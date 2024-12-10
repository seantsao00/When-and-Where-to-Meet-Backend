import path from 'path';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool();
const dir = path.join(import.meta.dirname, '../../data/dataset/');

// 資料庫初始化程式
const seedDB = async () => {
  console.log('Seeding database...');
  try {
    const usrCsvFilePath = path.join(dir, 'usr.csv');
    const meetCsvFilePath = path.join(dir, 'meet.csv');
    const locationCsvFilePath = path.join(dir, 'location.csv');
    const locationOptionCsvFilePath = path.join(dir, 'location_option.csv');
    const participationCsvFilePath = path.join(dir, 'participation.csv');
    const availibalityCsvFilePath = path.join(dir, 'availability.csv');
    const isAvailableAtCsvFilePath = path.join(dir, 'availability_location.csv');
    const finalDecisionCsvFilePath = path.join(dir, 'final_decision.csv');

    // 使用 COPY 導入資料
    const copyQuery = async (tableName, filePath, columns) => {
      const query = `
        COPY ${tableName} (${columns.join(', ')})
        FROM '${filePath}'
        DELIMITER ','
        CSV HEADER;
      `;
      try {
        await pool.query(query);
        console.log(`${tableName} seeded.`);
      } catch (err) {
        console.error(`Error seeding ${tableName}:`, err.message);
      }
    };

    // import from csv
    await copyQuery('usr', usrCsvFilePath, ['id', 'name', 'email', 'status']);
    await copyQuery('meet', meetCsvFilePath, ['id', 'is_public', 'name', 'status', 'description', 'holder_id', 'start_time', 'end_time', 'start_date', 'end_date', 'duration']);
    await copyQuery('location', locationCsvFilePath, ['id', 'name', 'address', 'capacity', 'price']);
    await copyQuery('location_option', locationOptionCsvFilePath, ['id', 'meet_id', 'location_id']);
    await copyQuery('participation', participationCsvFilePath, ['usr_id', 'meet_id', 'is_pending']);
    await copyQuery('availability', availibalityCsvFilePath, ['id', 'usr_id', 'meet_id', 'time_segment']);
    await copyQuery('availability_location', isAvailableAtCsvFilePath, ['location_option_id', 'availability_id']);
    await copyQuery('final_decision', finalDecisionCsvFilePath, ['meet_id', 'final_place_id', 'final_time']);

    // update index
    await pool.query('SELECT setval(\'usr_id_seq\', (SELECT MAX(id) FROM usr));');
    await pool.query('SELECT setval(\'meet_id_seq\', (SELECT MAX(id) FROM meet));');
    await pool.query('SELECT setval(\'location_id_seq\', (SELECT MAX(id) FROM location));');
    await pool.query('SELECT setval(\'location_option_id_seq\', (SELECT MAX(id) FROM location_option));');
    await pool.query('SELECT setval(\'availability_id_seq\', (SELECT MAX(id) FROM availability));');

    console.log('Database seeding completed.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDB();
}
