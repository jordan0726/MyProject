-- ============================================================================
-- FUNCTION: udf_GetCurrentStopStationIdByScannerId
-- PURPOSE : Retrieves the current stop station ID based on a scanner ID.
-- RETURNS : INT - current_stop_station_id (nullable)
-- ============================================================================
CREATE OR ALTER FUNCTION udf_GetCurrentStopStationIdByScannerId (
    @scanner_id INT
)
RETURNS INT
WITH RETURNS NULL ON NULL INPUT,
     SCHEMABINDING
AS
BEGIN
    DECLARE @stop_id INT;

    SELECT @stop_id = dl.current_stop_station_id
    FROM dbo.Scanner s
    INNER JOIN dbo.DeviceLocation dl ON s.device_location_id = dl.device_location_id
    WHERE s.scanner_id = @scanner_id;

    RETURN @stop_id;
END;
GO

-- ============================================================================
-- PROCEDURE: usp_InsertTripRecord
-- PURPOSE   : Inserts a new Trip record into the database using supplied values.
-- ============================================================================
CREATE OR ALTER PROCEDURE usp_InsertTripRecord
    @card_id INT,
    @scanner_id INT,
    @stop_station_id INT,
    @touch_on_time DATETIME2(0)
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @card_id IS NULL OR @scanner_id IS NULL OR @stop_station_id IS NULL OR @touch_on_time IS NULL
    BEGIN
        THROW 50000, '❌ Required parameters cannot be NULL', 1;
        RETURN;
    END

    INSERT INTO dbo.Trip (
        card_id,
        touch_on_time,
        touch_on_scanner_id,
        touch_on_stop_station_id,
        touch_off_time,
        touch_off_scanner_id,
        touch_off_stop_station_id,
        fare_type
    )
    VALUES (
        @card_id,
        @touch_on_time,
        @scanner_id,
        @stop_station_id,
        NULL,
        NULL,
        NULL,
        NULL
    );

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 50001, '❌ Trip record insertion failed', 1;
    END
END;
GO

-- ============================================================================
-- PROCEDURE: usp_InsertTripOnTouchOn
-- PURPOSE   : Handles the full touch-on process for a Myki card.
-- ============================================================================
CREATE OR ALTER PROCEDURE usp_InsertTripOnTouchOn
    @card_id INT,
    @scanner_id INT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @stop_station_id INT;
    DECLARE @now DATETIME2(0) = SYSUTCDATETIME();

    IF @card_id IS NULL OR @scanner_id IS NULL
    BEGIN
        THROW 50000, '❌ Required parameters cannot be NULL.', 1;
    END

    BEGIN TRY
        SET @stop_station_id = dbo.udf_GetCurrentStopStationIdByScannerId(@scanner_id);

        IF @stop_station_id IS NULL
        BEGIN
            PRINT '❌ Could not resolve stop station from scanner ID ' + CAST(@scanner_id AS NVARCHAR);
            THROW 50002, 'Could not resolve stop station from scanner ID.', 1;
        END

        EXEC usp_InsertTripRecord @card_id, @scanner_id, @stop_station_id, @now;

        PRINT '✅ Trip record inserted successfully for card ' + CAST(@card_id AS NVARCHAR) + '.';
    END TRY

    BEGIN CATCH
        DECLARE @error_message NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @error_severity INT = ERROR_SEVERITY();
        DECLARE @error_state INT = ERROR_STATE();

        PRINT '❌ Error: ' + @error_message 
              + ' (Severity: ' + CAST(@error_severity AS NVARCHAR) 
              + ', State: ' + CAST(@error_state AS NVARCHAR) + ')';
        THROW 50003, 'An error occurred during touch-on.', 1;
    END CATCH
END;
GO
