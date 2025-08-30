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
- **Token Policy**: Keep JWT tokens simple and consistent - only include user identification fields (user_id, email, display_name). Any additional data should be fetched from database when needed.
- **Email**: Resend service for passwordless authentication
- **Security**: Helmet, CORS, rate limiting, input validation

### Frontend (lmslocal-web/)
- **Technology**: Next.js 15.5 with React 19 and TypeScript 5
- **Styling**: Tailwind CSS with PostCSS
- **Port**: 3000 (development)
- **State Management**: Local state with localStorage persistence
- **HTTP Client**: Axios with automatic JWT token injection and interceptors
- **Forms**: React Hook Form with @heroicons/react for UI components

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
npm run dev        # Development server with hot reload (port 3000)
npm run build      # Production build with TypeScript type checking
npm run start      # Production server
npm run lint       # ESLint code linting
npx tsc --noEmit   # TypeScript type checking only (no build output)
```

### Testing
No test framework is currently configured. The package.json test scripts show placeholder commands.

## API Development Standards

### Route Conventions
- **All routes use POST method** for consistency
- **All responses include "return_code"** field ("SUCCESS" or error type)
- **ALWAYS return HTTP 200** - Use `return_code` for success/error status (prevents frontend crashes)
- **Single route file per function** - no combining multiple endpoints
- **Lowercase filenames with hyphens** (e.g., `set-pick.js`, `add-fixtures-bulk.js`)
- **Database connections**: Each route creates its own Pool instance (anti-pattern - should use database.js)
- **File naming**: Use lowercase with hyphens, not underscores

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

Success Response (ALWAYS HTTP 200):
{
  "return_code": "SUCCESS",
  "field1": "value1",                  // type, description
  "field2": "value2"                   // type, description
}

Error Response (ALWAYS HTTP 200):
{
  "return_code": "ERROR_TYPE_1",
  "message": "Descriptive error message"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"UNAUTHORIZED" 
"NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/
```

### API Response Pattern (NEW APIS ONLY)
**CRITICAL**: All new APIs must follow this crash-safe pattern:

```javascript
// ✅ CORRECT - Always return 200, use return_code for status
if (error) {
  return res.status(200).json({
    return_code: "ERROR_TYPE",
    message: "User-friendly error message"
  });
}

// ❌ WRONG - HTTP errors can crash frontend
if (error) {
  return res.status(404).json({ // Can cause unhandled promise rejection
    return_code: "ERROR_TYPE",
    message: "Error message"
  });
}
```

**Migration**: Existing APIs will be gradually migrated to this pattern. See `docs/api-migration-plan.md` for tracking progress.

## Database Configuration

- **Connection**: PostgreSQL with connection pooling via pg module
- **Configuration**: All database credentials stored in .env file
- **Pool Settings**: Max 20 connections, 30s idle timeout, 2s connection timeout
- **Security**: Always use parameterized queries to prevent SQL injection

## Application Architecture

### Backend Architecture
- **Server Entry**: server.js configures Express with comprehensive security middleware
- **Database Layer**: database.js provides connection pooling and query utilities
- **Route Pattern**: Each API endpoint is a separate file with standardized POST-only interface
- **Authentication**: JWT-based with separate middleware for admin vs player verification
- **Error Handling**: Centralized error handling with structured return_code responses

### Frontend Architecture 
- **App Router Structure**: Next.js App Router with TypeScript for admin dashboard and player-facing competition views
- **API Layer**: Axios service (api.ts) with automatic JWT token injection and response interceptors
- **State Management**: No global state management - relies on localStorage and local component state
- **Styling**: Tailwind utility-first CSS framework with PostCSS
- **Forms**: React Hook Form for form validation and handling

### Key Files
```
lmslocal-server/
├── server.js              # Express server with security middleware
├── database.js            # PostgreSQL pool and query utilities  
├── routes/                 # API endpoints (50+ single-function routes)
├── middleware/verifyToken.js  # JWT verification middleware
└── services/emailService.js   # Resend email integration

lmslocal-web/
├── src/app/               # Next.js App Router pages and layouts
├── src/lib/api.ts         # Axios HTTP client with JWT injection and TypeScript types
└── next.config.ts         # Next.js configuration
```

