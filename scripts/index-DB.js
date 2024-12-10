import pg from 'pg';
const { Pool } = pg;

const pool = new Pool();

// 資料庫初始化程式
const indexDB = async () => {
  try {
    const index1 = ` 
      
    `;
    await pool.query(index1);
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

indexDB();
