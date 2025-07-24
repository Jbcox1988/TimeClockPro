// Database configuration switch
// Set DATABASE_TYPE=mysql in your .env file to use MySQL
// Set DATABASE_TYPE=sqlite (or leave unset) to use SQLite

import { SqliteStorage } from "./storage";
import { MySqlStorage } from "./storage-mysql";

export function createStorage() {
  const dbType = process.env.DATABASE_TYPE || "sqlite";
  
  if (dbType === "mysql") {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("your_")) {
      console.log("MySQL requested but no valid DATABASE_URL found. Using SQLite instead.");
      return new SqliteStorage();
    }
    console.log("Attempting MySQL connection...");
    try {
      return new MySqlStorage();
    } catch (error) {
      console.log("MySQL connection failed, falling back to SQLite:", error);
      return new SqliteStorage();
    }
  }
  
  console.log("Using SQLite database");
  return new SqliteStorage();
}

export const storage = createStorage();