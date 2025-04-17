/* ============================================================
   INDEXES – aligned to partition schemes where applicable
   ============================================================
   說明
   • Trip / VehicleStopLog / VehicleRealTimeLog  →  已按「pf_Monthly / ps_Monthly」
     進行月分分割，故索引需對齊：ON ps_Monthly(<partition‑key>)
   • MykiCard、DeviceLocation 未分割，維持 PRIMARY 即可
   ‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑‑ */

/* ===========================================
   Trip: Index for finding the newest trip by card
   Used to retrieve recent trips regardless of completion status
   =========================================== */
CREATE NONCLUSTERED INDEX IX_Trip_Card_TouchOn
ON dbo.Trip (card_id, touch_on_time)
INCLUDE (touch_off_time)
ON ps_Monthly (touch_on_time);
GO

/* ===========================================
   Trip: Index to check if a card currently has an unfinished trip
   Used in determining whether the current tap is touch‑on or touch‑off
   =========================================== */
CREATE NONCLUSTERED INDEX IX_Trip_UnfinishedTripCheck
ON dbo.Trip (card_id, touch_on_time DESC)
WHERE touch_off_time IS NULL
ON ps_Monthly (touch_on_time);
GO

/* ===========================================
   Trip: Index to find the last completed trip
   Used in 2‑hour free transfer detection (fare logic)
   =========================================== */
CREATE NONCLUSTERED INDEX IX_Trip_CompletedTripLookup
ON dbo.Trip (card_id, touch_on_time DESC)
WHERE touch_off_time IS NOT NULL
ON ps_Monthly (touch_on_time);
GO

/* ===========================================
   MykiCard: Index for frequent look‑ups on card attributes
   Supports balance checks, pass status, card type, daily caps
   (未分割表 — 仍放 PRIMARY)
   =========================================== */
CREATE NONCLUSTERED INDEX IX_MykiCard_CardLookup
ON dbo.MykiCard (card_id)
INCLUDE (pass_id, balance, status, daily_cap, card_type);
GO

/* ===========================================
   VehicleStopLog: Index to track vehicle’s stop changes
   Used to detect stop_station_id change per vehicle, ordered by time
   =========================================== */
CREATE NONCLUSTERED INDEX IX_VehicleStopLog_Vehicle_Stop_Timestamp
ON dbo.VehicleStopLog (vehicle_id, stop_station_id, update_timestamp DESC)
ON ps_Monthly (update_timestamp);
GO

/* ===========================================
   DeviceLocation: Index for updating current stop by vehicle ID
   Used during real‑time location updates
   (未分割表 — 仍放 PRIMARY)
   =========================================== */
CREATE UNIQUE NONCLUSTERED INDEX IX_DeviceLocation_ByVehicle
ON dbo.DeviceLocation (vehicle_id);
GO

/* ===========================================
   VehicleRealTimeLog: Index to fetch most recent GPS logs
   Supports real‑time tracking of vehicle location updates
   =========================================== */
CREATE NONCLUSTERED INDEX IX_VehicleRealTimeLog_ByVehicle_Timestamp
ON dbo.VehicleRealTimeLog (vehicle_id, log_timestamp)
ON ps_Monthly (log_timestamp);
GO
