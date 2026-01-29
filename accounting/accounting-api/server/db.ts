import { config } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Load environment variables from .env file
config();

console.log("DATABASE_URL", process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Only use SSL for non-local connections
const isLocalDb = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Connection timeout
  ssl: isLocalDb ? false : {
    rejectUnauthorized: false, // Required for remote PostgreSQL connections
  },
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('🚨 Database Pool Error:', err);
  // Don't crash the process, just log the error
});

// Database connection with retry logic
const createDbWithRetry = (retries = 3) => {
  try {
    return drizzle(pool, { schema });
  } catch (error) {
    console.error(`🚨 Database connection failed, retries left: ${retries}`, error);
    if (retries > 0) {
      setTimeout(() => createDbWithRetry(retries - 1), 1000);
    } else {
      console.error('🚨 Database connection failed after all retries');
      throw error;
    }
  }
};

export const db = createDbWithRetry();