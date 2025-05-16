INSERT INTO CardType (card_type, description) VALUES
('full-fare', 'Full fare adult'),
('concession', 'Concession card holder'),
('child', 'Child passenger'),
('senior', 'Senior citizen');


INSERT INTO FareType (fare_type, description) VALUES
('default_fare', 'Default fare (standard condition)'),
('default_weekend', 'Weekend default fare'),
('default_zone2', 'Default fare for Zone 2 only'),
('concession', 'Concession fare'),
('concession_weekend', 'Weekend concession fare'),
('concession_zone2', 'Concession fare for Zone 2'),
('free_2hours', 'Free fare within 2-hour transfer window'),
('free_senior', 'Free fare for seniors on public holidays'),
('free_mykipass', 'Covered by active Myki pass'),
('free_weekend_zone2', 'Weekend free fare in Zone 2'),
('free_dailycap', 'Free fare due to daily cap limit');


INSERT INTO VehicleType (vehicle_type, description) VALUES
('metropolitan_train', 'Metropolitan train service'),
('metropolitan_bus', 'Metropolitan bus service'),
('metropolitan_tram', 'Metropolitan tram service'),
('regional_train', 'Regional train service'),
('regional_bus', 'Regional bus service'),
('regional_couch', 'Regional long-distance coach'),
('interstate', 'Interstate transport service');
