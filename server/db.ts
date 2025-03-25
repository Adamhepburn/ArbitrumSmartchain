import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Create a PostgreSQL pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a Drizzle ORM instance with our schema
export const db = drizzle(pool, { schema });

// Export a function to run migrations
export async function runMigrations() {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        wallet_address TEXT UNIQUE,
        wallet_encrypted_json TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT UNIQUE NOT NULL,
        contract_type TEXT NOT NULL,
        abi JSONB NOT NULL,
        bytecode TEXT NOT NULL,
        deployed_by_address TEXT NOT NULL,
        deployed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        network TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT,
        contract_address TEXT,
        value TEXT NOT NULL,
        gas_used TEXT NOT NULL,
        gas_price TEXT NOT NULL,
        status TEXT NOT NULL,
        type TEXT NOT NULL,
        method TEXT,
        args JSONB,
        block_number INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        network TEXT NOT NULL
      );
    `);
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}