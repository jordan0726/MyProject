
INSERT INTO Vehicle (vehicle_type) VALUES
('metropolitan_tram'),
('metropolitan_tram'),
('metropolitan_train'),
('metropolitan_train'),
('metropolitan_bus'),
('metropolitan_bus');


INSERT INTO StopStation (station_name, zone, geo_point) VALUES
('Melbourne Central', 'zone1', GEOGRAPHY::Point(-37.8100, 144.9620, 4326)),
('Flagstaff Station', 'zone1', GEOGRAPHY::Point(-37.8107, 144.9546, 4326)),
('Southern Cross', 'zone1', GEOGRAPHY::Point(-37.8183, 144.9526, 4326));


INSERT INTO StopStation (station_name, zone, geo_point) VALUES
('Dandenong Station', 'zone2', GEOGRAPHY::Point(-37.9857, 145.2157, 4326)),
('Frankston Station', 'zone2', GEOGRAPHY::Point(-38.1446, 145.1244, 4326)),
('Sunbury Station', 'zone2', GEOGRAPHY::Point(-37.5803, 144.7274, 4326));


INSERT INTO StopStation (station_name, zone, geo_point) VALUES
('North Richmond', 'zone1+zone2', GEOGRAPHY::Point(-37.8108, 144.9931, 4326)),
('Richmond Station', 'zone1+zone2', GEOGRAPHY::Point(-37.8240, 144.9988, 4326)),
('Clifton Hill', 'zone1+zone2', GEOGRAPHY::Point(-37.7924, 145.0087, 4326));
