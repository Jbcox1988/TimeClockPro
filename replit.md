# TimeClock Pro - Employee Time Management System

## Overview

TimeClock Pro is a full-stack employee time management system built with React, Express, and SQLite. The application provides PIN-based employee authentication, time punch tracking with geofencing capabilities, and comprehensive admin management tools. It features a modern UI built with shadcn/ui components and supports dark/light themes.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Session Management**: Express sessions with in-memory storage
- **Authentication**: PIN-based for employees, password-based for admins
- **API**: RESTful endpoints with JSON responses

### Database Schema
The application uses SQLite database (data.db) with the following main entities:
- **Employees**: Store employee information with PIN authentication
- **Punches**: Track clock-in/out events with location data
- **Settings**: Application configuration and company branding
- **Corrections**: Handle time correction requests

The database is fully implemented with Drizzle ORM for type-safe operations.

## Key Components

### Authentication System
- **Employee Authentication**: 4-6 digit PIN-based login system
- **Admin Access**: PIN-based through employee accounts with admin privileges
- **Session Management**: Express sessions with automatic logout
- **Admin Employees**: Joshua Cox (PIN: 1003) and Matt McVeigh (PIN: 1008)

### Time Tracking
- **Punch System**: Clock in/out functionality with timestamp recording
- **Geolocation**: Optional GPS tracking for punch verification
- **Geofencing**: Configurable location-based restrictions
- **IP Tracking**: Records IP address for each punch

### Admin Dashboard
- **Employee Management**: CRUD operations for employee records
- **Punch Management**: View, edit, and manage time entries
- **Reports**: CSV export functionality for payroll processing
- **Settings**: Company branding, geofencing configuration

### UI Components
- **Responsive Design**: Mobile-first approach with tablet/desktop optimization
- **Theme Support**: Dark/light mode with system preference detection
- **Accessibility**: ARIA labels and keyboard navigation support
- **Modern UI**: Clean, professional interface using shadcn/ui

## Data Flow

1. **Employee Login**: PIN verification → Session creation → Dashboard access
2. **Time Punching**: Location check → Timestamp recording → Database storage
3. **Admin Operations**: Authentication → Data queries → Real-time updates
4. **Reporting**: Data aggregation → CSV generation → File download

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React, React DOM, React Query
- **UI Components**: Radix UI primitives, shadcn/ui components
- **Utilities**: date-fns, clsx, class-variance-authority
- **Forms**: React Hook Form with Zod validation

### Backend Dependencies
- **Server**: Express.js with session support
- **Database**: SQLite3 with Drizzle ORM
- **Security**: bcrypt for password hashing
- **Development**: tsx for TypeScript execution

### Development Tools
- **Build**: Vite with React plugin
- **TypeScript**: Full type safety across frontend and backend
- **Database Management**: Drizzle Kit for migrations

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:
- **Development**: `npm run dev` starts both frontend and backend
- **Production Build**: Vite builds frontend, esbuild bundles backend
- **Database**: SQLite file-based storage (data.db)
- **Static Assets**: Served from dist/public directory
- **Port Configuration**: Backend on port 5000, proxied to port 80

The deployment uses autoscale targeting with automatic build and start scripts configured in the .replit file.

## Changelog

- June 19, 2025: Initial setup with complete SQLite database implementation
- June 19, 2025: Implemented proper kiosk workflow with auto-logout countdown after punch actions
- June 19, 2025: Added PIN-based authentication with touch-friendly keypad for shared terminal use
- June 19, 2025: Integrated PIN-based admin access - admins use employee PINs and see admin features in dashboard
- June 19, 2025: Created dedicated geofencing settings page, removed unnecessary admin password security section
- June 19, 2025: Fixed critical stay-logged-in functionality - countdown interval now properly clears when user selects "Yes"
- June 19, 2025: Added 30-second deduplication logic to prevent duplicate punch entries from rapid button clicks
- June 19, 2025: Implemented complete employee management CRUD operations with working Add/Edit/Delete dialogs
- June 19, 2025: Added working Edit/Delete buttons to punch management with confirmation dialogs and admin PIN requirements
- June 19, 2025: Created reusable DatePicker component and replaced all date inputs with popup calendar selectors
- June 19, 2025: Removed redundant "Request Correction" button from employee dashboard - corrections available in punch history
- June 19, 2025: Fixed navigation routing errors for admin dashboard and corrections requests
- June 19, 2025: Fixed correction request submission by updating data structure to match schema requirements (punchId, date, note)
- June 19, 2025: Added complete manual punch entry system for admins to add forgotten clock-ins/outs
- June 19, 2025: Created dedicated corrections management page with full approval/denial workflow
- June 19, 2025: Built comprehensive employee profile management system with PIN changes, photo uploads, contact info
- June 19, 2025: Extended employee schema with email, phone, birthday, and photo URL fields
- June 19, 2025: Fixed navigation text visibility issues - replaced hard-coded gray colors with semantic CSS classes
- June 19, 2025: Re-enabled color customization system and made appearance settings theme-aware
- June 19, 2025: Fixed PIN keypad delete button visibility by forcing white icon color on orange background
- June 19, 2025: Removed complex color customization system that was causing conflicts and restored original simple light/dark mode functionality
- June 19, 2025: Simplified settings page to focus on core functionality - company info, geofencing, and built-in theme switching
- June 19, 2025: Added comprehensive email export functionality for employees to receive CSV time reports via SendGrid integration
- June 19, 2025: Fixed critical database update issue in employee profile - all profile fields now save correctly including phone, email, birthday
- June 19, 2025: Fixed navigation routing errors for "Employee View" buttons across all admin pages
- June 19, 2025: Implemented complete time-off request calendar system with employee submission, admin approval workflow, and visual calendar view
- June 19, 2025: Fixed critical time-off request sync issue - admin management page now properly displays pending requests submitted by employees
- June 19, 2025: Fixed employee time-off calendar display issue - calendar now properly shows submitted requests and visual indicators
- June 19, 2025: Implemented partial day time-off requests with half-hour precision - employees can now request specific time ranges instead of full days
- June 22, 2025: Successfully migrated from Replit to local Windows PC deployment with complete project portability
- June 22, 2025: Fixed Windows compatibility issues - changed server binding from 0.0.0.0 to localhost for Windows systems
- June 22, 2025: Created comprehensive README.md with complete setup instructions for distribution to other users
- June 22, 2025: Successfully published complete TimeClock Pro system to GitHub at https://github.com/Jbcox1988/TimeClockPro for public distribution
- June 22, 2025: Simplified user setup - removed all default employees and created single default admin "Administrator" with PIN 0000
- June 23, 2025: Integrated external time clock synchronization with Puppeteer web automation for https://admin.andrewstool.com/account/timeclock
- June 23, 2025: Fixed Puppeteer browser configuration by installing Chromium system package and configuring proper executable path
- June 23, 2025: Resolved employee name mapping issue for external sync (Josh Cox → Joshua Cox) ensuring proper synchronization
- June 23, 2025: Temporarily disabled external sync feature due to dynamic web automation challenges with external time clock system

## User Preferences

Preferred communication style: Simple, everyday language.