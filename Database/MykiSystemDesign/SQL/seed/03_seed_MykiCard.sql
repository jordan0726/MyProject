INSERT INTO MykiCard (balance, customer_id, card_type, pass_id, pass_expiry_date, daily_cap, status, expiry_date) VALUES
(25.30, 49, 'full_fare',   80, '2025-04-25', 4, 0, '2026-01-01'),
(10.50, 50, 'concession',  81, '2025-05-10', 0, 0, '2025-12-31'),
(18.75, 51, 'child',       82, '2025-06-01', 1, 0, '2026-06-30'),
( -5.00, 52, 'full_fare',   83, '2025-06-28', 0, 0, '2026-01-01'), 
(30.00, 53, 'concession',  84, '2025-07-07', 3, 0, '2026-07-01'),
(15.20, 54, 'senior',      85, '2025-08-28', 2, 0, '2026-08-01'),
( -9.00, 55, 'child',       86, '2025-10-01', 1, 0, '2026-10-10'), 
( 0.00, 56, 'full_fare',   87, '2026-10-01', 0, 0, '2027-01-01'),
(12.00, 57, 'concession',  88, '2026-12-01', 2, 0, '2026-12-31'),
(20.00, 58, 'senior',      89, '2025-05-18', 1, 0, '2026-12-31');

--Without MykiPass
INSERT INTO MykiCard (balance, customer_id, card_type, pass_id, pass_expiry_date, daily_cap, status, expiry_date) VALUES
( 6.50, 49, 'full_fare',   NULL, NULL, 0, 0, '2026-01-01'),
( -1.00, 50, 'full_fare',       NULL, NULL, 2, 0, '2025-12-31'),
(13.75, NULL, 'full_fare',      NULL, NULL, 5.5, 0, '2027-03-15'),
(13.75, NULL, 'full_fare',      NULL, NULL, 1, 1, '2027-03-15'),
(20.00, NULL, 'concession',  NULL, NULL, 0, 0, '2026-06-30'),
( -3.00, 51, 'concession',  NULL, NULL, 0, 0, '2026-09-30'),
( 7.20, 53, 'concession',   NULL, NULL, 3.75, 0, '2026-07-01'),
( 7.20, 53, 'concession',   NULL, NULL, 3.75, 1, '2026-07-01'),
(11.90, 54, 'child',       NULL, NULL, 3, 0, '2026-08-15'),
(17.40, 56, 'senior',      NULL, NULL, 2, 0, '2027-01-01'),
( 8.10, 57, 'full_fare',   NULL, NULL, 4, 1, '2026-10-10'),
( 0.50, NULL, 'child',       NULL, NULL, 1, 0, '2026-12-31');
