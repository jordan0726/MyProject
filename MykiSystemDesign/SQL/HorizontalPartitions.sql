/*===================================================================
  PARTITION SCRIPT – s4068959   (single PRIMARY filegroup)
  • Monthly partitions   – RANGE RIGHT, boundaries generated on​-the​-fly
  • Yearly partitions    – manual boundaries (table MykiPass)
===================================================================*/

/*------------------------------------------------------------------
  0.  Parameters – first/last month
------------------------------------------------------------------*/
DECLARE @StartDate date = '2024-02-01';   -- inclusive
DECLARE @EndDate   date = '2030-01-01';   -- exclusive

/*------------------------------------------------------------------
  1.  Build a comma​-separated boundary list for months:  YYYYMMDD,…
------------------------------------------------------------------*/
DECLARE @ValueList nvarchar(max);

;WITH m AS (
    SELECT @StartDate AS d
    UNION ALL
    SELECT DATEADD(month, 1, d)
    FROM   m
    WHERE  DATEADD(month, 1, d) < @EndDate
)
SELECT @ValueList =
       STRING_AGG('''' + CONVERT(char(10), d, 120) + '''', ', ')
       WITHIN GROUP (ORDER BY d)
FROM   m
OPTION (MAXRECURSION 0);

/*------------------------------------------------------------------
  2.  Conditionally create monthly Partition Function / Scheme
      – everything lives in the PRIMARY filegroup –
------------------------------------------------------------------*/
IF NOT EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'pf_Monthly')
BEGIN
    DECLARE @sqlMonthly nvarchar(max) = N'
    CREATE PARTITION FUNCTION pf_Monthly (datetime2(0))
    AS RANGE RIGHT FOR VALUES (' + @ValueList + N');

    CREATE PARTITION SCHEME ps_Monthly
    AS PARTITION pf_Monthly
    ALL TO ([PRIMARY]);';

    EXEC (@sqlMonthly);
END
ELSE
BEGIN
    PRINT N'>> Partition function/scheme pf_Monthly / ps_Monthly already exists. Skipped creation.';
END
GO


/*------------------------------------------------------------------
  3.  Conditionally create yearly Partition (MykiPass)
------------------------------------------------------------------*/
IF NOT EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'pf_Yearly')
BEGIN
    CREATE PARTITION FUNCTION pf_Yearly (date)
    AS RANGE RIGHT FOR VALUES (
        '2025-01-01','2026-01-01','2027-01-01','2028-01-01',
        '2029-01-01','2030-01-01','2031-01-01','2032-01-01',
        '2033-01-01','2034-01-01','2035-01-01'
    );

    CREATE PARTITION SCHEME ps_Yearly
    AS PARTITION pf_Yearly
    ALL TO ([PRIMARY]);
END
ELSE
BEGIN
    PRINT N'>> Partition function/scheme pf_Yearly / ps_Yearly already exists. Skipped creation.';
END
GO


/*------------------------------------------------------------------
4.  Inspect partitions – add GROUP BY
------------------------------------------------------------------*/
SELECT
    OBJECT_NAME(p.object_id)            AS TableName,
    i.name                              AS IndexName,
    p.partition_number,
    MIN(CONVERT(char(8), rv.value,112)) AS BoundaryFrom,
    SUM(p.rows)                         AS RowsInPartition
FROM sys.partitions p
JOIN sys.indexes            i  ON p.object_id = i.object_id AND p.index_id = i.index_id
LEFT JOIN sys.partition_schemes ps ON i.data_space_id = ps.data_space_id
LEFT JOIN sys.partition_functions pf ON ps.function_id = pf.function_id
LEFT JOIN sys.partition_range_values rv
       ON pf.function_id = rv.function_id
      AND rv.boundary_id = p.partition_number - 1
WHERE OBJECT_NAME(p.object_id) IN
      ('Trip','CardTransaction','VehicleStopLog',
       'VehicleRealTimeLog','VehicleRun','MykiPass')
GROUP BY
      OBJECT_NAME(p.object_id),
      i.name,
      p.partition_number
ORDER BY TableName, partition_number;
GO
