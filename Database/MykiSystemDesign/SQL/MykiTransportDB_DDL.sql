-----------------------------------------------------
-- 0) CardType Lookup Table
-----------------------------------------------------
CREATE TABLE CardType (
    card_type   VARCHAR(20)   PRIMARY KEY,
    description VARCHAR(100)  NULL  -- Description for the card type
);
GO

-----------------------------------------------------
-- 0) FareType Lookup Table
-----------------------------------------------------
CREATE TABLE FareType (
    fare_type   VARCHAR(20)   PRIMARY KEY,
    description VARCHAR(100)  NULL  -- For example: default_fare, concession_fare, free_2hours, etc.
);
GO

-----------------------------------------------------
-- 1) MykiPass Table
-----------------------------------------------------
CREATE TABLE MykiPass (
    pass_id     INT           IDENTITY(1,1),
    start_date  DATE          NOT NULL,
    expiry_date DATE          NOT NULL,
    expired     BIT           DEFAULT 0,

    CONSTRAINT PK_MykiPass PRIMARY KEY CLUSTERED (expiry_date, pass_id)
        ON ps_Yearly(expiry_date)
)
ON ps_Yearly(expiry_date);
GO

-- Create a unique index for FK use (must include the partition key)
CREATE UNIQUE NONCLUSTERED INDEX IX_MykiPass_PassID
ON MykiPass (pass_id, expiry_date);
GO

-----------------------------------------------------
-- 3) MykiCard Table
-----------------------------------------------------
CREATE TABLE MykiCard (
    card_id             INT             IDENTITY(1,1) PRIMARY KEY,
    balance             DECIMAL(10,2)   NOT NULL 
                        CONSTRAINT CK_MykiCard_Balance CHECK (balance >= -10),
    customer_id         INT             NULL,
    card_type           VARCHAR(20)     NOT NULL,
    pass_id             INT             NULL,
    pass_expiry_date    DATE,
    daily_cap           INT             DEFAULT 0,
    status              BIT             DEFAULT 0,
    expiry_date         DATE,

    CONSTRAINT FK_MykiCard_Customer 
        FOREIGN KEY (customer_id) REFERENCES CustomerAuth(customer_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_MykiCard_CardType
        FOREIGN KEY (card_type) REFERENCES CardType(card_type),

    CONSTRAINT FK_MykiCard_Pass
        FOREIGN KEY (pass_id, pass_expiry_date)
        REFERENCES MykiPass(pass_id, expiry_date)
);
GO


-----------------------------------------------------
-- 4) DeviceLocation Table
-----------------------------------------------------
CREATE TABLE DeviceLocation (
    device_location_id       INT            IDENTITY(1,1) PRIMARY KEY,
    vehicle_id               INT            NULL,
    stop_station_id          INT            NULL,
    location_type            VARCHAR(20)    NOT NULL,
    current_stop_station_id  INT            NULL,
    CONSTRAINT CK_DeviceLocation_VehicleStopStation_XOR
        CHECK (
            (vehicle_id IS NOT NULL AND stop_station_id IS NULL)
         OR (vehicle_id IS NULL AND stop_station_id IS NOT NULL)
        )
);
GO

-----------------------------------------------------
-- 5) Scanner Table
-----------------------------------------------------
CREATE TABLE Scanner (
    scanner_id           INT            IDENTITY(1,1) PRIMARY KEY,
    device_location_id   INT            NOT NULL,
    CONSTRAINT FK_Scanner_DeviceLocation 
        FOREIGN KEY (device_location_id) REFERENCES DeviceLocation(device_location_id)
);
GO

-----------------------------------------------------
-- 6) Trip Table
-----------------------------------------------------
CREATE TABLE Trip (
    trip_id                    INT            IDENTITY(1,1),
    card_id                    INT            NOT NULL,
    touch_on_time              DATETIME2(0)   NOT NULL,
    touch_on_scanner_id        INT,
    touch_on_stop_station_id   INT,
    touch_off_time             DATETIME2(0),
    touch_off_scanner_id       INT,
    touch_off_stop_station_id  INT,
    fare_type                  VARCHAR(20),

    CONSTRAINT PK_Trip PRIMARY KEY CLUSTERED (touch_on_time, trip_id)
        ON ps_Monthly(touch_on_time),

    CONSTRAINT FK_Trip_Card 
        FOREIGN KEY (card_id) REFERENCES MykiCard(card_id) ON DELETE CASCADE,
    CONSTRAINT FK_Trip_TouchOnScanner 
        FOREIGN KEY (touch_on_scanner_id) REFERENCES Scanner(scanner_id),
    CONSTRAINT FK_Trip_TouchOffScanner 
        FOREIGN KEY (touch_off_scanner_id) REFERENCES Scanner(scanner_id),
    CONSTRAINT FK_Trip_FareType
        FOREIGN KEY (fare_type) REFERENCES FareType(fare_type)
)
ON ps_Monthly(touch_on_time);
GO

