const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const bodyparser = require("body-parser");

const app = express();
const PORT = 3001;

// app.use(express.json());
app.use(bodyparser.json());

function connectWithRetry() {
  const connection = mysql.createConnection({
    host: 'mysql',
    // host: 'localhost',
    user: 'root',
    password: 'rootpassword',
    // password:"pass@word1",
    database: 'salesdb'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Failed to connect to MySQL. Retrying in 5 seconds...', err);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('Connected to MySQL successfully!');
      setupRoutes(connection);
    }
  });

  connection.on('error', (err) => {
    console.error('MySQL connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      connectWithRetry();
    } else {
      throw err;
    }
  });
}

function setupRoutes(db) {
  app.get('/sales', (req, res) => {
    db.query('SELECT * FROM sales', (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Error fetching sales data' });
      } else {
        res.json(results);
      }
    });
  });

  app.post('/sales', async (req, res) => {
    const { productId, customerId, quantity } = req.body;
    
    try {
      const productRes = await axios.get(`http://productinfo:3002/products/${productId}`);
      const customerRes = await axios.get(`http://customerinfo:3003/customers/${customerId}`);
      
      if (productRes.data && customerRes.data) {
        db.query('INSERT INTO sales (product_id, customer_id, quantity) VALUES (?, ?, ?)', 
          [productId, customerId, quantity], 
          (err, result) => {
            if (err) {
              res.status(500).json({ error: 'Error creating sale' });
            } else {
              res.status(201).json({ message: 'Sale created successfully', id: result.insertId });
            }
          }
        );
      } else {
        res.status(400).json({ error: 'Invalid product or customer' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error processing sale' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Sales service running on port ${PORT}`);
  });
}

connectWithRetry();