/*==============================================================================
  Name      : usp_AutoCompleteUnfinishedTrips
  Purpose   : Automatically completes trips that were touched-on over 6 hours ago
              and never touched-off. Marks them with a placeholder scanner and
              stop station, and assigns fallback fare type based on card_type.
  Notes     :
      • Fare type will be 'auto_default_fare' or 'auto_concession'.
      • Touch-off time = current UTC time.
      • Touch-off scanner_id and stop_station_id = -1
==============================================================================*/
CREATE OR ALTER PROCEDURE dbo.usp_AutoCompleteUnfinishedTrips
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @now DATETIME2(0) = SYSUTCDATETIME();

    -- Step 1: Find all trips that were touched-on more than 6 hours ago and are still open
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
