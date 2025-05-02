
DELETE FROM dbo.MykiCard;

-- Reseed the identity to 0 so the next insert starts from 1
DBCC CHECKIDENT ('dbo.MykiCard', RESEED, 0);

-------- TICKET 1 -----------
-- Insert an expired Myki card for 2025/05/02 demo
INSERT INTO dbo.MykiCard (
    balance,
    customer_id,
    card_type,
    pass_id,
    pass_expiry_date,
    daily_cap,
    status,
    expiry_date
)
VALUES (
    15.50,             -- balance
    NULL,              -- customer_id (must exist in CustomerAuth or be NULL if unregistered)
    'full-fare',      -- card_type (must exist in CardType)
    NULL,             -- no active pass
    NULL,             -- no pass expiry
    0.00,             -- daily cap
    0,                -- status = 0 → expired
    '2024-12-31'      -- expiry_date before demo date 2025-05-02
);

-------- TICKET 2 -----------
-- Insert a valid MykiPass (not expired)
INSERT INTO dbo.MykiPass (start_date, expiry_date, expired)
VALUES ('2025-04-01', '2025-06-01', 0);  -- active pass (ends after 2025/05/02)

-- Insert the MykiCard with that active pass
INSERT INTO dbo.MykiCard (
    balance,
    customer_id,
    card_type,
    pass_id,
    pass_expiry_date,
    daily_cap,
    status,
    expiry_date
)
VALUES (
    0.00,                  -- balance (irrelevant per Ticket 2)
    NULL,                   -- customer_id (must exist or be NULL)
    'full-fare',           -- card_type (must exist)
    '1',          -- link to active MykiPass
    '2025-06-01',          -- pass_expiry_date matches the pass
    0.00,                  -- daily cap
    1,                     -- status = 1 (active)
    '2026-01-01'           -- card is not expired on 2025-05-02
);

-------- TICKET 3 -----------
-- Insert the MykiCard with that 20 balance and not live
INSERT INTO dbo.MykiCard (
    balance,
    customer_id,
    card_type,
    pass_id,
    pass_expiry_date,
    daily_cap,
    status,
    expiry_date
)
VALUES (
    20.00,                  -- balance (irrelevant per Ticket 2)
    NULL,                   -- customer_id (must exist or be NULL)
    'full-fare',           -- card_type (must exist)
    NULL,          -- link to active MykiPass
    NULL,          -- pass_expiry_date matches the pass
    0.00,                  -- daily cap
    1,                     -- status = 1 (active)
    '2026-01-01'           -- card is not expired on 2025-05-02
);

-------- TICKET 4 -----------
-- Insert the MykiCard with that 20 balance and is live
INSERT INTO dbo.MykiCard (
    balance,
    customer_id,
    card_type,
    pass_id,
    pass_expiry_date,
    daily_cap,
    status,
    expiry_date
)
VALUES (
    20.00,                  -- balance (irrelevant per Ticket 2)
    NULL,                   -- customer_id (must exist or be NULL)
    'full-fare',           -- card_type (must exist)
    NULL,          -- link to active MykiPass
    NULL,          -- pass_expiry_date matches the pass
    0.00,                  -- daily cap
    1,                     -- status = 1 (active)
    '2026-01-01'           -- card is not expired on 2025-05-02
);

-------- TICKET 5 -----------
-- Insert the MykiCard with negative balance
INSERT INTO dbo.MykiCard (
    balance,
    customer_id,
    card_type,
    pass_id,
    pass_expiry_date,
    daily_cap,
    status,
    expiry_date
)
VALUES (
    -5.00,                  -- balance (irrelevant per Ticket 2)
    NULL,                   -- customer_id (must exist or be NULL)
    'full-fare',           -- card_type (must exist)
    NULL,          -- link to active MykiPass
    NULL,          -- pass_expiry_date matches the pass
    0.00,                  -- daily cap
    1,                     -- status = 1 (active)
    '2026-01-01'           -- card is not expired on 2025-05-02
);


-------- TICKET 1 Testing -----------
-- Should retunr "expired" and won't create any trip data
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 1,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

select * from trip
select * from cardtransaction
select * from mykicard;

-------- TICKET 2 Testing -----------
-- Should retunr "touch_on_ok" at first tap and create trip record
-- Should retunr "touch_off_ok" and balance at second tap, and update trip data and create transaction record
-- Should identify it ahs valid MykiPass and free from deduction
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 2,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

select * from trip
select * from cardtransaction
select * from mykicard;


-------- TICKET 3 Testing -----------
-- Should retunr "touch_on_ok" at first tap and create trip record
-- Should retunr "touch_off_ok" and new balance at second tap, and update trip data and create transaction record
-- The default fare 5.5 should be deducted from balance
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 3,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

select * from trip
select * from cardtransaction
select * from mykicard;


-------- TICKET 4 Testing -----------
-- Should retunr "touch_on_ok" at first tap and create trip record
-- Should retunr "touch_off_ok" and new balance at second tap, and update trip data and create transaction record
-- Should retunr "touch_on_ok" at third tap and create a new trip record
-- Should retunr "touch_off_ok" and new balance at forth tap, and update trip data and create transaction record
-- The fare type should be free_2hour, no balance should be deducted

DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 4,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

select * from trip
select * from cardtransaction
select * from mykicard;

-------- TICKET 5 Testing -----------
-- Should return 'insufficient_balance' and no trip or transaciton is recorded

DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 5,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

select * from trip
select * from cardtransaction
select * from mykicard;


------- CLEAN THE TEST --------
DELETE FROM dbo.CardTransaction
DELETE FROM dbo.Trip
DELETE FROM dbo.MykiCard
DELETE FROM dbo.MykiPass


-- Reseed the identity to 0 so the next insert starts from 1
DBCC CHECKIDENT ('dbo.CardTransaction', RESEED, 0)
DBCC CHECKIDENT ('dbo.Trip', RESEED, 0)
DBCC CHECKIDENT ('dbo.MykiPass', RESEED, 0)
DBCC CHECKIDENT ('dbo.MykiCard', RESEED, 0);

