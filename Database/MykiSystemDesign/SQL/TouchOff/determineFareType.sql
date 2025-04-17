-- =============================================
-- Fare Type Determination - Main Stored Procedure
-- =============================================
CREATE OR ALTER PROCEDURE usp_DetermineFareType
    @card_id INT,
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
    
    DECLARE @result VARCHAR(20);
    DECLARE @card_type VARCHAR(20);
    DECLARE @is_weekend_or_holiday BIT = 0;
    DECLARE @travel_date DATE = CAST(@touch_on_time AS DATE);
    DECLARE @touch_on_zone VARCHAR(50), @touch_off_zone VARCHAR(50);
    
    SELECT @card_type = card_type
    FROM dbo.MykiCard 
    WHERE card_id = @card_id;
    
    IF @card_type IS NULL
    BEGIN
        THROW 50001, '❌ Invalid card ID or card not found', 1;
        RETURN;
    END
    
    SELECT @is_weekend_or_holiday = CASE WHEN is_weekend = 1 OR is_holiday = 1 THEN 1 ELSE 0 END
    FROM dbo.Calendar
    WHERE calendar_date = @travel_date;
    
    EXEC dbo.usp_CheckFree2HourTransfer @card_id, @touch_on_time, @result OUTPUT;
    IF @result IS NOT NULL
    BEGIN
        SET @OUT_fare_type = @result;
        RETURN;
    END
    
    EXEC dbo.usp_CheckMykiPass @card_id, @result OUTPUT;
    IF @result IS NOT NULL
    BEGIN
        SET @OUT_fare_type = @result;
        RETURN;
    END
    
    IF @card_type = 'senior' AND @is_weekend_or_holiday = 1
    BEGIN
        SET @OUT_fare_type = 'free_senior';
        RETURN;
    END
    
    EXEC dbo.usp_DetermineZoneType 
        @touch_on_stop_station_id, 
        @touch_off_stop_station_id, 
        @touch_on_zone OUTPUT, 
        @touch_off_zone OUTPUT,
        @OUT_zone_type OUTPUT;
    
    EXEC dbo.usp_CheckDailyCap 
        @card_id, 
        @card_type,
        @OUT_zone_type,
        @is_weekend_or_holiday,
        @OUT_fare_type OUTPUT,
        @OUT_daily_cap_used OUTPUT,
        @OUT_daily_cap_limit OUTPUT;
    
    IF @OUT_fare_type IS NOT NULL
    BEGIN
        RETURN;
    END
    
    EXEC dbo.usp_DetermineDefaultFare
        @card_type,
        @OUT_zone_type,
        @is_weekend_or_holiday,
        @OUT_fare_type OUTPUT;
END;
GO

-- =============================================
-- Function: Check for Free 2-Hour Transfer
-- =============================================
CREATE OR ALTER PROCEDURE usp_CheckFree2HourTransfer
    @card_id INT,
    @current_touch_on_time DATETIME2(0),
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @last_touch_off_time DATETIME2(0);
    
    SELECT TOP 1 @last_touch_off_time = touch_off_time
    FROM dbo.Trip
    WHERE card_id = @card_id
      AND touch_off_time IS NOT NULL
    ORDER BY touch_off_time DESC;
    
    IF @last_touch_off_time IS NOT NULL AND 
       DATEDIFF(MINUTE, @last_touch_off_time, @current_touch_on_time) <= 120
    BEGIN
        SET @OUT_fare_type = 'free_2hours';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL;
    END
END;
GO

-- =============================================
-- Function: Check for Active Myki Pass
-- =============================================
CREATE OR ALTER PROCEDURE usp_CheckMykiPass
    @card_id INT,
    @OUT_fare_type VARCHAR(20) OUTPUT
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @pass_id INT;
    
    SELECT @pass_id = pass_id
    FROM dbo.MykiCard
    WHERE card_id = @card_id;
    
    IF @pass_id IS NOT NULL
    BEGIN
        SET @OUT_fare_type = 'free_mykipass';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL;
    END
END;
GO

-- =============================================
-- Function: Determine Zone Type
-- =============================================
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
    
    SELECT @OUT_touch_on_zone = zone
    FROM dbo.StopStation
    WHERE stop_station_id = @touch_on_stop_station_id;
    
    SELECT @OUT_touch_off_zone = zone
    FROM dbo.StopStation
    WHERE stop_station_id = @touch_off_stop_station_id;
    
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
-- =============================================
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
    
    SELECT @OUT_daily_cap_used = daily_cap
    FROM dbo.MykiCard
    WHERE card_id = @card_id;
    
    IF @zone_type = 'zone2_only'
    BEGIN
        IF @is_weekend_or_holiday = 1
        BEGIN
            SET @OUT_daily_cap_limit = 0;
            SET @OUT_fare_type = 'free_weekend_zone2';
            RETURN;
        END
        ELSE
        BEGIN
            IF @card_type = 'full-fare'
                SET @OUT_daily_cap_limit = 7.00;
            ELSE
                SET @OUT_daily_cap_limit = 3.50;
        END
    END
    ELSE
    BEGIN
        IF @is_weekend_or_holiday = 1
        BEGIN
            IF @card_type = 'full-fare'
                SET @OUT_daily_cap_limit = 7.60;
            ELSE
                SET @OUT_daily_cap_limit = 3.80;
        END
        ELSE
        BEGIN
            IF @card_type = 'full-fare'
                SET @OUT_daily_cap_limit = 11.00;
            ELSE
                SET @OUT_daily_cap_limit = 5.50;
        END
    END
    
    IF @OUT_daily_cap_used >= @OUT_daily_cap_limit
    BEGIN
        SET @OUT_fare_type = 'free_dailycap';
    END
    ELSE
    BEGIN
        SET @OUT_fare_type = NULL;
    END
END;
GO

-- =============================================
-- Function: Determine Default Fare
-- =============================================
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
    BEGIN
        IF @card_type = 'full-fare'
            SET @OUT_fare_type = 'default_zone2';
        ELSE
            SET @OUT_fare_type = 'concession_zone2';
    END
    ELSE
    BEGIN
        IF @card_type = 'full-fare'
        BEGIN
            IF @is_weekend_or_holiday = 1
                SET @OUT_fare_type = 'default_weekend';
            ELSE
                SET @OUT_fare_type = 'default_fare';
        END
        ELSE
        BEGIN
            IF @is_weekend_or_holiday = 1
                SET @OUT_fare_type = 'concession_weekend';
            ELSE
                SET @OUT_fare_type = 'concession';
        END
    END
END;
GO
