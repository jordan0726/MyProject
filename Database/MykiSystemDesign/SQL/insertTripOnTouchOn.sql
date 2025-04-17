-- ============================================================================
-- FUNCTION: getCurrentStopStationIdByScannerId
-- PURPOSE : Retrieves the current stop station ID based on a scanner ID.
--           This function is used to resolve the physical stop where a scanner
--           is currently located, by tracing through its device location.
-- PARAMETERS:
--     @scanner_id - The ID of the scanner device
-- RETURNS:
--     INT - current_stop_station_id (nullable)
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
-- PROCEDURE: insertTripRecord
-- PURPOSE   : Inserts a new Trip record into the database using supplied values.
--             Used to modularise the low-level data insert logic during a touch-on.
-- PARAMETERS:
--     @card_id         - The ID of the card being used
--     @scanner_id      - The scanner where the card was tapped
--     @stop_station_id - The resolved stop station ID from device location
--     @touch_on_time   - The timestamp of touch on
-- ============================================================================
CREATE OR ALTER PROCEDURE insertTripRecord
    @card_id INT,
    @scanner_id INT,
    @stop_station_id INT,
    @touch_on_time DATETIME2(0)
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Parameter validation
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
        NULL,  -- will be set on touch off
        NULL,
        NULL,
        NULL   -- fare_type to be determined later
    );
    
    -- Check if insert was successful
    IF @@ROWCOUNT = 0
    BEGIN
        THROW 50001, '❌ Trip record insertion failed', 1;
    END
END;
GO

-- ============================================================================
-- PROCEDURE: insertTripOnTouchOn
-- PURPOSE   : Controls the process of inserting a new Trip record when a card
--             is tapped on. It resolves the stop station via helper function,
--             and inserts the Trip via a separate modularised procedure.
-- PARAMETERS:
--     @card_id    - The ID of the Myki card
--     @scanner_id - The scanner being tapped
-- EXCEPTION HANDLING:
--     Raises errors if location cannot be resolved or insert fails.
-- ============================================================================
CREATE OR ALTER PROCEDURE insertTripOnTouchOn
    @card_id INT,
    @scanner_id INT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @stop_station_id INT;
    DECLARE @now DATETIME2(0) = SYSUTCDATETIME();  -- Using UTC time is best practice

    -- Parameter validation
    IF @card_id IS NULL OR @scanner_id IS NULL
    BEGIN
        THROW 50000, '❌ Required parameters cannot be NULL', 1;
        RETURN;
    END

    BEGIN TRY
        -- Get current stop_station_id from helper function
        SET @stop_station_id = dbo.getCurrentStopStationIdByScannerId(@scanner_id);

        IF @stop_station_id IS NULL
        BEGIN
            THROW 50002, CONCAT('❌ Could not resolve stop station from scanner ID ', @scanner_id), 1;
            RETURN;
        END

        -- Insert trip using helper procedure 
        EXEC insertTripRecord @card_id, @scanner_id, @stop_station_id, @now;

        PRINT CONCAT('✅ Trip record inserted successfully for card ', @card_id, '.');
    END TRY

    BEGIN CATCH
        -- Modern error handling
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