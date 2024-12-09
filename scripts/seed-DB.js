import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Pool } from 'pg';
import { executeQuery } from './utils';

const pool = Pool();
const dir = path.join(__dirname, '../data/datasetusers.csv');

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

const seedDB = async () => {
  console.log('Seeding database...');
  try {
    const userCsvFilePath = path.join(dir, 'users.csv');
    const meetCsvFilePath = path.join(dir, 'meets.csv');
    const locationCsvFilePath = path.join(dir, 'locations.csv');
    const locationOptionCsvFilePath = path.join(dir, 'locations.csv');
    const joinCsvFilePath = path.join(dir, 'locations.csv');
    const availibalityCsvFilePath = path.join(dir, 'locations.csv');
    const isAvailableAtCsvFilePath = path.join(dir, 'locations.csv');
    const finalDecisionCsvFilePath = path.join(dir, 'locations.csv');

    const users = await readCsv(userCsvFilePath);
    const meets = await readCsv(meetCsvFilePath);
    const locations = await readCsv(locationCsvFilePath);
    const locationOptions = await readCsv(locationOptionCsvFilePath);
    const joins = await readCsv(joinCsvFilePath);
    const availabilities = await readCsv(availibalityCsvFilePath);
    const isAvailableAts = await readCsv(isAvailableAtCsvFilePath);
    const finalDecisions = await readCsv(finalDecisionCsvFilePath);

    for (const user of users) {
      const { id, name, email, status } = user;
      await executeQuery(pool, `
        INSERT INTO users (id, name, email, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [id, name, email, status]);
    }

    for (const meet of meets) {
      const { id, isPublic, name, status, description, holderId,
        startTime, endTime, startDate, endDate } = meet;
      await executeQuery(pool, `
        INSERT INTO users (id, isPublic, name, status, description, holderId, startTime, endTime, startDate, endDate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [id, isPublic, name, status, description, holderId, startTime, endTime, startDate, endDate]);
    }

    for (const location of locations) {
      const { id, name, address, capacity, price } = location;
      await executeQuery(pool, `
        INSERT INTO users (id, name, address, capacity, price)
        VALUES ($1, $2, $3, $4 $5)
        ON CONFLICT (id) DO NOTHING;
      `, [id, name, address, capacity, price]);
    }

    for (const locationOption of locationOptions) {
      const { meetId, locationId, id } = locationOption;
      await executeQuery(pool, `
        INSERT INTO users (meetId, locationId, id)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING;
      `, [meetId, locationId, id]);
    }

    for (const join of joins) {
      const { userId, meetId, isPending } = join;
      await executeQuery(pool, `
        INSERT INTO users (userId, meetId)
        VALUES ($1, $2)
        ON CONFLICT (userId, meetId, isPending) DO NOTHING;
      `, [userId, meetId, isPending]);
    }

    for (const availability of availabilities) {
      const { id, userId, meetId, timestamp } = availability;
      await executeQuery(pool, `
        INSERT INTO users (id, userId, meetId, timestamp)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [id, userId, meetId, timestamp]);
    }

    for (const isAvailableAt of isAvailableAts) {
      const { id, locationOptionId, availabilityId } = isAvailableAt;
      await executeQuery(pool, `
        INSERT INTO users (id, locationOptionId, availabilityId)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING;
      `, [id, locationOptionId, availabilityId]);
    }

    for (const finalDecision of finalDecisions) {
      const { meetId, finalPlaceId, finalTime } = finalDecision;
      await executeQuery(pool, `
        INSERT INTO users (meetId, finalPlaceId, finalTime)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING;
      `, [meetId, finalPlaceId, finalTime]);
    }

    console.log('Database seeding completed.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
};

seedDB();
