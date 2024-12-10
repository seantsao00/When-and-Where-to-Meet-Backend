import { indexDB, restoreDB } from '../utils.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  restoreDB(process.env.PGDATABASE);
  indexDB(process.env.PGDATABASE);
}
