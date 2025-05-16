----------------------------------Main Procedure---------------------------------
-- ============================================================================
-- PROCEDURE: usp_TouchOn
-- PURPOSE  : Handles tap event for a Myki card; either initiates a trip (touch on)
--            or completes a trip and charges fare (touch off), depending on status.
-- PARAMETERS:
--   @card_id      - ID of the card tapping on/off
--   @scanner_id   - ID of the scanner being used
--   @tap_result   - OUTPUT status message of the tap event
--   @new_balance  - OUTPUT updated balance (only on touch off)
-- ============================================================================
CREATE OR ALTER PROCEDURE usp_TouchOn
    @card_id     INT,
    @scanner_id  INT,
    @tap_result  NVARCHAR(50) OUTPUT,
    @new_balance DECIMAL(10,2) OUTPUT  -- Only updated during touch_off
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @status NVARCHAR(50);
    SET @new_balance = NULL;  -- Default to NULL unless touch_off occurs

    -- Step 1: Check card status
    EXEC usp_CheckTapCardStatus
         @card_id  = @card_id,
         @result   = @status OUTPUT;

    IF @status IN ('expired', 'insufficient_balance')
    BEGIN
        SET @tap_result = @status;
        RETURN;
    END

    -- Step 2: Determine tap type and route accordingly
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

-----------Step 1 - Check if the card has expired and enough balance------------

-- ============================================================================
-- PROCEDURE: usp_CheckTapCardStatus
-- PURPOSE   : Determines whether a tap is a touch on or touch off and
--             validates card status and balance beforehand.
-- PARAMETERS:
--     @card_id     - ID of the card being tapped
--     @result OUT  - Result string: 'expired', 'insufficient_balance',
--                    'touch_on', or 'touch_off'
-- ============================================================================
CREATE OR ALTER PROCEDURE usp_CheckTapCardStatus
    @card_id INT,
    @result NVARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @card_id IS NULL
    BEGIN
        THROW 50010, '❌ Card ID cannot be NULL', 1;
        RETURN;
    END

    -- Step 1: Check if card is active
    IF dbo.udf_CheckCardStatusActive(@card_id) = 0
    BEGIN
        SET @result = 'expired';
        RETURN;
    END

    -- Step 2: Check if card has valid balance or pass
    IF dbo.udf_CheckCardBalanceValid(@card_id) = 0
    BEGIN
        SET @result = 'insufficient_balance';
        RETURN;
    END

    -- Step 3: Determine if current tap is a touch off or new trip
    BEGIN TRY
        IF dbo.udf_CheckLastTripIsTouchOff(@card_id) = 1
            SET @result = 'touch_off';
        ELSE
            SET @result = 'touch_on';
    END TRY
    BEGIN CATCH
        SET @result = 'touch_on'; -- fallback if check fails
        PRINT '⚠️ Warning: Failed to check last trip status. Defaulting to touch_on.';
    END CATCH
END;
GO

------------------------Sub-function of usp_CheckTapCardStatus---------------------

    -- ============================================================================
    -- FUNCTION: udf_CheckCardStatusActive
    -- PURPOSE : Checks if a Myki card's status is 'active'
    -- RETURNS : 1 if active, 0 otherwise
    -- ============================================================================
    CREATE OR ALTER FUNCTION udf_CheckCardStatusActive (
        @card_id INT
    )
    RETURNS BIT
    WITH RETURNS NULL ON NULL INPUT,
        SCHEMABINDING
    AS
    BEGIN
        DECLARE @is_active BIT = 0;

        IF EXISTS (
            SELECT 1 
            FROM dbo.MykiCard 
            WHERE card_id = @card_id AND status = 1
        )
            SET @is_active = 1;

        RETURN @is_active;
    END;
    GO
    -- ============================================================================
    -- FUNCTION: udf_CheckCardBalanceValid
    -- PURPOSE : Determines whether a Myki card is financially valid to travel
    --           by checking either an active Myki Pass or a non-negative balance.
    -- RETURNS : 1 if valid for travel, 0 otherwise
    -- ============================================================================
    CREATE OR ALTER FUNCTION dbo.udf_CheckCardBalanceValid
    (
        @card_id INT
    )
    RETURNS BIT
    WITH RETURNS NULL ON NULL INPUT,
        SCHEMABINDING
    AS
    BEGIN
        DECLARE @is_valid BIT = 0;

        IF EXISTS (
            SELECT 1
            FROM dbo.MykiCard
            WHERE card_id = @card_id
            AND (
                    pass_id IS NOT NULL     -- active Myki Pass
                OR balance >= 0            -- or sufficient stored value
            )
        )
            SET @is_valid = 1;

        RETURN @is_valid;
    END;
    GO
    -- ============================================================================
    -- FUNCTION: udf_CheckLastTripIsTouchOff
    -- PURPOSE : Checks if the last trip is still active (i.e., no touch off yet)
    -- RETURNS : 1 if touch_off_time is '9999-12-31 23:59:59', else 0
    -- ============================================================================
    CREATE OR ALTER FUNCTION udf_CheckLastTripIsTouchOff (
        @card_id INT
    )
    RETURNS BIT
    WITH RETURNS NULL ON NULL INPUT,
        SCHEMABINDING
    AS
    BEGIN
        DECLARE @needs_touch_off BIT = 0;

        IF EXISTS (
            SELECT TOP(1) 1
            FROM dbo.Trip
            WHERE card_id = @card_id AND touch_off_time = '9999-12-31 23:59:59'
            ORDER BY touch_on_time DESC
        )
            SET @needs_touch_off = 1;

        RETURN @needs_touch_off;
    END;
    GO

