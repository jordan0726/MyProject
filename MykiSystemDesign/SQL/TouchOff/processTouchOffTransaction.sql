/*==============================================================================
  Name      : usp_ProcessTouchOffTransaction
  Purpose   : Coordinates the full flow for a card touch-off event:
                1. Completes the trip and updates Trip table.
                2. Calculates and records fare in CardTransaction.
                3. Optionally deducts balance from the card (if not free).
                4. Returns updated balance for UI or device display.

  Parameters:
      @card_id          INT              – ID of the tapped Myki card
      @scanner_id       INT              – ID of the scanner that recorded the tap
  Output:
      @OUT_new_balance  DECIMAL(10,2)    – Card balance after transaction (for display)
==============================================================================*/
CREATE OR ALTER PROCEDURE dbo.usp_ProcessTouchOffTransaction
      @card_id           INT,
      @scanner_id        INT,
      @OUT_new_balance   DECIMAL(10,2) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /*----------------------------------------------------------
        Step 1: Complete trip (updates Trip table with touch-off data).
                 Fare type and daily cap info are calculated internally.
    ----------------------------------------------------------*/
    DECLARE @fare_type         VARCHAR(20),
            @daily_cap_used    DECIMAL(10,2),
            @daily_cap_limit   DECIMAL(10,2),
            @trip_id           INT,
            @touch_off_scanner_id INT,
            @touch_off_time    DATETIME2(0),
            @zone_type         VARCHAR(20);

    EXEC dbo.usp_UpdateTripOnTouchOff
         @card_id               = @card_id,
         @scanner_id            = @scanner_id,
         @fare_type             = @fare_type OUTPUT,
         @trip_id               = @trip_id OUTPUT,
         @touch_off_scanner_id  = @touch_off_scanner_id OUTPUT,
         @daily_cap_used        = @daily_cap_used OUTPUT,
         @daily_cap_limit       = @daily_cap_limit OUTPUT,
         @zone_type             = @zone_type OUTPUT,
         @touch_off_time        = @touch_off_time OUTPUT;

    /*----------------------------------------------------------
        Step 2: Create CardTransaction for this trip.
                 Fare is calculated based on type and cap delta.
    ----------------------------------------------------------*/
    DECLARE @txn_type   VARCHAR(20),
            @amount     DECIMAL(10,2);

    EXEC dbo.usp_CreateCardTransactionFromTripFare
         @card_id               = @card_id,
         @trip_id               = @trip_id,
         @scanner_id            = @scanner_id,
         @fare_type             = @fare_type,
         @daily_cap_used        = @daily_cap_used,
         @daily_cap_limit       = @daily_cap_limit,
         @touch_off_time        = @touch_off_time,
         @final_amount          = @amount OUTPUT,
         @OUT_transaction_type  = @txn_type OUTPUT;

    /*----------------------------------------------------------
        Step 3: Update balance if transaction is not 'free'.
                 Returns updated balance for display.
    ----------------------------------------------------------*/
    EXEC dbo.usp_UpdateMykiBalance
         @card_id           = @card_id,
         @amount            = @amount,
         @transaction_type  = @txn_type,
         @OUT_new_balance   = @OUT_new_balance OUTPUT;

    -- At this point, @OUT_new_balance can be shown on the device screen.
END;
GO
