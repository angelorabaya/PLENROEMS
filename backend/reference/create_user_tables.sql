-- =============================================
-- PLENRO User Management - Create Tables
-- Run this script to create user management tables
-- =============================================

-- Create Roles Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbl_roles' AND xtype='U')
BEGIN
    CREATE TABLE tbl_roles (
        role_id INT IDENTITY(1,1) PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        role_desc VARCHAR(200),
        role_created DATETIME DEFAULT GETDATE()
    );
    
    -- Insert default roles
    INSERT INTO tbl_roles (role_name, role_desc) VALUES 
        ('admin', 'Full system access including user management'),
        ('manager', 'View reports, manage permits, no system settings'),
        ('clerk', 'Create and edit records, no delete or reports'),
        ('viewer', 'Read-only access to data');
    
    PRINT 'tbl_roles created with default roles';
END
ELSE
BEGIN
    PRINT 'tbl_roles already exists';
END
GO

-- Create Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbl_users' AND xtype='U')
BEGIN
    CREATE TABLE tbl_users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        user_name VARCHAR(50) NOT NULL UNIQUE,
        user_pass VARCHAR(255) NOT NULL,
        user_fullname VARCHAR(100),
        user_role_id INT NOT NULL DEFAULT 4,
        user_active BIT NOT NULL DEFAULT 1,
        user_created DATETIME DEFAULT GETDATE(),
        user_updated DATETIME NULL,
        CONSTRAINT FK_users_roles FOREIGN KEY (user_role_id) 
            REFERENCES tbl_roles(role_id)
    );
    
    -- Create index for faster lookups
    CREATE INDEX IX_users_username ON tbl_users(user_name);
    CREATE INDEX IX_users_role ON tbl_users(user_role_id);
    
    PRINT 'tbl_users created successfully';
END
ELSE
BEGIN
    PRINT 'tbl_users already exists';
END
GO

-- Verify tables created
SELECT 'tbl_roles' as TableName, COUNT(*) as RecordCount FROM tbl_roles
UNION ALL
SELECT 'tbl_users' as TableName, COUNT(*) as RecordCount FROM tbl_users;
GO
