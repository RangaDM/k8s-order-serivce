const express = require('express');
const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// NOTE: All prom-client code has been removed.
// Istio's sidecar proxy will handle metrics automatically.

// Kafka connection
const kafka = new Kafka({
  clientId: 'order-app',
  brokers: ['kafka-service:9092'], // Using Kubernetes service DNS name
});
const producer = kafka.producer();

// PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST, // Will be 'order-db' from env var
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Function to create the orders table
const initializeDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database table "orders" is ready.');
  } finally {
    client.release();
  }
};

app.post('/orders', async (req, res) => {
  const { itemName } = req.body;
  if (!itemName) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  try {
    const dbRes = await pool.query(
      'INSERT INTO orders (item_name) VALUES ($1) RETURNING *',
      [itemName]
    );
    const newOrder = dbRes.rows[0];

    await producer.send({
      topic: 'order-created',
      messages: [{ value: JSON.stringify(newOrder) }],
    });

    res.status(201).json({ message: 'Order created', order: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const startServer = async () => {
  await initializeDb();
  await producer.connect();
  app.listen(3001, () => {
    console.log('Order service API listening on port 3001');
  });
};

startServer();

