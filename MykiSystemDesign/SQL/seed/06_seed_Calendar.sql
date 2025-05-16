INSERT INTO Calendar (calendar_date, is_weekend, is_holiday, holiday_name, day_of_week, year, month, day_of_month)
VALUES
('2025-04-14', 0, 0, NULL, 'Monday',    2025, 4, 14),  -- weekday
('2025-04-15', 0, 0, NULL, 'Tuesday',   2025, 4, 15),  -- weekday
('2025-04-19', 1, 0, NULL, 'Saturday',  2025, 4, 19),  -- weekend
('2025-04-20', 1, 0, NULL, 'Sunday',    2025, 4, 20),  -- weekend
('2025-04-25', 0, 1, 'ANZAC Day',       'Friday',     2025, 4, 25),  -- holiday
('2025-12-25', 1, 1, 'Christmas Day',   'Thursday',   2025, 12, 25); -- holiday

INSERT INTO Calendar (calendar_date, is_weekend, is_holiday, holiday_name, day_of_week, year, month, day_of_month)
VALUES
('2025-04-18', 0, 1, 'Easter Day',       'Friday',     2025, 4, 18);  -- holiday

