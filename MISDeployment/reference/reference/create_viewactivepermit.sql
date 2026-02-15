SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW View_activepermit
AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY cp.ph_dto) AS num_row, 
    c.ph_cname, 
    cp.ph_mun, 
    cp.ph_brgy, 
    cp.ph_volume, 
    cp.ph_area, 
    cp.ph_dfrom, 
    cp.ph_dto, 
    cp.ph_permitno, 
    c.ph_contact, 
    cp.ph_source
FROM tbl_clientpermit AS cp
INNER JOIN tbl_client AS c ON cp.ph_lnkctrl = c.ph_ctrlno
WHERE cp.ph_dto >= CAST(GETDATE() AS DATE)
  AND cp.ph_source IS NOT NULL 
  AND cp.ph_cancelled = 0;
GO