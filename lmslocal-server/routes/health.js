/*
=======================================================================================================================================
API Route: health
=======================================================================================================================================
Method: POST
Purpose: Health check endpoint to verify server and database connectivity
=======================================================================================================================================
Request Payload:
{
  // No payload required
}

Success Response:
{
  "return_code": "SUCCESS",                // string, always "SUCCESS" when healthy
  "status": "healthy",                     // string, health status description
  "timestamp": "2025-01-01T12:00:00.000Z", // string, current server timestamp
  "server": {                              // object, server information
    "port": 3015,                          // number, server port
    "environment": "development",          // string, environment name
    "uptime": 123.45                       // number, server uptime in seconds
  },
  "database": {                            // object, database connection info
    "connected": true,                     // boolean, connection status
    "timestamp": "2025-01-01T12:00:00.000Z", // string, database timestamp
    "pool_status": {                       // object, connection pool information
      "total": 20,                         // number, total connections
      "idle": 19,                          // number, idle connections
      "waiting": 0                         // number, waiting connections
    }
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"DATABASE_ERROR"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../database');

router.post('/', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await db.testConnection();
    const poolStatus = db.getPoolStatus();
    
    if (dbTest.success) {
      res.json({
        return_code: "SUCCESS",
        status: "healthy",
        timestamp: new Date().toISOString(),
        server: {
          port: process.env.PORT || 3015,
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime()
        },
        database: {
          connected: true,
          timestamp: dbTest.timestamp,
          pool_status: {
            total: poolStatus.totalCount,
            idle: poolStatus.idleCount,
            waiting: poolStatus.waitingCount
          }
        }
      });
    } else {
      res.status(503).json({
        return_code: "DATABASE_ERROR",
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        server: {
          port: process.env.PORT || 3015,
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime()
        },
        database: {
          connected: false,
          error: dbTest.error
        }
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    });
  }
});

module.exports = router;