## Environment Configuration

- **Environment Files**: Both lmslocal-server/.env and lmslocal-web/.env exist (check both locations)
- **Backend .env**: Contains database and server configuration
- **Required variables**: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PORT, JWT_SECRET
- **Optional variables**: CLIENT_URL (for CORS), NODE_ENV, RESEND_API_KEY
- **Access via**: `process.env.VARIABLE_NAME`
- **Frontend API**: Hardcoded to http://localhost:3015 in src/lib/api.ts

## Security Guidelines

- **Rate limiting**: General limit (100 req/15min), DB-intensive endpoints (5 req/10sec)
- **CORS**: Configured for localhost:3000-3003 and CLIENT_URL environment variable
- **Helmet**: CSP, security headers with unsafe-inline allowances for React dev
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: Connection pooling (max 20 connections) with parameterized queries

## Development Workflow

1. **Backend development**: Use `npm run dev` in lmslocal-server (nodemon auto-restart)
2. **Frontend development**: Use `npm run dev` in lmslocal-web (Next.js hot reload on port 3000)
3. **New API routes**: Each route in separate file, follow header format, POST-only
4. **Database operations**: Use database.js query/transaction functions, never direct pool access
5. **Authentication**: Player routes use JWT middleware, admin routes use different verification

## Critical Architecture Patterns

### API Client Structure
- **Comprehensive API Client**: All API calls organized by domain (authApi, playerApi, competitionApi, etc.)
- **TypeScript Interfaces**: Full type definitions for requests and responses
- **Interceptors**: Automatic JWT token injection and 401 handling with localStorage cleanup
- **Consistent Response Format**: All API responses follow `ApiResponse<T>` interface with `return_code`

### Database Anti-Pattern
- **Current Issue**: Each route creates its own database Pool instance
- **Better Approach**: Should use shared `database.js` utilities for all database operations
- **Connection Details**: Max 20 connections, 30s idle timeout, 2s connection timeout

### Authentication Architecture
- **Dual System**: Admin authentication (full login/register) + Player authentication (magic link)
- **JWT Implementation**: Tokens stored in localStorage, automatic injection via axios interceptors
- **Player Flow**: Magic link → JWT token → competition access
- **Admin Flow**: Traditional login → JWT token → full admin dashboard access

## Competition Game Logic

### Player Rules
- **Pick System**: One team per round, cannot reuse teams across rounds
- **Lock Timing**: Picks lock when all players choose, admin sets time, or 1hr before kickoff
- **Elimination**: Win = advance, Draw/Loss = elimination, Missed pick = life lost
- **Results**: Based on regulation time only (90 minutes + stoppage time)

### Admin Controls
- **Competition Management**: Create competitions with custom access codes or slugs
- **Override Powers**: Full ability to modify fixtures, results, and player status
- **Round Management**: Competition-level locking (round-level locking was removed)

### Technical Implementation
- **Authentication**: Dual authentication system for admins (full login) and players (magic link)
- **Access Methods**: Players join via competition slug or access code
- **Data Flow**: PostgreSQL backend with real-time fixture and result management

## Database Schema Reference

**CRITICAL**: Always check `/docs/DB-Schema.sql` when making SQL database calls to ensure correct table names and column references. This file contains the complete database structure including:

- `competitions` - Competition definitions and settings
- `users` - User accounts (admins and players)
- `rounds` - Competition rounds and fixtures
- `picks` - Player picks for each round
- `allowed_teams` - Teams available to players per competition
- `teams` - Master list of teams and fixtures

## Important Development Notes

### API Migration Status
See `/docs/api-migration-plan.md` for current status of migrating APIs from HTTP status codes to the standardized 200 + return_code pattern. When modifying existing APIs, check this file to understand which routes still need migration.

### TypeScript Configuration
- **Frontend TypeScript**: Strict mode enabled with Next.js plugin integration
- **Path Mapping**: `@/*` maps to `./src/*` for clean imports
- **Type Checking**: Run `npx tsc --noEmit` for standalone type checking without build