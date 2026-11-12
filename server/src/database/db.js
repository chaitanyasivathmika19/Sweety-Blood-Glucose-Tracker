const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const { validateProductionDatabaseConfig } = require('./config');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

let pool = global.__SWEETY_DB_POOL__ || null;
let memDb = global.__SWEETY_MEM_DB__ || null;
let isInMemory = global.__SWEETY_IS_IN_MEMORY__ || false;

async function initDatabase() {
  validateProductionDatabaseConfig({
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    forceMemoryDb: process.env.FORCE_MEMORY_DB
  });

  if (global.__SWEETY_DB_POOL__) {
    pool = global.__SWEETY_DB_POOL__;
    isInMemory = global.__SWEETY_IS_IN_MEMORY__;
    if (process.env.NODE_ENV === 'production' && isInMemory) {
      throw new Error('Production cannot use the in-memory database.');
    }
    return { isInMemory, pool };
  }

  // The backend service uses the repository root as its Render rootDir so
  // this single canonical schema file is present both locally and in deploys.
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Try PostgreSQL connection if DATABASE_URL is provided
  if (process.env.DATABASE_URL && !process.env.FORCE_MEMORY_DB) {
    let client;
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const useSsl = isProduction || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com'));

      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000
      });

      // Test connection
      client = await pool.connect();
      console.log('Connected to PostgreSQL successfully.');
      
      // Run migrations / schema
      await client.query(schemaSql);
      client.release();
      client = null;
      isInMemory = false;
      global.__SWEETY_DB_POOL__ = pool;
      global.__SWEETY_IS_IN_MEMORY__ = false;
      return { isInMemory: false, pool };
    } catch (err) {
      if (client) client.release();
      if (pool) await pool.end().catch(() => {});
      pool = null;
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Production PostgreSQL connection or schema initialization failed: ${err.message}`);
      }
      console.warn('PostgreSQL connection failed or not available:', err.message);
      console.log('Falling back to pg-mem high-fidelity in-memory PostgreSQL engine.');
    }
  }

  // Fallback to pg-mem in-memory PostgreSQL
  isInMemory = true;
  memDb = newDb();

  // Register necessary PostgreSQL functions in pg-mem
  memDb.public.registerFunction({
    name: 'current_database',
    implementation: () => 'sweety_mem'
  });

  memDb.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 14.0 (pg-mem)'
  });

  // Execute schema
  memDb.public.none(schemaSql);
  console.log('pg-mem in-memory database initialized with complete schema.');
  
  // Create an adapter matching pg pool interface
  const memAdapter = memDb.adapters.createPg();
  pool = new memAdapter.Pool();
  global.__SWEETY_DB_POOL__ = pool;
  global.__SWEETY_MEM_DB__ = memDb;
  global.__SWEETY_IS_IN_MEMORY__ = true;
  return { isInMemory: true, pool };
}

async function query(text, params = []) {
  if (!pool) {
    await initDatabase();
  }
  return pool.query(text, params);
}

async function getClient() {
  if (!pool) {
    await initDatabase();
  }
  return pool.connect();
}

module.exports = {
  initDatabase,
  query,
  getClient,
  isInMemory: () => isInMemory
};
