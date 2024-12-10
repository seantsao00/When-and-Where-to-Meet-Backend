import { exec } from 'node:child_process';
import path from 'path';
import pkg from 'pg';

const { Client } = pkg;
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

const restoreDB = async () => {
  console.log('Restoring database...');
  try {
    const client = new Client({ database: 'postgres' });
    await client.connect();

    const backupFilePath = path.join(dir, 'When-and-Where-to-Meet.backup');
    await client.query(`DROP DATABASE IF EXISTS ${process.env.PGDATABASE}`);
    await client.query(`CREATE DATABASE ${process.env.PGDATABASE}`);
    await client.end();

    await runCommand(`psql ${process.env.PGDATABASE} < ${backupFilePath}`);
    console.log('Database restored.');
  } catch (err) {
    console.error('Error restoring database:', err.message);
  }
};

restoreDB();