-----------Step 2 (touch-on) - Insert a trip data ------------

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

------------------------Sub-function/procedure of usp_InsertTripOnTouchOn---------------------

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
            '9999-12-31 23:59:59', -- Placeholder to be updated later
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
            '9999-12-31 23:59:59', -- Placeholder to be updated later
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

-----------Step 2 (touch-off) - Process touch off transaction ------------

/*==============================================================================
  PROCEDURE: usp_ProcessTouchOffTransaction
  PURPOSE   : Coordinates the full flow for a card touch-off event:
                1. Completes the trip and updates Trip table.
                2. Calculates and records fare in CardTransaction.
                3. Optionally deducts balance from the card (if not free).
                4. Returns updated balance for UI or device display.
  PARAMETERS:
      @card_id           INT            – ID of the tapped Myki card
      @scanner_id        INT            – ID of the scanner that recorded the tap
  OUTPUT:
      @OUT_new_balance   DECIMAL(10,2)  – Card balance after transaction (for display)
==============================================================================*/
CREATE OR ALTER PROCEDURE dbo.usp_ProcessTouchOffTransaction
      @card_id           INT,
      @scanner_id        INT,
      @OUT_new_balance   DECIMAL(10,2) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    ----------------------------------------------------------------------
    -- Step 1: Complete the trip and update Trip table
    --         Fare type, zone, and daily cap are calculated internally
    ----------------------------------------------------------------------
    DECLARE @fare_type         VARCHAR(20),
            @daily_cap_used    DECIMAL(10,2),
            @daily_cap_limit   DECIMAL(10,2),
            @trip_id           INT,
            @touch_off_scanner_id INT,
            @touch_off_time    DATETIME2(0),
            @zone_type         VARCHAR(20);

    EXEC dbo.usp_UpdateTripOnTouchOff
         @card_id               = @card_id,
         @scanner_id            = @scanner_id,
         @fare_type             = @fare_type OUTPUT,
         @trip_id               = @trip_id OUTPUT,
         @touch_off_scanner_id  = @touch_off_scanner_id OUTPUT,
         @daily_cap_used        = @daily_cap_used OUTPUT,
         @daily_cap_limit       = @daily_cap_limit OUTPUT,
         @zone_type             = @zone_type OUTPUT,
         @touch_off_time        = @touch_off_time OUTPUT;

    ----------------------------------------------------------------------
    -- Step 2: Record fare in CardTransaction
    ----------------------------------------------------------------------
    DECLARE @txn_type   VARCHAR(20),
            @amount     DECIMAL(10,2);

    EXEC dbo.usp_CreateCardTransactionFromTripFare
         @card_id               = @card_id,
         @trip_id               = @trip_id,
         @scanner_id            = @scanner_id,
         @fare_type             = @fare_type,
         @daily_cap_used        = @daily_cap_used,
         @daily_cap_limit       = @daily_cap_limit,
         @touch_off_time        = @touch_off_time,
         @final_amount          = @amount OUTPUT,
         @OUT_transaction_type  = @txn_type OUTPUT;

    ----------------------------------------------------------------------
    -- Step 3: Deduct balance if needed, return updated value
    ----------------------------------------------------------------------
    EXEC dbo.usp_UpdateMykiBalance
         @card_id           = @card_id,
         @amount            = @amount,
         @transaction_type  = @txn_type,
         @OUT_new_balance   = @OUT_new_balance OUTPUT;

    -- Final output: @OUT_new_balance for device display
