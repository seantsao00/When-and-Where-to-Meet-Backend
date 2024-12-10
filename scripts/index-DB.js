import pg from 'pg';
import { resotreDB } from 'restore-DB.js';

const { Pool } = pg;
const pool = new Pool();

// 資料庫初始化程式
const indexDB = async () => {
  const createIndex1 = ` 
    CREATE INDEX ON usr (name);
  `;
  try {
    resotreDB();
    await pool.query(createIndex1);
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

indexDB();
