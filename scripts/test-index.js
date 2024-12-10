import pkg from 'pg';
import { indexDB, restoreDB } from './utils.js';

const { Client } = pkg;
const testDBName = 'testIndex';
const query = `
  SELECT m.id, m.name
  FROM meet AS m
    JOIN Availability AS a ON m.id = a.meet_id
`;

const test_index = async () => {
  const client = new Client({ database: testDBName });
  try {
    await restoreDB(testDBName);
    await client.connect();
    await client.query(query);
    await indexDB(testDBName);
  } catch (err) {
    console.error('Error building index:', err.message);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
};

test_index();
