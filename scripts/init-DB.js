import { Pool } from 'pg';

import { executeQuery } from './utils';

const pool = new Pool();

const initDb = async () => {
  console.log('Starting database initialization...');
  try {
    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS user (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name varchar(50) NOT NULL,
          email varchar(100) NOT NULL UNIQUE,
          status varchar(10) DEFAULT 'active'
            CHECK (status IN ('active', 'banned', 'deleted')) NOT NULL,
      );
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS participation (
          meet_id bigint REFERENCES meet (id),
          user_id bigint REFERENCES user (id),
          is_pending boolean NOT NULL,
          PRIMARY KEY (meet_id, user_id)
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS meet (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name varchar(50) NOT NULL,
          status varchar(10) DEFAULT 'active'
            CHECK (status IN ('active', 'deleted')) NOT NULL,
          description varchar(200) NOT NULL,
          is_public boolean NOT NULL,
          final_place_id bigint REFERENCES location (id),
          holder_id bigint REFERENCES user (id),
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS availability (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          timestamp timestamp NOT NULL,
          user_id bigint NOT NULL REFERENCES user (id),
          meet_id bigint NOT NULL REFERENCES meet (id),
          UNIQUE (timestamp, user_id, meet_id),
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS availability_location (
          location_option_id bigint,
          availability_id bigint,
          PRIMARY KEY (location_option_id, availability_id),
          FOREIGN KEY (location_option_id) REFERENCES location_option (id)
            ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (availability_id) REFERENCES availability (id)
            ON DELETE CASCADE ON UPDATE CASCADE,
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS location_option (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          location_id bigint NOT NULL REFERENCES location (id),
          meet_id bigint NOT NULL REFERENCES meet (id),
          UNIQUE (location_id, meet_id),
    `);

    await executeQuery(pool, `
      CREATE TABLE IF NOT EXISTS location (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name varchar(100) NOT NULL,
          address varchar(200) NOT NULL,
          price integer NOT NULL,
          capacity integer NOT NULL,
          status varchar(10) DEFAULT 'available'
            CHECK (status IN ('available', 'unavailable')) NOT NULL,
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
