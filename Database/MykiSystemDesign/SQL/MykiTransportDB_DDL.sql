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
    pass_id     INT           IDENTITY(1,1) PRIMARY KEY,
    start_date  DATE          NOT NULL,
    expiry_date DATE          NOT NULL,
    expired     BIT           DEFAULT 0   -- 0: Not expired, 1: Expired
);
GO

-----------------------------------------------------
-- 2) CustomerAccount Table
-----------------------------------------------------
CREATE TABLE CustomerAccount (
    customer_id   INT            IDENTITY(1,1) PRIMARY KEY,
    full_name     VARCHAR(100)   NOT NULL,
    email         VARCHAR(100)   NOT NULL UNIQUE,
    phone_num     VARCHAR(20),
    address       VARCHAR(200),
    dob           DATE,
    regs_date     DATE           DEFAULT GETDATE(),
    acc_status    VARCHAR(20)    DEFAULT 'active',
    password_hash VARCHAR(256)   NOT NULL
);
GO

-----------------------------------------------------
-- 3) MykiCard Table
-----------------------------------------------------
CREATE TABLE MykiCard (
    card_id      INT             IDENTITY(1,1) PRIMARY KEY,
    balance      DECIMAL(10,2)   NOT NULL 
                                 CONSTRAINT CK_MykiCard_Balance CHECK (balance >= 0),
    customer_id  INT             NOT NULL,
    card_type    VARCHAR(20)     NOT NULL,
    pass_id      INT             NULL,
    daily_cap    INT             DEFAULT 0,
    status       BIT             DEFAULT 0,
    expiry_date  DATE,
    CONSTRAINT FK_MykiCard_Customer 
        FOREIGN KEY (customer_id) REFERENCES CustomerAccount(customer_id)
        ON DELETE CASCADE,
    CONSTRAINT FK_MykiCard_CardType
        FOREIGN KEY (card_type) REFERENCES CardType(card_type),
    CONSTRAINT FK_MykiCard_Pass
        FOREIGN KEY (pass_id) REFERENCES MykiPass(pass_id)
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
    trip_id                    INT            IDENTITY(1,1) PRIMARY KEY,
    card_id                    INT            NOT NULL,
    touch_on_time              DATETIME2(0)   NOT NULL,  -- Precise to the second
    touch_on_scanner_id        INT,
    touch_on_stop_station_id   INT,             -- For on-board tap-on; can be inferred from VehicleStopLog
    touch_off_time             DATETIME2(0)   NULL,  -- Precise to the second
    touch_off_scanner_id       INT,
    touch_off_stop_station_id  INT,
    fare_type                  VARCHAR(20),    -- Fare type (refer to FareType)
    
    CONSTRAINT FK_Trip_Card 
        FOREIGN KEY (card_id) REFERENCES MykiCard(card_id)
        ON DELETE CASCADE,
    CONSTRAINT FK_Trip_TouchOnScanner 
        FOREIGN KEY (touch_on_scanner_id) REFERENCES Scanner(scanner_id),
    CONSTRAINT FK_Trip_TouchOffScanner 
        FOREIGN KEY (touch_off_scanner_id) REFERENCES Scanner(scanner_id),
    CONSTRAINT FK_Trip_FareType
        FOREIGN KEY (fare_type) REFERENCES FareType(fare_type)
);
GO

-----------------------------------------------------
-- 7) CardTransaction Table
-----------------------------------------------------
CREATE TABLE CardTransaction (
    transaction_id   INT            IDENTITY(1,1) PRIMARY KEY,
    card_id          INT            NOT NULL,
    trip_id          INT            NULL,
    scanner_id       INT            NULL,
    amount           DECIMAL(10,2)  NOT NULL DEFAULT 0 
                                      CONSTRAINT CK_CardTransaction_Amount CHECK (amount > 0),
    [timestamp]      DATETIME2(0)   DEFAULT GETDATE(),
    [transaction_type] VARCHAR(20)  NOT NULL 
                                      CONSTRAINT CK_CardTransaction_Type CHECK ([transaction_type] IN ('deduction','top-up','refund')),
    CONSTRAINT FK_CardTransaction_Card
        FOREIGN KEY (card_id) REFERENCES MykiCard(card_id)
        ON DELETE CASCADE,
    CONSTRAINT FK_CardTransaction_Trip
        FOREIGN KEY (trip_id) REFERENCES Trip(trip_id),
    CONSTRAINT FK_CardTransaction_Scanner
        FOREIGN KEY (scanner_id) REFERENCES Scanner(scanner_id)
);
GO

-----------------------------------------------------
-- 8) Calendar
-----------------------------------------------------
CREATE TABLE Calendar (
    calendar_date     DATE           PRIMARY KEY,
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
                                        CONSTRAINT CK_Calendar_DayOfMonth CHECK (day_of_month BETWEEN 1 AND 31)
);
GO


------------------------------------------------------
-- B) Green Section: Routes, Stations, Scheduling, and Vehicles
-----------------------------------------------------

-- 1) StopStation Table
CREATE TABLE StopStation (
    stop_station_id INT          IDENTITY(1,1) PRIMARY KEY,
    station_name    VARCHAR(100) NOT NULL,
    zone            VARCHAR(50)  NULL,         -- Example: zone1, zone2, zone1+zone2（overlap)
    geo_point       GEOGRAPHY     NULL         -- Stores geographic coordinates; if not enabled, can be VARCHAR(200)
);
GO

-- 2) Route Table
CREATE TABLE Route (
    route_id            INT            IDENTITY(1,1) PRIMARY KEY,
    route_name          VARCHAR(100)   NOT NULL,
    start_time_of_day   TIME           NOT NULL,  -- Daily scheduled departure time
    last_run_time       DATETIME2(0)   NULL     -- Last run time, optional
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

-- 4) VehicleType (Lookup Table)
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

-- 6) VehicleRealTimeLog Table
-- Stores raw real-time data received from GPS
CREATE TABLE VehicleRealTimeLog (
    vehicle_realtime_log_id INT            IDENTITY(1,1) PRIMARY KEY,
    vehicle_id              INT            NOT NULL,
    latitude                DECIMAL(9,6)   NOT NULL,
    longitude               DECIMAL(9,6)   NOT NULL,
    speed                   DECIMAL(10,2)  NULL,       -- Example: km/h
    log_timestamp           DATETIME2(0)   DEFAULT GETDATE(),
    CONSTRAINT FK_VehicleRealTimeLog_Vehicle
        FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);
GO

-- 7) VehicleStopLog Table
-- Derived from VehicleRealTimeLog, it stores the calculated nearest station for a vehicle,
-- which is referenced by DeviceLocation or Scanner.
CREATE TABLE VehicleStopLog (
    vehicle_stop_log_id     INT            IDENTITY(1,1) PRIMARY KEY,
    vehicle_id              INT            NOT NULL,
    stop_station_id         INT            NOT NULL,
    update_timestamp        DATETIME2(0)   DEFAULT GETDATE(),
    CONSTRAINT FK_VehicleStopLog_Vehicle
        FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    CONSTRAINT FK_VehicleStopLog_StopStation
        FOREIGN KEY (stop_station_id) REFERENCES StopStation(stop_station_id)
);
GO

-- 8) VehicleRun Table
-- Records the actual run information.
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
