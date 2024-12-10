import { indexDB, restoreDB } from './utils.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await restoreDB(process.env.PGDATABASE);
    await indexDB(process.env.PGDATABASE);
  } catch (err) {
    console.error('Error building index:', err.message);
  };
}
