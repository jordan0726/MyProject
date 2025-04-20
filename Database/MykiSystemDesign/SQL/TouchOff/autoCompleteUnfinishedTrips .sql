/*==============================================================================
  PROCEDURE: usp_AutoCompleteUnfinishedTrips
  PURPOSE  : Automatically completes trips that were touched-on over 6 hours ago
             and never touched-off. This prevents data inconsistency by closing
             abandoned trip records.
  SYSTEM USE:
      ⚠️ This procedure is intended to be executed by the system every 6 hours
         (via scheduled job – not yet implemented) to auto-fix unfinished trips.
  BEHAVIOUR:
      • Fare type is set to 'auto_default_fare' or 'auto_concession'
      • Touch-off time is set to current UTC time
      • Scanner ID and stop station ID are set to -1 (placeholder values)
==============================================================================*/
CREATE OR ALTER PROCEDURE dbo.usp_AutoCompleteUnfinishedTrips
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @now DATETIME2(0) = SYSUTCDATETIME();

    -- Step 1: Update all trips that were touched-on 6+ hours ago but never touched-off
    UPDATE t
    SET 
        t.touch_off_time = @now,
        t.touch_off_scanner_id = -1,
        t.touch_off_stop_station_id = -1,
        t.fare_type = 
            CASE 
                WHEN c.card_type IN ('concession', 'child', 'senior')
                    THEN 'auto_concession'
                ELSE 'auto_default_fare'
            END
    FROM dbo.Trip t
    INNER JOIN dbo.MykiCard c ON t.card_id = c.card_id
    WHERE 
        t.touch_off_time IS NULL
        AND DATEDIFF(HOUR, t.touch_on_time, @now) >= 6;

    PRINT '✅ Auto-completion of unfinished trips has been executed.';
END;
GO
