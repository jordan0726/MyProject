-- DeviceLocation（location_type = 'physical'）
INSERT INTO DeviceLocation (vehicle_id, stop_station_id, location_type, current_stop_station_id) VALUES
(1, NULL, 'physical', 3),   -- tram
(2, NULL, 'physical', 7),   -- tram
(3, NULL, 'physical', 1),   -- train
(4, NULL, 'physical', 6),   -- train
(5, NULL, 'physical', 2),   -- bus
(NULL, 1, 'physical', 1),
(NULL, 4, 'physical', 4),
(NULL, 6, 'physical', 6),
(NULL, 9, 'physical', 9),

-- DeviceLocation （location_type = 'online'）
(NULL, 1, 'online', NULL);  -- used for online transaction

-- Scanner
INSERT INTO Scanner (device_location_id) VALUES
(1),  
(1),
(2),

(6),  
(6);  



