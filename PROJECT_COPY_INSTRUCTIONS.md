# TimeClock Pro - Project Copy Instructions

## Method 1: Use GitHub (Recommended)

Since your project is already on GitHub at https://github.com/Jbcox1988/TimeClockPro:

1. Create a new Replit project
2. Choose "Import from GitHub"
3. Enter your GitHub repository URL
4. Replit will automatically import everything

## Method 2: Manual File Copy

If you want to copy manually, here are the essential files and folders:

### Core Application Files:
- `package.json` - Dependencies and scripts
- `package-lock.json` - Dependency lock file
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Styling configuration
- `postcss.config.js` - CSS processing
- `components.json` - UI components config
- `drizzle.config.ts` - Database configuration

### Environment Files:
- `.env.example` - Environment template
- `.replit` - Replit configuration
- `.gitignore` - Git ignore rules

### Source Code Folders:
- `client/` - Frontend React application
- `server/` - Backend Express server
- `shared/` - Shared TypeScript schemas

### Documentation:
- `README.md` - Setup instructions
- `replit.md` - Project architecture
- `MYSQL_MIGRATION.md` - Database migration guide

### Skip These (They'll be regenerated):
- `node_modules/` - Will be installed by npm
- `dist/` - Build output directory
- `data.db` - Database file (will create fresh)
- `.cache/` - Build cache
- `attached_assets/` - Chat attachments (optional)

## After Copying:

1. Run `npm install` to install dependencies
2. Set up your environment variables in `.env`
3. Run `npm run dev` to start the application
4. The database will be created automatically on first run

## Default Admin Access:
- PIN: 0000
- Name: Administrator

The new copy will start with a clean database and the default admin account.