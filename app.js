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

//Example 1: Fetch Revenue Collection Data by Tax Type
app.get('/api/revenue/:tax_type', async (req, res) => {
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const taxType = req.params.tax_type;
        const query = `SELECT * FROM Revenue_Collection WHERE tax_type = :tax_type`;

        // Execute the query and pass the tax type parameter
        const result = await connection.execute(query, [taxType]);

        // Send the result back as a JSON response
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching revenue data');
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

//Example 2: Fetch Law Enforcement Data
app.get('/api/law-enforcement', async (req, res) => {
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const query = `SELECT * FROM taxes`;

        // Execute the query
        const result = await connection.execute(query);

        // Send the result back as a JSON response
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching law enforcement data');
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

//Filtered Revenue Data by Date:
app.get('/api/revenue/date', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT * FROM Revenue_Collection WHERE collection_date BETWEEN :startDate AND :endDate`,
            [startDate, endDate]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Error fetching data');
    } finally {
        await connection.close();
    }
});

app.get('/api/tax_collected/branch', async (req, res) => {
    const { selectedYear } = req.query;

    try {
        // Establish a connection to the Oracle DB
        const connection = await oracledb.getConnection(dbConfig);
        
        // SQL query to aggregate tax data by branch name for the selected year
        const result = await connection.execute(
            `SELECT 
                branch_name, 
                SUM(duty_tax_to_be_paid_etb) AS total_duty_tax_to_be_paid,
                SUM(duty_tax_paid_etb) AS total_duty_tax_paid,
                SUM(vat_to_be_paid_etb) AS total_vat_to_be_paid,
                SUM(vat_paid_etb) AS total_vat_paid,
                SUM(wh_tax_to_be_paid_etb) AS total_wh_tax_to_be_paid,
                SUM(wh_tax_paid_etb) AS total_wh_tax_paid,
                SUM(total_tax_paid_etb) AS total_tax_paid
            FROM 
                taxes
            WHERE 
                EXTRACT(YEAR FROM reg_date) = :selectedYear
            GROUP BY 
                branch_name
            ORDER BY 
                branch_name`,
            [selectedYear]
        );

        // Return the result as JSON
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    } finally {
        // Ensure the connection is closed, even in case of error
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection', err);
            }
        }
    }
});
