INSERT INTO VehicleRealTimeLog (vehicle_id, latitude, longitude, speed, log_timestamp) VALUES
(1, -37.810120, 144.962380, 22.50, '2025-04-18 08:00:00'),
(1, -37.811000, 144.963000, 18.20, '2025-04-18 08:01:00'),
(1, -37.812300, 144.963500, 15.60, '2025-04-18 08:02:00'),

(2, -37.820100, 144.970000, 25.00, '2025-04-18 08:00:30'),
(2, -37.821200, 144.971200, 21.75, '2025-04-18 08:01:30'),
(2, -37.822500, 144.972000, 19.00, '2025-04-18 08:02:30');


INSERT INTO VehicleStopLog (vehicle_id, stop_station_id, update_timestamp) VALUES
(1, 1, '2025-04-18 08:00:05'),  -- vehicle 1 stop at Melbourne Central
(1, 2, '2025-04-18 08:01:10'),  -- vehicle 1 stop at Flagstaff
(1, 3, '2025-04-18 08:02:15'),  -- vehicle 1 stop at Southern Cross

(2, 4, '2025-04-18 08:00:35'),  -- vehicle 2 stop at Dandenong
(2, 5, '2025-04-18 08:01:45'),  -- vehicle 2 stop at Frankston
(2, 6, '2025-04-18 08:02:50');  -- vehicle 2 stop at Sunbury
