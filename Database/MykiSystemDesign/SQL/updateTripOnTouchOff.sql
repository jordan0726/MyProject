-- ============================================================================
-- FUNCTION: getCurrentStopStationIdByScannerId
-- PURPOSE : Resolves the current_stop_station_id linked to a given scanner.
-- RETURNS : INT - The current stop station ID, or NULL if not found.
-- ============================================================================
CREATE OR ALTER FUNCTION getCurrentStopStationIdByScannerId (
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
-- FUNCTION: getLatestUnfinishedTripIdByCard
-- PURPOSE : Fetches the trip_id of the most recent unfinished trip for a card.
-- RETURNS : INT - The trip_id if found, otherwise NULL.
-- ============================================================================
CREATE OR ALTER FUNCTION getLatestUnfinishedTripIdByCard (
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
    WHERE card_id = @card_id AND touch_off_time IS NULL
    ORDER BY touch_on_time DESC;

    RETURN @trip_id;
END;
GO


-- ============================================================================
-- PROCEDURE: updateTripOnTouchOff
-- PURPOSE   : Completes the most recent unfinished trip for a card by updating
--             touch-off time, location and calculated fare type.
-- PARAMETERS:
--     @card_id     - The ID of the card being tapped off
--     @scanner_id  - The scanner used for the tap off event
--     @fare_type OUT - Fare type to be returned for use in transaction logic
-- ============================================================================
CREATE OR ALTER PROCEDURE updateTripOnTouchOff
    @card_id INT,
    @scanner_id INT,
    @fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @now DATETIME2(0) = SYSUTCDATETIME();  -- Using UTC time as best practice
    DECLARE @stop_station_id INT;
    DECLARE @trip_id INT;
    DECLARE @touch_on_time DATETIME2(0);
    DECLARE @touch_on_stop_station_id INT;

    BEGIN TRY
        -- Step 1: Get stop station from scanner
        SET @stop_station_id = dbo.getCurrentStopStationIdByScannerId(@scanner_id);

        IF @stop_station_id IS NULL
        BEGIN
            THROW 50001, '❌ Failed to resolve stop station from scanner.', 1;
            RETURN;
        END

        -- Step 2: Get the most recent unfinished trip
        SET @trip_id = dbo.getLatestUnfinishedTripIdByCard(@card_id);

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

        -- Step 4: Determine fare_type using the comprehensive fare calculation logic
        EXEC sp_DetermineFareType 
            @card_id = @card_id,
            @touch_on_time = @touch_on_time,
            @touch_on_stop_station_id = @touch_on_stop_station_id,
            @touch_off_time = @now,
            @touch_off_stop_station_id = @stop_station_id,
            @OUT_fare_type = @fare_type OUTPUT;

        -- Step 5: Update the trip
        UPDATE dbo.Trip
        SET
            touch_off_time = @now,
            touch_off_scanner_id = @scanner_id,
            touch_off_stop_station_id = @stop_station_id,
            fare_type = @fare_type,
            last_updated = @now  -- Good practice to track modification time
        WHERE trip_id = @trip_id;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50003, '❌ Trip update failed - no rows affected.', 1;
            RETURN;
        END

        -- Log success
        PRINT CONCAT('✅ Trip ', @trip_id, ' updated successfully with touch off details.');
    END TRY

    BEGIN CATCH
        -- More modern error handling with THROW
        DECLARE @error_message NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @error_severity INT = ERROR_SEVERITY();
        DECLARE @error_state INT = ERROR_STATE();
        
        -- Log error details
        PRINT CONCAT('❌ Error: ', @error_message, ' (Severity: ', @error_severity, ', State: ', @error_state, ')');
        
        -- Re-throw with original severity and state
        THROW;
    END CATCH
END;
GO