END;
GO

-----------Substep 2-1 (touch-off) - Update trip table on touch off ------------

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

            -- Step 3: Retrieve trip touch-on data
            SELECT 
                @touch_on_time = touch_on_time, 
                @touch_on_stop_station_id = touch_on_stop_station_id
            FROM dbo.Trip
            WHERE trip_id = @trip_id;

            -- Step 4: Determine fare details
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

            -- Step 5: Update trip with touch-off data
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

-----------Substep 2-1-1 (touch-off) - Determine fare type for trip data insertion   ------------

        -- ============================================================================
        -- PROCEDURE: usp_DetermineFareType
        -- PURPOSE  : Determines fare type for a completed trip, including logic for
        --            transfers, passes, senior discounts, zones, and capping rules.
        -- ============================================================================
        CREATE OR ALTER PROCEDURE usp_DetermineFareType
            @card_id INT,
            @trip_id INT,
            @touch_on_time DATETIME2(0),
            @touch_on_stop_station_id INT,
            @touch_off_time DATETIME2(0),
            @touch_off_stop_station_id INT,
            @OUT_fare_type VARCHAR(20) OUTPUT,
            @OUT_zone_type VARCHAR(20) = NULL OUTPUT,
            @OUT_daily_cap_used DECIMAL(10,2) = NULL OUTPUT,
            @OUT_daily_cap_limit DECIMAL(10,2) = NULL OUTPUT
        WITH EXECUTE AS CALLER
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;
            
            IF @card_id IS NULL OR @touch_on_time IS NULL OR @touch_on_stop_station_id IS NULL 
            OR @touch_off_time IS NULL OR @touch_off_stop_station_id IS NULL
            BEGIN
                THROW 50000, '❌ Required parameters cannot be NULL', 1;
                RETURN;
            END
            
            DECLARE @result VARCHAR(20), @card_type VARCHAR(20),
                    @is_weekend_or_holiday BIT = 0, @travel_date DATE = CAST(@touch_on_time AS DATE),
                    @touch_on_zone VARCHAR(50), @touch_off_zone VARCHAR(50);
            
            SELECT @card_type = card_type FROM dbo.MykiCard WHERE card_id = @card_id;
            IF @card_type IS NULL
            BEGIN
                THROW 50001, '❌ Invalid card ID or card not found', 1;
                RETURN;
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.Calendar WHERE calendar_date = @travel_date)
            BEGIN
                THROW 60001, 'Calendar date not found', 1;
                RETURN;
            END

            SELECT @is_weekend_or_holiday = CASE WHEN is_weekend = 1 OR is_holiday = 1 THEN 1 ELSE 0 END
            FROM dbo.Calendar WHERE calendar_date = @travel_date;

            -- Check various fare rules in priority order
            EXEC dbo.usp_CheckFree2HourTransfer @card_id, @trip_id, @touch_on_time, @result OUTPUT;
            IF @result IS NOT NULL BEGIN SET @OUT_fare_type = @result; RETURN; END

            EXEC dbo.usp_CheckMykiPass @card_id, @result OUTPUT;
            IF @result IS NOT NULL BEGIN SET @OUT_fare_type = @result; RETURN; END

            IF @card_type = 'senior' AND @is_weekend_or_holiday = 1
            BEGIN
                SET @OUT_fare_type = 'free_senior';
                RETURN;
            END

            EXEC dbo.usp_DetermineZoneType 
                @touch_on_stop_station_id, @touch_off_stop_station_id,
                @touch_on_zone OUTPUT, @touch_off_zone OUTPUT, @OUT_zone_type OUTPUT;

            EXEC dbo.usp_CheckDailyCap 
                @card_id, @card_type, @OUT_zone_type, @is_weekend_or_holiday,
                @OUT_fare_type OUTPUT, @OUT_daily_cap_used OUTPUT, @OUT_daily_cap_limit OUTPUT;

            IF @OUT_fare_type IS NOT NULL RETURN;

            EXEC dbo.usp_DetermineDefaultFare
                @card_type, @OUT_zone_type, @is_weekend_or_holiday, @OUT_fare_type OUTPUT;
        END;
        GO

        -- ============================================================================
        -- PROCEDURE: usp_CheckFree2HourTransfer
        -- PURPOSE  : Applies free fare if previous paid trip was within 2 hours.
        -- ============================================================================
        CREATE OR ALTER PROCEDURE usp_CheckFree2HourTransfer
            @card_id INT,
            @trip_id INT,
            @current_touch_on_time DATETIME2(0),
            @OUT_fare_type VARCHAR(20) OUTPUT
        WITH EXECUTE AS CALLER
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            DECLARE @ref_time DATETIME2(0);

            SELECT TOP 1 @ref_time = touch_off_time
            FROM dbo.Trip
            WHERE card_id = @card_id
            AND touch_off_time IS NOT NULL
            AND trip_id <> @trip_id
            AND (fare_type IS NULL OR LEFT(fare_type, 5) <> 'free_')
            ORDER BY touch_off_time DESC;

            IF @ref_time IS NOT NULL AND DATEDIFF(MINUTE, @ref_time, @current_touch_on_time) <= 120
                SET @OUT_fare_type = 'free_2hours';
            ELSE
                SET @OUT_fare_type = NULL;
        END;
        GO

        -- ============================================================================
        -- PROCEDURE: usp_CheckMykiPass
        -- PURPOSE  : Returns 'free_mykipass' if card currently has a pass assigned.
        -- ============================================================================
        CREATE OR ALTER PROCEDURE usp_CheckMykiPass
            @card_id INT,
            @OUT_fare_type VARCHAR(20) OUTPUT
        WITH EXECUTE AS CALLER
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            DECLARE @pass_id INT;

            SELECT @pass_id = pass_id FROM dbo.MykiCard WHERE card_id = @card_id;

            IF @pass_id IS NOT NULL
                SET @OUT_fare_type = 'free_mykipass';
            ELSE
                SET @OUT_fare_type = NULL;
        END;
        GO

        -- ============================================================================
        -- PROCEDURE: usp_DetermineZoneType
        -- PURPOSE  : Resolves the zone type based on start and end stop stations.
        -- ============================================================================
        CREATE OR ALTER PROCEDURE usp_DetermineZoneType
            @touch_on_stop_station_id INT,
            @touch_off_stop_station_id INT,
            @OUT_touch_on_zone VARCHAR(50) OUTPUT,
            @OUT_touch_off_zone VARCHAR(50) OUTPUT,
            @OUT_zone_type VARCHAR(20) OUTPUT
        WITH EXECUTE AS CALLER
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            SELECT @OUT_touch_on_zone = zone FROM dbo.StopStation WHERE stop_station_id = @touch_on_stop_station_id;
            SELECT @OUT_touch_off_zone = zone FROM dbo.StopStation WHERE stop_station_id = @touch_off_stop_station_id;

            IF (@OUT_touch_on_zone = 'zone2' OR @OUT_touch_on_zone = 'zone1+zone2') 
            AND (@OUT_touch_off_zone = 'zone2' OR @OUT_touch_off_zone = 'zone1+zone2')
                SET @OUT_zone_type = 'zone2_only';
            ELSE
                SET @OUT_zone_type = 'zone1_default';
        END;
        GO

        -- ============================================================================
        -- PROCEDURE: usp_CheckDailyCap
        -- PURPOSE  : Applies free fare if daily cap already reached for zone/type
        -- ============================================================================
        CREATE OR ALTER PROCEDURE usp_CheckDailyCap
            @card_id INT,
            @card_type VARCHAR(20),
            @zone_type VARCHAR(20),
            @is_weekend_or_holiday BIT,
            @OUT_fare_type VARCHAR(20) OUTPUT,
            @OUT_daily_cap_used DECIMAL(10,2) = NULL OUTPUT,
            @OUT_daily_cap_limit DECIMAL(10,2) = NULL OUTPUT
        WITH EXECUTE AS CALLER
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            SELECT @OUT_daily_cap_used = daily_cap FROM dbo.MykiCard WHERE card_id = @card_id;

            IF @zone_type = 'zone2_only'
            BEGIN
                IF @is_weekend_or_holiday = 1
                BEGIN
                    SET @OUT_daily_cap_limit = 0;
                    SET @OUT_fare_type = 'free_weekend_zone2';
                    RETURN;
                END
                ELSE
                    SET @OUT_daily_cap_limit = CASE WHEN @card_type = 'full-fare' THEN 7.00 ELSE 3.50 END;
            END
            ELSE
            BEGIN
                IF @is_weekend_or_holiday = 1
                    SET @OUT_daily_cap_limit = CASE WHEN @card_type = 'full-fare' THEN 7.60 ELSE 3.80 END;
                ELSE
                    SET @OUT_daily_cap_limit = CASE WHEN @card_type = 'full-fare' THEN 11.00 ELSE 5.50 END;
            END

            IF @OUT_daily_cap_used >= @OUT_daily_cap_limit
                SET @OUT_fare_type = 'free_dailycap';
            ELSE
                SET @OUT_fare_type = NULL;
        END;
        GO

        -- ============================================================================
        -- PROCEDURE: usp_DetermineDefaultFare
        -- PURPOSE  : Assigns default fare type based on card type, zone, and day type.
        -- ============================================================================
        CREATE OR ALTER PROCEDURE usp_DetermineDefaultFare
            @card_type VARCHAR(20),
            @zone_type VARCHAR(20),
            @is_weekend_or_holiday BIT,
            @OUT_fare_type VARCHAR(20) OUTPUT
        WITH EXECUTE AS CALLER
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            IF @zone_type = 'zone2_only'
                SET @OUT_fare_type = CASE WHEN @card_type = 'full-fare' THEN 'default_zone2' ELSE 'concession_zone2' END;
            ELSE
            BEGIN
                IF @card_type = 'full-fare'
                    SET @OUT_fare_type = CASE WHEN @is_weekend_or_holiday = 1 THEN 'default_weekend' ELSE 'default_fare' END;
                ELSE
                    SET @OUT_fare_type = CASE WHEN @is_weekend_or_holiday = 1 THEN 'concession_weekend' ELSE 'concession' END;
            END
        END;
        GO

