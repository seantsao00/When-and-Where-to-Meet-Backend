import path from 'path';
import { Client } from 'pg';
const { exec } = require('node:child_process');

const dir = path.join(import.meta.dirname, '../data/dataset/');

// 資料庫初始化程式
const restoreDB = async () => {
  console.log('Restoring database...');
  try {
    const client = new Client();
    await client.connect();

    const backupFilePath = path.join(dir, 'Where-and-When-to-Meet.backup');
    await client.query(`DROP DATABASE IF EXISTS ${process.env.PGDATABASE}`);
    await client.query(`CREATE DATABASE ${process.env.PGDATABASE}`);

    exec(`psql -d ${process.env.PGDATABASE} -f ${backupFilePath}`);
  } catch (err) {
    console.error('Error restoring database:', err.message);
  }
};

restoreDB();
