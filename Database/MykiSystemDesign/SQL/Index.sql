/* ============================================================
   INDEXES – aligned to partition schemes where applicable
   ============================================================
   Notes:
   • Trip / VehicleStopLog / VehicleRealTimeLog → partitioned monthly via pf_Monthly / ps_Monthly,
     so indexes must align: ON ps_Monthly(<partition‑key>)
   • MykiCard and DeviceLocation are not partitioned, so retain PRIMARY index only.
   ------------------------------------------------------------ */

/* ===========================================
   Trip: Index to find the latest trip per card
   Used to retrieve recent trips regardless of whether they are completed
   =========================================== */
CREATE NONCLUSTERED INDEX IX_Trip_Card_TouchOn
ON dbo.Trip (card_id, touch_on_time)
INCLUDE (touch_off_time)
ON ps_Monthly (touch_on_time);
GO

/* ===========================================
   Trip: Index to detect if a card has an active (unfinished) trip
   Used to determine whether the current tap is a touch-on or touch-off
   =========================================== */
CREATE NONCLUSTERED INDEX IX_Trip_UnfinishedTripCheck
ON dbo.Trip (card_id, touch_on_time DESC)
WHERE touch_off_time IS NULL
ON ps_Monthly (touch_on_time);
GO

/* ===========================================
   Trip: Index to retrieve the last completed trip per card
   Supports 2-hour free transfer detection in fare calculation
   =========================================== */
CREATE NONCLUSTERED INDEX IX_Trip_CompletedTripLookup
ON dbo.Trip (card_id, touch_on_time DESC)
WHERE touch_off_time IS NOT NULL
ON ps_Monthly (touch_on_time);
GO

/* ===========================================
   MykiCard: Index for frequent lookups on card details
   Supports balance checking, pass status, card type, and daily cap limits
   (Non-partitioned table — stored on PRIMARY)
   =========================================== */
CREATE NONCLUSTERED INDEX IX_MykiCard_CardLookup
ON dbo.MykiCard (card_id)
INCLUDE (pass_id, balance, status, daily_cap, card_type);
GO

/* ===========================================
   VehicleStopLog: Index for tracking vehicle stop changes
   Used to detect changes in stop_station_id by vehicle, ordered by update time
   =========================================== */
CREATE NONCLUSTERED INDEX IX_VehicleStopLog_Vehicle_Stop_Timestamp
ON dbo.VehicleStopLog (vehicle_id, stop_station_id, update_timestamp DESC)
ON ps_Monthly (update_timestamp);
GO

/* ===========================================
   DeviceLocation: Index to quickly update current stop by vehicle ID
   Supports real-time updates of current_stop_station_id
   (Non-partitioned table — stored on PRIMARY)
   =========================================== */
CREATE UNIQUE NONCLUSTERED INDEX IX_DeviceLocation_ByVehicle
ON dbo.DeviceLocation (vehicle_id);
GO

/* ===========================================
   VehicleRealTimeLog: Index for retrieving latest GPS logs
   Supports real-time vehicle tracking based on location updates
   =========================================== */
CREATE NONCLUSTERED INDEX IX_VehicleRealTimeLog_ByVehicle_Timestamp
ON dbo.VehicleRealTimeLog (vehicle_id, log_timestamp)
ON ps_Monthly (log_timestamp);
GO
