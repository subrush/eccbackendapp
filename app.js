const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const app = express();

app.use(bodyParser.json());  // To parse incoming JSON request bodies

// Oracle DB connection setup
const dbConfig = {
    user: 'C##ecc',
    password: 'test',
    connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=XE)))'
};


// Test endpoint
app.get('/', (req, res) => {
    res.send('API is working!');
});

// Server setup
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
// API route to fetch tax performance data
app.get('/tax_performance', async (req, res) => {
  const { year, branch = 'all', page = 1, page_size = 20 } = req.query;

  // Calculate pagination offset and limit
  const offset = (page - 1) * page_size;
  const limit = parseInt(page_size);

  try {
    // Establish a database connection
    const connection = await oracledb.getConnection(dbConfig);

    // SQL query with filters for year, branch, and pagination
    const query = `
      SELECT DISTINCT
        s.typ_sad AS "IMPEX",
        s.ide_cuo_cod || ' - ' || s.ide_cuo_nam AS "OFFICE",
        s.sta AS "status",
        s.dec_cod AS "TWM Dec. Code",
        dec.mot_lic || '/' || NVL(agt_m.asy_cod, SUBSTR(s.agt, 3, 4)) AS "ASY Dec. Code",
        dec.nam AS "Declarant Name",
        s.reg_ser || '-' || s.reg_nbr AS "Reg. No",
        s.typ_sad || ' - ' || s.typ_prc AS "MODEL TYPE",
        s_itm.prc_ext || ' ' || s_itm.prc_nat AS "CPC",
        cp4.dsc || ' // ' || cp3.dsc AS "CPC Description",
        s.bnk_fre AS "BANK PERMIT NUMBER",
        TO_CHAR(s.reg_dat, 'DD/MM/YYYY') AS "Reg. Date (Day/Mon/Year)",
        TO_CHAR(s.ast_dat, 'DD/MM/YYYY') AS "Ass. Date (Day/Mon/Year)",
        cmp.cod || NVL(s.des_crg, s.ept_crg) || s.sad_bac_cod AS "TIN",
        cmp.nam AS "Trader",
        cmp.adr || ' (' || cmp.ad2 || ') (' || cmp.ad3 || ') (' || cmp.ad4 || ') (Tel ' || cmp.tel || ')' AS "Trader Address",
        s_itm.key_itm_nbr AS "Item",
        s_itm.hsc_nb1 AS "HS Code",
        s_itm.ds1 AS "HS Description",
        s_itm.ds3 || ' (' || s_itm.mk1 || ' ' || s_itm.mk2 || ')' AS "Commercial / Brand Name",
        s_itm.TPT AS "BILL OF LANDING",
        cty.cty_dsc AS "Country (Origin)",
        s.ept_nam AS "Country (Consignment)",
        s.des_nam AS "Destination",
        SUM(s_itm.vit_stv) AS "CIF/FOB Value (ETB)",
        SUM(s_itm.INV_AMT_FCX) AS "FOB (FC)",
        s_itm.INV_CUR_COD AS "CURRENCY CODE",
        s.nbr_pck AS "# of packages",
        s.brd_cod AS "MoT Code",
        mot.dsc AS "MoT Description",
        SUM(s_itmsup.qty) AS "Suppl. Quantity",
        SUM(s_itm.wgt_grs) AS "Gross Wt. (Kg)",
        SUM(s_itm.wgt_net) AS "Net Wt. (Kg)",
        ROUND(SUM(NVL(s_itmtax.c01_amt, 0) + NVL(s_itmtax.c01_r_amt, 0)), 2) AS "Duty tax tobe paid (ETB)",
        SUM(NVL(s_itmtax.c01_amt, 0)) AS "Duty tax paid (ETB)",
        ROUND(SUM(NVL(s_itmtax.c03_amt, 0) + NVL(s_itmtax.c03_r_amt, 0)), 2) AS "Excise tax tobe paid (ETB)",
        SUM(NVL(s_itmtax.c03_amt, 0)) AS "Excise tax paid (ETB)",
        ROUND(SUM(NVL(s_itmtax.c04_amt, 0) + NVL(s_itmtax.c04_r_amt, 0)), 2) AS "VAT tobe paid (ETB)",
        SUM(NVL(s_itmtax.c04_amt, 0)) AS "VAT paid (ETB)",
        ROUND(SUM(NVL(s_itmtax.c15_amt, 0) + NVL(s_itmtax.c15_r_amt, 0)), 2) AS "WH tax tobe paid (ETB)",
        SUM(NVL(s_itmtax.c15_amt, 0)) AS "WH tax paid (ETB)",
        ROUND(SUM(NVL(s_itmtax.c05_amt, 0) + NVL(s_itmtax.c05_r_amt, 0)), 2) AS "Sur tax tobe paid (ETB)",
        SUM(NVL(s_itmtax.c05_amt, 0)) AS "Sur tax paid (ETB)",
        ROUND(SUM(NVL(s_itmtax.c12_amt, 0) + NVL(s_itmtax.c12_r_amt, 0)), 2) AS "Social Wel Tax tobe paid (ETB)",
        SUM(NVL(s_itmtax.c12_amt, 0)) AS "Social Wel Tax paid (ETB)",
        ROUND(SUM(NVL(s_itmtax.c01_amt, 0) + NVL(s_itmtax.c01_r_amt, 0)) + 
              SUM(NVL(s_itmtax.c03_amt, 0) + NVL(s_itmtax.c03_r_amt, 0)) +
              SUM(NVL(s_itmtax.c04_amt, 0) + NVL(s_itmtax.c04_r_amt, 0)) +
              SUM(NVL(s_itmtax.c05_amt, 0) + NVL(s_itmtax.c05_r_amt, 0)) +
              SUM(NVL(s_itmtax.c15_amt, 0) + NVL(s_itmtax.c15_r_amt, 0)) +
              SUM(NVL(s_itmtax.c12_amt, 0) + NVL(s_itmtax.c12_r_amt, 0)), 2) AS "Total tax tobe paid (ETB)",
        SUM(NVL(s_itmtax.c01_amt, 0)) + SUM(NVL(s_itmtax.c03_amt, 0)) + SUM(NVL(s_itmtax.c04_amt, 0)) + 
        SUM(NVL(s_itmtax.c05_amt, 0)) + SUM(NVL(s_itmtax.c15_amt, 0)) + SUM(NVL(s_itmtax.c12_amt, 0)) AS "Total tax paid (ETB)"
      FROM sad s
      JOIN sad_itm s_itm ON s.instanceid = s_itm.instanceid
      LEFT JOIN rimm_mot mot ON s.brd_cod = mot.cod
      LEFT JOIN sad_itmsup s_itmsup ON s_itm.instanceid = s_itmsup.instanceid AND s_itm.key_itm_nbr = s_itmsup.key_itm_nbr
      LEFT JOIN rimm_cty cty ON s_itm.org_cty = cty.cty_cod
      LEFT JOIN rimm_cmp cmp ON NVL(s.con_cod, s.exp_cod) = cmp.cod
      LEFT JOIN rimm_dec dec ON s.dec_cod = dec.dec_cod
      LEFT JOIN rimm_agt_asymap agt_m ON s.agt = agt_m.twm_cod
      LEFT JOIN rimm_cp4 cp4 ON s_itm.prc_ext = cp4.cod
      LEFT JOIN rimm_cp3 cp3 ON s_itm.prc_nat = cp3.cod
      LEFT JOIN sad_itmtax s_itmtax ON s_itm.instanceid = s_itmtax.instanceid
          AND s_itm.key_itm_nbr = s_itmtax.key_itm_nbr
      WHERE EXTRACT(YEAR FROM s.ast_dat) = :year
          AND (:branch = 'all' OR s.ide_cuo_cod = :branch)
      GROUP BY s.typ_sad, s.ide_cuo_cod, s.sta, s.dec_cod, dec.mot_lic, dec.nam, s.reg_ser, s.typ_prc, s_itm.prc_ext, 
               cp4.dsc, s.bnk_fre, s.reg_dat, s.ast_dat, cmp.cod, cmp.nam, cmp.adr, s_itm.key_itm_nbr, 
               s_itm.hsc_nb1, s_itm.ds1, s_itm.ds3, cty.cty_dsc, s.ept_nam, s.des_nam, s.nbr_pck, s.brd_cod, mot.dsc
      ORDER BY s.reg_dat DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const binds = { year: parseInt(year), branch, offset, limit };
    
    // Execute the query
    const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    // Send response with data and pagination info
    res.json({
      data: result.rows,
      page: parseInt(page),
      page_size: limit,
      total_records: result.rows.length
    });   
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  } finally {
    try {
      // Close the database connection
      await connection.close();
    } catch (err) {
      console.error('Error closing connection', err);
    }
  }
});

