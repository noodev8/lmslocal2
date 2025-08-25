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
const loginRoute = require('./routes/login');
const registerRoute = require('./routes/register');
const updateProfileRoute = require('./routes/update-profile');
const forgotPasswordRoute = require('./routes/forgot-password');
const resetPasswordRoute = require('./routes/reset-password');
const verifyEmailRoute = require('./routes/verify-email');
const resendVerificationRoute = require('./routes/resend-verification');
const mycompetitionsRoute = require('./routes/mycompetitions');
const createCompetitionRoute = require('./routes/create-competition');
const teamListsRoute = require('./routes/team-lists');
const getTeamsRoute = require('./routes/get-teams');
const createRoundRoute = require('./routes/create-round');
const getRoundsRoute = require('./routes/get-rounds');
const addFixtureRoute = require('./routes/add-fixture');
const getFixturesRoute = require('./routes/get-fixtures');
const modifyFixtureRoute = require('./routes/modify-fixture');
const setFixtureResultRoute = require('./routes/set-fixture-result');
// const lockUnlockRoundRoute = require('./routes/lock-unlock-round'); // DISABLED: Round status removed
const lockUnlockCompetitionRoute = require('./routes/lock-unlock-competition');
const getCompetitionBySlugRoute = require('./routes/get-competition-by-slug');
const joinCompetitionBySlugRoute = require('./routes/join-competition-by-slug');
const verifyPlayerTokenRoute = require('./routes/verify-player-token');
const getPlayerCurrentRoundRoute = require('./routes/get-player-current-round');
const deleteFixtureRoute = require('./routes/delete-fixture');
const setPickRoute = require('./routes/set-pick');
const calculateResultsRoute = require('./routes/calculate-results');
const joinCompetitionRoute = require('./routes/join-competition');

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

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    return_code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later"
  }
});
app.use(limiter);

// Aggressive rate limiting for database-heavy endpoints
const dbIntensiveLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Max 5 requests per 10 seconds per IP
  message: {
    return_code: "RATE_LIMIT_EXCEEDED",
    message: "Too many database requests. Please wait 10 seconds before trying again."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + endpoint to prevent rapid clicks on same endpoint
    return `${req.ip}-${req.path}`;
  }
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3002',
  'http://localhost:3003'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CLIENT_URL === origin) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Rate limiting will be applied within the competition router for specific endpoints

// Routes
app.use('/login', loginRoute);
app.use('/register', registerRoute);
app.use('/update-profile', updateProfileRoute);
app.use('/forgot-password', forgotPasswordRoute);
app.use('/reset-password', resetPasswordRoute);
app.use('/verify-email', verifyEmailRoute);
app.use('/resend-verification', resendVerificationRoute);
app.use('/mycompetitions', mycompetitionsRoute);
app.use('/create-competition', createCompetitionRoute);
app.use('/team-lists', teamListsRoute);
app.use('/get-teams', getTeamsRoute);
app.use('/create-round', createRoundRoute);
app.use('/get-rounds', getRoundsRoute);
app.use('/add-fixture', addFixtureRoute);
app.use('/get-fixtures', getFixturesRoute);
app.use('/modify-fixture', modifyFixtureRoute);
app.use('/set-fixture-result', setFixtureResultRoute);
// app.use('/lock-unlock-round', lockUnlockRoundRoute); // DISABLED: Round status removed
app.use('/lock-unlock-competition', lockUnlockCompetitionRoute);
app.use('/get-competition-by-slug', getCompetitionBySlugRoute);
app.use('/join-competition-by-slug', joinCompetitionBySlugRoute);
app.use('/verify-player-token', verifyPlayerTokenRoute);
app.use('/get-player-current-round', getPlayerCurrentRoundRoute);
app.use('/delete-fixture', deleteFixtureRoute);
app.use('/set-pick', setPickRoute);
app.use('/calculate-results', calculateResultsRoute);
app.use('/join-competition', joinCompetitionRoute);

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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions  
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('Memory at crash:', process.memoryUsage());
  console.error('========================');
  // Log but don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle process signals
process.on('SIGTERM', () => {
  console.log('=== SIGTERM received ===');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('=== SIGINT received ===');
  process.exit(0);
});

// Handle exit
process.on('exit', (code) => {
  console.log(`=== Process exiting with code ${code} ===`);
});

module.exports = app;