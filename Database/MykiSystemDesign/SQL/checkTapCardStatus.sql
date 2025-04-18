-- ============================================================================
-- FUNCTION: udf_CheckCardStatusActive
-- PURPOSE : Checks if a Myki card's status is 'active'
-- RETURNS : 1 if active, 0 otherwise
-- ============================================================================
CREATE OR ALTER FUNCTION udf_CheckCardStatusActive (
    @card_id INT
)
RETURNS BIT
WITH RETURNS NULL ON NULL INPUT,
     SCHEMABINDING
AS
BEGIN
    DECLARE @is_active BIT = 0;

    IF EXISTS (
        SELECT 1 
        FROM dbo.MykiCard 
        WHERE card_id = @card_id AND status = 'active'
    )
        SET @is_active = 1;

    RETURN @is_active;
END;
GO

/*==============================================================================
  Function : udf_CheckCardBalanceValid
  Purpose  : Determines whether a Myki card may proceed with a tap event from
             the perspective of stored‑value balance **and/or** an active pass.

             • If the card has an active Myki Pass (pass_id IS NOT NULL) the
               function returns 1 (valid) regardless of the monetary balance.
             • Otherwise the balance must be zero or positive.

  Returns  : BIT
                1  – card is financially valid to travel
                0  – balance is negative AND no active pass exists
==============================================================================*/
CREATE OR ALTER FUNCTION dbo.udf_CheckCardBalanceValid
(
    @card_id INT
)
RETURNS BIT
WITH RETURNS NULL ON NULL INPUT,
     SCHEMABINDING
AS
BEGIN
    DECLARE @is_valid BIT = 0;

    /*-----------------------------------------------------------------------
        Card is valid when
          – pass_id IS NOT NULL  (active Myki Pass)               OR
          – balance      >= 0    (sufficient stored value)
    -----------------------------------------------------------------------*/
    IF EXISTS
    (
        SELECT 1
        FROM dbo.MykiCard
        WHERE card_id = @card_id
          AND ( pass_id IS NOT NULL        -- active pass
                OR balance >= 0 )          -- or non‑negative balance
    )
        SET @is_valid = 1;

    RETURN @is_valid;
END;
GO


-- ============================================================================
-- FUNCTION: udf_CheckLastTripIsTouchOff
-- PURPOSE : Determines whether the last trip is unfinished (touch_off_time IS NULL)
-- RETURNS : 1 if still ongoing trip (needs touch off), 0 if no active trip
-- ============================================================================
CREATE OR ALTER FUNCTION udf_CheckLastTripIsTouchOff (
    @card_id INT
)
RETURNS BIT
WITH RETURNS NULL ON NULL INPUT,
     SCHEMABINDING
AS
BEGIN
    DECLARE @needs_touch_off BIT = 0;

    IF EXISTS (
        SELECT TOP(1) 1
        FROM dbo.Trip
        WHERE card_id = @card_id AND touch_off_time IS NULL
        ORDER BY touch_on_time DESC
    )
        SET @needs_touch_off = 1;

    RETURN @needs_touch_off;
END;
GO  
-- ============================================================================
-- PROCEDURE: usp_CheckTapCardStatus
-- PURPOSE   : Coordinates the validation of a tap card event
-- PARAMETERS:
--     @card_id     - ID of the card being tapped
--     @result OUT  - 'expired', 'insufficient_balance', 'touch_on', or 'touch_off'
-- ============================================================================
CREATE OR ALTER PROCEDURE usp_CheckTapCardStatus
    @card_id INT,
    @result NVARCHAR(20) OUTPUT  -- Limited to defined status values
WITH EXECUTE AS CALLER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @card_id IS NULL
    BEGIN
        THROW 50010, '❌ Card ID cannot be NULL', 1;
        RETURN;
    END

    -- Step 1: Check if card is active
    IF dbo.udf_CheckCardStatusActive(@card_id) = 0
    BEGIN
        SET @result = 'expired';
        RETURN;
    END

    -- Step 2: Check if balance is sufficient
    IF dbo.udf_CheckCardBalanceValid(@card_id) = 0
    BEGIN
        SET @result = 'insufficient_balance';
        RETURN;
    END

    -- Step 3: Determine if this tap is touch-off or new trip (touch-on)
    BEGIN TRY
        IF dbo.udf_CheckLastTripIsTouchOff(@card_id) = 1
            SET @result = 'touch_off';
        ELSE
            SET @result = 'touch_on';
    END TRY
    BEGIN CATCH
        SET @result = 'touch_on'; -- Default to new trip if check fails
        PRINT '⚠️ Warning: Failed to check last trip status. Defaulting to touch_on.';
    END CATCH
END;
GO
