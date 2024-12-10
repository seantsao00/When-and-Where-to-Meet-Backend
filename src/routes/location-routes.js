import { Router } from 'express';
import { query } from '../db/index.js';
import { getYYYYMMDD } from '../utils.js';
import { adminChecker, locationExistsChecker, meetExistsChecker } from './middlewares.js';

const router = Router();

// GET /locations/:locationId
// Returns the details of a location.
// Response body: { locationId: number, locationName: string, locationAddress: string, locationPrice: number, locationCapacity: number }
router.get('/:locationId', locationExistsChecker, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { rows } = await query(`
      SELECT
          id AS "locationId",
          name AS "locationName",
          address AS "locationAddress",
          price AS "locationPrice",
          capacity AS "locationCapacity"
      FROM location
      WHERE id = $1
    `, [locationId]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /locations/:locationId/meets
// Returns the meets that are held at a location.
// Response body: { items: [{ meetId: number, meetName: string, meetDescription, holderId, startTime, endTime, startDate, endDate, duration }] }
router.get('/:locationId/meets', locationExistsChecker, adminChecker, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { rows } = await query(`
      SELECT
          m.id AS "meetId",
          m.name AS "meetName",
          m.description AS "meetDescription",
          m.holder_id AS "holderId",
          m.start_time AS "startTime",
          m.end_time AS "endTime",
          m.start_date AS "startDate",
          m.end_date AS "endDate",
          m.duration
      FROM meet AS m
        JOIN final_decision AS fd ON m.id = fd.meet_id AND fd.final_place_id = $1
    `, [locationId]);

    const items = rows.map(row => ({
      ...row,
      startDate: getYYYYMMDD(row.startDate),
      endDate: getYYYYMMDD(row.endDate),
    }));

    res.json(items);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /locations/:locationId/meets/:timeSegment
// Returns the meet that are held at a location at a specific time segment.
// Response body: { meetId: number, meetName: string, meetDescription, holderId, startTime, endTime, startDate, endDate, duration }
router.get('/:locationId/meets/:timeSegment', locationExistsChecker, meetExistsChecker, adminChecker, async (req, res) => {
  try {
    const { locationId, timeSegment } = req.params;
    const { rows } = await query(`
      SELECT
          m.id AS "meetId",
          m.name AS "meetName",
          m.description AS "meetDescription",
          m.holder_id AS "holderId",
          m.start_time AS "startTime",
          m.end_time AS "endTime",
          m.start_date AS "startDate",
          m.end_date AS "endDate",
          m.duration
      FROM meet AS m
        JOIN final_decision AS fd ON m.id = fd.meet_id AND fd.final_place_id = $1
      WHERE tstzrange($3::timestamp, $3::timestamp + interval '15 minutes')
        && tstzrange(fd.final_time, fd.final_time + m.duration)
    `, [locationId, timeSegment]);

    if (rows.length === 0) return res.sendStatus(404);

    const { startDate, endDate } = rows[0];
    res.json({
      ...rows[0],
      startDate: getYYYYMMDD(startDate),
      endDate: getYYYYMMDD(endDate),
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;
