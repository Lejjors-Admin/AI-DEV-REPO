import { defineConfig } from "drizzle-kit";

if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("Missing required database environment variables");
}

// Only use SSL for non-local connections
const isLocalDb = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: isLocalDb ? false : {
      rejectUnauthorized: false,
    },
  },
});