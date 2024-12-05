import { Pool } from 'pg';
import { executeQuery } from './utils';

const pool = Pool();

const seedDB = async () => {
  console.log('Seeding database...');
  try {
    await executeQuery(pool, `
      INSERT INTO users (name, email)
      VALUES
          ('Alice', 'alice@example.com'),
          ('Bob', 'bob@example.com')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database seeding completed.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

seedDB();
