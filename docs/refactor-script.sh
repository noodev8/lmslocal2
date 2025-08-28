#!/bin/bash

# Database Pool Refactor Script
# This script helps automate the basic pool-to-query replacement

ROUTES_DIR="lmslocal-server/routes"

# List of routes to refactor (excluding the 3 already completed)
routes_to_refactor=(
    "add-fixture.js"
    "add-fixtures-bulk.js" 
    "calculate-results.js"
    "create-round.js"
    "delete-fixture.js"
    "forgot-password.js"
    "get-competition-by-slug.js"
    "get-fixtures.js"
    "get-player-current-round.js"
    "get-rounds.js"
    "get-teams.js"
    "get-user-competitions.js"
    "join-by-access-code.js"
    "join-competition-by-slug.js"
    "join-competition.js"
    "lock-unlock-competition.js"
    "modify-fixture.js"
    "mycompetitions.js"
    "player-login-general.js"
    "player-login.js"
    "register-and-join-competition.js"
    "register.js"
    "replace-fixtures-bulk.js"
    "resend-verification.js"
    "reset-password.js"
    "set-fixture-result.js"
    "team-lists.js"
    "update-profile.js"
    "update-round.js"
    "validate-access-code.js"
    "verify-email.js"
    "verify-player-token.js"
)

echo "🚀 Starting database pool refactor for ${#routes_to_refactor[@]} routes..."

for route in "${routes_to_refactor[@]}"; do
    file_path="$ROUTES_DIR/$route"
    
    if [ -f "$file_path" ]; then
        echo "📝 Processing $route..."
        
        # Create backup
        cp "$file_path" "$file_path.backup"
        
        # Replace Pool import and database connection setup
        sed -i.tmp 's/const { Pool } = require('\''pg'\'');/const { query } = require('\''..\/database'\'');/g' "$file_path"
        
        # Remove the pool connection block (this is a simplified approach)
        # More complex pool connection blocks may need manual review
        sed -i.tmp '/\/\/ Database connection/,/});/d' "$file_path"
        
        # Replace pool.query with query
        sed -i.tmp 's/pool\.query(/query(/g' "$file_path"
        sed -i.tmp 's/await pool\.query(/await query(/g' "$file_path"
        
        # Clean up temporary file
        rm "$file_path.tmp"
        
        echo "✅ Completed $route"
    else
        echo "❌ File not found: $file_path"
    fi
done

echo ""
echo "🎉 Refactor complete!"
echo "📋 Summary:"
echo "   - ${#routes_to_refactor[@]} routes processed"
echo "   - Backup files created with .backup extension"
echo "   - Manual review recommended for complex transaction logic"
echo ""
echo "🧪 Next steps:"
echo "   1. Test the server: cd lmslocal-server && npm run dev"
echo "   2. Test key endpoints with frontend"
echo "   3. Monitor database connections: check pool status in logs"