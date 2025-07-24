import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import * as schema from "../shared/schema-mysql";
import type { IStorage } from "./storage";
import type {
  Employee,
  InsertEmployee,
  Punch,
  InsertPunch,
  Settings,
  InsertSettings,
  Correction,
  InsertCorrection,
  TimeOffRequest,
  InsertTimeOffRequest,
} from "../shared/schema-mysql";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export class MySqlStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const connectionString = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/timeclock_pro";
    
    try {
      const connection = await mysql.createConnection(connectionString);
      this.db = drizzle(connection, { schema, mode: "default" });
      
      await this.createTables();
      await this.seedData();
    } catch (error) {
      console.error("Failed to initialize MySQL database:", error);
      throw error;
    }
  }

  private async createTables() {
    try {
      // Create employees table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS employees (
          id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
          name VARCHAR(255) NOT NULL,
          pin VARCHAR(10) NOT NULL UNIQUE,
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_admin BOOLEAN NOT NULL DEFAULT false,
          email VARCHAR(255),
          phone VARCHAR(20),
          birthday VARCHAR(10),
          photo_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create punches table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS punches (
          id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
          employee_id VARCHAR(255) NOT NULL,
          punch_type VARCHAR(10) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          ip_address VARCHAR(45),
          flagged BOOLEAN NOT NULL DEFAULT false,
          note TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )
      `);

      // Create settings table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS settings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_name VARCHAR(255) NOT NULL DEFAULT 'Your Company',
          logo_url TEXT,
          geofencing_enabled BOOLEAN NOT NULL DEFAULT false,
          geo_lat DECIMAL(10,8),
          geo_lon DECIMAL(11,8),
          geo_radius INT DEFAULT 500,
          admin_password VARCHAR(255),
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create corrections table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS corrections (
          id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
          employee_id VARCHAR(255) NOT NULL,
          punch_id VARCHAR(255),
          requested_date VARCHAR(10) NOT NULL,
          requested_time VARCHAR(8),
          punch_type VARCHAR(10) NOT NULL,
          reason TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          admin_note TEXT,
          request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolved_date TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
          FOREIGN KEY (punch_id) REFERENCES punches(id) ON DELETE SET NULL
        )
      `);

      // Create time_off_requests table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS time_off_requests (
          id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
          employee_id VARCHAR(255) NOT NULL,
          type VARCHAR(20) NOT NULL,
          start_date VARCHAR(10) NOT NULL,
          end_date VARCHAR(10) NOT NULL,
          is_partial_day BOOLEAN NOT NULL DEFAULT false,
          start_time VARCHAR(8),
          end_time VARCHAR(8),
          reason TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          admin_note TEXT,
          request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          reviewed_date TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )
      `);

      console.log("MySQL tables created successfully");
    } catch (error) {
      console.error("Failed to create MySQL tables:", error);
    }
  }

  private async seedData() {
    try {
      // Check if settings exist
      const existingSettings = await this.db.select().from(schema.settings).limit(1);
      if (existingSettings.length === 0) {
        await this.db.insert(schema.settings).values({
          companyName: "Corvaer",
          logoUrl: null,
          geofencingEnabled: false,
          geoLat: null,
          geoLon: null,
          geoRadius: 500,
          adminPassword: null,
        });
      }

      // Check if admin employees exist
      const existingEmployees = await this.db.select().from(schema.employees).limit(1);
      if (existingEmployees.length === 0) {
        await this.db.insert(schema.employees).values([
          {
            id: nanoid(),
            name: "Administrator",
            pin: "0000",
            isActive: true,
            isAdmin: true,
            email: "admin@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "Joshua Cox",
            pin: "1003",
            isActive: true,
            isAdmin: true,
            email: "joshua@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "Matt McVeigh",
            pin: "1008",
            isActive: true,
            isAdmin: true,
            email: "matt@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "Sarah Johnson",
            pin: "2001",
            isActive: true,
            isAdmin: false,
            email: "sarah@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "Mike Davis",
            pin: "2002",
            isActive: true,
            isAdmin: false,
            email: "mike@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "Lisa Thompson",
            pin: "2003",
            isActive: true,
            isAdmin: false,
            email: "lisa@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "David Wilson",
            pin: "2004",
            isActive: true,
            isAdmin: false,
            email: "david@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
          {
            id: nanoid(),
            name: "Emily Brown",
            pin: "2005",
            isActive: true,
            isAdmin: false,
            email: "emily@company.com",
            phone: null,
            birthday: null,
            photoUrl: null,
          },
        ]);
      }

      console.log("MySQL database seeded successfully");
    } catch (error) {
      console.error("Failed to seed MySQL database:", error);
    }
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(schema.employees).where(eq(schema.employees.id, id)).limit(1);
    return result[0];
  }

  async getEmployeeByPin(pin: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(schema.employees).where(eq(schema.employees.pin, pin)).limit(1);
    return result[0];
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await this.db.select().from(schema.employees).orderBy(schema.employees.name);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = nanoid();
    await this.db.insert(schema.employees).values({ ...employee, id });
    return await this.getEmployee(id) as Employee;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    await this.db.update(schema.employees).set(employee).where(eq(schema.employees.id, id));
    return await this.getEmployee(id);
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.employees).where(eq(schema.employees.id, id));
    return result.affectedRows > 0;
  }

  // Punch methods
  async createPunch(punch: InsertPunch): Promise<Punch> {
    const id = nanoid();
    await this.db.insert(schema.punches).values({ ...punch, id });
    const result = await this.db.select().from(schema.punches).where(eq(schema.punches.id, id)).limit(1);
    return result[0];
  }

  async getPunchesByEmployee(employeeId: string, startDate?: Date, endDate?: Date): Promise<Punch[]> {
    let query = this.db.select().from(schema.punches).where(eq(schema.punches.employeeId, employeeId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          eq(schema.punches.employeeId, employeeId),
          gte(schema.punches.timestamp, startDate),
          lte(schema.punches.timestamp, endDate)
        )
      );
    }
    
    return await query.orderBy(desc(schema.punches.timestamp));
  }

  async getAllPunches(startDate?: Date, endDate?: Date): Promise<Punch[]> {
    let query = this.db.select().from(schema.punches);
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(schema.punches.timestamp, startDate),
          lte(schema.punches.timestamp, endDate)
        )
      );
    }
    
    return await query.orderBy(desc(schema.punches.timestamp));
  }

  async getLastPunchByEmployee(employeeId: string): Promise<Punch | undefined> {
    const result = await this.db
      .select()
      .from(schema.punches)
      .where(eq(schema.punches.employeeId, employeeId))
      .orderBy(desc(schema.punches.timestamp))
      .limit(1);
    
    return result[0];
  }

  async updatePunch(id: string, punch: Partial<InsertPunch>): Promise<Punch | undefined> {
    await this.db.update(schema.punches).set(punch).where(eq(schema.punches.id, id));
    const result = await this.db.select().from(schema.punches).where(eq(schema.punches.id, id)).limit(1);
    return result[0];
  }

  async deletePunch(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.punches).where(eq(schema.punches.id, id));
    return result.affectedRows > 0;
  }

  // Settings methods
  async getSettings(): Promise<Settings> {
    const result = await this.db.select().from(schema.settings).limit(1);
    return result[0];
  }

  async updateSettings(settings: Partial<InsertSettings>): Promise<Settings> {
    await this.db.update(schema.settings).set(settings).where(eq(schema.settings.id, 1));
    return await this.getSettings();
  }

  // Correction methods
  async createCorrection(correction: InsertCorrection): Promise<Correction> {
    const id = nanoid();
    await this.db.insert(schema.corrections).values({ ...correction, id });
    const result = await this.db.select().from(schema.corrections).where(eq(schema.corrections.id, id)).limit(1);
    return result[0];
  }

  async getCorrectionsByEmployee(employeeId: string): Promise<Correction[]> {
    return await this.db
      .select()
      .from(schema.corrections)
      .where(eq(schema.corrections.employeeId, employeeId))
      .orderBy(desc(schema.corrections.requestDate));
  }

  async getAllCorrections(): Promise<Correction[]> {
    return await this.db
      .select()
      .from(schema.corrections)
      .orderBy(desc(schema.corrections.requestDate));
  }

  async updateCorrection(id: string, correction: Partial<InsertCorrection>): Promise<Correction | undefined> {
    await this.db.update(schema.corrections).set(correction).where(eq(schema.corrections.id, id));
    const result = await this.db.select().from(schema.corrections).where(eq(schema.corrections.id, id)).limit(1);
    return result[0];
  }

  // Time off request methods
  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const id = nanoid();
    await this.db.insert(schema.timeOffRequests).values({ ...request, id });
    const result = await this.db.select().from(schema.timeOffRequests).where(eq(schema.timeOffRequests.id, id)).limit(1);
    return result[0];
  }

  async getTimeOffRequestsByEmployee(employeeId: string): Promise<TimeOffRequest[]> {
    return await this.db
      .select()
      .from(schema.timeOffRequests)
      .where(eq(schema.timeOffRequests.employeeId, employeeId))
      .orderBy(desc(schema.timeOffRequests.requestDate));
  }

  async getAllTimeOffRequests(): Promise<TimeOffRequest[]> {
    return await this.db
      .select()
      .from(schema.timeOffRequests)
      .orderBy(desc(schema.timeOffRequests.requestDate));
  }

  async getTimeOffRequestsInRange(startDate: string, endDate: string): Promise<TimeOffRequest[]> {
    return await this.db
      .select()
      .from(schema.timeOffRequests)
      .where(
        and(
          gte(schema.timeOffRequests.startDate, startDate),
          lte(schema.timeOffRequests.endDate, endDate)
        )
      );
  }

  async updateTimeOffRequest(id: string, request: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest | undefined> {
    await this.db.update(schema.timeOffRequests).set(request).where(eq(schema.timeOffRequests.id, id));
    const result = await this.db.select().from(schema.timeOffRequests).where(eq(schema.timeOffRequests.id, id)).limit(1);
    return result[0];
  }

  async deleteTimeOffRequest(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.timeOffRequests).where(eq(schema.timeOffRequests.id, id));
    return result.affectedRows > 0;
  }

  // Stats methods
  async getAdminStats(): Promise<{
    activeEmployees: number;
    clockedInToday: number;
    punchesToday: number;
    pendingCorrections: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeEmployees] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.employees)
      .where(eq(schema.employees.isActive, true));

    const [punchesToday] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.punches)
      .where(
        and(
          gte(schema.punches.timestamp, today),
          lte(schema.punches.timestamp, tomorrow)
        )
      );

    const [pendingCorrections] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.corrections)
      .where(eq(schema.corrections.status, "pending"));

    // Calculate clocked in today
    const todayPunches = await this.db
      .select()
      .from(schema.punches)
      .where(
        and(
          gte(schema.punches.timestamp, today),
          lte(schema.punches.timestamp, tomorrow)
        )
      )
      .orderBy(desc(schema.punches.timestamp));

    const employeesStatus = new Map<string, string>();
    for (const punch of todayPunches) {
      if (!employeesStatus.has(punch.employeeId)) {
        employeesStatus.set(punch.employeeId, punch.punchType);
      }
    }

    const clockedInToday = Array.from(employeesStatus.values()).filter(status => status === "in").length;

    return {
      activeEmployees: activeEmployees.count,
      clockedInToday,
      punchesToday: punchesToday.count,
      pendingCorrections: pendingCorrections.count,
    };
  }
}