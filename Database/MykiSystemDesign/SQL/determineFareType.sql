-- =============================================
-- Fare Type Determination - Main Stored Procedure
-- =============================================
CREATE OR ALTER PROCEDURE sp_DetermineFareType
    @card_id INT,
    @touch_on_time DATETIME2(0),
    @touch_on_stop_station_id INT,
    @touch_off_time DATETIME2(0),
    @touch_off_stop_station_id INT,
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    -- Parameter validation
    IF @card_id IS NULL OR @touch_on_time IS NULL OR @touch_on_stop_station_id IS NULL 
       OR @touch_off_time IS NULL OR @touch_off_stop_station_id IS NULL
    BEGIN
        THROW 50000, '❌ Required parameters cannot be NULL', 1;
        RETURN;
    END
    
    DECLARE @result VARCHAR(20);
    
    -- Check for free 2-hour transfer
    EXEC dbo.fn_CheckFree2HourTransfer @card_id, @touch_on_time, @result OUTPUT;
    IF @result IS NOT NULL
    BEGIN
        SET @OUT_fare_type = @result;
        RETURN;
    END
    
    -- Check for active Myki Pass
    EXEC dbo.fn_CheckMykiPass @card_id, @result OUTPUT;
    IF @result IS NOT NULL
    BEGIN
        SET @OUT_fare_type = @result;
        RETURN;
    END
    
    -- Check for senior free travel on weekends/holidays
    DECLARE @card_type VARCHAR(20);
    SELECT @card_type = card_type FROM dbo.MykiCard WHERE card_id = @card_id;
    
    IF @card_type = 'senior'
    BEGIN
        EXEC dbo.fn_CheckSeniorFreeTravel @touch_on_time, @result OUTPUT;
        IF @result IS NOT NULL
        BEGIN
            SET @OUT_fare_type = @result;
            RETURN;
        END
    END
    
    -- Get zone information
    DECLARE @touch_on_zone VARCHAR(50), @touch_off_zone VARCHAR(50), @zone_type VARCHAR(20);
    EXEC dbo.fn_DetermineZoneType 
        @touch_on_stop_station_id, 
        @touch_off_stop_station_id, 
        @touch_on_zone OUTPUT, 
        @touch_off_zone OUTPUT,
        @zone_type OUTPUT;
    
    -- Check for daily cap reached
    EXEC dbo.fn_CheckDailyCap 
        @card_id, 
        @touch_on_time, 
        @card_type,
        @zone_type,
        @result OUTPUT;
    
    IF @result IS NOT NULL
    BEGIN
        SET @OUT_fare_type = @result;
        RETURN;
    END
    
    -- If no free conditions met, determine default fare type
    EXEC dbo.fn_DetermineDefaultFare 
        @card_type, 
        @touch_on_time,
        @zone_type,
        @result OUTPUT;
    
    SET @OUT_fare_type = @result;
END;
GO

-- =============================================
-- Function: Check for Free 2-Hour Transfer
-- Purpose: Determines if this trip qualifies for free travel within 2 hours of previous trip
-- =============================================
CREATE OR ALTER PROCEDURE fn_CheckFree2HourTransfer
    @card_id INT,
    @current_touch_on_time DATETIME2(0),
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @last_touch_off_time DATETIME2(0);
    
    -- Get the most recent touch-off time for this card
    SELECT TOP 1 @last_touch_off_time = touch_off_time
    FROM dbo.Trip
    WHERE card_id = @card_id
      AND touch_off_time IS NOT NULL
    ORDER BY touch_off_time DESC;
    
    -- Check if current touch-on is within 2 hours of last touch-off
    IF @last_touch_off_time IS NOT NULL AND 
       DATEDIFF(MINUTE, @last_touch_off_time, @current_touch_on_time) <= 120
    BEGIN
        SET @OUT_fare_type = 'free_2hours';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL; -- Not eligible for free 2-hour transfer
    END
END;
GO

-- =============================================
-- Function: Check for Active Myki Pass
-- Purpose: Determines if the card has an active Myki Pass
-- =============================================
CREATE OR ALTER PROCEDURE fn_CheckMykiPass
    @card_id INT,
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @pass_id INT;
    
    -- Check if card has an active pass
    SELECT @pass_id = pass_id
    FROM dbo.MykiCard
    WHERE card_id = @card_id;
    
    IF @pass_id IS NOT NULL
    BEGIN
        SET @OUT_fare_type = 'free_mykipass';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL; -- No active Myki Pass
    END
END;
GO

-- =============================================
-- Function: Check for Senior Free Travel
-- Purpose: Determines if a senior card qualifies for free travel on weekends/holidays
-- =============================================
CREATE OR ALTER PROCEDURE fn_CheckSeniorFreeTravel
    @touch_on_time DATETIME2(0),
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @travel_date DATE = CAST(@touch_on_time AS DATE);
    DECLARE @is_weekend_or_holiday BIT = 0;
    
    -- Check if the travel date is a weekend or holiday using Calendar
    SELECT @is_weekend_or_holiday = CASE WHEN is_weekend = 1 OR is_holiday = 1 THEN 1 ELSE 0 END
    FROM dbo.Calendar
    WHERE calendar_date = @travel_date;
    
    -- Free travel for seniors on weekends OR public holidays
    IF @is_weekend_or_holiday = 1
    BEGIN
        SET @OUT_fare_type = 'free_senior';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL; -- Not eligible for free senior travel
    END
END;
GO

