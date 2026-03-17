CREATE TABLE tbl_leaveapplications (
    la_ctrlno INT PRIMARY KEY IDENTITY(1,1),
    la_employeeid INT NOT NULL,
    la_leavetypeid INT NOT NULL,
    la_dateoffiling DATETIME DEFAULT GETDATE(),
    la_totaldaysapplied DECIMAL(4, 2) NOT NULL,
    
    CONSTRAINT FK_EmployeeLeave FOREIGN KEY (la_employeeid) REFERENCES tbl_enroemp(emp_ctrlno)
);

CREATE TABLE tbl_leaveapplicationdates (
    lad_ctrlno INT PRIMARY KEY IDENTITY(1,1),
    lad_applicationid INT NOT NULL,
    lad_specificdate DATE NOT NULL,
    lad_ishalfday BIT DEFAULT 0,
    
    CONSTRAINT FK_ApplicationDetail FOREIGN KEY (lad_applicationid) 
        REFERENCES tbl_leaveapplications(la_ctrlno) ON DELETE CASCADE
);

CREATE TABLE tbl_leavetypes (
    lt_leavetypeid INT PRIMARY KEY IDENTITY(1,1),
    lt_typename NVARCHAR(100) NOT NULL,
    lt_isactive BIT DEFAULT 1
);

INSERT INTO tbl_leavetypes (lt_typename) VALUES 
('Vacation Leave'),
('Mandatory/Forced Leave'),
('Sick Leave'),
('Maternity Leave'),
('Paternity Leave'),
('Special Privilege Leave'),
('Solo Parent Leave'),
('Study Leave'),
('10-Day VAWC Leave'),
('Rehabilitation Privilege'),
('Special Leave Benefits for Women'),
('Emergency (Calamity) Leave'),
('Adoption Leave'),
('Others');

CREATE INDEX IX_tbl_leaveapplications_EmployeeID ON tbl_leaveapplications(la_employeeid);
CREATE INDEX IX_tbl_leaveapplications_LeaveTypeID ON tbl_leaveapplications(la_leavetypeid);
CREATE INDEX IX_tbl_leaveapplications_DateOfFiling ON tbl_leaveapplications(la_dateoffiling);
CREATE INDEX IX_tbl_leaveapplicationdates_Date ON tbl_leaveapplicationdates(lad_specificdate);

CREATE UNIQUE INDEX UIX_Employee_Date_Unique 
ON tbl_leaveapplicationdates(lad_specificdate) 
INCLUDE (lad_applicationid); 

ALTER TABLE tbl_leaveapplications 
ADD CONSTRAINT FK_LeaveType 
FOREIGN KEY (la_leavetypeid) REFERENCES tbl_leavetypes(lt_leavetypeid);

-- If tbl_enroemp doesn't exist yet, it's defined as below, but likely it already exists.
-- Please ensure the following table exists:
-- CREATE TABLE tbl_enroemp(
-- 	emp_ctrlno int IDENTITY(1,1) NOT NULL,
-- 	emp_name nvarchar(70) NOT NULL,
--  CONSTRAINT PK_tbl_enroemp PRIMARY KEY CLUSTERED (emp_ctrlno ASC)
-- )
