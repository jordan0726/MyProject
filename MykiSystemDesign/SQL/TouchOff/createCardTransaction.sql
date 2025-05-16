/*============================================================================
  PROCEDURE : usp_CreateCardTransactionFromTripFare
  PURPOSE   : Based on a completed Trip, this procedure calculates the fare
              and inserts a corresponding record into CardTransaction.
              - Automatically applies daily cap logic (charges only the remaining amount)
              - If fare_type indicates a free trip, amount is set to 0, transaction_type = 'free'
              - Default transaction_type is 'deduction'
              - (Optional) MykiCard.balance deduction logic may be added later
  PARAMETERS
      @card_id           INT          -- Required: Card ID
      @trip_id           INT          -- Required: Primary key of the current Trip
      @scanner_id        INT          -- Required: Scanner used for touch-off
      @fare_type         VARCHAR(20)  -- Required: Returned by usp_DetermineFareType
      @daily_cap_used    DECIMAL(10,2)-- Required: Total fare spent today so far
      @daily_cap_limit   DECIMAL(10,2)-- Required: Daily fare cap for today
  OUTPUT
      @final_amount      DECIMAL(10,2) OUTPUT -- Final charge (or 0 if free)
==============================================================================*/
CREATE OR ALTER PROCEDURE dbo.usp_CreateCardTransactionFromTripFare
      @card_id           INT,
      @trip_id           INT,
      @scanner_id        INT,
      @fare_type         VARCHAR(20),
      @daily_cap_used    DECIMAL(10,2),
      @daily_cap_limit   DECIMAL(10,2),
      @touch_off_time    DATETIME2(0), 
      @final_amount      DECIMAL(10,2) OUTPUT,
      @OUT_transaction_type  VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /* 1. Basic parameter validation */
    IF @card_id IS NULL OR @trip_id IS NULL OR @scanner_id IS NULL OR @fare_type IS NULL OR @touch_off_time IS NULL
    BEGIN
        THROW 51000, '❌ usp_CreateCardTransactionFromTripFare: Input parameters must not be NULL', 1;
        RETURN;
    END

    /* 2. Map fare_type to base fare */
    DECLARE @base_fare DECIMAL(10,2);

    SET @base_fare =
        CASE LOWER(@fare_type)
            WHEN 'default_fare'        THEN 5.50
            WHEN 'default_weekend'     THEN 5.50
            WHEN 'default_zone2'       THEN 3.50
            WHEN 'concession'          THEN 2.75
            WHEN 'concession_weekend'  THEN 2.75
            WHEN 'concession_zone2'    THEN 1.75
            ELSE 0.00
        END;

    /* 3. Apply daily cap */
    IF @base_fare > 0
    BEGIN
        SET @final_amount = 
            CASE 
                WHEN @base_fare + @daily_cap_used > @daily_cap_limit 
                    THEN @daily_cap_limit - @daily_cap_used
                ELSE @base_fare 
            END;
    END
    ELSE
    BEGIN
        SET @final_amount = 0.00;
    END

    /* 4. Determine transaction type */
    DECLARE @txn_type VARCHAR(20) =
        CASE WHEN @final_amount = 0 THEN 'free' ELSE 'deduction' END;

    /* 5. Insert into CardTransaction using Melbourne time for [timestamp] */
    DECLARE @melbourne_now DATETIME2(0) = DATEADD(HOUR, 10, SYSUTCDATETIME());  -- Adjust to +11 if DST

    INSERT INTO dbo.CardTransaction
          (card_id, trip_id, touch_off_time, scanner_id, amount, [timestamp], transaction_type)
    VALUES(@card_id, @trip_id, @touch_off_time, @scanner_id, @final_amount, @melbourne_now, @txn_type);

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 51001, '❌ Failed to insert into CardTransaction', 1;
        RETURN;
    END

    /* 6. Output */
    SET @OUT_transaction_type = @txn_type;
    SET @final_amount = @final_amount;

    PRINT CONCAT('✅ CardTransaction created, amount = ', @final_amount);
END;
GO