-- =============================================
-- Function: Determine Zone Type
-- Purpose: Gets zone information for both stops and determines zone movement type
-- =============================================
CREATE OR ALTER PROCEDURE fn_DetermineZoneType
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
    
    -- Get zone information for both stops
    SELECT @OUT_touch_on_zone = zone
    FROM dbo.StopStation
    WHERE stop_station_id = @touch_on_stop_station_id;
    
    SELECT @OUT_touch_off_zone = zone
    FROM dbo.StopStation
    WHERE stop_station_id = @touch_off_stop_station_id;
    
    -- Determine zone type
    -- zone_type can be:
    -- 'zone2_only' - Travel only within zone2 or zone1+zone2(overlap)
    -- 'zone1_default' - All other travel (within zone1 or crossing from zone1 to zone2)
    
    IF (@OUT_touch_on_zone = 'zone2' OR @OUT_touch_on_zone = 'zone1+zone2') 
       AND (@OUT_touch_off_zone = 'zone2' OR @OUT_touch_off_zone = 'zone1+zone2')
    BEGIN
        SET @OUT_zone_type = 'zone2_only';
    END
    ELSE
    BEGIN
        SET @OUT_zone_type = 'zone1_default';
    END
END;
GO

-- =============================================
-- Function: Check Daily Cap
-- Purpose: Determines if daily cap has been reached for the card
-- =============================================
CREATE OR ALTER PROCEDURE fn_CheckDailyCap
    @card_id INT,
    @touch_on_time DATETIME2(0),
    @card_type VARCHAR(20),
    @zone_type VARCHAR(20),
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    -- Get daily_cap value from MykiCard
    DECLARE @daily_cap_used INT;
    SELECT @daily_cap_used = daily_cap
    FROM dbo.MykiCard
    WHERE card_id = @card_id;
    
    -- Calculate appropriate daily cap based on card type, day of week, and zone
    DECLARE @daily_cap_limit DECIMAL(10,2);
    DECLARE @travel_date DATE = CAST(@touch_on_time AS DATE);
    DECLARE @is_weekend_or_holiday BIT = 0;
    
    -- Check if the travel date is a weekend or holiday using Calendar
    SELECT @is_weekend_or_holiday = CASE WHEN is_weekend = 1 OR is_holiday = 1 THEN 1 ELSE 0 END
    FROM dbo.Calendar
    WHERE calendar_date = @travel_date;
    
    -- Set daily cap limit based on rules
    IF @zone_type = 'zone2_only'
    BEGIN
        IF @is_weekend_or_holiday = 1
        BEGIN
            -- Weekend/holiday travel in zone2 is free for all card types
            SET @daily_cap_limit = 0; -- Free
            SET @OUT_fare_type = 'free_weekend_zone2';
            RETURN;
        END
        ELSE -- Weekday
        BEGIN
            IF @card_type = 'full-fare'
                SET @daily_cap_limit = 7.00;
            ELSE -- concession, child, senior
                SET @daily_cap_limit = 3.50;
        END
    END
    ELSE -- zone1_default
    BEGIN
        IF @is_weekend_or_holiday = 1
        BEGIN
            IF @card_type = 'full-fare'
                SET @daily_cap_limit = 7.60;
            ELSE -- concession, child, senior
                SET @daily_cap_limit = 3.80;
        END
        ELSE -- Weekday
        BEGIN
            IF @card_type = 'full-fare'
                SET @daily_cap_limit = 11.00;
            ELSE -- concession, child, senior
                SET @daily_cap_limit = 5.50;
        END
    END
    
    -- Check if daily cap is reached
    IF @daily_cap_used >= @daily_cap_limit
    BEGIN
        SET @OUT_fare_type = 'free_dailycap';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL; -- Daily cap not reached
    END
END;
GO

-- =============================================
-- Function: Determine Default Fare
-- Purpose: Determines the default fare type when no free conditions apply
-- =============================================
CREATE OR ALTER PROCEDURE fn_DetermineDefaultFare
    @card_type VARCHAR(20),
    @touch_on_time DATETIME2(0),
    @zone_type VARCHAR(20),
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @travel_date DATE = CAST(@touch_on_time AS DATE);
    DECLARE @is_weekend_or_holiday BIT = 0;
    
    -- Check if the travel date is a weekend or holiday using Calendar
    SELECT @is_weekend_or_holiday = CASE WHEN is_weekend = 1 OR is_holiday = 1 THEN 1 ELSE 0 END
    FROM dbo.Calendar
    WHERE calendar_date = @travel_date;
    
    -- Determine fare type based on card type, day of week, and zone
    IF @card_type = 'full-fare'
    BEGIN
        IF @is_weekend_or_holiday = 1
            SET @OUT_fare_type = 'default_weekend';
        ELSE
            SET @OUT_fare_type = 'default_fare';
    END
    ELSE -- concession, child, senior
    BEGIN
        IF @is_weekend_or_holiday = 1
            SET @OUT_fare_type = 'concession_weekend';
        ELSE
            SET @OUT_fare_type = 'concession';
    END
END;
GO

-- =============================================
-- Example Usage
-- =============================================
DECLARE @card_id INT = 123;
DECLARE @touch_on_time DATETIME2(0) = '2025-04-17 08:30:00';
DECLARE @touch_on_stop_station_id INT = 1;
DECLARE @touch_off_time DATETIME2(0) = '2025-04-17 09:00:00';
DECLARE @touch_off_stop_station_id INT = 5;
DECLARE @fare_type VARCHAR(20);

EXEC sp_DetermineFareType 
    @card_id = @card_id,
    @touch_on_time = @touch_on_time,
    @touch_on_stop_station_id = @touch_on_stop_station_id,
    @touch_off_time = @touch_off_time,
    @touch_off_stop_station_id = @touch_off_stop_station_id,
    @OUT_fare_type = @fare_type OUTPUT;

SELECT @fare_type AS DeterminedFareType;