-----------Substep 2-2 (touch-off) - Create a transcation record   ------------

    /*============================================================================
    PROCEDURE : usp_CreateCardTransactionFromTripFare
    PURPOSE   : Based on a completed Trip, this procedure calculates the fare
                and inserts a corresponding record into CardTransaction.
                - Applies daily cap logic (charges only the remaining amount)
                - If fare_type indicates a free trip, amount is 0, transaction_type = 'free'
                - Otherwise transaction_type = 'deduction'
    PARAMETERS:
        @card_id             INT            – Card ID
        @trip_id             INT            – Primary key of the trip
        @scanner_id          INT            – Scanner used for touch-off
        @fare_type           VARCHAR(20)    – Fare type determined earlier
        @daily_cap_used      DECIMAL(10,2)  – Amount already spent today
        @daily_cap_limit     DECIMAL(10,2)  – Cap limit for today
        @touch_off_time      DATETIME2(0)   – Time of touch-off
    OUTPUT:
        @final_amount        DECIMAL(10,2) OUTPUT – Final charge (0 if free)
        @OUT_transaction_type VARCHAR(20)  OUTPUT – Transaction type: 'free' or 'deduction'
    ==============================================================================*/
    CREATE OR ALTER PROCEDURE dbo.usp_CreateCardTransactionFromTripFare
        @card_id             INT,
        @trip_id             INT,
        @scanner_id          INT,
        @fare_type           VARCHAR(20),
        @daily_cap_used      DECIMAL(10,2),
        @daily_cap_limit     DECIMAL(10,2),
        @touch_off_time      DATETIME2(0), 
        @final_amount        DECIMAL(10,2) OUTPUT,
        @OUT_transaction_type VARCHAR(20) OUTPUT
    WITH EXECUTE AS CALLER
    AS
    BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT ON;

        -- Step 1: Validate parameters
        IF @card_id IS NULL OR @trip_id IS NULL OR @scanner_id IS NULL 
        OR @fare_type IS NULL OR @touch_off_time IS NULL
        BEGIN
            THROW 51000, '❌ Input parameters must not be NULL', 1;
            RETURN;
        END

        -- Step 2: Map fare_type to base fare amount
        DECLARE @base_fare DECIMAL(10,2);
        SET @base_fare =
            CASE LOWER(@fare_type)
                WHEN 'default_fare'        THEN 5.50
                WHEN 'default_weekend'     THEN 5.50
                WHEN 'default_zone2'       THEN 3.50
                WHEN 'concession'          THEN 2.75
                WHEN 'concession_weekend'  THEN 2.75
                WHEN 'concession_zone2'    THEN 1.75
                ELSE 0.00
            END;

        -- Step 3: Apply daily cap if needed
        IF @base_fare > 0
        BEGIN
            SET @final_amount = 
                CASE 
                    WHEN @base_fare + @daily_cap_used > @daily_cap_limit 
                        THEN @daily_cap_limit - @daily_cap_used
                    ELSE @base_fare 
                END;
        END
        ELSE
        BEGIN
            SET @final_amount = 0.00;
        END

        -- Step 4: Determine transaction type
        DECLARE @txn_type VARCHAR(20) =
            CASE WHEN @final_amount = 0 THEN 'free' ELSE 'deduction' END;

        -- Step 5: Insert into CardTransaction table
        INSERT INTO dbo.CardTransaction (
            card_id, trip_id, touch_off_time, scanner_id, amount, [timestamp], transaction_type
        )
        VALUES (
            @card_id, @trip_id, @touch_off_time, @scanner_id, @final_amount, SYSUTCDATETIME(), @txn_type
        );

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 51001, '❌ Failed to insert into CardTransaction', 1;
            RETURN;
        END

        -- Step 6: Return outputs
        SET @OUT_transaction_type = @txn_type;
        SET @final_amount = @final_amount;

        PRINT CONCAT('✅ CardTransaction created, amount = ', @final_amount);
    END;
    GO

