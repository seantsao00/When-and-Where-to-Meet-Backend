import { Pool } from 'pg';

import { executeQuery } from './utils';

const pool = new Pool();

const initDb = async () => {
  console.log('Starting database initialization...');
  try {
    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS user (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
          name varchar(50) NOT NULL,
          email varchar(100) NOT NULL UNIQUE,
          status varchar(10) NOT NULL DEFAULT 'active'
      );
    `);

    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

initDb();
