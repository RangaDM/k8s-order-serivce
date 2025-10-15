const express = require('express');
const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// PostgreSQL Client - Now configured from environment variables
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432,
});

// Initialize DB
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Order database initialized successfully.');
  } catch (err) {
    console.error('Error initializing order database:', err.stack);
  }
};

// Kafka Producer
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka:9092']
});
const producer = kafka.producer();

app.post('/orders', async (req, res) => {
  try {
    const { itemName } = req.body;
    if (!itemName) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    // 1. Save to database
    const result = await pool.query(
      'INSERT INTO orders (item_name) VALUES ($1) RETURNING *',
      [itemName]
    );
    const newOrder = result.rows[0];
    console.log('Order saved:', newOrder);

    // 2. Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'order-created',
      messages: [
        { value: JSON.stringify({ orderId: newOrder.id, itemName: newOrder.item_name }) },
      ],
    });
    console.log('Order event sent to Kafka:', newOrder);
    await producer.disconnect();

    res.status(201).json({ message: 'Order created', order: newOrder });
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
  initDb();
});

