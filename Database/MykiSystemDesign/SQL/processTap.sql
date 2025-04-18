CREATE OR ALTER PROCEDURE usp_ProcessTap
    @card_id     INT,
    @scanner_id  INT,
    @tap_result  NVARCHAR(50) OUTPUT,
    @new_balance DECIMAL(10,2) OUTPUT  -- ✅ Only has value on touch_off; otherwise NULL
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @status NVARCHAR(50);
    SET @new_balance = NULL;  -- Default to NULL

    /*-------------------------------------------------
      1) Check card status
    -------------------------------------------------*/
    EXEC usp_CheckTapCardStatus
         @card_id  = @card_id,
         @result   = @status OUTPUT;

    IF @status IN ('expired', 'insufficient_balance')
    BEGIN
        SET @tap_result = @status;
        RETURN;
    END

    /*-------------------------------------------------
      2) Route to appropriate process
    -------------------------------------------------*/
    IF @status = 'touch_on'
    BEGIN
        BEGIN TRAN;
            EXEC usp_InsertTripOnTouchOn
                 @card_id    = @card_id,
                 @scanner_id = @scanner_id;
        COMMIT;

        SET @tap_result = 'touch_on_ok';
    END
    ELSE IF @status = 'touch_off'
    BEGIN
        BEGIN TRAN;
            EXEC dbo.usp_ProcessTouchOffTransaction
                 @card_id         = @card_id,
                 @scanner_id      = @scanner_id,
                 @OUT_new_balance = @new_balance OUTPUT;
        COMMIT;

        SET @tap_result = 'touch_off_ok';
    END
END;
GO
