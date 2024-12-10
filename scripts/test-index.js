import pkg from 'pg';
import { indexDB, queryWithAnalysis, restoreDB, dropDatabase } from './utils.js';

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
    await queryWithAnalysis(query);
    await client.end();

    await indexDB(testDBName);

    await client.connect();
    await queryWithAnalysis(query);
    await client.end();

    await dropDatabase(testDBName);
  } catch (err) {
    console.error('Error building index:', err.message);
  }
};

test_index();
