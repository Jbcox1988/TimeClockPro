# TimeClock Pro - Employee Time Management System

A comprehensive web-based employee time tracking system with PIN-based authentication, designed for shared kiosk environments.

## Features

- **PIN-Based Authentication**: Secure 4-6 digit PIN system for employees
- **Time Tracking**: Clock in/out with automatic timestamp recording
- **Geofencing**: Optional GPS location verification for punches
- **Admin Dashboard**: Complete employee and punch management
- **Reports**: CSV export functionality for payroll processing
- **Time-Off Management**: Employee requests with admin approval workflow
- **Corrections System**: Handle time correction requests
- **Mobile Responsive**: Works on tablets, phones, and desktop computers
- **Dark/Light Mode**: Automatic theme support
- **Real-time Updates**: Live data synchronization

## Quick Start

### Prerequisites
- **Node.js 16 or higher** - Download from [nodejs.org](https://nodejs.org)
- **Git** (if cloning from GitHub) - Download from [git-scm.com](https://git-scm.com)
- **MySQL** (optional - SQLite included for easy setup) - Download from [mysql.com](https://mysql.com)

### Installation

#### Option 1: Download ZIP from GitHub (Easiest)
1. **Go to https://github.com/Jbcox1988/TimeClockPro**
2. **Click the green "Code" button → "Download ZIP"**
3. **Extract the ZIP file to your desired location**
4. **Open terminal/command prompt and navigate to the extracted folder**
   ```bash
   cd TimeClockPro
   ```

#### Option 2: Clone with Git
1. **Open terminal/command prompt**
2. **Clone the repository:**
   ```bash
   git clone https://github.com/Jbcox1988/TimeClockPro.git
   cd TimeClockPro
   ```

#### Complete Setup
3. **Install dependencies** (this may take a few minutes):
   ```bash
   npm install
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```
   
   **Note**: On first run, you may see some setup messages - this is normal!

5. **Open your browser and go to:**
   ```
   http://localhost:5000
   ```

**Success!** The system will automatically:
- Create the SQLite database file (`data.db`)
- Set up all required tables
- Configure the default Administrator account
- Be ready for immediate use

## Database Options

### SQLite (Default - No Setup Required)
The system runs with SQLite by default. No additional setup needed - just run `npm run dev`.

### MySQL (Production Recommended)
For production use or multiple concurrent users:

1. **Install MySQL** on your system
2. **Create database**: 
   ```sql
   CREATE DATABASE timeclock;
   ```
3. **Create .env file** in your project root:
   ```
   DATABASE_TYPE=mysql
   DATABASE_URL=mysql://username:password@localhost:3306/timeclock
   ```
   Replace `username` and `password` with your MySQL credentials.

4. **Start the application**:
   ```bash
   npm run dev
   ```

### Environment Variables (.env file)
Create a `.env` file in your project root directory with these options:

```
# Database Configuration
DATABASE_TYPE=sqlite          # Use 'sqlite' or 'mysql'

# MySQL Configuration (only if using MySQL)
DATABASE_URL=mysql://username:password@localhost:3306/timeclock

# Email Configuration (optional - for email reports)
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

**Note**: The `.env` file is optional for SQLite but required for MySQL or email features.

### Switching Between Databases

**To switch from MySQL to SQLite:**
1. Delete or rename your `.env` file (or change `DATABASE_TYPE=sqlite`)
2. Restart the application with `npm run dev`
3. The system will automatically use SQLite

**To switch from SQLite to MySQL:**
1. Create `.env` file with MySQL configuration (see above)
2. Ensure MySQL database exists: `CREATE DATABASE timeclock;`
3. Restart the application with `npm run dev`
4. The system will automatically migrate to MySQL

## Default Admin User

The system comes with one pre-configured admin user:

- **Administrator** - PIN: `0000`

This admin user has full administrative privileges and can:
- Manage employees
- View all punches and reports
- Approve time-off requests
- Handle correction requests
- Configure system settings

## System Usage

### For Employees
1. Enter your PIN on the main screen
2. Clock in/out using the punch buttons
3. View your punch history
4. Submit time-off requests
5. Request time corrections if needed

### For Administrators
1. Log in with admin PIN (0000)
2. Access admin dashboard for full system management
3. Add/edit/delete employees
4. Manage punch records
5. Generate reports
6. Configure company settings and geofencing

## Key Features Explained

### Geofencing
- Optional GPS location verification
- Configurable radius around work location
- Prevents remote clock-ins when enabled

### Time-Off Requests
- Employees can request full or partial days off
- Half-hour precision for partial day requests
- Admin approval workflow
- Calendar view of approved time off

### Corrections System
- Employees can request punch corrections
- Admin review and approval process
- Detailed notes and timestamps

### Reporting
- Export punch data to CSV
- Email reports directly to employees
- Customizable date ranges
- Payroll-ready formatting

## Email Setup (Optional)

To enable email reports, you'll need a SendGrid account:

1. **Sign up at [sendgrid.com](https://sendgrid.com)**
2. **Create an API key** in your SendGrid dashboard
3. **Add to your .env file:**
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```
   
   **Or set as environment variable:**
   ```bash
   # Windows PowerShell
   $env:SENDGRID_API_KEY="your_api_key_here"
   npm run dev
   
   # Mac/Linux Terminal
   export SENDGRID_API_KEY="your_api_key_here"
   npm run dev
   ```

## Troubleshooting

### Installation Issues
**"npm install" fails:**
- Ensure Node.js 16+ is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` folder and `package-lock.json`, then retry

**"npm run dev" fails:**
- Check if port 5000 is available
- Verify all dependencies installed correctly
- Look for error messages in terminal

### Port Already in Use
If port 5000 is busy, the system will automatically find an available port and display the correct URL.

### Database Connection Issues
**SQLite (default):**
- System creates `data.db` automatically
- No configuration needed
- Delete `data.db` file to reset database

**MySQL connection problems:**
- Verify MySQL is running: `mysql --version`
- Check database credentials in DATABASE_URL
- Ensure database exists: `CREATE DATABASE timeclock;`
- Test connection: `mysql -u username -p timeclock`

### Permission Issues
- **Windows**: Run Command Prompt as Administrator
- **Mac/Linux**: Use `sudo` if needed for npm install
- Ensure Node.js has network permissions through firewall

### Browser Issues
- Clear browser cache and cookies
- Try different browser (Chrome, Firefox, Safari)
- Disable browser extensions temporarily
- Check browser console for error messages

### Common Error Messages
**"Cannot find module"**: Run `npm install` again
**"Port 5000 already in use"**: Close other applications or let system auto-select port
**"Database connection failed"**: Check MySQL service and credentials
**"Invalid PIN"**: Ensure using correct PIN format (0000 for admin)

## System Requirements

- **Operating System**: Windows, Mac, or Linux
- **Node.js**: Version 16 or higher
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB free space
- **Network**: Internet connection for email features (optional)

## Security Notes

- **Change default admin PIN** from 0000 in production environments
- **Use strong MySQL passwords** (8+ characters, mixed case, numbers, symbols)
- **Enable geofencing** for location-sensitive environments
- **Regular database backups** recommended
- **Firewall configuration**: Only allow necessary ports (5000 for TimeClock Pro)
- **HTTPS**: Consider using reverse proxy (nginx) for SSL in production
- **Employee PINs**: Enforce unique 4-6 digit PINs for all employees

## Production Deployment

### For Small Teams (5-20 employees)
- SQLite database is sufficient
- Single server deployment
- Regular automated backups of `data.db` file

### For Larger Organizations (20+ employees)
- **Use MySQL database** for better performance
- **Dedicated server** with sufficient RAM (2GB+)
- **Regular MySQL backups**: `mysqldump -u username -p timeclock > backup.sql`
- **Load balancing** for high availability
- **SSL certificate** for secure connections

## Support

This is a complete, self-contained system. All necessary files and dependencies are included. The system will automatically:

- Create database tables on first run
- Set up default admin users
- Configure initial company settings
- Handle all migrations and updates

For technical issues, check that:
1. Node.js is properly installed: `node --version` (should show 16+)
2. All dependencies installed: `npm install` completed successfully
3. Database is accessible (if using MySQL): Test with `mysql -u username -p`
4. No firewall blocking port 5000: Check Windows Defender/Mac firewall
5. Browser compatibility: Use Chrome, Firefox, Safari, or Edge (modern versions)

## Quick Start Checklist

**For New Users (First Time Setup):**
- [ ] Node.js 16+ installed
- [ ] Downloaded TimeClock Pro from GitHub
- [ ] Extracted files to desired location
- [ ] Opened terminal in TimeClock Pro folder
- [ ] Ran `npm install` (wait for completion)
- [ ] Ran `npm run dev`
- [ ] Opened browser to http://localhost:5000
- [ ] Logged in with PIN 0000 (Administrator)
- [ ] System working correctly!

**For Production Use:**
- [ ] Changed default admin PIN from 0000
- [ ] Added employee accounts with unique PINs
- [ ] Configured geofencing (if needed)
- [ ] Set up MySQL database (for 20+ employees)
- [ ] Configured email settings (if needed)
- [ ] Set up regular database backups
- [ ] Secured server with firewall rules

## File Structure

```
TimeClockPro/
├── client/              # Frontend React application
├── server/              # Backend Express server
├── shared/              # Shared types and schemas
├── data.db             # SQLite database (auto-created)
├── package.json        # Project dependencies
├── .env                # Configuration (optional)
└── README.md          # This documentation
```

---

**TimeClock Pro** - Professional time tracking made simple.

🌟 **Star us on GitHub**: https://github.com/Jbcox1988/TimeClockPro