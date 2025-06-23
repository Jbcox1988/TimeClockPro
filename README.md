# TimeClock Pro - Employee Time Management System

!!!!!MySQL & SQLite Options!!!!

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
- Node.js 16 or higher
- MySQL (optional - SQLite included for easy setup)

### Installation

1. **Download and extract the TimeClock Pro folder**

2. **Open terminal/command prompt and navigate to the folder**
   ```bash
   cd TimeClockPro
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Open your browser to http://localhost:5000**

That's it! The system will automatically create the database and set up everything needed.

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
3. **Set database connection** before starting:

   **Windows PowerShell:**
   ```powershell
   $env:DATABASE_URL="mysql://username:password@localhost:3306/timeclock"
   npm run dev
   ```

   **Mac/Linux:**
   ```bash
   export DATABASE_URL="mysql://username:password@localhost:3306/timeclock"
   npm run dev
   ```

Replace `username` and `password` with your MySQL credentials.

## Default Admin Users

The system comes with two pre-configured admin users:

- **Joshua Cox** - PIN: `1003`
- **Matt McVeigh** - PIN: `1008`

Both users have full administrative privileges and can:
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
1. Log in with admin PIN (1003 or 1008)
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

1. Sign up at sendgrid.com
2. Get your API key
3. Set environment variable:
   ```bash
   # Windows
   $env:SENDGRID_API_KEY="your_api_key_here"
   
   # Mac/Linux  
   export SENDGRID_API_KEY="your_api_key_here"
   ```

## Troubleshooting

### Port Already in Use
If port 5000 is busy, the system will automatically find an available port.

### Database Connection Issues
- Verify MySQL is running (if using MySQL)
- Check database credentials in DATABASE_URL
- Ensure database exists: `CREATE DATABASE timeclock;`

### Permission Issues
- Run terminal/command prompt as administrator if needed
- Ensure Node.js has network permissions

## System Requirements

- **Operating System**: Windows, Mac, or Linux
- **Node.js**: Version 16 or higher
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB free space
- **Network**: Internet connection for email features (optional)

## Security Notes

- Change default admin PINs in production environments
- Use strong MySQL passwords
- Enable geofencing for location-sensitive environments
- Regular database backups recommended

## Support

This is a complete, self-contained system. All necessary files and dependencies are included. The system will automatically:

- Create database tables on first run
- Set up default admin users
- Configure initial company settings
- Handle all migrations and updates

For technical issues, check that:
1. Node.js is properly installed
2. All dependencies installed (`npm install`)
3. Database is accessible (if using MySQL)
4. No firewall blocking port 5000

---

**TimeClock Pro** - Professional time tracking made simple.
