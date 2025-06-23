import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  pin: text("pin").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  email: text("email"),
  phone: text("phone"),
  birthday: text("birthday"),
  photoUrl: text("photo_url"),
});

export const punches = sqliteTable("punches", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  punchType: text("punch_type", { enum: ["in", "out"] }).notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  ipAddress: text("ip_address").notNull(),
  flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  companyName: text("company_name").notNull().default("TimeClock Pro"),
  logoUrl: text("logo_url"),
  showCompanyName: integer("show_company_name", { mode: "boolean" }).notNull().default(true),
  showLogo: integer("show_logo", { mode: "boolean" }).notNull().default(true),
  themeColor: text("theme_color").notNull().default("#1976D2"),
  accentColor: text("accent_color").default("#059669"),
  successColor: text("success_color").default("#16a34a"),
  warningColor: text("warning_color").default("#ea580c"),
  destructiveColor: text("destructive_color").default("#dc2626"),
  backgroundColor: text("background_color").default("#f9fafb"),
  cardColor: text("card_color").default("#ffffff"),
  textColor: text("text_color").default("#111827"),
  mutedTextColor: text("muted_text_color").default("#6b7280"),
  geoLat: real("geo_lat"),
  geoLon: real("geo_lon"),
  geoRadius: real("geo_radius").default(500),
  geofencingEnabled: integer("geofencing_enabled", { mode: "boolean" }).notNull().default(false),
  adminPasswordHash: text("admin_password_hash").notNull(),
});

export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  punchId: text("punch_id").references(() => punches.id),
  date: text("date").notNull(),
  note: text("note").notNull(),
  status: text("status", { enum: ["pending", "approved", "denied"] }).notNull().default("pending"),
});

export const timeOffRequests = sqliteTable("time_off_requests", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  startTime: text("start_time"), // Format: "HH:MM" for partial days
  endTime: text("end_time"), // Format: "HH:MM" for partial days
  isPartialDay: integer("is_partial_day", { mode: "boolean" }).notNull().default(false),
  type: text("type", { enum: ["vacation", "sick", "personal", "other"] }).notNull(),
  reason: text("reason"),
  requestDate: integer("request_date", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["pending", "approved", "denied"] }).notNull().default("pending"),
  adminResponse: text("admin_response"),
  processedDate: integer("processed_date", { mode: "timestamp" }),
  processedBy: text("processed_by").references(() => employees.id),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
});

export const insertPunchSchema = createInsertSchema(punches).omit({
  id: true,
  timestamp: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export const insertCorrectionSchema = createInsertSchema(corrections).omit({
  id: true,
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({
  id: true,
  requestDate: true,
  processedDate: true,
}).extend({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isPartialDay: z.boolean().default(false),
});

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
