-- =============================================
-- PLENRO User Management - Migrate Users
-- Run this AFTER running create_user_tables.sql
-- Migrates existing users from tbl_login to tbl_users
-- =============================================

-- Check if migration is needed
DECLARE @existingCount INT;
SELECT @existingCount = COUNT(*) FROM tbl_users;

IF @existingCount = 0
BEGIN
    PRINT 'Starting user migration from tbl_login to tbl_users...';
    
    -- Get the default role (viewer = 4, or use admin = 1 for first user)
    DECLARE @defaultRoleId INT = 4; -- viewer role
    DECLARE @adminRoleId INT = 1;   -- admin role
    
    -- Insert users from tbl_login
    -- First user gets admin role, rest get viewer role
    INSERT INTO tbl_users (user_name, user_pass, user_fullname, user_role_id, user_active)
    SELECT 
        log_user,
        log_pass,  -- Note: These are plain-text, should be hashed later
        COALESCE(log_cname, log_user),
        CASE 
            WHEN ROW_NUMBER() OVER (ORDER BY log_ctrlno) = 1 THEN @adminRoleId
            ELSE @defaultRoleId
        END,
        1
    FROM tbl_login
    WHERE log_user IS NOT NULL AND log_user != '';
    
    DECLARE @migratedCount INT;
    SELECT @migratedCount = @@ROWCOUNT;
    
    PRINT CONCAT('Successfully migrated ', @migratedCount, ' users from tbl_login');
    PRINT 'NOTE: First user has been assigned admin role, others have viewer role';
    PRINT 'You may want to update roles as needed using:';
    PRINT '  UPDATE tbl_users SET user_role_id = 1 WHERE user_name = ''USERNAME'';';
END
ELSE
BEGIN
    PRINT CONCAT('Migration skipped: tbl_users already has ', @existingCount, ' users');
END
GO

-- Show migrated users
SELECT 
    u.user_id,
    u.user_name,
    u.user_fullname,
    r.role_name,
    u.user_active,
    u.user_created
FROM tbl_users u
INNER JOIN tbl_roles r ON u.user_role_id = r.role_id
ORDER BY u.user_id;
GO
