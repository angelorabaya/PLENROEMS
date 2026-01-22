SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW View_applicants
AS
SELECT 
    ph_ctrlno,
    ph_cname,
    ph_address1,
    ph_address2,
    ph_TIN,
    ph_contact,
    ph_tpermit
FROM tbl_client
-- Filtering out both NULL and Empty Strings
WHERE ISNULL(ph_tpermit, '') <> '';
GO