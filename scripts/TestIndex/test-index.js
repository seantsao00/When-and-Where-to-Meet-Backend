import pkg from 'pg';
import { indexDB, restoreDB } from '../utils.js';

const { Client } = pkg;
const testDBName = 'testIndex';

const test_index = async () => {
  
  const client = new Client({ database: testDBName });
  try {
    restoreDB(testDBName);
  } catch (err) {
    console.error('Error building index:', err.message);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
};

test_index();
