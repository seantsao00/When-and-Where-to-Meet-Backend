import pg from 'pg';
const { Pool } = pg;

import { executeQuery } from '../utils.js';

const initDb = async () => {
  console.log('Starting database initialization...');

  const postgresPool = new Pool({ database: 'postgres' });
  try {
    await postgresPool.query(`
      DROP DATABASE IF EXISTS ${process.env.PGDATABASE};
    `);
    await postgresPool.query(`
      CREATE DATABASE ${process.env.PGDATABASE};
    `);
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    await postgresPool.end();
  }

  const pool = new Pool();
  try {
    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS usr (
        id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        name varchar(50) NOT NULL,
        email varchar(100) NOT NULL UNIQUE,
        status varchar(10) DEFAULT 'active'
        CHECK (status IN ('active', 'banned', 'deleted')) NOT NULL
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS location (
        id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        name varchar(100) NOT NULL,
        address varchar(200) NOT NULL,
        price integer NOT NULL,
        capacity integer NOT NULL,
        status varchar(10) DEFAULT 'available'
        CHECK (status IN ('available', 'unavailable')) NOT NULL
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS meet (
        id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        name varchar(50) NOT NULL,
        status varchar(10) DEFAULT 'active'
            CHECK (status IN ('active', 'deleted')) NOT NULL,
        description varchar(200) NOT NULL,
        is_public boolean NOT NULL,
        holder_id bigint REFERENCES usr (id),
        start_time time NOT NULL,
        end_time time NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        duration interval
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS location_option (
        id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        meet_id bigint NOT NULL REFERENCES meet (id),
        location_id bigint NOT NULL REFERENCES location (id),
        UNIQUE (location_id, meet_id)
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS participation (
        usr_id bigint REFERENCES usr (id),
        meet_id bigint REFERENCES meet (id),
        is_pending boolean NOT NULL,
        PRIMARY KEY (meet_id, usr_id)
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS availability (
        id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        usr_id bigint NOT NULL REFERENCES usr (id),
        meet_id bigint NOT NULL REFERENCES meet (id),
        time_segment timestamp NOT NULL,
        UNIQUE (usr_id, meet_id, time_segment)
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS availability_location (
        location_option_id bigint NOT NULL,
        availability_id bigint NOT NULL,
        PRIMARY KEY (location_option_id, availability_id),
        FOREIGN KEY (location_option_id) REFERENCES location_option (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (availability_id) REFERENCES availability (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS final_decision (
        meet_id int REFERENCES meet (id),
        final_place_id int REFERENCES location (id),
        final_time timestamp NOT NULL,
        PRIMARY KEY (meet_id, final_place_id)
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

if (import.meta.url === `file://${process.argv[1]}`) {
  initDb();
}