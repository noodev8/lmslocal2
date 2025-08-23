/*
=======================================================================================================================================
LMSLocal Express Server
=======================================================================================================================================
Purpose: Main Express server for Last Man Standing application
Port: 3015
Database: PostgreSQL
=======================================================================================================================================
*/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const healthRoute = require('./routes/health');
const authRoute = require('./routes/auth');
const competitionRoute = require('./routes/competition');

const app = express();
const PORT = process.env.PORT || 3015;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    return_code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later"
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRoute);
app.use('/auth', authRoute);
app.use('/competitions', competitionRoute);

// Default route for testing
app.get('/', (req, res) => {
  res.json({
    return_code: "SUCCESS",
    message: "LMSLocal API Server",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    return_code: "ENDPOINT_NOT_FOUND",
    message: "Endpoint not found"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    return_code: "SERVER_ERROR",
    message: "Internal server error"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================================`);
  console.log(`LMSLocal Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`=======================================================================`);
});

module.exports = app;