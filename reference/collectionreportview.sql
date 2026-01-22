CREATE VIEW View_collectionreport
AS
SELECT
    -- Time Period
    YEAR(h.aop_ordate) AS [Year],
    DATENAME(MONTH, h.aop_ordate) AS [Month_Name],
    MONTH(h.aop_ordate) AS [Month_No], -- Useful for sorting

    -- 1. Share Columns (Equivalent to View_share)
    -- Column B: 30% (PROVINCE)
    CAST(SUM(CASE WHEN d.aop_share = 1 THEN d.aop_total ELSE 0 END) * 0.3 AS DECIMAL(18,2)) AS [Share_Prov_30],
    -- Column C: 30% (MUNICIPALITIES)
    CAST(SUM(CASE WHEN d.aop_share = 1 THEN d.aop_total ELSE 0 END) * 0.3 AS DECIMAL(18,2)) AS [Share_Mun_30],
    -- Column D: 40% (BARANGAYS)
    CAST(SUM(CASE WHEN d.aop_share = 1 THEN d.aop_total ELSE 0 END) * 0.4 AS DECIMAL(18,2)) AS [Share_Brgy_40],
    -- Column E: Volume
    SUM(CASE WHEN d.aop_share = 1 THEN d.aop_volume ELSE 0 END) AS [Share_Volume],

    -- 2. MGB Extract Columns (Equivalent to View_MGBExtract)
    -- Column F: 30% (PROVINCE)
    SUM(CASE WHEN d.aop_item = 'Extraction Fee (30% Provincial Share)' THEN d.aop_total ELSE 0 END) AS [MGB_Prov_30],
    -- Column G: Volume
    SUM(CASE WHEN d.aop_item = 'Extraction Fee (30% Provincial Share)' THEN d.aop_volume ELSE 0 END) AS [MGB_Volume],

    -- 3. Outbound Fee (Equivalent to View_outbound)
    -- Column H
    SUM(CASE WHEN h.aop_nature = 'Shipment Fees–Going Out of the Province' THEN d.aop_total ELSE 0 END) AS [Outbound_Fee],

    -- 4. Inbound Fee (Equivalent to View_inbound)
    -- Column I
    SUM(CASE WHEN h.aop_nature = 'Shipment Fees–Entering the Province' THEN d.aop_total ELSE 0 END) AS [Inbound_Fee],

    -- 5. ADMIN Fee (Equivalent to View_adminfee)
    -- Column J
    SUM(CASE WHEN d.aop_item LIKE 'ADMIN FEE%' THEN d.aop_total ELSE 0 END) AS [Admin_Fee],

    -- 6. Ecosystem Fee (Equivalent to View_ecosystemfee)
    -- Column K
    SUM(CASE WHEN d.aop_item LIKE 'ECOSYSTEM FEE%' THEN d.aop_total ELSE 0 END) AS [Ecosystem_Fee],

    -- 7. Admin & Ecosystem Fee (Equivalent to View_adminecosystemfee)
    -- Column L
    SUM(CASE WHEN d.aop_item LIKE 'ADMIN AND ECOSYSTEM FEE%' THEN d.aop_total ELSE 0 END) AS [Admin_Ecosystem_Fee],

    -- 8. Other Misc. Fee (Calculated: Gross - Sum of all other specific fees)
    -- Column M
    (SUM(d.aop_total) - (
        SUM(CASE WHEN d.aop_share = 1 THEN d.aop_total ELSE 0 END) + -- Subtracts full share (B+C+D)
        SUM(CASE WHEN d.aop_item = 'Extraction Fee (30% Provincial Share)' THEN d.aop_total ELSE 0 END) + -- F
        SUM(CASE WHEN h.aop_nature = 'Shipment Fees–Going Out of the Province' THEN d.aop_total ELSE 0 END) + -- H
        SUM(CASE WHEN h.aop_nature = 'Shipment Fees–Entering the Province' THEN d.aop_total ELSE 0 END) + -- I
        SUM(CASE WHEN d.aop_item LIKE 'ADMIN FEE%' THEN d.aop_total ELSE 0 END) + -- J
        SUM(CASE WHEN d.aop_item LIKE 'ECOSYSTEM FEE%' THEN d.aop_total ELSE 0 END) + -- K
        SUM(CASE WHEN d.aop_item LIKE 'ADMIN AND ECOSYSTEM FEE%' THEN d.aop_total ELSE 0 END) + -- L
        SUM(CASE WHEN d.aop_item LIKE '%Stickers%' THEN d.aop_total ELSE 0 END) + -- N
        SUM(CASE WHEN d.aop_item LIKE 'Trucks%' THEN d.aop_total ELSE 0 END) + -- O
        SUM(CASE WHEN h.aop_nature = 'Fines And Penalties' THEN d.aop_total ELSE 0 END) -- P
    )) AS [Other_Misc_Fee],

    -- 9. Sticker Fee (Equivalent to View_stickers)
    -- Column N
    SUM(CASE WHEN d.aop_item LIKE '%Stickers%' THEN d.aop_total ELSE 0 END) AS [Sticker_Fee],

    -- 10. Conveyance Fee (Equivalent to View_conveyances)
    -- Column O
    SUM(CASE WHEN d.aop_item LIKE 'Trucks%' THEN d.aop_total ELSE 0 END) AS [Reg_Conveyances_Fee],

    -- 11. Penalties (Equivalent to View_penalties)
    -- Column P
    SUM(CASE WHEN h.aop_nature = 'Fines And Penalties' THEN d.aop_total ELSE 0 END) AS [Penalties_Fee],

    -- 12. Net Share (Calculated: Gross - Municipal Share - Barangay Share)
    -- Column Q
    (SUM(d.aop_total) -
        (SUM(CASE WHEN d.aop_share = 1 THEN d.aop_total ELSE 0 END) * 0.3) -
        (SUM(CASE WHEN d.aop_share = 1 THEN d.aop_total ELSE 0 END) * 0.4)
    ) AS [Net_Share],

    -- 13. Gross Total (Equivalent to View_gross)
    -- Column R
    SUM(d.aop_total) AS [Gross_Total]

FROM
    dbo.tbl_assessmenthdr h
    INNER JOIN dbo.tbl_assessmentdtl d ON h.aop_control = d.aop_control
WHERE
    h.aop_orno IS NOT NULL
GROUP BY
    YEAR(h.aop_ordate),
    MONTH(h.aop_ordate),
    DATENAME(MONTH, h.aop_ordate);