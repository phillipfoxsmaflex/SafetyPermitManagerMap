import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

const { Pool: NodePool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine if we're in Docker environment
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

let pool: Pool | NodePool;
let db: ReturnType<typeof drizzle> | ReturnType<typeof drizzleNode>;

if (isDocker) {
  // Use standard PostgreSQL for Docker
  console.log('Using standard PostgreSQL connection for Docker environment');
  pool = new NodePool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNode(pool, { schema });
} else {
  // Use Neon for production
  console.log('Using Neon PostgreSQL connection for production environment');
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };