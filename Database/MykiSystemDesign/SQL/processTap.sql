/* =========================================================================
   usp_ProcessTap
   ⽤　途：Scanner 呼叫；自動判斷是 touch‑on 還是 touch‑off，
           並呼叫對應 SP。回傳最後結果字串。
   ========================================================================*/
CREATE OR ALTER PROCEDURE usp_ProcessTap
    @card_id     INT,
    @scanner_id  INT,
    @tap_result  NVARCHAR(50) OUTPUT    -- 最終結果：'touch_on_ok' / 'touch_off_ok' / 'expired'...
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @status NVARCHAR(50);

    /*-------------------------------------------------
      1) 先檢查卡片狀態
      -------------------------------------------------*/
    EXEC usp_CheckTapCardStatus
         @card_id  = @card_id,
         @result   = @status OUTPUT;      -- 可能值見上表

    /*-------------------------------------------------
      2) 依結果分流
      -------------------------------------------------*/
    IF @status IN ('expired', 'insufficient_balance')
    BEGIN
        SET @tap_result = @status;        -- 直接回傳錯誤狀態
        RETURN;
    END

    /*-------------------------------------------------
      3) Touch‑ON or Touch‑OFF
      -------------------------------------------------*/
    IF @status = 'touch_on'
    BEGIN
        --=== Touch‑ON 流程 =================================
        BEGIN TRAN;

            EXEC usp_InsertTripOnTouchOn
                 @card_id    = @card_id,
                 @scanner_id = @scanner_id;

            -- 這裡可順便呼叫扣款 / free‑transfer 判斷 …
            -- EXEC usp_ProcessFareOnTouchOn ...

        COMMIT;

        SET @tap_result = 'touch_on_ok';
    END
    ELSE IF @status = 'touch_off'
    BEGIN
        --=== Touch‑OFF 流程 =================================
        BEGIN TRAN;

            EXEC usp_ProcessTouchOff   -- 需自行實作
                 @card_id    = @card_id,
                 @scanner_id = @scanner_id;

        COMMIT;

        SET @tap_result = 'touch_off_ok';
    END
END
GO
