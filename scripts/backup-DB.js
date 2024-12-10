import path from 'path';
import pg from 'pg';
import { executeQuery, runCommand } from './utils.js';

const { Pool } = pg;
const pool = new Pool();
const dir = path.join(import.meta.dirname, '../data/dataset/');
const backupFile = path.join(import.meta.dirname, '../data/When-and-Where-to-Meet.backup');

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

const seedDB = async () => {
  console.log('Seeding database...');
  try {
    const usrCsvFilePath = path.join(dir, 'usr.csv');
    const meetCsvFilePath = path.join(dir, 'meet.csv');
    const locationCsvFilePath = path.join(dir, 'location.csv');
    const locationOptionCsvFilePath = path.join(dir, 'location_option.csv');
    const participationCsvFilePath = path.join(dir, 'participation.csv');
    const availibalityCsvFilePath = path.join(dir, 'availability.csv');
    const isAvailableAtCsvFilePath = path.join(dir, 'availability_location.csv');
    const finalDecisionCsvFilePath = path.join(dir, 'final_decision.csv');

    // 使用 COPY 導入資料
    const copyQuery = async (tableName, filePath, columns) => {
      const query = `
        COPY ${tableName} (${columns.join(', ')})
        FROM '${filePath}'
        DELIMITER ','
        CSV HEADER;
      `;
      try {
        await pool.query(query);
        console.log(`${tableName} seeded.`);
      } catch (err) {
        console.error(`Error seeding ${tableName}:`, err.message);
      }
    };

    // import from csv
    await copyQuery('usr', usrCsvFilePath, ['id', 'name', 'email', 'status']);
    await copyQuery('meet', meetCsvFilePath, ['id', 'is_public', 'name', 'status', 'description', 'holder_id', 'start_time', 'end_time', 'start_date', 'end_date', 'duration']);
    await copyQuery('location', locationCsvFilePath, ['id', 'name', 'address', 'capacity', 'price']);
    await copyQuery('location_option', locationOptionCsvFilePath, ['id', 'meet_id', 'location_id']);
    await copyQuery('participation', participationCsvFilePath, ['usr_id', 'meet_id', 'is_pending']);
    await copyQuery('availability', availibalityCsvFilePath, ['id', 'usr_id', 'meet_id', 'time_segment']);
    await copyQuery('availability_location', isAvailableAtCsvFilePath, ['location_option_id', 'availability_id']);
    await copyQuery('final_decision', finalDecisionCsvFilePath, ['meet_id', 'final_place_id', 'final_time']);

    // update index
    await pool.query('SELECT setval(\'usr_id_seq\', (SELECT MAX(id) FROM usr));');
    await pool.query('SELECT setval(\'meet_id_seq\', (SELECT MAX(id) FROM meet));');
    await pool.query('SELECT setval(\'location_id_seq\', (SELECT MAX(id) FROM location));');
    await pool.query('SELECT setval(\'location_option_id_seq\', (SELECT MAX(id) FROM location_option));');
    await pool.query('SELECT setval(\'availability_id_seq\', (SELECT MAX(id) FROM availability));');

    console.log('Database seeding completed.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await initDb();
    await seedDB();
    await runCommand(`pg_dump -d ${process.env.PGDATABASE} -f ${backupFile}`);
    console.log('Database backup completed.');
  } catch (err) {
    console.error('Error building index:', err.message);
  };
}