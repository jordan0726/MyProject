-- ============================================================================
-- INDEX: IX_Trip_Card_TouchTime_DESC
-- PURPOSE: Speeds up retrieval of the latest trip for a given card,
--          regardless of whether the trip is complete or not.
-- USAGE: Used when checking recent usage or for fare capping analysis.
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_Trip_Card_TouchTime_DESC
ON Trip(card_id, touch_on_time DESC)
INCLUDE (touch_off_time);
GO

-- ============================================================================
-- INDEX: IX_Trip_Card_TouchOn_OpenOnly
-- PURPOSE: Optimises queries that check if a given card has an active,
--          incomplete trip (i.e., no touch off recorded yet).
-- USAGE: Supports logic to determine whether to trigger a touch on or off.
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_Trip_Card_TouchOn_OpenOnly
ON Trip(card_id, touch_on_time DESC)
WHERE touch_off_time IS NULL;
GO

-- ============================================================================
-- INDEX: IX_Scanner_DeviceLocation
-- PURPOSE: Supports quick lookup of the physical location associated with
--          a scanner, especially during touch-on/touch-off operations.
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_Scanner_DeviceLocation
ON Scanner(device_location_id);
GO

-- ============================================================================
-- INDEX: IX_VehicleStopLog_Run_Stop
-- PURPOSE: Optimises matching of a vehicle's run log entries with specific
--          stops, useful for determining stopping patterns and travel logs.
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_VehicleStopLog_Run_Stop
ON VehicleStopLog(run_id, stop_station_id);
GO

-- ============================================================================
-- INDEX: IX_VehicleRealTimeLog_Vehicle_Timestamp_DESC
-- PURPOSE: Supports fast access to the most recent GPS location logs for a
--          specific vehicle, useful for live tracking and movement history.
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_VehicleRealTimeLog_Vehicle_Timestamp_DESC
ON VehicleRealTimeLog(vehicle_id, timestamp DESC);
GO
