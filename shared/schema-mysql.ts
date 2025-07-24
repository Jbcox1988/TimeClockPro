import { sql } from "drizzle-orm";
import { mysqlTable, varchar, text, int, boolean, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = mysqlTable("employees", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  pin: varchar("pin", { length: 10 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  birthday: varchar("birthday", { length: 10 }),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const punches = mysqlTable("punches", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  employeeId: varchar("employee_id", { length: 255 }).notNull(),
  punchType: varchar("punch_type", { length: 10 }).notNull(), // 'in' or 'out'
  timestamp: timestamp("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  flagged: boolean("flagged").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  companyName: varchar("company_name", { length: 255 }).notNull().default("Your Company"),
  logoUrl: text("logo_url"),
  geofencingEnabled: boolean("geofencing_enabled").notNull().default(false),
  geoLat: decimal("geo_lat", { precision: 10, scale: 8 }),
  geoLon: decimal("geo_lon", { precision: 11, scale: 8 }),
  geoRadius: int("geo_radius").default(500),
  adminPassword: varchar("admin_password", { length: 255 }),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const corrections = mysqlTable("corrections", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  employeeId: varchar("employee_id", { length: 255 }).notNull(),
  punchId: varchar("punch_id", { length: 255 }),
  requestedDate: varchar("requested_date", { length: 10 }).notNull(),
  requestedTime: varchar("requested_time", { length: 8 }),
  punchType: varchar("punch_type", { length: 10 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  adminNote: text("admin_note"),
  requestDate: timestamp("request_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedDate: timestamp("resolved_date"),
});

export const timeOffRequests = mysqlTable("time_off_requests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  employeeId: varchar("employee_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'vacation', 'sick', 'personal'
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  isPartialDay: boolean("is_partial_day").notNull().default(false),
  startTime: varchar("start_time", { length: 8 }),
  endTime: varchar("end_time", { length: 8 }),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  adminNote: text("admin_note"),
  requestDate: timestamp("request_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedDate: timestamp("reviewed_date"),
});

// Insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPunchSchema = createInsertSchema(punches).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertCorrectionSchema = createInsertSchema(corrections).omit({
  id: true,
  requestDate: true,
  resolvedDate: true,
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({
  id: true,
  requestDate: true,
  reviewedDate: true,
});

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Punch = typeof punches.$inferSelect;
export type InsertPunch = z.infer<typeof insertPunchSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Correction = typeof corrections.$inferSelect;
export type InsertCorrection = z.infer<typeof insertCorrectionSchema>;
export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;