-- ============================================
-- ActivityLogs Table Creation Script
-- PLENRO System - Audit Logging
-- ============================================

-- Drop table if exists (optional - comment out if you want to preserve data)
-- DROP TABLE IF EXISTS ActivityLogs;

-- Create ActivityLogs table
CREATE TABLE ActivityLogs (
    LogID           INT IDENTITY(1,1) PRIMARY KEY,
    UserID          NVARCHAR(255) NOT NULL,
    UserName        NVARCHAR(255) NOT NULL,
    ActionType      NVARCHAR(50) NOT NULL,        -- CREATE, UPDATE, DELETE
    TableName       NVARCHAR(100) NOT NULL,
    RecordID        NVARCHAR(100) NULL,
    OldValues       NVARCHAR(MAX) NULL,           -- JSON string of old values
    NewValues       NVARCHAR(MAX) NULL,           -- JSON string of new values
    IPAddress       NVARCHAR(50) NULL,
    UserAgent       NVARCHAR(MAX) NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index on CreatedAt for time-based queries (most common - latest logs)
CREATE NONCLUSTERED INDEX IX_ActivityLogs_CreatedAt 
ON ActivityLogs (CreatedAt DESC);

-- Index on UserID for filtering by user
CREATE NONCLUSTERED INDEX IX_ActivityLogs_UserID 
ON ActivityLogs (UserID);

-- Index on TableName for filtering by affected table
CREATE NONCLUSTERED INDEX IX_ActivityLogs_TableName 
ON ActivityLogs (TableName);

-- Index on ActionType for filtering by action type
CREATE NONCLUSTERED INDEX IX_ActivityLogs_ActionType 
ON ActivityLogs (ActionType);

-- Composite index for common query patterns (user + date range)
CREATE NONCLUSTERED INDEX IX_ActivityLogs_UserID_CreatedAt 
ON ActivityLogs (UserID, CreatedAt DESC);

-- Composite index for table + action filtering
CREATE NONCLUSTERED INDEX IX_ActivityLogs_TableName_ActionType 
ON ActivityLogs (TableName, ActionType);

-- ============================================
-- Verify Creation
-- ============================================
SELECT 
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('ActivityLogs')
ORDER BY c.column_id;

-- Show indexes
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('ActivityLogs')
  AND i.name IS NOT NULL;
