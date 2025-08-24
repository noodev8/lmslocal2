# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LMSLocal is a "Last Man Standing" competition platform designed for pub landlords, workplace organizers, and club managers. The system follows an admin-first approach where organizers can easily set up and manage elimination-style competitions based on real fixtures.

## Architecture

This is a full-stack application with two main components:

### Backend (lmslocal-server/)
- **Technology**: Node.js with Express.js
- **Database**: PostgreSQL with connection pooling
- **Port**: 3015
- **Authentication**: JWT tokens with bcrypt password hashing
- **Email**: Resend service for passwordless authentication
- **Security**: Helmet, CORS, rate limiting, input validation

### Frontend (lmslocal-web/)
- **Technology**: React 18 with Vite
- **Styling**: Tailwind CSS with custom primary color scheme
- **Routing**: React Router DOM v6
- **Port**: 3000 (development)
- **State Management**: React Context API (AuthContext)

## Development Commands

### Server (lmslocal-server/)
```bash
cd lmslocal-server
npm start          # Production server
npm run dev        # Development with nodemon
```

### Frontend (lmslocal-web/)
```bash
cd lmslocal-web
npm run dev        # Development server with hot reload
npm run build      # Production build
npm run preview    # Preview production build
npm start          # Development server on all interfaces
```

## API Development Standards

### Route Conventions
- **All routes use POST method** for consistency
- **All responses include "return_code"** field ("SUCCESS" or error type)
- **Single route file per function** - no combining multiple endpoints
- **Lowercase filenames with underscores** (e.g., `set-pick.js`)

### Standard API Route Header Format
```javascript
/*
=======================================================================================================================================
API Route: [route_name]
=======================================================================================================================================
Method: POST
Purpose: [Clear description of what this route does]
=======================================================================================================================================
Request Payload:
{
  "field1": "value1",                  // type, required/optional
  "field2": "value2"                   // type, required/optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "field1": "value1",                  // type, description
  "field2": "value2"                   // type, description
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"ERROR_TYPE_1"
"ERROR_TYPE_2" 
"SERVER_ERROR"
=======================================================================================================================================
*/
```

## Database Configuration

- **Connection**: PostgreSQL with connection pooling via pg module
- **Configuration**: All database credentials stored in .env file
- **Pool Settings**: Max 20 connections, 30s idle timeout, 2s connection timeout
- **Security**: Always use parameterized queries to prevent SQL injection

## File Structure

```
lmslocal-server/
├── server.js              # Main Express server entry point
├── database.js            # PostgreSQL connection and utilities
├── routes/                 # API endpoints (one file per function)
├── middleware/             # Custom middleware (verifyToken.js)
├── services/               # External services (emailService.js)
└── utils/                  # Utility functions (tokenUtils.js)

lmslocal-web/
├── src/
│   ├── App.jsx            # Main app with routing
│   ├── context/           # React Context providers
│   └── pages/             # Page components
├── index.html             # Main HTML template
├── vite.config.js         # Vite configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## Environment Configuration

- **Single .env file** at project root only
- **Required variables**: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PORT
- **Access via**: `process.env.VARIABLE_NAME`

## Security Guidelines

- **Rate limiting** implemented on all API endpoints
- **CORS** properly configured for cross-origin requests
- **Password hashing** with bcrypt
- **Input validation** and sanitization on all user inputs
- **JWT token expiration** with appropriate timeout values
- **Helmet** for security headers

## Development Workflow

1. Backend changes: Use `npm run dev` in lmslocal-server for auto-restart
2. Frontend changes: Use `npm run dev` in lmslocal-web for hot reload
3. New API routes: Follow the standardized header format and single-function rule
4. Database operations: Always use connection pooling and parameterized queries
5. Authentication: Verify tokens using middleware/verifyToken.js

## Key Game Logic

- Players pick one team per round, cannot pick same team twice
- Picks lock when all players choose, admin sets time, or 1hr before kickoff
- Win = advance, Draw/Loss = elimination, Missed pick = life lost
- Admin has full override powers with audit trail
- Results based on regulation time only (90' + stoppage)