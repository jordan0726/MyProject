
/*-----------------------------------------------------------
  1)  Login / authentication table  –  CustomerAuth
      – customer_id is IDENTITY(1,1)
-----------------------------------------------------------*/
CREATE TABLE dbo.CustomerAuth
(
    customer_id     INT            IDENTITY(1,1) PRIMARY KEY,
    email           VARCHAR(100)   NOT NULL UNIQUE,
    password_hash   VARCHAR(256)   NOT NULL,
    acc_status      VARCHAR(20)    NOT NULL DEFAULT 'active',
    regs_date       DATE           NOT NULL DEFAULT GETDATE()
);
GO
/*-----------------------------------------------------------
  2)  Personal‑profile table  –  CustomerProfile
      – customer_id matches the value in CustomerAuth
      – do NOT add another IDENTITY here
-----------------------------------------------------------*/
CREATE TABLE dbo.CustomerProfile
(
    customer_id INT          PRIMARY KEY
                 CONSTRAINT  FK_CustProfile_Auth
                 REFERENCES  dbo.CustomerAuth(customer_id),
    full_name    VARCHAR(100) NOT NULL,
    phone_num    VARCHAR(20),
    address      VARCHAR(200),
    dob          DATE
);
GO
/*-----------------------------------------------------------
  3)  Read‑only view that joins both tables
-----------------------------------------------------------*/
CREATE VIEW dbo.vwCustomer
AS
SELECT  a.customer_id,
        a.email,
        a.password_hash,
        a.acc_status,
        a.regs_date,
        p.full_name,
        p.phone_num,
        p.address,
        p.dob
FROM    dbo.CustomerAuth    AS a
JOIN    dbo.CustomerProfile AS p
          ON p.customer_id = a.customer_id;
GO
/*-----------------------------------------------------------
  4)  INSTEAD‑OF‑INSERT trigger:
      inserting into the view writes to both tables
-----------------------------------------------------------*/
CREATE OR ALTER TRIGGER trg_vwCustomer_IOI
ON dbo.vwCustomer
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    /* (1) Insert into CustomerAuth and capture new IDs -------- */
    DECLARE @NewCust TABLE
    (
        customer_id   INT,
        email         VARCHAR(100),
        password_hash VARCHAR(256)
    );

    INSERT dbo.CustomerAuth (email, password_hash, acc_status)
    OUTPUT inserted.customer_id, inserted.email, inserted.password_hash
           INTO @NewCust (customer_id, email, password_hash)
    SELECT  i.email,
            i.password_hash,
            COALESCE(i.acc_status,'active')
    FROM    inserted AS i;          -- inserted from the view

    /* (2) Insert into CustomerProfile ------------------------- */
    INSERT dbo.CustomerProfile (customer_id,
                                full_name,
                                phone_num,
                                address,
                                dob)
    SELECT  n.customer_id,
            i.full_name,
            i.phone_num,
            i.address,
            i.dob
    FROM        inserted  AS i
    INNER JOIN  @NewCust AS n
           ON   n.email = i.email
          AND   n.password_hash = i.password_hash;
END;
GO

