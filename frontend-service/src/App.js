import React, { useState } from 'react';

function App() {
  const [itemName, setItemName] = useState('');
  const [message, setMessage] = useState('');

  const createOrder = async () => {
    if (!itemName) {
      setMessage('Please enter an item name.');
      return;
    }
    try {
      // In a real GKE deployment, you'd use the internal service name,
      // e.g., 'http://order-service:3001/orders'
      const response = await fetch('http://localhost:3001/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Order created successfully! Order ID: ${data.order.id}`);
        setItemName('');
      } else {
        throw new Error(data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold mb-6 text-center text-teal-400">Microservice Order System</h1>
        <p className="text-gray-400 mb-8 text-center">Create a new order. This will trigger a notification via Kafka.</p>
        
        <div className="flex flex-col gap-6">
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter Item Name"
            className="bg-gray-700 text-white placeholder-gray-500 p-4 rounded-md border-2 border-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
          />
          <button
            onClick={createOrder}
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-md shadow-lg transition-transform transform hover:scale-105"
          >
            Create Order
          </button>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-gray-700 text-center rounded-md text-teal-300 border border-teal-500">
            {message}
          </div>
        )}
      </div>
      <footer className="mt-12 text-gray-500 text-sm">
        <p>Frontend Service</p>
      </footer>
    </div>
  );
}

export default App;

