CREATE OR ALTER PROCEDURE dbo.usp_ProcessTouchOffTransaction
      @card_id     INT,
      @scanner_id  INT,
      -- === OUTPUT to device ===
      @OUT_new_balance DECIMAL(10,2) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /*----------------------------------------------------------
        1. 完成 Trip（內部已計算 fare_type 與 cap）
    ----------------------------------------------------------*/
    DECLARE @fare_type VARCHAR(20),
            @daily_cap_used  DECIMAL(10,2),
            @daily_cap_limit DECIMAL(10,2),
            @trip_id INT;   -- usp_UpdateTripOnTouchOff 應加 OUTPUT 傳回

    EXEC dbo.usp_UpdateTripOnTouchOff
         @card_id      = @card_id,
         @scanner_id   = @scanner_id,
         @fare_type    = @fare_type OUTPUT,
         @OUT_daily_cap_used  = @daily_cap_used  OUTPUT,
         @OUT_daily_cap_limit = @daily_cap_limit OUTPUT,
         @OUT_trip_id         = @trip_id OUTPUT;

    /*----------------------------------------------------------
        2. 產生交易
    ----------------------------------------------------------*/
    DECLARE @txn_type  VARCHAR(20),
            @amount    DECIMAL(10,2);

    EXEC dbo.usp_CreateCardTransactionFromTripFare
         @card_id            = @card_id,
         @trip_id            = @trip_id,
         @scanner_id         = @scanner_id,
         @fare_type          = @fare_type,
         @daily_cap_used     = @daily_cap_used,
         @daily_cap_limit    = @daily_cap_limit,
         @OUT_transaction_type = @txn_type OUTPUT,
         @OUT_final_amount     = @amount   OUTPUT;

    /*----------------------------------------------------------
        3. 更新餘額（若需要）
    ----------------------------------------------------------*/
    EXEC dbo.usp_UpdateMykiBalance
         @card_id          = @card_id,
         @amount           = @amount,
         @transaction_type = @txn_type,
         @OUT_new_balance  = @OUT_new_balance OUTPUT;

    -- 至此可把 @OUT_new_balance 回傳給掃描器做餘額顯示
END;
GO
