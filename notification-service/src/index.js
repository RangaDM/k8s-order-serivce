const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

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
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Notification database initialized successfully.');
  } catch (err) {
    console.error('Error initializing notification database:', err.stack);
  }
};


// Kafka Consumer
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: ['kafka-service:9092']
});
const consumer = kafka.consumer({ groupId: 'notification-group' });

const run = async () => {
  await initDb();
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-created', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const order = JSON.parse(message.value.toString());
        console.log(`Received order: ${order.orderId}`);
        
        const notificationMessage = `Notification: A new order for '${order.itemName}' (ID: ${order.orderId}) has been created.`;

        // Save notification to its own database
        await pool.query(
          'INSERT INTO notifications (message) VALUES ($1)',
          [notificationMessage]
        );
        console.log('Notification saved to database.');
        
        // In a real app, you would send an email, push notification, etc. here.
        console.log(notificationMessage);

      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
  });
};

run().catch(console.error);