-----------------------------------------------------
-- 7) CardTransaction Table
-----------------------------------------------------
CREATE TABLE CardTransaction (
    transaction_id   INT            IDENTITY(1,1),
    card_id          INT            NOT NULL,
    trip_id          INT            NULL,
    touch_on_time    DATETIME2(0),
    scanner_id       INT            NULL,
    amount           DECIMAL(10,2)  NOT NULL DEFAULT 0 
                                      CONSTRAINT CK_CardTransaction_Amount CHECK (amount > 0),
    [timestamp]      DATETIME2(0)   NOT NULL DEFAULT GETDATE(),
    transaction_type VARCHAR(20)    NOT NULL 
                                      CONSTRAINT CK_CardTransaction_Type CHECK (transaction_type IN ('deduction','top-up','refund', 'free')),

    CONSTRAINT PK_CardTransaction PRIMARY KEY CLUSTERED ([timestamp], transaction_id)
        ON ps_Monthly([timestamp]),

    CONSTRAINT FK_CardTransaction_Card
        FOREIGN KEY (card_id) REFERENCES MykiCard(card_id) ON DELETE CASCADE,

    CONSTRAINT FK_CardTransaction_Trip
        FOREIGN KEY (touch_on_time, trip_id ) REFERENCES Trip(touch_on_time, trip_id ),

    CONSTRAINT FK_CardTransaction_Scanner
        FOREIGN KEY (scanner_id) REFERENCES Scanner(scanner_id)
)
ON ps_Monthly([timestamp]);
GO

-----------------------------------------------------
-- 8) Calendar Table
-----------------------------------------------------
CREATE TABLE Calendar (
    calendar_date     DATE           NOT NULL,
    is_weekend        BIT            NOT NULL 
                                        CONSTRAINT CK_Calendar_IsWeekend CHECK (is_weekend IN (0, 1)),
    is_holiday        BIT            NOT NULL DEFAULT 0
                                        CONSTRAINT CK_Calendar_IsHoliday CHECK (is_holiday IN (0, 1)),
    holiday_name      VARCHAR(100)   NULL,
    day_of_week       VARCHAR(10)    NOT NULL,
    year              INT            NOT NULL
                                        CONSTRAINT CK_Calendar_Year CHECK (year >= 2000),
    month             INT            NOT NULL
                                        CONSTRAINT CK_Calendar_Month CHECK (month BETWEEN 1 AND 12),
    day_of_month      INT            NOT NULL
                                        CONSTRAINT CK_Calendar_DayOfMonth CHECK (day_of_month BETWEEN 1 AND 31),

    CONSTRAINT PK_Calendar PRIMARY KEY CLUSTERED (calendar_date)
        ON ps_Yearly(calendar_date)
)
ON ps_Yearly(calendar_date);
GO

------------------------------------------------------
-- B) Green Section: Routes, Stations, Scheduling, and Vehicles
------------------------------------------------------

-- 1) StopStation Table
CREATE TABLE StopStation (
    stop_station_id INT          IDENTITY(1,1) PRIMARY KEY,
    station_name    VARCHAR(100) NOT NULL,
    zone            VARCHAR(50)  NULL,         -- Example: zone1, zone2, zone1+zone2 (overlap)
    geo_point       GEOGRAPHY     NULL         -- Stores geographic coordinates; alternatively VARCHAR(200)
);
GO

-- 2) Route Table
CREATE TABLE Route (
    route_id            INT            IDENTITY(1,1) PRIMARY KEY,
    route_name          VARCHAR(100)   NOT NULL,
    start_time_of_day   TIME           NOT NULL,  -- Daily scheduled departure time
    last_run_time       DATETIME2(0)   NULL       -- Optional: last actual run time
);
GO

