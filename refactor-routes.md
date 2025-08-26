# Database Pool Refactor Template

## Completed Routes
✅ `set-pick.js` - Refactored to use centralized database  
✅ `create-competition.js` - Refactored to use centralized database  
✅ `login.js` - Refactored to use centralized database

## Remaining Routes (32 total)
The following routes still need to be refactored:

```
add-fixture.js
add-fixtures-bulk.js
calculate-results.js
create-round.js
delete-fixture.js
forgot-password.js
get-competition-by-slug.js
get-fixtures.js
get-player-current-round.js
get-rounds.js
get-teams.js
get-user-competitions.js
join-by-access-code.js
join-competition-by-slug.js
join-competition.js
lock-unlock-competition.js
modify-fixture.js
mycompetitions.js
player-login-general.js
player-login.js
register-and-join-competition.js
register.js
replace-fixtures-bulk.js
resend-verification.js
reset-password.js
set-fixture-result.js
team-lists.js
update-profile.js
update-round.js
validate-access-code.js
verify-email.js
verify-player-token.js
```

## Refactor Steps for Each Route

### 1. Replace Pool Import and Declaration
**Find:**
```javascript
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

**Replace with:**
```javascript
const { query } = require('../database');
const router = express.Router();
```

### 2. Replace All Pool Usage
**Find all instances of:**
```javascript
pool.query(
await pool.query(
```

**Replace with:**
```javascript
query(
await query(
```

### 3. For Transaction-Heavy Routes
If a route has multiple related database operations, consider using the `transaction` helper:

**Replace:**
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result1 = await client.query('INSERT INTO...');
  const result2 = await client.query('UPDATE...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**With:**
```javascript
const { transaction } = require('../database');

const results = await transaction([
  { text: 'INSERT INTO...', params: [...] },
  { text: 'UPDATE...', params: [...] }
]);
```

## Expected Impact
- **Before**: 35 routes × 20 connections each = **700 potential connections**
- **After**: 1 shared pool × 20 connections = **20 total connections**
- **Memory savings**: Significant reduction in pool overhead
- **Maintenance**: Single point of database configuration

## Testing Priority
Test these high-impact routes first:
1. `register.js` - Core authentication
2. `get-fixtures.js` - High usage during active rounds  
3. `calculate-results.js` - Critical for competition logic
4. `player-login.js` - Player authentication flow