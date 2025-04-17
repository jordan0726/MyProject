/* ================================================================
   PARTITION SCRIPT  –  MykiTransportDB   (單一 PRIMARY filegroup)
   「月分」分割採 RANGE RIGHT，邊界值自動產生
   「年度」分割 (MykiPass) 手動列出邊界值
   ================================================================ */

USE MykiTransportDB;
GO

/* ---------------------------------------------------------------
   0. 參數設定：起訖年月
   --------------------------------------------------------------- */
DECLARE @StartDate date = '2024-02-01';   -- 第一個月 (inclusive)
DECLARE @EndDate   date = '2030-01-01';   -- 最後月 (exclusive)

/* ---------------------------------------------------------------
   1. 動態產生 ‑ 月分邊界值清單 (YYYYMMDD, …)
   --------------------------------------------------------------- */
DECLARE @ValueList nvarchar(max);

;WITH m AS (
    SELECT @StartDate AS d
    UNION ALL
    SELECT DATEADD(month,1,d) FROM m WHERE DATEADD(month,1,d) < @EndDate
)
SELECT  @ValueList = STRING_AGG(CONVERT(char(8), d, 112), ', ')
         WITHIN GROUP (ORDER BY d)
FROM    m
OPTION (MAXRECURSION 0);

/* ---------------------------------------------------------------
   2. 重新建立 月分 Partition Function / Scheme
      — 所有 partition 都放在 PRIMARY filegroup —
   --------------------------------------------------------------- */
IF EXISTS (SELECT * FROM sys.partition_schemes   WHERE name = 'ps_Monthly')
    DROP PARTITION SCHEME   ps_Monthly;
IF EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'pf_Monthly')
    DROP PARTITION FUNCTION pf_Monthly;
GO

DECLARE @sqlMonthly nvarchar(max) = N'
CREATE PARTITION FUNCTION pf_Monthly (date)
AS RANGE RIGHT FOR VALUES (' + @ValueList + N');

CREATE PARTITION SCHEME  ps_Monthly
AS PARTITION pf_Monthly
ALL TO ([PRIMARY]);      -- ✅ 受管環境只能用 PRIMARY
';
EXEC (@sqlMonthly);

PRINT N'>>> pf_Monthly / ps_Monthly 建立完成，邊界 = ' + @ValueList;
GO

/* ---------------------------------------------------------------
   3. 重新建立 年度 Partition (MykiPass)
      — 仍然是 PRIMARY filegroup —
   --------------------------------------------------------------- */
IF EXISTS (SELECT * FROM sys.partition_schemes   WHERE name = 'ps_Yearly')
    DROP PARTITION SCHEME   ps_Yearly;
IF EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'pf_Yearly')
    DROP PARTITION FUNCTION pf_Yearly;
GO

CREATE PARTITION FUNCTION pf_Yearly (date)
AS RANGE RIGHT FOR VALUES (20250101,20260101,20270101,20280101,
                           20290101,20300101,20310101,20320101,
                           20330101,20340101,20350101);

CREATE PARTITION SCHEME ps_Yearly
AS PARTITION pf_Yearly
ALL TO ([PRIMARY]);      -- ✅
GO

/* ---------------------------------------------------------------
   4. 以分割方案重新建立聚簇索引
   --------------------------------------------------------------- */
-- ★ 若表原本已有聚簇索引，請先 DROP / SWITCH，再重建 ★

-- Trip  ─ touch_on_time → 月分
IF EXISTS (SELECT * FROM sys.indexes
           WHERE name = 'CX_Trip_TouchOnTime'
             AND object_id = OBJECT_ID('dbo.Trip'))
    DROP INDEX CX_Trip_TouchOnTime ON dbo.Trip;
CREATE UNIQUE CLUSTERED INDEX CX_Trip_TouchOnTime
        ON dbo.Trip (touch_on_time, trip_id)
        ON ps_Monthly(touch_on_time);

-- CardTransaction  ─ timestamp → 月分
IF EXISTS (SELECT * FROM sys.indexes
           WHERE name = 'CX_CardTransaction_Timestamp'
             AND object_id = OBJECT_ID('dbo.CardTransaction'))
    DROP INDEX CX_CardTransaction_Timestamp ON dbo.CardTransaction;
CREATE CLUSTERED INDEX CX_CardTransaction_Timestamp
        ON dbo.CardTransaction ([timestamp], transaction_id)
        ON ps_Monthly([timestamp]);

-- VehicleStopLog  ─ update_timestamp → 月分
IF EXISTS (SELECT * FROM sys.indexes
           WHERE name = 'CX_VehicleStopLog_UpdateTS'
             AND object_id = OBJECT_ID('dbo.VehicleStopLog'))
    DROP INDEX CX_VehicleStopLog_UpdateTS ON dbo.VehicleStopLog;
CREATE CLUSTERED INDEX CX_VehicleStopLog_UpdateTS
        ON dbo.VehicleStopLog (update_timestamp, vehicle_stop_log_id)
        ON ps_Monthly(update_timestamp);

-- VehicleRealTimeLog  ─ log_timestamp → 月分
IF EXISTS (SELECT * FROM sys.indexes
           WHERE name = 'CX_VehicleRTLog_LogTS'
             AND object_id = OBJECT_ID('dbo.VehicleRealTimeLog'))
    DROP INDEX CX_VehicleRTLog_LogTS ON dbo.VehicleRealTimeLog;
CREATE CLUSTERED INDEX CX_VehicleRTLog_LogTS
        ON dbo.VehicleRealTimeLog (log_timestamp, vehicle_realtime_log_id)
        ON ps_Monthly(log_timestamp);

-- VehicleRun  ─ start_time → 月分
IF EXISTS (SELECT * FROM sys.indexes
           WHERE name = 'CX_VehicleRun_StartTime'
             AND object_id = OBJECT_ID('dbo.VehicleRun'))
    DROP INDEX CX_VehicleRun_StartTime ON dbo.VehicleRun;
CREATE CLUSTERED INDEX CX_VehicleRun_StartTime
        ON dbo.VehicleRun (start_time, run_id)
        ON ps_Monthly(start_time);

-- MykiPass  ─ expiry_date → 年度
IF EXISTS (SELECT * FROM sys.indexes
           WHERE name = 'CX_MykiPass_Expiry'
             AND object_id = OBJECT_ID('dbo.MykiPass'))
    DROP INDEX CX_MykiPass_Expiry ON dbo.MykiPass;
CREATE CLUSTERED INDEX CX_MykiPass_Expiry
        ON dbo.MykiPass (expiry_date, pass_id)
        ON ps_Yearly(expiry_date);
GO

/* ---------------------------------------------------------------
   5. 檢視分割結果 (可選)
   --------------------------------------------------------------- */
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
ORDER BY TableName, partition_number;
GO
