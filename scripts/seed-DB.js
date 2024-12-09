import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

import pg from 'pg';
const { Pool } = pg;

import { executeQuery } from './utils.js';

const pool = new Pool();
const dir = path.join(import.meta.dirname, '../data/dataset/');

// 讀取 CSV 的通用函數
const readCsv = async (filePath) => {
  const data = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => data.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  return data;
};

// 批次插入的函數，限制每次插入的行數
const batchInsert = async (tableName, columns, rows, batchSize = 1000) => {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch
      .map((_, j) => `(${columns.map((_, k) => `$${j * columns.length + k + 1}`).join(', ')})`)
      .join(', ');

    const values = batch.flat();
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT DO NOTHING;
    `;

    try {
      await executeQuery(pool, query, values);
      // console.log(`Inserted ${batch.length} rows into ${tableName}.`);
    } catch (error) {
      console.error(`Error inserting into ${tableName}:`, error.message);
    }
  }
};

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

    const usrs = await readCsv(usrCsvFilePath);
    const meets = await readCsv(meetCsvFilePath);
    const locations = await readCsv(locationCsvFilePath);
    const locationOptions = await readCsv(locationOptionCsvFilePath);
    const participation = await readCsv(participationCsvFilePath);
    const availabilities = await readCsv(availibalityCsvFilePath);
    const isAvailableAts = await readCsv(isAvailableAtCsvFilePath);
    const finalDecisions = await readCsv(finalDecisionCsvFilePath);

    await batchInsert('usr', ['id', 'name', 'email', 'status'], usrs.map(({ id, name, email, status }) => [id, name, email, status]));
    console.log('Usrs seeded.');

    await batchInsert('meet', ['id', 'is_public', 'name', 'status', 'description', 'holder_id', 'start_time', 'end_time', 'start_date', 'end_date'],
      meets.map(({ id, is_public, name, status, description, holder_id, start_time, end_time, start_date, end_date }) =>
        [id, is_public, name, status, description, holder_id, start_time, end_time, start_date, end_date]));
    console.log('Meets seeded.');

    await batchInsert('location', ['id', 'name', 'address', 'capacity', 'price'],
      locations.map(({ id, name, address, capacity, price }) => [id, name, address, capacity, price]));
    console.log('Locations seeded.');

    await batchInsert('location_option', ['id', 'meet_id', 'location_id'],
      locationOptions.map(({ id, meet_id, location_id }) => [id, meet_id, location_id]));
    console.log('Location options seeded.');

    await batchInsert('participation', ['meet_id', 'usr_id', 'is_pending'],
      participation.map(({ meet_id, usr_id, is_pending }) => [meet_id, usr_id, is_pending]));
    console.log('Participations seeded.');

    await batchInsert('availability', ['id', 'usr_id', 'meet_id', 'time_segment'],
      availabilities.map(({ id, usr_id, meet_id, time_segment }) => [id, usr_id, meet_id, time_segment]));
    console.log('Availabilities seeded.');

    await batchInsert('availability_location', ['location_option_id', 'availability_id'],
      isAvailableAts.map(({ location_option_id, availability_id }) => [location_option_id, availability_id]));
    console.log('Availability locations seeded.');

    await batchInsert('final_decision', ['meet_id', 'final_place_id', 'final_time'],
      finalDecisions.map(({ meet_id, final_place_id, final_time }) => [meet_id, final_place_id, final_time]));
    console.log('Final decisions seeded.');

    console.log('Database seeding completed.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

seedDB();
