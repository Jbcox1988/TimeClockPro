import Database from "sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { employees, punches, settings, corrections, timeOffRequests, type Employee, type InsertEmployee, type Punch, type InsertPunch, type Settings, type InsertSettings, type Correction, type InsertCorrection, type TimeOffRequest, type InsertTimeOffRequest } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";

const sqlite = new Database.Database("data.db");
const db = drizzle(sqlite);

export interface IStorage {
  // Employee methods
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByPin(pin: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Punch methods
  createPunch(punch: InsertPunch): Promise<Punch>;
  getPunchesByEmployee(employeeId: string, startDate?: Date, endDate?: Date): Promise<Punch[]>;
  getAllPunches(startDate?: Date, endDate?: Date): Promise<Punch[]>;
  getLastPunchByEmployee(employeeId: string): Promise<Punch | undefined>;
  updatePunch(id: string, punch: Partial<InsertPunch & { timestamp?: Date }>): Promise<Punch | undefined>;
  deletePunch(id: string): Promise<boolean>;

  // Settings methods
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  // Correction methods
  createCorrection(correction: InsertCorrection): Promise<Correction>;
  getCorrectionsByEmployee(employeeId: string): Promise<Correction[]>;
  getAllCorrections(): Promise<Correction[]>;
  updateCorrection(id: string, correction: Partial<InsertCorrection>): Promise<Correction | undefined>;

  // Time off request methods
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  getTimeOffRequestsByEmployee(employeeId: string): Promise<TimeOffRequest[]>;
  getAllTimeOffRequests(): Promise<TimeOffRequest[]>;
  getTimeOffRequestsInRange(startDate: string, endDate: string): Promise<TimeOffRequest[]>;
  updateTimeOffRequest(id: string, request: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest | undefined>;
  deleteTimeOffRequest(id: string): Promise<boolean>;

  // Stats methods
  getAdminStats(): Promise<{
    activeEmployees: number;
    clockedInToday: number;
    punchesToday: number;
    pendingCorrections: number;
  }>;
}

export class SqliteStorage implements IStorage {
  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Create tables if they don't exist
    await this.createTables();
    await this.seedData();
  }

  private async createTables() {
    const createEmployeesTable = `
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pin TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_admin INTEGER NOT NULL DEFAULT 0,
        email TEXT,
        phone TEXT,
        birthday TEXT,
        photo_url TEXT
      )
    `;

    const createPunchesTable = `
      CREATE TABLE IF NOT EXISTS punches (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        punch_type TEXT NOT NULL CHECK(punch_type IN ('in', 'out')),
        timestamp INTEGER NOT NULL,
        latitude REAL,
        longitude REAL,
        ip_address TEXT NOT NULL,
        flagged INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (employee_id) REFERENCES employees (id)
      )
    `;

    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        company_name TEXT NOT NULL DEFAULT 'TimeClock Pro',
        logo_url TEXT,
        show_company_name INTEGER NOT NULL DEFAULT 1,
        show_logo INTEGER NOT NULL DEFAULT 1,
        theme_color TEXT NOT NULL DEFAULT '#1976D2',
        accent_color TEXT NOT NULL DEFAULT '#059669',
        success_color TEXT NOT NULL DEFAULT '#16a34a',
        warning_color TEXT NOT NULL DEFAULT '#ea580c',
        destructive_color TEXT NOT NULL DEFAULT '#dc2626',
        background_color TEXT NOT NULL DEFAULT '#f9fafb',
        card_color TEXT NOT NULL DEFAULT '#ffffff',
        text_color TEXT NOT NULL DEFAULT '#111827',
        muted_text_color TEXT NOT NULL DEFAULT '#6b7280',
        geo_lat REAL,
        geo_lon REAL,
        geo_radius REAL DEFAULT 500,
        geofencing_enabled INTEGER NOT NULL DEFAULT 0,
        admin_password_hash TEXT NOT NULL
      )
    `;

    const createCorrectionsTable = `
      CREATE TABLE IF NOT EXISTS corrections (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        punch_id TEXT,
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (punch_id) REFERENCES punches (id)
      )
    `;

    const createTimeOffRequestsTable = `
      CREATE TABLE IF NOT EXISTS time_off_requests (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('vacation', 'sick', 'personal', 'other')),
        reason TEXT,
        request_date INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
        admin_response TEXT,
        processed_date INTEGER,
        processed_by TEXT,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (processed_by) REFERENCES employees (id)
      )
    `;

    return new Promise<void>((resolve, reject) => {
      sqlite.serialize(() => {
        sqlite.run(createEmployeesTable);
        sqlite.run(createPunchesTable);
        sqlite.run(createSettingsTable);
        sqlite.run(createCorrectionsTable);
        sqlite.run(createTimeOffRequestsTable);
        
        // Add migration for new employee profile fields
        sqlite.run(`ALTER TABLE employees ADD COLUMN email TEXT`, () => {});
        sqlite.run(`ALTER TABLE employees ADD COLUMN phone TEXT`, () => {});
        sqlite.run(`ALTER TABLE employees ADD COLUMN birthday TEXT`, () => {});
        sqlite.run(`ALTER TABLE employees ADD COLUMN photo_url TEXT`, () => {});
        
        // Add migration for new settings branding fields
        sqlite.run(`ALTER TABLE settings ADD COLUMN show_company_name INTEGER NOT NULL DEFAULT 1`, () => {});
        sqlite.run(`ALTER TABLE settings ADD COLUMN show_logo INTEGER NOT NULL DEFAULT 1`, () => {});
        
        // Add migration for partial day time-off requests
        sqlite.run(`ALTER TABLE time_off_requests ADD COLUMN start_time TEXT`, () => {});
        sqlite.run(`ALTER TABLE time_off_requests ADD COLUMN end_time TEXT`, () => {});
        sqlite.run(`ALTER TABLE time_off_requests ADD COLUMN is_partial_day INTEGER NOT NULL DEFAULT 0`, (err) => {
          // Ignore errors if columns already exist
          resolve();
        });
      });
    });
  }

  private async seedData() {
    // Check if data already exists
    const employeeCount = await new Promise<number>((resolve) => {
      sqlite.get("SELECT COUNT(*) as count FROM employees", (err, row: any) => {
        resolve(err ? 0 : row.count);
      });
    });

    if (employeeCount > 0) return;

    // Seed default admin password (admin123)
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    // Seed settings
    await new Promise<void>((resolve) => {
      sqlite.run(
        "INSERT INTO settings (admin_password_hash) VALUES (?)",
        [adminPasswordHash],
        resolve
      );
    });

    // Seed initial employees
    const employees = [
      { name: "Administrator", pin: "0000", isAdmin: true },
      { name: "Joshua Cox", pin: "1003", isAdmin: true },
      { name: "Matt McVeigh", pin: "1008", isAdmin: true },
      { name: "Sarah Johnson", pin: "2001", isAdmin: false },
      { name: "Mike Davis", pin: "2002", isAdmin: false },
      { name: "Lisa Thompson", pin: "2003", isAdmin: false },
      { name: "David Wilson", pin: "2004", isAdmin: false },
      { name: "Emily Brown", pin: "2005", isAdmin: false }
    ];

    for (const employee of employees) {
      const employeeId = randomUUID();
      await new Promise<void>((resolve) => {
        sqlite.run(
          "INSERT INTO employees (id, name, pin, is_active, is_admin) VALUES (?, ?, ?, ?, ?)",
          [employeeId, employee.name, employee.pin, true, employee.isAdmin],
          resolve
        );
      });
    }
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return new Promise((resolve) => {
      sqlite.get(
        "SELECT * FROM employees WHERE id = ?",
        [id],
        (err, row: any) => {
          if (err || !row) resolve(undefined);
          else resolve({
            id: row.id,
            name: row.name,
            pin: row.pin,
            isActive: Boolean(row.is_active),
            isAdmin: Boolean(row.is_admin),
            email: row.email || null,
            phone: row.phone || null,
            birthday: row.birthday || null,
            photoUrl: row.photo_url || null
          });
        }
      );
    });
  }

  async getEmployeeByPin(pin: string): Promise<Employee | undefined> {
    return new Promise((resolve) => {
      sqlite.get(
        "SELECT * FROM employees WHERE pin = ? AND is_active = 1",
        [pin],
        (err, row: any) => {
          if (err || !row) resolve(undefined);
          else resolve({
            id: row.id,
            name: row.name,
            pin: row.pin,
            isActive: Boolean(row.is_active),
            isAdmin: Boolean(row.is_admin),
            email: row.email || null,
            phone: row.phone || null,
            birthday: row.birthday || null,
            photoUrl: row.photo_url || null
          });
        }
      );
    });
  }

  async getAllEmployees(): Promise<Employee[]> {
    return new Promise((resolve) => {
      sqlite.all(
        "SELECT * FROM employees ORDER BY name",
        (err, rows: any[]) => {
          if (err) resolve([]);
          else resolve(rows.map(row => ({
            id: row.id,
            name: row.name,
            pin: row.pin,
            isActive: Boolean(row.is_active),
            isAdmin: Boolean(row.is_admin),
            email: row.email || null,
            phone: row.phone || null,
            birthday: row.birthday || null,
            photoUrl: row.photo_url || null
          })));
        }
      );
    });
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      sqlite.run(
        "INSERT INTO employees (id, name, pin, is_active, is_admin, email, phone, birthday, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, employee.name, employee.pin, employee.isActive ? 1 : 0, employee.isAdmin ? 1 : 0, employee.email || null, employee.phone || null, employee.birthday || null, employee.photoUrl || null],
        function(err) {
          if (err) reject(err);
          else resolve({
            id,
            name: employee.name,
            pin: employee.pin,
            isActive: employee.isActive ?? true,
            isAdmin: employee.isAdmin ?? false,
            email: employee.email || null,
            phone: employee.phone || null,
            birthday: employee.birthday || null,
            photoUrl: employee.photoUrl || null
          });
        }
      );
    });
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const updates: string[] = [];
    const values: any[] = [];

    if (employee.name !== undefined) {
      updates.push("name = ?");
      values.push(employee.name);
    }
    if (employee.pin !== undefined) {
      updates.push("pin = ?");
      values.push(employee.pin);
    }
    if (employee.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(employee.isActive ? 1 : 0);
    }
    if (employee.isAdmin !== undefined) {
      updates.push("is_admin = ?");
      values.push(employee.isAdmin ? 1 : 0);
    }
    if (employee.email !== undefined) {
      updates.push("email = ?");
      values.push(employee.email || null);
    }
    if (employee.phone !== undefined) {
      updates.push("phone = ?");
      values.push(employee.phone || null);
    }
    if (employee.birthday !== undefined) {
      updates.push("birthday = ?");
      values.push(employee.birthday || null);
    }
    if (employee.photoUrl !== undefined) {
      updates.push("photo_url = ?");
      values.push(employee.photoUrl || null);
    }

    if (updates.length === 0) return this.getEmployee(id);

    values.push(id);

    return new Promise((resolve) => {
      sqlite.run(
        `UPDATE employees SET ${updates.join(", ")} WHERE id = ?`,
        values,
        (err) => {
          if (err) resolve(undefined);
          else this.getEmployee(id).then(resolve);
        }
      );
    });
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      sqlite.run(
        "DELETE FROM employees WHERE id = ?",
        [id],
        function(err) {
          resolve(!err && this.changes > 0);
        }
      );
    });
  }

  async createPunch(punch: InsertPunch): Promise<Punch> {
    const id = randomUUID();
    const timestamp = new Date();
    
    // Check for recent duplicate punches (within 30 seconds)
    const recentTimeThreshold = timestamp.getTime() - (30 * 1000);
    
    return new Promise((resolve, reject) => {
      // First check for recent duplicates
      sqlite.get(
        "SELECT id FROM punches WHERE employee_id = ? AND punch_type = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 1",
        [punch.employeeId, punch.punchType, recentTimeThreshold],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row) {
            // Duplicate found within 30 seconds, reject
            reject(new Error("Duplicate punch detected. Please wait before punching again."));
            return;
          }
          
          // No recent duplicate, proceed with insertion
          sqlite.run(
            "INSERT INTO punches (id, employee_id, punch_type, timestamp, latitude, longitude, ip_address, flagged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [id, punch.employeeId, punch.punchType, timestamp.getTime(), punch.latitude, punch.longitude, punch.ipAddress, punch.flagged ? 1 : 0],
            function(err) {
              if (err) reject(err);
              else resolve({
                id,
                employeeId: punch.employeeId,
                punchType: punch.punchType,
                timestamp,
                latitude: punch.latitude || null,
                longitude: punch.longitude || null,
                ipAddress: punch.ipAddress,
                flagged: punch.flagged ?? false
              });
            }
          );
        }
      );
    });
  }

  async getPunchesByEmployee(employeeId: string, startDate?: Date, endDate?: Date): Promise<Punch[]> {
    let query = "SELECT * FROM punches WHERE employee_id = ?";
    const params: any[] = [employeeId];

    if (startDate) {
      query += " AND timestamp >= ?";
      params.push(startDate.getTime());
    }
    if (endDate) {
      query += " AND timestamp <= ?";
      params.push(endDate.getTime());
    }

    query += " ORDER BY timestamp DESC";

    return new Promise((resolve) => {
      sqlite.all(query, params, (err, rows: any[]) => {
        if (err) resolve([]);
        else resolve(rows.map(row => ({
          id: row.id,
          employeeId: row.employee_id,
          punchType: row.punch_type as "in" | "out",
          timestamp: new Date(row.timestamp),
          latitude: row.latitude,
          longitude: row.longitude,
          ipAddress: row.ip_address,
          flagged: Boolean(row.flagged)
        })));
      });
    });
  }

  async getAllPunches(startDate?: Date, endDate?: Date): Promise<Punch[]> {
    let query = "SELECT * FROM punches";
    const params: any[] = [];

    if (startDate || endDate) {
      query += " WHERE";
      if (startDate) {
        query += " timestamp >= ?";
        params.push(startDate.getTime());
      }
      if (endDate) {
        if (startDate) query += " AND";
        query += " timestamp <= ?";
        params.push(endDate.getTime());
      }
    }

    query += " ORDER BY timestamp DESC";

    return new Promise((resolve) => {
      sqlite.all(query, params, (err, rows: any[]) => {
        if (err) resolve([]);
        else resolve(rows.map(row => ({
          id: row.id,
          employeeId: row.employee_id,
          punchType: row.punch_type as "in" | "out",
          timestamp: new Date(row.timestamp),
          latitude: row.latitude,
          longitude: row.longitude,
          ipAddress: row.ip_address,
          flagged: Boolean(row.flagged)
        })));
      });
    });
  }

  async getLastPunchByEmployee(employeeId: string): Promise<Punch | undefined> {
    return new Promise((resolve) => {
      sqlite.get(
        "SELECT * FROM punches WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1",
        [employeeId],
        (err, row: any) => {
          if (err || !row) resolve(undefined);
          else resolve({
            id: row.id,
            employeeId: row.employee_id,
            punchType: row.punch_type as "in" | "out",
            timestamp: new Date(row.timestamp),
            latitude: row.latitude,
            longitude: row.longitude,
            ipAddress: row.ip_address,
            flagged: Boolean(row.flagged)
          });
        }
      );
    });
  }

  async updatePunch(id: string, punch: Partial<InsertPunch & { timestamp?: Date }>): Promise<Punch | undefined> {
    const updates: string[] = [];
    const values: any[] = [];

    if (punch.timestamp !== undefined) {
      updates.push("timestamp = ?");
      values.push(punch.timestamp.getTime());
    }
    if (punch.punchType !== undefined) {
      updates.push("punch_type = ?");
      values.push(punch.punchType);
    }
    if (punch.latitude !== undefined) {
      updates.push("latitude = ?");
      values.push(punch.latitude);
    }
    if (punch.longitude !== undefined) {
      updates.push("longitude = ?");
      values.push(punch.longitude);
    }
    if (punch.flagged !== undefined) {
      updates.push("flagged = ?");
      values.push(punch.flagged ? 1 : 0);
    }

    if (updates.length === 0) {
      return new Promise((resolve) => {
        sqlite.get("SELECT * FROM punches WHERE id = ?", [id], (err, row: any) => {
          if (err || !row) resolve(undefined);
          else resolve({
            id: row.id,
            employeeId: row.employee_id,
            punchType: row.punch_type as "in" | "out",
            timestamp: new Date(row.timestamp),
            latitude: row.latitude,
            longitude: row.longitude,
            ipAddress: row.ip_address,
            flagged: Boolean(row.flagged)
          });
        });
      });
    }

    values.push(id);

    return new Promise((resolve) => {
      sqlite.run(
        `UPDATE punches SET ${updates.join(", ")} WHERE id = ?`,
        values,
        (err) => {
          if (err) resolve(undefined);
          else {
            sqlite.get("SELECT * FROM punches WHERE id = ?", [id], (err, row: any) => {
              if (err || !row) resolve(undefined);
              else resolve({
                id: row.id,
                employeeId: row.employee_id,
                punchType: row.punch_type as "in" | "out",
                timestamp: new Date(row.timestamp),
                latitude: row.latitude,
                longitude: row.longitude,
                ipAddress: row.ip_address,
                flagged: Boolean(row.flagged)
              });
            });
          }
        }
      );
    });
  }

  async deletePunch(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      sqlite.run(
        "DELETE FROM punches WHERE id = ?",
        [id],
        function(err) {
          resolve(!err && this.changes > 0);
        }
      );
    });
  }

  async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      sqlite.get(
        "SELECT * FROM settings WHERE id = 1",
        (err, row: any) => {
          if (err || !row) {
            // Return default settings if none exist - using original theme colors
            resolve({
              id: 1,
              companyName: "TimeClock Pro",
              logoUrl: null,
              showCompanyName: true,
              showLogo: true,
              themeColor: "#1976D2",
              accentColor: "#059669",
              successColor: "#16a34a",
              warningColor: "#ea580c",
              destructiveColor: "#dc2626",
              backgroundColor: "#f9fafb",
              cardColor: "#ffffff",
              textColor: "#111827",
              mutedTextColor: "#6b7280",
              geoLat: null,
              geoLon: null,
              geoRadius: 500,
              geofencingEnabled: false,
              adminPasswordHash: ""
            });
          } else {
            resolve({
              id: row.id,
              companyName: row.company_name,
              logoUrl: row.logo_url,
              showCompanyName: Boolean(row.show_company_name !== undefined ? row.show_company_name : true),
              showLogo: Boolean(row.show_logo !== undefined ? row.show_logo : true),
              themeColor: row.theme_color,
              accentColor: row.accent_color || "#059669",
              successColor: row.success_color || "#16a34a",
              warningColor: row.warning_color || "#ea580c",
              destructiveColor: row.destructive_color || "#dc2626",
              backgroundColor: row.background_color || "#f9fafb",
              cardColor: row.card_color || "#ffffff",
              textColor: row.text_color || "#111827",
              mutedTextColor: row.muted_text_color || "#6b7280",
              geoLat: row.geo_lat,
              geoLon: row.geo_lon,
              geoRadius: row.geo_radius,
              geofencingEnabled: Boolean(row.geofencing_enabled),
              adminPasswordHash: row.admin_password_hash
            });
          }
        }
      );
    });
  }

  async updateSettings(settings: Partial<InsertSettings>): Promise<Settings> {
    const updates: string[] = [];
    const values: any[] = [];

    if (settings.companyName !== undefined) {
      updates.push("company_name = ?");
      values.push(settings.companyName);
    }
    if (settings.logoUrl !== undefined) {
      updates.push("logo_url = ?");
      values.push(settings.logoUrl);
    }
    if (settings.showCompanyName !== undefined) {
      updates.push("show_company_name = ?");
      values.push(settings.showCompanyName ? 1 : 0);
    }
    if (settings.showLogo !== undefined) {
      updates.push("show_logo = ?");
      values.push(settings.showLogo ? 1 : 0);
    }
    if (settings.themeColor !== undefined) {
      updates.push("theme_color = ?");
      values.push(settings.themeColor);
    }
    if (settings.accentColor !== undefined) {
      updates.push("accent_color = ?");
      values.push(settings.accentColor);
    }
    if (settings.successColor !== undefined) {
      updates.push("success_color = ?");
      values.push(settings.successColor);
    }
    if (settings.warningColor !== undefined) {
      updates.push("warning_color = ?");
      values.push(settings.warningColor);
    }
    if (settings.destructiveColor !== undefined) {
      updates.push("destructive_color = ?");
      values.push(settings.destructiveColor);
    }
    if (settings.backgroundColor !== undefined) {
      updates.push("background_color = ?");
      values.push(settings.backgroundColor);
    }
    if (settings.cardColor !== undefined) {
      updates.push("card_color = ?");
      values.push(settings.cardColor);
    }
    if (settings.textColor !== undefined) {
      updates.push("text_color = ?");
      values.push(settings.textColor);
    }
    if (settings.mutedTextColor !== undefined) {
      updates.push("muted_text_color = ?");
      values.push(settings.mutedTextColor);
    }
    if (settings.geoLat !== undefined) {
      updates.push("geo_lat = ?");
      values.push(settings.geoLat);
    }
    if (settings.geoLon !== undefined) {
      updates.push("geo_lon = ?");
      values.push(settings.geoLon);
    }
    if (settings.geoRadius !== undefined) {
      updates.push("geo_radius = ?");
      values.push(settings.geoRadius);
    }
    if (settings.geofencingEnabled !== undefined) {
      updates.push("geofencing_enabled = ?");
      values.push(settings.geofencingEnabled ? 1 : 0);
    }
    if (settings.adminPasswordHash !== undefined) {
      updates.push("admin_password_hash = ?");
      values.push(settings.adminPasswordHash);
    }

    if (updates.length === 0) return this.getSettings();

    return new Promise((resolve) => {
      sqlite.run(
        `UPDATE settings SET ${updates.join(", ")} WHERE id = 1`,
        values,
        (err) => {
          if (err) this.getSettings().then(resolve);
          else this.getSettings().then(resolve);
        }
      );
    });
  }

  async createCorrection(correction: InsertCorrection): Promise<Correction> {
    const id = randomUUID();
    
    return new Promise((resolve, reject) => {
      sqlite.run(
        "INSERT INTO corrections (id, employee_id, punch_id, date, note, status) VALUES (?, ?, ?, ?, ?, ?)",
        [id, correction.employeeId, correction.punchId, correction.date, correction.note, correction.status || "pending"],
        function(err) {
          if (err) reject(err);
          else resolve({
            id,
            employeeId: correction.employeeId,
            punchId: correction.punchId || null,
            date: correction.date,
            note: correction.note,
            status: correction.status || "pending"
          });
        }
      );
    });
  }

  async getCorrectionsByEmployee(employeeId: string): Promise<Correction[]> {
    return new Promise((resolve) => {
      sqlite.all(
        "SELECT * FROM corrections WHERE employee_id = ? ORDER BY date DESC",
        [employeeId],
        (err, rows: any[]) => {
          if (err) resolve([]);
          else resolve(rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            punchId: row.punch_id,
            date: row.date,
            note: row.note,
            status: row.status as "pending" | "approved" | "denied"
          })));
        }
      );
    });
  }

  async getAllCorrections(): Promise<Correction[]> {
    return new Promise((resolve) => {
      sqlite.all(
        "SELECT * FROM corrections ORDER BY date DESC",
        (err, rows: any[]) => {
          if (err) resolve([]);
          else resolve(rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            punchId: row.punch_id,
            date: row.date,
            note: row.note,
            status: row.status as "pending" | "approved" | "denied"
          })));
        }
      );
    });
  }

  async updateCorrection(id: string, correction: Partial<InsertCorrection>): Promise<Correction | undefined> {
    const updates: string[] = [];
    const values: any[] = [];

    if (correction.status !== undefined) {
      updates.push("status = ?");
      values.push(correction.status);
    }
    if (correction.note !== undefined) {
      updates.push("note = ?");
      values.push(correction.note);
    }

    if (updates.length === 0) {
      return new Promise((resolve) => {
        sqlite.get("SELECT * FROM corrections WHERE id = ?", [id], (err, row: any) => {
          if (err || !row) resolve(undefined);
          else resolve({
            id: row.id,
            employeeId: row.employee_id,
            punchId: row.punch_id,
            date: row.date,
            note: row.note,
            status: row.status as "pending" | "approved" | "denied"
          });
        });
      });
    }

    values.push(id);

    return new Promise((resolve) => {
      sqlite.run(
        `UPDATE corrections SET ${updates.join(", ")} WHERE id = ?`,
        values,
        (err) => {
          if (err) resolve(undefined);
          else {
            sqlite.get("SELECT * FROM corrections WHERE id = ?", [id], (err, row: any) => {
              if (err || !row) resolve(undefined);
              else resolve({
                id: row.id,
                employeeId: row.employee_id,
                punchId: row.punch_id,
                date: row.date,
                note: row.note,
                status: row.status as "pending" | "approved" | "denied"
              });
            });
          }
        }
      );
    });
  }

  async getAdminStats(): Promise<{
    activeEmployees: number;
    clockedInToday: number;
    punchesToday: number;
    pendingCorrections: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    return new Promise((resolve) => {
      const stats = {
        activeEmployees: 0,
        clockedInToday: 0,
        punchesToday: 0,
        pendingCorrections: 0
      };

      // Get active employees count
      sqlite.get("SELECT COUNT(*) as count FROM employees WHERE is_active = 1", (err, row: any) => {
        if (!err && row) stats.activeEmployees = row.count;

        // Get clocked in today count
        sqlite.get(
          `SELECT COUNT(DISTINCT employee_id) as count FROM punches 
           WHERE timestamp >= ? AND timestamp < ? AND punch_type = 'in'`,
          [todayStart, todayEnd],
          (err, row: any) => {
            if (!err && row) stats.clockedInToday = row.count;

            // Get punches today count
            sqlite.get(
              "SELECT COUNT(*) as count FROM punches WHERE timestamp >= ? AND timestamp < ?",
              [todayStart, todayEnd],
              (err, row: any) => {
                if (!err && row) stats.punchesToday = row.count;

                // Get pending corrections count
                sqlite.get(
                  "SELECT COUNT(*) as count FROM corrections WHERE status = 'pending'",
                  (err, row: any) => {
                    if (!err && row) stats.pendingCorrections = row.count;
                    resolve(stats);
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const id = randomUUID();
    const requestDate = new Date();
    
    return new Promise((resolve, reject) => {
      sqlite.run(
        `INSERT INTO time_off_requests (id, employee_id, start_date, end_date, start_time, end_time, is_partial_day, type, reason, request_date, status, admin_response, processed_date, processed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, request.employeeId, request.startDate, request.endDate, request.startTime || null, request.endTime || null, request.isPartialDay ? 1 : 0, request.type, request.reason || null, requestDate.getTime(), request.status || "pending", request.adminResponse || null, null, request.processedBy || null],
        function(err) {
          if (err) reject(err);
          else resolve({
            id,
            employeeId: request.employeeId,
            startDate: request.startDate,
            endDate: request.endDate,
            startTime: request.startTime || null,
            endTime: request.endTime || null,
            isPartialDay: request.isPartialDay || false,
            type: request.type,
            reason: request.reason || null,
            requestDate: requestDate,
            status: request.status || "pending",
            adminResponse: request.adminResponse || null,
            processedDate: null,
            processedBy: request.processedBy || null
          });
        }
      );
    });
  }

  async getTimeOffRequestsByEmployee(employeeId: string): Promise<TimeOffRequest[]> {
    return new Promise((resolve) => {
      sqlite.all(
        "SELECT * FROM time_off_requests WHERE employee_id = ? ORDER BY request_date DESC",
        [employeeId],
        (err, rows: any[]) => {
          if (err || !rows) resolve([]);
          else resolve(rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            isPartialDay: Boolean(row.is_partial_day),
            type: row.type,
            reason: row.reason,
            requestDate: new Date(row.request_date),
            status: row.status,
            adminResponse: row.admin_response,
            processedDate: row.processed_date ? new Date(row.processed_date) : null,
            processedBy: row.processed_by
          })));
        }
      );
    });
  }

  async getAllTimeOffRequests(): Promise<TimeOffRequest[]> {
    return new Promise((resolve) => {
      sqlite.all(
        "SELECT * FROM time_off_requests ORDER BY request_date DESC",
        (err, rows: any[]) => {
          if (err || !rows) resolve([]);
          else resolve(rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            isPartialDay: Boolean(row.is_partial_day),
            type: row.type,
            reason: row.reason,
            requestDate: new Date(row.request_date),
            status: row.status,
            adminResponse: row.admin_response,
            processedDate: row.processed_date ? new Date(row.processed_date) : null,
            processedBy: row.processed_by
          })));
        }
      );
    });
  }

  async getTimeOffRequestsInRange(startDate: string, endDate: string): Promise<TimeOffRequest[]> {
    return new Promise((resolve) => {
      sqlite.all(
        `SELECT * FROM time_off_requests 
         WHERE (start_date <= ? AND end_date >= ?) 
         OR (start_date >= ? AND start_date <= ?)
         ORDER BY start_date ASC`,
        [endDate, startDate, startDate, endDate],
        (err, rows: any[]) => {
          if (err || !rows) resolve([]);
          else resolve(rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            isPartialDay: Boolean(row.is_partial_day),
            type: row.type,
            reason: row.reason,
            requestDate: new Date(row.request_date),
            status: row.status,
            adminResponse: row.admin_response,
            processedDate: row.processed_date ? new Date(row.processed_date) : null,
            processedBy: row.processed_by
          })));
        }
      );
    });
  }

  async updateTimeOffRequest(id: string, request: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest | undefined> {
    const updates: string[] = [];
    const values: any[] = [];

    if (request.startDate !== undefined) {
      updates.push("start_date = ?");
      values.push(request.startDate);
    }
    if (request.endDate !== undefined) {
      updates.push("end_date = ?");
      values.push(request.endDate);
    }
    if (request.type !== undefined) {
      updates.push("type = ?");
      values.push(request.type);
    }
    if (request.reason !== undefined) {
      updates.push("reason = ?");
      values.push(request.reason);
    }
    if (request.status !== undefined) {
      updates.push("status = ?");
      values.push(request.status);
    }
    if (request.adminResponse !== undefined) {
      updates.push("admin_response = ?");
      values.push(request.adminResponse);
    }
    if (request.processedBy !== undefined) {
      updates.push("processed_by = ?");
      values.push(request.processedBy);
      updates.push("processed_date = ?");
      values.push(new Date().getTime());
    }

    if (updates.length === 0) return this.getTimeOffRequestById(id);

    values.push(id);

    return new Promise((resolve) => {
      sqlite.run(
        `UPDATE time_off_requests SET ${updates.join(", ")} WHERE id = ?`,
        values,
        (err) => {
          if (err) resolve(undefined);
          else this.getTimeOffRequestById(id).then(resolve);
        }
      );
    });
  }

  private async getTimeOffRequestById(id: string): Promise<TimeOffRequest | undefined> {
    return new Promise((resolve) => {
      sqlite.get(
        "SELECT * FROM time_off_requests WHERE id = ?",
        [id],
        (err, row: any) => {
          if (err || !row) resolve(undefined);
          else resolve({
            id: row.id,
            employeeId: row.employee_id,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            isPartialDay: Boolean(row.is_partial_day),
            type: row.type,
            reason: row.reason,
            requestDate: new Date(row.request_date),
            status: row.status,
            adminResponse: row.admin_response,
            processedDate: row.processed_date ? new Date(row.processed_date) : null,
            processedBy: row.processed_by
          });
        }
      );
    });
  }

  async deleteTimeOffRequest(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      sqlite.run(
        "DELETE FROM time_off_requests WHERE id = ?",
        [id],
        function(err) {
          resolve(!err && this.changes > 0);
        }
      );
    });
  }
}

export const storage = new SqliteStorage();
