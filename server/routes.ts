import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./db-config";
import bcrypt from "bcrypt";
import session from "express-session";
import { insertEmployeeSchema, insertPunchSchema, insertSettingsSchema, insertCorrectionSchema, insertTimeOffRequestSchema } from "@shared/schema";
import { sendEmail, isEmailConfigured } from "./email";
import { formatPunchesForCSV } from "./csv-utils";
import { syncPunchToExternalClock, isExternalSyncEnabled } from "./external-sync";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "timeclock-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Middleware to get client IP
  const getClientIP = (req: any) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  };

  // Employee authentication
  app.post("/api/employee/login", async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin || pin.length < 4 || pin.length > 6) {
        return res.status(400).json({ message: "Invalid PIN format" });
      }

      const employee = await storage.getEmployeeByPin(pin);
      if (!employee) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      (req.session as any).employeeId = employee.id;
      res.json({ employee: { id: employee.id, name: employee.name } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/employee/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // Employee punch operations
  app.post("/api/employee/punch", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { punchType, latitude, longitude, flagged } = req.body;
      const ipAddress = getClientIP(req);

      const punchData = {
        employeeId,
        punchType,
        latitude,
        longitude,
        ipAddress,
        flagged: flagged || false
      };

      const validatedData = insertPunchSchema.parse(punchData);
      const punch = await storage.createPunch(validatedData);
      
      // Get employee info for external sync
      const employee = await storage.getEmployee(employeeId);
      
      // Sync to external time clock in background (don't wait for it)
      console.log(`Employee: ${employee?.name}, External sync enabled: ${isExternalSyncEnabled()}`);
      if (employee && isExternalSyncEnabled()) {
        console.log(`Starting external sync for ${employee.name} - ${punchType}`);
        syncPunchToExternalClock(employee.name, punchType as 'in' | 'out')
          .then(result => {
            if (result.success) {
              console.log(`External sync success: ${result.message}`);
            } else {
              console.warn(`External sync failed: ${result.message}`, result.error);
            }
          })
          .catch(error => {
            console.error('External sync error:', error);
          });
      } else {
        console.log(`External sync skipped - Employee: ${!!employee}, Sync enabled: ${isExternalSyncEnabled()}`);
      }
      
      res.json({ punch });
    } catch (error) {
      res.status(400).json({ message: "Failed to create punch" });
    }
  });

  app.get("/api/employee/current", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json({ employee });
    } catch (error) {
      res.status(500).json({ message: "Failed to get employee" });
    }
  });

  app.get("/api/employee/last-punch", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const lastPunch = await storage.getLastPunchByEmployee(employeeId);
      res.json({ lastPunch });
    } catch (error) {
      res.status(500).json({ message: "Failed to get last punch" });
    }
  });

  app.get("/api/employee/punches", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { startDate, endDate } = req.query;
      const punches = await storage.getPunchesByEmployee(
        employeeId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({ punches });
    } catch (error) {
      res.status(500).json({ message: "Failed to get punches" });
    }
  });

  // Employee profile update
  app.put("/api/employee/profile", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, email, phone, birthday, photoUrl, currentPin, newPin } = req.body;
      console.log("Profile update request body:", req.body);
      
      // If changing PIN, verify current PIN
      if (newPin && currentPin) {
        const employee = await storage.getEmployee(employeeId);
        if (!employee || employee.pin !== currentPin) {
          return res.status(400).json({ message: "Current PIN is incorrect" });
        }
        
        // Check if new PIN is already taken
        const existingEmployee = await storage.getEmployeeByPin(newPin);
        if (existingEmployee && existingEmployee.id !== employeeId) {
          return res.status(400).json({ message: "PIN is already in use" });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (birthday !== undefined) updateData.birthday = birthday;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (newPin) updateData.pin = newPin;
      
      console.log("Update data being sent to storage:", updateData);

      const updatedEmployee = await storage.updateEmployee(employeeId, updateData);
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json({ employee: updatedEmployee });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  // Correction requests
  app.post("/api/employee/corrections", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const correctionData = {
        employeeId,
        punchId: req.body.punchId,
        date: new Date().toISOString(),
        note: req.body.reason || req.body.note,
        status: "pending"
      };

      const validatedData = insertCorrectionSchema.parse(correctionData);
      const correction = await storage.createCorrection(validatedData);
      
      res.json({ correction });
    } catch (error) {
      console.error("Correction request error:", error);
      res.status(400).json({ message: "Failed to create correction request" });
    }
  });

  app.get("/api/employee/corrections", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const corrections = await storage.getCorrectionsByEmployee(employeeId);
      res.json({ corrections });
    } catch (error) {
      res.status(500).json({ message: "Failed to get corrections" });
    }
  });

  // Email time export
  app.post("/api/employee/email-export", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!employeeId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { email, startDate, endDate } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }

      if (!isEmailConfigured()) {
        return res.status(503).json({ message: "Email service not configured" });
      }

      // Get employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Get punch data
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      const punches = await storage.getPunchesByEmployee(employeeId, start, end);

      // Generate CSV content
      const csvData = formatPunchesForCSV(punches);
      const csvContent = [
        "Date,Time,Type,Location",
        ...csvData.map((row: any) => `"${row.date}","${row.time}","${row.type}","${row.location}"`)
      ].join('\n');

      // Prepare email
      const dateRange = start && end 
        ? `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`
        : "All Time";
      
      const settings = await storage.getSettings();
      const companyName = settings.companyName || "Company";

      const emailSent = await sendEmail({
        to: email,
        from: "noreply@timeclock.app", // You may want to make this configurable
        subject: `${companyName} - Time Export for ${employee.name}`,
        text: `Your time export for ${dateRange} is attached.`,
        html: `
          <h2>${companyName} Time Export</h2>
          <p>Hello ${employee.name},</p>
          <p>Your time export for <strong>${dateRange}</strong> is attached to this email.</p>
          <p>The export includes ${punches.length} punch records.</p>
          <br>
          <p>Thank you!</p>
        `,
        attachments: [{
          content: Buffer.from(csvContent).toString('base64'),
          filename: `time-export-${employee.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`,
          type: 'text/csv'
        }]
      });

      if (emailSent) {
        res.json({ message: "Time export emailed successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Email export error:", error);
      res.status(500).json({ message: "Failed to email time export" });
    }
  });

  // Admin authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password required" });
      }

      const settings = await storage.getSettings();
      const isValid = await bcrypt.compare(password, settings.adminPasswordHash);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      (req.session as any).isAdmin = true;
      (req.session as any).isDefaultPassword = password === "admin123";
      
      res.json({ 
        message: "Login successful",
        isDefaultPassword: password === "admin123"
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // Admin middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const employee = await storage.getEmployee(employeeId);
      if (!employee || !employee.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      return res.status(500).json({ message: "Authentication error" });
    }
  };

  // Admin - Employee management
  app.get("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json({ employees });
    } catch (error) {
      res.status(500).json({ message: "Failed to get employees" });
    }
  });

  app.post("/api/admin/employees", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.json({ employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await storage.updateEmployee(id, req.body);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json({ employee });
    } catch (error) {
      res.status(400).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/admin/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteEmployee(id);
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Admin - Punch management
  app.get("/api/admin/punches", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const punches = await storage.getAllPunches(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json({ punches });
    } catch (error) {
      res.status(500).json({ message: "Failed to get punches" });
    }
  });

  app.put("/api/admin/punches/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Punch update request:", { id, body: req.body });
      
      // Validate and transform the data
      const updateData: any = {};
      if (req.body.timestamp) {
        updateData.timestamp = new Date(req.body.timestamp);
        console.log("Parsed timestamp:", updateData.timestamp);
      }
      if (req.body.punchType) {
        updateData.punchType = req.body.punchType;
      }
      if (req.body.flagged !== undefined) {
        updateData.flagged = req.body.flagged;
      }
      
      console.log("Update data:", updateData);
      
      const punch = await storage.updatePunch(id, updateData);
      if (!punch) {
        return res.status(404).json({ message: "Punch not found" });
      }
      res.json({ punch });
    } catch (error) {
      console.error("Punch update error:", error);
      res.status(400).json({ message: "Failed to update punch", error: error.message });
    }
  });

  app.delete("/api/admin/punches/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePunch(id);
      if (!success) {
        return res.status(404).json({ message: "Punch not found" });
      }
      res.json({ message: "Punch deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete punch" });
    }
  });

  app.post("/api/admin/punches/manual", requireAdmin, async (req, res) => {
    try {
      const { employeeId, timestamp, punchType, note } = req.body;
      
      if (!employeeId || !timestamp || !punchType) {
        return res.status(400).json({ message: "Employee ID, timestamp, and punch type are required" });
      }

      const punchData = {
        employeeId,
        timestamp: new Date(timestamp),
        punchType,
        latitude: null,
        longitude: null,
        ipAddress: req.ip || "127.0.0.1",
        flagged: false
      };

      const validatedData = insertPunchSchema.parse(punchData);
      const punch = await storage.createPunch(validatedData);
      
      res.json({ punch });
    } catch (error) {
      console.error("Manual punch creation error:", error);
      res.status(400).json({ message: "Failed to create manual punch" });
    }
  });

  // Admin - Correction management
  app.get("/api/admin/corrections", requireAdmin, async (req, res) => {
    try {
      const corrections = await storage.getAllCorrections();
      res.json({ corrections });
    } catch (error) {
      res.status(500).json({ message: "Failed to get corrections" });
    }
  });

  app.put("/api/admin/corrections/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const correction = await storage.updateCorrection(id, req.body);
      if (!correction) {
        return res.status(404).json({ message: "Correction not found" });
      }
      res.json({ correction });
    } catch (error) {
      res.status(400).json({ message: "Failed to update correction" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      // Don't expose password hash
      const { adminPasswordHash, ...publicSettings } = settings;
      res.json({ settings: publicSettings });
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      // Hash new password if provided
      if (updateData.newPassword) {
        updateData.adminPasswordHash = await bcrypt.hash(updateData.newPassword, 10);
        delete updateData.newPassword;
      }

      const settings = await storage.updateSettings(updateData);
      const { adminPasswordHash, ...publicSettings } = settings;
      res.json({ settings: publicSettings });
    } catch (error) {
      res.status(400).json({ message: "Failed to update settings" });
    }
  });

  // Admin stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Time-off request routes
  app.post("/api/time-off", async (req, res) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const requestData = insertTimeOffRequestSchema.parse({
        ...req.body,
        employeeId
      });
      
      const request = await storage.createTimeOffRequest(requestData);
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/time-off/employee", async (req, res) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const requests = await storage.getTimeOffRequestsByEmployee(employeeId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get time-off requests" });
    }
  });

  app.get("/api/admin/time-off", async (req, res) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is admin
    try {
      const employee = await storage.getEmployee(employeeId);
      if (!employee?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const requests = await storage.getAllTimeOffRequests();
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get time-off requests" });
    }
  });

  app.get("/api/time-off/calendar", async (req, res) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and end date required" });
      }

      const requests = await storage.getTimeOffRequestsInRange(
        startDate as string, 
        endDate as string
      );
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get calendar data" });
    }
  });

  app.patch("/api/admin/time-off/:id", async (req, res) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const employee = await storage.getEmployee(employeeId);
      if (!employee?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updateData = {
        ...req.body,
        processedBy: employeeId
      };

      const request = await storage.updateTimeOffRequest(id, updateData);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: "Failed to update request" });
    }
  });

  app.delete("/api/time-off/:id", async (req, res) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const success = await storage.deleteTimeOffRequest(id);
      
      if (!success) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json({ message: "Request deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
