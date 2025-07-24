# MySQL Migration Guide

This guide shows how to switch from SQLite to MySQL while preserving your SQLite version.

## Current Setup

Your project currently runs on SQLite and saves all data to `data.db`. The MySQL conversion files are ready but not active.

## Migration Strategy: Two Versions

### Option 1: Git Branches (Recommended)
Keep both database versions in separate branches:

```bash
# Save current SQLite version
git add .
git commit -m "Save SQLite version before MySQL conversion"

# Create MySQL branch
git checkout -b mysql-version

# Make MySQL changes in this branch
# Switch back anytime with: git checkout main
```

### Option 2: Environment Variable Switch
Use the same codebase with environment variable switching:

```bash
# SQLite (current default)
DATABASE_TYPE=sqlite

# MySQL (when ready)
DATABASE_TYPE=mysql
DATABASE_URL=mysql://username:password@host:port/database_name
```

## MySQL Setup Steps

### 1. Get MySQL Database
Choose one option:

**PlanetScale (Easiest)**
- Sign up at planetscale.com
- Create new database
- Get connection string

**Local MySQL**
- Install MySQL locally
- Create database: `CREATE DATABASE timeclock_pro;`
- Use: `mysql://root:password@localhost:3306/timeclock_pro`

**Workplace MySQL**
- Get connection details from IT
- Format: `mysql://username:password@server:3306/database_name`

### 2. Update Environment
Create `.env` file:
```bash
DATABASE_TYPE=mysql
DATABASE_URL=mysql://your_connection_string_here
SENDGRID_API_KEY=your_sendgrid_key
```

### 3. Activate MySQL Code
Update `server/routes.ts` to import from `db-config.ts`:
```typescript
import { storage } from "./db-config";
```

### 4. Test Migration
- Start application: `npm run dev`
- MySQL tables will be created automatically
- All your features work the same way

## Data Migration

To move existing SQLite data to MySQL:

### Export SQLite Data
```bash
# Export employees
sqlite3 data.db ".mode csv" ".output employees.csv" "SELECT * FROM employees;"

# Export punches  
sqlite3 data.db ".mode csv" ".output punches.csv" "SELECT * FROM punches;"

# Export other tables as needed
```

### Import to MySQL
```sql
-- Create temporary tables
LOAD DATA INFILE 'employees.csv' INTO TABLE employees_temp;

-- Transform and insert data
INSERT INTO employees SELECT * FROM employees_temp;
```

## Files Created for MySQL

- `shared/schema-mysql.ts` - MySQL database schema
- `server/storage-mysql.ts` - MySQL storage implementation  
- `server/db-config.ts` - Database type switching
- `MYSQL_MIGRATION.md` - This guide

## Switch Back to SQLite

At any time, you can switch back:

```bash
# Environment variable method
DATABASE_TYPE=sqlite

# Or git branch method
git checkout main
```

## Benefits of MySQL

- Better performance with multiple users
- Professional database for workplace deployment
- Familiar to most IT departments
- Better backup and recovery tools
- Scales with your business growth

## Troubleshooting

**Connection Errors**
- Verify DATABASE_URL format
- Check firewall/network access
- Confirm database exists

**Permission Errors**  
- Ensure user has CREATE/INSERT/UPDATE/DELETE privileges
- Check database connection limits

**Data Type Issues**
- MySQL schema handles all current data types
- No data loss during conversion