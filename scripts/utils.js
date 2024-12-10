import { exec } from 'node:child_process';
import path from 'path';
import pkg from 'pg';

const { Client, Pool } = pkg;

const dir = path.join(import.meta.dirname, '../data/');
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${error.message}`);
        return;
      }
      resolve(stdout || stderr);
    });
  });
};

const restoreDB = async (DBName) => {
  console.log('Restoring database...');
  try {
    const client = new Client({ database: 'postgres' });
    const backupFilePath = path.join(dir, 'When-and-Where-to-Meet.backup');

    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS ${DBName}`);
    await client.query(`CREATE DATABASE ${DBName}`);
    await client.end();

    await runCommand(`psql ${DBName} < ${backupFilePath}`);
    console.log('Database restored.');
  } catch (err) {
    console.error('Error restoring database:', err.message);
  }
};

const executeQuery = async (pool, query, params = []) => {
  try {
    await pool.query(query, params);
    // console.log('Query executed successfully:\n', query);
  } catch (err) {
    console.error('Error executing query:\n', query, '\nError:', err.message);
    throw err;
  }
};

const queryWithAnalysis = async (text, params) => {
  const pool = new Pool();
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  // console.log('query plan', JSON.stringify(plan.rows[0]['QUERY PLAN'], null, 2));
  return res;
};

const dropDatabase = async (DBName) => {
  try {
    const client = new Client({ database: 'postgres' });
    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS ${DBName}`);
    await client.end();
    console.log(`Database ${DBName} dropped.`);
  } catch (err) {
    console.error('Error dropping database:', err.message);
  }
};

export { executeQuery, restoreDB, queryWithAnalysis, runCommand, dropDatabase };
