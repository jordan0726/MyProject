/*==============================================================================
  Name      : usp_UpdateMykiBalance
  Purpose   : Adjusts MykiCard.balance according to a single transaction.
              • Supports 'deduction', 'top-up', 'refund', 'free'.
              • When type = 'free'   → no balance change, returns current balance.
              • When type = 'deduction' → subtract @amount.
              • When type = 'top-up' / 'refund' → add @amount.
  Parameters
      @card_id          INT            – Card to update.
      @amount           DECIMAL(10,2)  – Amount to add / subtract.
      @transaction_type VARCHAR(20)    – 'deduction' | 'top-up' | 'refund' | 'free'
  Output
      @OUT_new_balance  DECIMAL(10,2)  – Balance after update (or unchanged for free).
==============================================================================*/
CREATE OR ALTER PROCEDURE dbo.usp_UpdateMykiBalance
      @card_id            INT,
      @amount             DECIMAL(10,2),
      @transaction_type   VARCHAR(20),   -- 'deduction' / 'top-up' / 'refund' / 'free'
      @OUT_new_balance    DECIMAL(10,2) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @card_id IS NULL OR @transaction_type IS NULL
        THROW 52000, 'card_id and transaction_type must not be NULL.', 1;

    IF @amount < 0
        THROW 52001, 'Amount cannot be negative.', 1;

    /* ------------------------------------------------------------------
       'free'  – just read current balance and exit
    ------------------------------------------------------------------*/
    IF LOWER(@transaction_type) = 'free'
    BEGIN
        SELECT @OUT_new_balance = balance
        FROM dbo.MykiCard
        WHERE card_id = @card_id;

        IF @OUT_new_balance IS NULL
            THROW 52004, 'Card not found.', 1;
        RETURN;
    END;

    /* Use a table variable to capture OUTPUT */
    DECLARE @t TABLE (balance DECIMAL(10,2));

    /* ------------------------------------------------------------------
       Apply balance mutation based on transaction_type
    ------------------------------------------------------------------*/
    IF LOWER(@transaction_type) = 'deduction'
    BEGIN
        UPDATE dbo.MykiCard
        SET balance = balance - @amount,
            daily_cap = daily_cap + @amount
        OUTPUT INSERTED.balance INTO @t(balance)
        WHERE card_id = @card_id;
    END
    ELSE IF LOWER(@transaction_type) IN ('top-up','refund')
    BEGIN
        UPDATE dbo.MykiCard
        SET balance = balance + @amount
        OUTPUT INSERTED.balance INTO @t(balance)
        WHERE card_id = @card_id;
    END
    ELSE
        THROW 52002, 'Unsupported transaction_type.', 1;

    /* Retrieve new balance */
    SELECT TOP (1) @OUT_new_balance = balance FROM @t;

    IF @OUT_new_balance IS NULL
        THROW 52003, 'Balance update failed or card not found.', 1;
END;
GO
