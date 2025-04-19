-- ============================================================================
-- FUNCTION: udf_GetCurrentStopStationIdByScannerId
-- PURPOSE : Resolves the current_stop_station_id linked to a given scanner.
-- RETURNS : INT - The current stop station ID, or NULL if not found.
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
-- FUNCTION: udf_GetLatestUnfinishedTripIdByCard
-- PURPOSE : Fetches the trip_id of the most recent unfinished trip for a card.
-- RETURNS : INT - The trip_id if found, otherwise NULL.
-- ============================================================================
CREATE OR ALTER FUNCTION udf_GetLatestUnfinishedTripIdByCard (
    @card_id INT
)
RETURNS INT
WITH RETURNS NULL ON NULL INPUT,
     SCHEMABINDING
AS
BEGIN
    DECLARE @trip_id INT;

    SELECT TOP 1 @trip_id = trip_id
    FROM dbo.Trip
    WHERE card_id = @card_id AND touch_off_time = '9999-12-31 23:59:59'
    ORDER BY touch_on_time DESC;

    RETURN @trip_id;
END;
GO
-- ============================================================================
-- PROCEDURE: usp_UpdateTripOnTouchOff
-- PURPOSE   : Completes the most recent unfinished trip for a card by updating
--             touch-off data and determining fare, then outputs all necessary
--             data for creating a CardTransaction record.
-- ============================================================================
CREATE OR ALTER PROCEDURE usp_UpdateTripOnTouchOff
    @card_id INT,
    @scanner_id INT,
    @fare_type VARCHAR(20) OUTPUT,
    @trip_id INT OUTPUT,
    @touch_off_scanner_id INT OUTPUT,
    @touch_off_time DATETIME2(0) OUTPUT,
    @daily_cap_used DECIMAL(10,2) OUTPUT,
    @daily_cap_limit DECIMAL(10,2) OUTPUT,
    @zone_type VARCHAR(20) = NULL OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @now DATETIME2(0) = SYSUTCDATETIME();  
    DECLARE @stop_station_id INT;
    DECLARE @touch_on_time DATETIME2(0);
    DECLARE @touch_on_stop_station_id INT;

    BEGIN TRY
        -- Step 1: Get stop station from scanner
        SET @stop_station_id = dbo.udf_GetCurrentStopStationIdByScannerId(@scanner_id);
        SET @touch_off_scanner_id = @scanner_id;

        IF @stop_station_id IS NULL
        BEGIN
            THROW 50001, '❌ Failed to resolve stop station from scanner.', 1;
            RETURN;
        END

        -- Step 2: Get the most recent unfinished trip
        SET @trip_id = dbo.udf_GetLatestUnfinishedTripIdByCard(@card_id);

        IF @trip_id IS NULL
        BEGIN
            THROW 50002, '❌ No active trip found for card.', 1;
            RETURN;
        END

        -- Step 3: Get touch-on details from the trip
        SELECT 
            @touch_on_time = touch_on_time, 
            @touch_on_stop_station_id = touch_on_stop_station_id
        FROM dbo.Trip
        WHERE trip_id = @trip_id;

        UPDATE dbo.Trip
        SET
            touch_off_time = @now
        WHERE trip_id = @trip_id;

        -- Step 4: Determine fare_type, daily_cap_used, daily_cap_limit, zone_type
        EXEC dbo.usp_DetermineFareType 
            @card_id = @card_id,
            @trip_id = @trip_id,
            @touch_on_time = @touch_on_time,
            @touch_on_stop_station_id = @touch_on_stop_station_id,
            @touch_off_time = @now,
            @touch_off_stop_station_id = @stop_station_id,
            @OUT_fare_type = @fare_type OUTPUT,
            @OUT_zone_type = @zone_type OUTPUT,
            @OUT_daily_cap_used = @daily_cap_used OUTPUT,
            @OUT_daily_cap_limit = @daily_cap_limit OUTPUT;

        -- Step 5: Update the trip with touch-off information
        UPDATE dbo.Trip
        SET
            touch_off_time = @now,
            touch_off_scanner_id = @scanner_id,
            touch_off_stop_station_id = @stop_station_id,
            fare_type = @fare_type
        WHERE trip_id = @trip_id;
        SET @touch_off_time = @now;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50003, '❌ Trip update failed - no rows affected.', 1;
            RETURN;
        END

        PRINT CONCAT('✅ Trip ', @trip_id, ' updated successfully with fare_type = ', @fare_type);
    END TRY

    BEGIN CATCH
        DECLARE @error_message NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @error_severity INT = ERROR_SEVERITY();
        DECLARE @error_state INT = ERROR_STATE();

        PRINT CONCAT('❌ Error: ', @error_message, ' (Severity: ', @error_severity, ', State: ', @error_state, ')');
        THROW;
    END CATCH
END;
GO
