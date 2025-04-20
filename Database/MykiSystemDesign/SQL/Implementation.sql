-- Test full-fare with mykiPass
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 88,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;


-- Test concession with mykiPass
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 89,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;


-- Test full-fare with mykiPass, balance < 0
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 91,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

------------------------------------------------------------

-----------------Within zone 1------------------------------
-- Test full-fare
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 98,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;


-- Test full-fare, balance < 0 -> should not create trip, directly return tap_result 
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 99,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;


-- Test full-fare, expired -> should not create trip, directly return tap_result 
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 101,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;


-- Test concession
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 102,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;



-- Test senior
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 107,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;



-- Test child
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 109,
     @scanner_id  = 2,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;



-----------------Within zone 1 -> zone 2 ------------------------------
-- Test full-fare
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 100,
     @scanner_id  = 1,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;

DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 100,
     @scanner_id  = 5,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;


-----------------Within zone 2 ------------------------------
-- Test full-fare
DECLARE @tap_result NVARCHAR(50);
DECLARE @new_balance DECIMAL(10,2);

EXEC usp_TouchOn
     @card_id     = 100,
     @scanner_id  = 5,
     @tap_result  = @tap_result OUTPUT,
     @new_balance = @new_balance OUTPUT;

-- check result
SELECT @tap_result AS tap_result,
       @new_balance AS new_balance;