-- 3) RouteStop Table
CREATE TABLE RouteStop (
    route_id               INT            NOT NULL,
    stop_station_id        INT            NOT NULL,
    direction              VARCHAR(20)    NOT NULL,  -- 'inbound' or 'outbound'
    scheduled_arrive_time  DATETIME2(0)   NULL,
    PRIMARY KEY (route_id, stop_station_id, direction),
    CONSTRAINT FK_RouteStop_Route FOREIGN KEY (route_id) REFERENCES Route(route_id),
    CONSTRAINT FK_RouteStop_StopStation FOREIGN KEY (stop_station_id) REFERENCES StopStation(stop_station_id)
);
GO

-- 4) VehicleType Lookup Table
CREATE TABLE VehicleType (
    vehicle_type    VARCHAR(50)  PRIMARY KEY,
    description     VARCHAR(200) NULL
);
GO

-- 5) Vehicle Table
CREATE TABLE Vehicle (
    vehicle_id         INT            IDENTITY(1,1) PRIMARY KEY,
    vehicle_type       VARCHAR(50)    NOT NULL,
    CONSTRAINT FK_Vehicle_VehicleType
        FOREIGN KEY (vehicle_type) REFERENCES VehicleType(vehicle_type)
);
GO

-- 6) VehicleRun Table
-- Records each scheduled or real-time vehicle run
CREATE TABLE VehicleRun (
    run_id     INT            IDENTITY(1,1) PRIMARY KEY,
    vehicle_id INT            NOT NULL,
    route_id   INT            NOT NULL,
    direction  VARCHAR(20)    NOT NULL,  -- 'inbound' or 'outbound'
    start_time DATETIME2(0)   NOT NULL,
    CONSTRAINT FK_VehicleRun_Vehicle
        FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    CONSTRAINT FK_VehicleRun_Route
        FOREIGN KEY (route_id) REFERENCES Route(route_id)
);
GO

-- 7) VehicleRealTimeLog Table
-- Captures real-time GPS data from vehicles
CREATE TABLE VehicleRealTimeLog (
    vehicle_realtime_log_id INT            IDENTITY(1,1),
    vehicle_id              INT            NOT NULL,
    latitude                DECIMAL(9,6)   NOT NULL,
    longitude               DECIMAL(9,6)   NOT NULL,
    speed                   DECIMAL(10,2)  NULL,
    log_timestamp           DATETIME2(0)   NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_VehicleRealTimeLog PRIMARY KEY CLUSTERED (log_timestamp, vehicle_realtime_log_id)
        ON ps_Monthly(log_timestamp),

    CONSTRAINT FK_VehicleRealTimeLog_Vehicle
        FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
)
ON ps_Monthly(log_timestamp);
GO

-- 8) VehicleStopLog Table
-- Associates vehicle log entries with the nearest stop station
CREATE TABLE VehicleStopLog (
    vehicle_stop_log_id     INT            IDENTITY(1,1),
    vehicle_id              INT            NOT NULL,
    stop_station_id         INT            NOT NULL,
    update_timestamp        DATETIME2(0)   NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_VehicleStopLog PRIMARY KEY CLUSTERED (update_timestamp, vehicle_stop_log_id)
        ON ps_Monthly(update_timestamp),

    CONSTRAINT FK_VehicleStopLog_Vehicle
        FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),

    CONSTRAINT FK_VehicleStopLog_StopStation
        FOREIGN KEY (stop_station_id) REFERENCES StopStation(stop_station_id)
)
ON ps_Monthly(update_timestamp);
GO


-- ------------------------------------------------------
-- -- Clean-Up Script: Drop All Foreign Keys and Tables
-- ------------------------------------------------------

-- -- Step 1: Temporarily disable all foreign key checks to avoid cyclic dependency issues
-- EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";

-- -- Step 2: Drop all foreign keys from the schema
-- DECLARE @sql NVARCHAR(MAX) = '';

-- SELECT @sql += 'ALTER TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) +
--                ' DROP CONSTRAINT ' + QUOTENAME(fk.name) + ';' + CHAR(13)
-- FROM sys.foreign_keys fk
-- JOIN sys.tables t ON fk.parent_object_id = t.object_id
-- JOIN sys.schemas s ON t.schema_id = s.schema_id;

-- EXEC (@sql);

-- -- Step 3: Drop all tables in reverse dependency order
-- SET @sql = '';
-- SELECT @sql += 'DROP TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ';' + CHAR(13)
-- FROM sys.tables t
-- JOIN sys.schemas s ON t.schema_id = s.schema_id
-- ORDER BY t.name DESC;

-- EXEC (@sql);