-----------Substep 2-3 (touch-off) - Update MykiCard table new balance and used daily cap   ------------
    /*==============================================================================
    PROCEDURE: usp_UpdateMykiBalance
    PURPOSE  : Adjusts MykiCard.balance based on a transaction type:
                • 'free'      → no change, just return balance
                • 'deduction' → subtract from balance and add to daily cap
                • 'top-up'    → add to balance
                • 'refund'    → add to balance
    PARAMETERS:
        @card_id            INT             – Card to update
        @amount             DECIMAL(10,2)   – Amount to apply
        @transaction_type   VARCHAR(20)     – Transaction type: 'deduction', 'top-up', 'refund', 'free'
    OUTPUT:
        @OUT_new_balance    DECIMAL(10,2) OUTPUT – Balance after adjustment
    ==============================================================================*/
    CREATE OR ALTER PROCEDURE dbo.usp_UpdateMykiBalance
        @card_id            INT,
        @amount             DECIMAL(10,2),
        @transaction_type   VARCHAR(20),
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

        -- Case: 'free' → return current balance without mutation
        IF LOWER(@transaction_type) = 'free'
        BEGIN
            SELECT @OUT_new_balance = balance
            FROM dbo.MykiCard
            WHERE card_id = @card_id;

            IF @OUT_new_balance IS NULL
                THROW 52004, 'Card not found.', 1;

            RETURN;
        END;

        -- Use a table variable to capture OUTPUT from UPDATE
        DECLARE @t TABLE (balance DECIMAL(10,2));

        -- Case: 'deduction' → subtract amount, add to daily_cap
        IF LOWER(@transaction_type) = 'deduction'
        BEGIN
            UPDATE dbo.MykiCard
            SET balance = balance - @amount,
                daily_cap = daily_cap + @amount
            OUTPUT INSERTED.balance INTO @t(balance)
            WHERE card_id = @card_id;
        END
        -- Case: 'top-up' or 'refund' → add amount
        ELSE IF LOWER(@transaction_type) IN ('top-up','refund')
        BEGIN
            UPDATE dbo.MykiCard
            SET balance = balance + @amount
            OUTPUT INSERTED.balance INTO @t(balance)
            WHERE card_id = @card_id;
        END
        ELSE
            THROW 52002, 'Unsupported transaction_type.', 1;

        -- Output result
        SELECT TOP (1) @OUT_new_balance = balance FROM @t;

        IF @OUT_new_balance IS NULL
            THROW 52003, 'Balance update failed or card not found.', 1;
    END;
    GO


-----------Substep 2-4 (auto touch-off) - Auto touch-off for those who forgot touch off   ------------

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













