const express = require('express');
const cardRoutes = require('./routes/cardRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register Routes
app.use('/api/cards', cardRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

module.exports = app;