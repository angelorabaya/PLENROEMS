-- =============================================
-- Create Document Outgoing Table
-- Mirror structure of tbl_dmsreceiving for outgoing documents
-- =============================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tbl_dmsoutgoing')
BEGIN
    CREATE TABLE [dbo].[tbl_dmsoutgoing] (
        [dms_ctrlno]      INT IDENTITY(1,1) PRIMARY KEY,
        [dms_date]        DATETIME NOT NULL DEFAULT GETDATE(),
        [dms_control]     VARCHAR(50) NOT NULL,
        [dms_destination] VARCHAR(255) NULL,  -- Where the document is being sent (replaces dms_source)
        [dms_empid]       INT NULL,           -- Sender/Releasing officer (FK to tbl_enroemp)
        [dms_desc]        VARCHAR(MAX) NULL,  -- Description
        [dms_type]        VARCHAR(100) NULL,  -- Document type
        [dms_purpose]     VARCHAR(200) NULL   -- Purpose of the document
    );
    
    PRINT 'Table tbl_dmsoutgoing created successfully.';
END
ELSE
BEGIN
    PRINT 'Table tbl_dmsoutgoing already exists.';
END
GO

-- =============================================
-- Create Indexes for faster query execution
-- =============================================

-- Index on dms_date for filtering by date (used in daily records query)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_dmsoutgoing_date' AND object_id = OBJECT_ID('tbl_dmsoutgoing'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_dmsoutgoing_date] 
    ON [dbo].[tbl_dmsoutgoing] ([dms_date] DESC)
    INCLUDE ([dms_ctrlno], [dms_control], [dms_destination], [dms_empid], [dms_desc], [dms_type], [dms_purpose]);
    
    PRINT 'Index IX_dmsoutgoing_date created successfully.';
END
GO

-- Index on dms_control for unique control number lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_dmsoutgoing_control' AND object_id = OBJECT_ID('tbl_dmsoutgoing'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_dmsoutgoing_control] 
    ON [dbo].[tbl_dmsoutgoing] ([dms_control]);
    
    PRINT 'Index IX_dmsoutgoing_control created successfully.';
END
GO

-- Index on dms_empid for employee-based queries and joins
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_dmsoutgoing_empid' AND object_id = OBJECT_ID('tbl_dmsoutgoing'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_dmsoutgoing_empid] 
    ON [dbo].[tbl_dmsoutgoing] ([dms_empid]);
    
    PRINT 'Index IX_dmsoutgoing_empid created successfully.';
END
GO

-- =============================================
-- Verify table and index creation
-- =============================================

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tbl_dmsoutgoing'
ORDER BY ORDINAL_POSITION;
GO

SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    c.name AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('tbl_dmsoutgoing')
ORDER BY i.name, ic.key_ordinal;
GO
