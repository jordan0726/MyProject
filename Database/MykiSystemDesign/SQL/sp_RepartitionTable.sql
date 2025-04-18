/*==================================================================
   sp_RepartitionTable
   ‑ 自動把指定資料表的 PK 轉成分割區對齊的 clustered index
   ‑ 並重建 NONCLUSTERED PK + 還原所有外鍵
   ================================================================*/
IF OBJECT_ID('dbo.sp_RepartitionTable') IS NOT NULL
    DROP PROCEDURE dbo.sp_RepartitionTable;
GO
CREATE PROCEDURE dbo.sp_RepartitionTable
      @TableName      sysname               -- 'dbo.Trip'
    , @PartitionKey   sysname               -- 'touch_on_time'
    , @SchemeName     sysname               -- 'ps_Monthly'
    , @PKCols         nvarchar(max)         -- '(trip_id)'
AS
BEGIN
    SET NOCOUNT ON;

    /*–––– 0. 解析 schema 與 table 名 ––––*/
    DECLARE @schema sysname, @table sysname;
    SELECT @schema = PARSENAME(@TableName,2),
           @table  = PARSENAME(@TableName,1);

    IF @schema IS NULL SET @schema = 'dbo';
    SET @TableName = QUOTENAME(@schema)+'.'+QUOTENAME(@table);

    /*–––– 1. 先把所有參考此表 PK 的外鍵抓出來 ––––*/
    DECLARE @FKDrop  nvarchar(max) = N'',
            @FKReAdd nvarchar(max) = N'';

    ;WITH fk AS (
        SELECT  fk.name,
                ps = QUOTENAME(SCHEMA_NAME(OBJECT_SCHEMA_ID(fk.parent_object_id))),
                pt = QUOTENAME(OBJECT_NAME(fk.parent_object_id)),
                cols = STUFF((
                        SELECT ','+QUOTENAME(pc.name)
                        FROM   sys.foreign_key_columns fkc2
                        JOIN   sys.columns pc
                               ON pc.object_id = fkc2.parent_object_id
                              AND pc.column_id = fkc2.parent_column_id
                        WHERE  fkc2.constraint_object_id = fk.object_id
                        ORDER BY fkc2.constraint_column_id
                        FOR XML PATH(''), TYPE).value('.','nvarchar(max)'),1,1,''),
                refcols = STUFF((
                        SELECT ','+QUOTENAME(rc.name)
                        FROM   sys.foreign_key_columns fkc3
                        JOIN   sys.columns rc
                               ON rc.object_id = fkc3.referenced_object_id
                              AND rc.column_id = fkc3.referenced_column_id
                        WHERE  fkc3.constraint_object_id = fk.object_id
                        ORDER BY fkc3.constraint_column_id
                        FOR XML PATH(''), TYPE).value('.','nvarchar(max)'),1,1,'')
        FROM sys.foreign_keys fk
        WHERE fk.referenced_object_id = OBJECT_ID(@TableName)
    )
    SELECT
      @FKDrop  = STRING_AGG(
            N'ALTER TABLE '+ps+'.'+pt
          + N' DROP CONSTRAINT '+QUOTENAME(name)+';', CHAR(13)+CHAR(10)),
      @FKReAdd = STRING_AGG(
            N'ALTER TABLE '+ps+'.'+pt
          + N' ADD CONSTRAINT '+QUOTENAME(name)
          + N' FOREIGN KEY('+cols+') REFERENCES '+@TableName+'('+refcols+');', CHAR(13)+CHAR(10))
    FROM fk;

    EXEC (@FKDrop);

    /*–––– 2. 刪掉目前 PK (如果有) ––––*/
    DECLARE @pkName sysname, @sql nvarchar(max);

    SELECT @pkName = kc.name
    FROM   sys.key_constraints kc
    WHERE  kc.parent_object_id = OBJECT_ID(@TableName)
      AND  kc.type = 'PK';

    IF @pkName IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE '+@TableName
                 + N' DROP CONSTRAINT '+QUOTENAME(@pkName)+';';
        EXEC (@sql);
    END

    /*–––– 3. 建立分割區對齊的 CLUSTERED Index ––––*/
    SET @sql = N'CREATE UNIQUE CLUSTERED INDEX CX_'
             + REPLACE(@table,'[','')
             + N'_'+@PartitionKey
             + N' ON '+@TableName
             + N' ('+QUOTENAME(@PartitionKey)+', '+STUFF(@PKCols,1,1,N'')+') '
             + N' ON '+@SchemeName+'('+QUOTENAME(@PartitionKey)+');';
    EXEC (@sql);

    /*–––– 4. 補回 NONCLUSTERED PK ––––*/
    SET @sql = N'ALTER TABLE '+@TableName
             + N' ADD CONSTRAINT PK_'+REPLACE(@table,'[','')
             + N' PRIMARY KEY NONCLUSTERED '+@PKCols+';';
    EXEC (@sql);

    /*–––– 5. 把 FK 全部加回來 ––––*/
    EXEC (@FKReAdd);
END
GO
