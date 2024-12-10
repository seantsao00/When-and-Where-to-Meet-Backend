import { Router } from 'express';
import { getClient, query } from '../db/index.js';
import { getYYYYMMDD, getYYYYMMDDHHMISS } from '../utils.js';
import { meetExistsChecker, meetHolderChecker, meetParticipantChecker, usrAuthChecker } from './middlewares.js';

const router = Router();

// GET /meets
// Get all meets' id and details, ordered by id.
// Query parameters: { offset = 0, limit = 10 }
// Response body: { items: [{ id, meetName, meetDescription, isPublic, holderId, startTime, endTime, startDate, endDate, duration, finalTime?, finalPlaceId? }] }
router.get('/', async (req, res) => {
  try {
    const { offset = 0, limit = 10 } = req.query;
    const { rows } = await query(`
      SELECT
        m.id,
        m.name AS "meetName",
        m.description AS "meetDescription",
        m.is_public AS "isPublic",
        m.holder_id AS "holderId",
        m.start_time AS "startTime",
        m.end_time AS "endTime",
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        m.duration AS "duration"
        fd.final_time AS "finalTime",
        fd.final_place_id AS "finalPlaceId"
      FROM meet AS m
        JOIN final_decision AS fd ON meet.id = fd.meet_id
      WHERE status = 'active'
      ORDER BY id
      OFFSET $1 LIMIT $2
    `, [offset, limit]);

    const items = rows.map(row => ({
      ...row,
      startDate: getYYYYMMDD(row.startDate),
      endDate: getYYYYMMDD(row.endDate),
      finalTime: row.finalTime ? row.finalTime : undefined,
      finalPlaceId: row.finalPlaceId ? row.finalPlaceId : undefined,
    }));

    res.json({ items });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch meets.' });
  }
});

// POST /meets
// Create a new meet.
// Request body: { meetName, meetDescription, isPublic, startTime, endTime, startDate, endDate, duration }
// Response body: { id }
router.post('/', async (req, res) => {
  try {
    const usrId = req.usrId;
    const { meetName, meetDescription, isPublic, startTime, endTime, startDate, endDate, duration } = req.body;

    const { id } = (await query(`
      INSERT INTO meet (name, description, is_public, holder_id, start_time, end_time, start_date, end_date, duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [meetName, meetDescription, isPublic, usrId, startTime, endTime, startDate, endDate, duration])).rows[0];

    res.json({ id });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to create meet.' });
  }
});

// GET /meets/:meetId
// Get a meet's details.
// Response body: { meetName, meetDescription, isPublic, holderId, startTime, endTime, startDate, endDate, duration, finalDecision?: { locationId, locationName, locationAddress, locationPrice, locationCapacity, finalTime } }
router.get('/:meetId', meetExistsChecker, meetParticipantChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const { rows } = await query(`
      SELECT
        m.name AS "meetName",
        m.description AS "meetDescription",
        m.is_public AS "isPublic",
        m.holder_id AS "holderId",
        u.name AS "holderName",
        m.start_time AS "startTime",
        m.end_time AS "endTime",
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        m.duration,
        fd.final_time AS "finalTime",
        l.id AS "locationId",
        l.name AS "locationName",
        l.address AS "locationAddress",
        l.price AS "locationPrice",
        l.capacity AS "locationCapacity"
      FROM meet AS m
        LEFT JOIN usr AS u ON m.holder_id = u.id
        LEFT JOIN final_decision AS fd ON m.id = fd.meet_id
        LEFT JOIN location AS l ON fd.final_place_id = l.id
      WHERE m.id = $1;
    `, [meetId]);
    if (rows.length === 0) return res.sendStatus(404);

    const { startDate, endDate, finalTime } = rows[0];
    const finalDecision = rows[0].locationId
      ? {
          locationId: rows[0].locationId,
          locationName: rows[0].locationName,
          locationAddress: rows[0].locationAddress,
          locationPrice: rows[0].locationPrice,
          locationCapacity: rows[0].locationCapacity,
          finalTime: finalTime ? finalTime : undefined,
        }
      : undefined;

    res.json({
      ...rows[0],
      startDate: getYYYYMMDD(startDate),
      endDate: getYYYYMMDD(endDate),
      finalDecision,
    });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch meet.' });
  }
});

// PATCH /meets/:meetId
// Update a meet's name, description, or public status.
// Request body: { meetName?, meetDescription?, isPublic? }
router.patch('/:meetId', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const updates = [];
    const params = [];
    if (req.body.meetName) {
      updates.push(`name = $${params.length + 1}`);
      params.push(req.body.meetName);
    }
    if (req.body.meetDescription) {
      updates.push(`description = $${params.length + 1}`);
      params.push(req.body.meetDescription);
    }
    if (req.body.isPublic !== undefined) {
      updates.push(`is_public = $${params.length + 1}`);
      params.push(req.body.isPublic);
    }

    if (updates.length === 0) return res.sendStatus(400);

    params.push(meetId);
    await query(`
      UPDATE meet SET ${updates.join(', ')} WHERE id = $${params.length}
    `, params);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to update meet.' });
  }
});

// DELETE /meets/:meetId
// Delete a meet.
router.delete('/:meetId', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    await query(`
      UPDATE meet SET status = $1 WHERE id = $2
    `, ['deleted', meetId]);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to delete meet.' });
  }
});

// POST /meets/:meetId/transfer
// Transfer a meet to another usr.
// Request body: { newHolderId }
router.post('/:meetId/transfer', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;
    const { newHolderId } = req.body;

    if (newHolderId == null)
      return res.status(400).json({ error: 'Missing new holder ID.' });

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows: newHolder } = await client.query(`
        SELECT * FROM usr WHERE id = $1
      `, [newHolderId]);
      if (newHolder.length === 0) {
        res.status(400).json({ error: 'New holder does not exist.' });
        throw new Error('New holder does not exist.');
      }

      await client.query(`
        UPDATE meet SET holder_id = $1 WHERE id = $2
      `, [newHolderId, meetId]);

      await client.query('COMMIT');
      res.sendStatus(200);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to transfer meet.' });
  }
});

// POST /meets/:meetId/invite
// Invite users to a meet.
// Request body: { usrIds: [usrId] }
router.post('/:meetId/invite', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;
    const { usrIds } = req.body;

    const client = await getClient();
    try {
      for (const usrId of usrIds) {
        const { rows: existingUsr } = await client.query(`
          SELECT * FROM usr WHERE id = $1
        `, [usrId]);
        if (existingUsr.length === 0) {
          res.status(400).json({ error: `User ${usrId} does not exist.` });
          throw new Error(`User ${usrId} does not exist.`);
        }

        const { rows: existingParticipation } = await client.query(`
          SELECT * FROM participation WHERE usr_id = $1 AND meet_id = $2
        `, [usrId, meetId]);
        if (existingParticipation.length === 0) {
          await client.query(`
            INSERT INTO participation (usr_id, meet_id, is_pending)
            VALUES ($1, $2, true)
          `, [usrId, meetId]);
        }
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to invite users.' });
  }
});

// POST /meets/:meetId/participate
// Participate in a meet. Can only participate in public meets without invitation.
router.post('/:meetId/participate', meetExistsChecker, async (req, res) => {
  try {
    const { meetId } = req.params;
    const usrId = req.usrId;

    const client = await getClient();
    try {
      const { rows: existingParticipation } = await query(`
        SELECT * FROM participation WHERE usr_id = $1 AND meet_id = $2 AND is_pending = true
      `, [usrId, meetId]);

      if (existingParticipation.length === 1) {
        await query(`
          UPDATE participation SET is_pending = false
          WHERE usr_id = $1 AND meet_id = $2
        `, [usrId, meetId]);
      } else {
        const meet = (await query(`
          SELECT * FROM meet WHERE id = $1 AND status = 'active'
        `, [meetId])).rows[0];

        if (!meet.is_public) {
          res.status(403).json({ error: 'This meet is private.' });
          throw new Error('This meet is private.');
        }

        await query(`
          INSERT INTO participation (usr_id, meet_id, is_pending)
          VALUES ($1, $2, false)
        `, [usrId, meetId]);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to participate in meet.' });
  }
});

// GET /meets/:meetId/location-options
// Get location options for a meet.
// Response body: { items: [{ locationId, locationName, locationAddress, locationPrice, locationCapacity }] }
router.get('/:meetId/location-options', meetExistsChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const { rows: items } = await query(`
      SELECT
        l.id AS "locationId",
        l.name AS "locationName",
        l.address AS "locationAddress",
        l.price AS "locationPrice",
        l.capacity AS "locationCapacity"
      FROM location_option AS lo
        JOIN location AS l ON lo.location_id = l.id
      WHERE lo.meet_id = $1
    `, [meetId]);

    res.json({ items });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch location options.' });
  }
});

// POST /meets/:meetId/location-options
// Add location options for a meet.
// Request body: { locationIds: [locationId] }
router.post('/:meetId/location-options', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;
    const { locationIds } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const locationId of locationIds) {
        const { rows: locationOptions } = await client.query(`
          SELECT *
          FROM location_option
          WHERE location_id = $1 AND meet_id = $2
        `, [locationId, meetId]);

        if (locationOptions.length === 0) {
          await client.query(`
            INSERT INTO location_option (location_id, meet_id)
            VALUES ($1, $2)
          `, [locationId, meetId]);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to add location options.' });
  }
});

// GET /meets/participating/:usrId
// Get all meets that a usr is or was participating in.
// Response body: { items: [{ meetId, meetName, meetDescription, isPublic, holderId, startTime, endTime, startDate, endDate, duration }] }
router.get('/participating/:usrId', usrAuthChecker, async (req, res) => {
  try {
    const usrId = req.usrId;

    const { rows } = await query(`
      SELECT
        m.id AS "meetId",
        m.name AS "meetName",
        m.description AS "meetDescription",
        m.is_public AS "isPublic",
        m.holder_id AS "holderId",
        m.start_time AS "startTime",
        m.end_time AS "endTime",
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        m.duration
      FROM meet AS m
        JOIN participation AS p ON m.id = p.meet_id AND p.is_pending = false
      WHERE p.usr_id = $1 AND m.status = 'active'
    `, [usrId]);

    const items = rows.map(row => ({
      ...row,
      startDate: getYYYYMMDD(row.startDate),
      endDate: getYYYYMMDD(row.endDate),
    }));

    res.json({ items });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch participating meets.' });
  }
});

// GET /meets/holding/:usrId
// Get all meets that a usr is holding.
// Response body: { items: [{ meetId, meetName, meetDescription, isPublic, startTime, endTime, startDate, endDate, duration }] }
router.get('/holding/:usrId', usrAuthChecker, async (req, res) => {
  try {
    const usrId = req.usrId;

    const { rows } = await query(`
      SELECT
        id AS "meetId",
        name AS "meetName",
        description AS "meetDescription",
        is_public AS "isPublic",
        start_time AS "startTime",
        end_time AS "endTime",
        start_date AS "startDate",
        end_date AS "endDate",
        duration
      FROM meet
      WHERE holder_id = $1 AND status = 'active'
    `, [usrId]);

    const items = rows.map(row => ({
      ...row,
      startDate: getYYYYMMDD(row.startDate),
      endDate: getYYYYMMDD(row.endDate),
    }));

    res.json({ items });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch holding meets.' });
  }
});

// GET /meets/:meetId/availabilities
// Get availability of all usrs for a meet.
// Response body: { items: [{ usrId, usrname, usrEmail, availabilities: [{ time_segment, locations: [{ locationId, locationName, locationAddress, locationPrice, locationCapacity }] }] }] }
router.get('/:meetId/availabilities', meetExistsChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const { rows } = await query(`
      SELECT
        u.id AS "usrId",
        u.name AS "usrName",
        u.email AS "usrEmail",
        a.time_segment AS "timeSegment",
        l.id AS "locationId",
        l.name AS "locationName",
        l.address AS "locationAddress",
        l.price AS "locationPrice",
        l.capacity AS "locationCapacity"
      FROM availability AS a
        JOIN usr AS u ON u.id = a.usr_id
        JOIN availability_location AS al ON al.availability_id = a.id
        JOIN location_option AS lo ON lo.id = al.location_option_id
        JOIN location AS l ON l.id = lo.location_id
      WHERE a.meet_id = $1
    `, [meetId]);

    if (rows.length === 0) return res.json({ items: [] });

    const items = Object.values(rows.reduce((map, row) => {
      if (!map[row.usrId]) {
        map[row.usrId] = { usrId: row.usrId, usrname: row.usrName, usrEmail: row.usrEmail, availabilities: [] };
      }
      if (!map[row.usrId].availabilities.find(a => a.timeSegment === row.timeSegment)) {
        map[row.usrId].availabilities.push({ timeSegment: row.timeSegment, locations: [] });
      }
      const availability = map[row.usrId].availabilities.find(a => a.timeSegment === row.timeSegment);
      availability.locations.push({
        locationId: row.locationId,
        locationName: row.locationName,
        locationAddress: row.locationAddress,
        locationPrice: row.locationPrice,
        locationCapacity: row.locationCapacity,
      });
      return map;
    }, {}));

    res.json({ items });
  } catch (err) {
    console.error(err);

    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
});

// GET /meets/:meetId/availabilities/:usrId
// Get availability for a meet.
// Response body: { items: [{ timeSegment, locations: [{ locationId, locationName, locationAddress, locationPrice, locationCapacity }] }] }
router.get('/:meetId/availabilities/:usrId', meetExistsChecker, async (req, res, next) => {
  const usrId = req.usrId;
  const { targetUsrId } = req.params;

  if (usrId === targetUsrId) return next();

  meetHolderChecker(req, res, next);
}, async (req, res) => {
  try {
    const { meetId, usrId: targetUsrId } = req.params;

    const { rows } = await query(`
      SELECT
        a.time_segment AS "timeSegment",
        l.id AS "locationId",
        l.name AS "locationName",
        l.address AS "locationAddress",
        l.price AS "locationPrice",
        l.capacity AS "locationCapacity"
      FROM availability AS a
        JOIN availability_location AS al ON al.availability_id = a.id
        JOIN location_option AS lo ON lo.id = al.location_option_id
        JOIN location AS l ON l.id = lo.location_id
      WHERE a.meet_id = $1 AND a.usr_id = $2
    `, [meetId, targetUsrId]);

    if (rows.length === 0) return res.json({ items: [] });

    const items = Object.values(rows.reduce((map, row) => {
      if (!map[row.timeSegment.getTime()]) {
        map[row.timeSegment.getTime()] = { timeSegment: getYYYYMMDDHHMISS(row.timeSegment), locations: [] };
      }
      if (row.locationId) {
        map[row.timeSegment.getTime()].locations.push({ locationId: row.locationId, locationName: row.locationName, locationAddress: row.locationAddress, locationPrice: row.locationPrice, locationCapacity: row.locationCapacity });
      }
      return map;
    }, {}));

    res.json({ items });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
});

// PUT /meets/:meetId/availabilities/:usrId/:timeSegment
// Update availability for a meet.
// Request body: { locationIds: [locationId] }
router.put('/:meetId/availabilities/:usrId/:timeSegment', meetExistsChecker, async (req, res) => {
  try {
    const usrId = req.usrId;
    const { meetId, usrId: targetUsrId } = req.params;
    const timeSegment = new Date(req.params.timeSegment);
    const { locationIds } = req.body;

    if (usrId !== targetUsrId) return res.sendStatus(403);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { startDate, endDate, startTime, endTime } = (
        await client.query(`
          SELECT
            start_date AS "startDate",
            end_date AS "endDate",
            start_time AS "startTime",
            end_time AS "endTime"
          FROM meet
          WHERE id = $1
        `, [meetId]))[0];
      if (timeSegment < new Date(`${startDate}`) || timeSegment > new Date(`${endDate}`)
        || timeSegment < startTime || timeSegment > endTime) {
        res.status(400).json({ error: 'Invalid time segment.' });
        throw new Error('Invalid time segment.');
      }

      const { rows: existingAvailability } = await client.query(`
        SELECT * FROM availability
        WHERE time_segment = $1 AND usr_id = $2 AND meet_id = $3
      `, [timeSegment, usrId, meetId]);

      if (existingAvailability !== 0) {
        await client.query(`
          DELETE FROM availability_location
          WHERE availability_id = $1
        `, [existingAvailability[0].id]);
      }

      const availability = (await client.query(`
        INSERT INTO availability (time_segment, usr_id, meet_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [timeSegment, usrId, meetId])).rows[0];

      for (const locationId of locationIds) {
        const { rows: locationOptions } = await client.query(`
          SELECT *
          FROM location_option AS lo
          WHERE lo.location_id = $1 AND lo.meet_id = $2
        `, [locationId, meetId]);
        if (locationOptions.length === 0) {
          res.status(400).json({ error: 'Invalid location ID.' });
          throw new Error('Invalid location ID.');
        }
        const locationOptionId = locationOptions[0].id;

        const { rows: availabilityLocations } = await client.query(`
          SELECT * FROM availability_location
          WHERE location_option_id = $1 AND availability_id = $2
        `, [locationOptionId, availability.id]);
        if (availabilityLocations.length === 0) {
          await client.query(`
            INSERT INTO availability_location (location_option_id, availability_id)
            VALUES ($1, $2)
          `, [locationOptionId, availability.id]);
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to add availability.' });
  }
});

// DELETE /meets/:meetId/availabilities/:usrId/:timeSegment
// Delete availability for a meet at a specific timeSegment.
router.delete('/:meetId/availabilities/:usrId/:timeSegment', meetExistsChecker, async (req, res, next) => {
  const usrId = req.usrId;
  const { usrId: targetUsrId } = req.params;

  if (usrId === targetUsrId) return next();

  meetHolderChecker(req, res, next);
}, async (req, res) => {
  try {
    const { meetId, usrId: targetUsrId, timeSegment } = req.params;

    const client = await getClient();
    try {
      const { rows: availabilities } = await client.query(`
        SELECT * FROM availability
        WHERE time_segment = $1 AND usr_id = $2 AND meet_id = $3
      `, [timeSegment, targetUsrId, meetId]);
      if (availabilities.length === 0) {
        res.sendStatus(404);
        throw new Error('Availability not found.');
      }

      await client.query(`
        DELETE FROM availability
        WHERE time_segment = $1 AND usr_id = $2 AND meet_id = $3
      `, [timeSegment, targetUsrId, meetId]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to delete availability.' });
  }
});

// POST /meets/:meetId/availabilities/:usrId/multiple-time-segments
// Update availabilities at many time segments for a meet.
// Request body: { timeSegments: [timeSegment], locationIds: [locationId] }
router.post('/:meetId/availabilities/:usrId/multiple-time-segments', meetExistsChecker, async (req, res) => {
  try {
    const usrId = req.usrId;
    const { meetId, usrId: targetUsrId } = req.params;
    const { timeSegments, locationIds } = req.body;

    if (usrId !== targetUsrId) return res.sendStatus(403);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { startDate, endDate, startTime, endTime } = (
        await client.query(`
          SELECT
            start_date AS "startDate",
            end_date AS "endDate",
            start_time AS "startTime",
            end_time AS "endTime"
          FROM meet
          WHERE id = $1
        `, [meetId]).rows[0]);

      for (const locationId of locationIds) {
        const { rows: locationOptions } = await client.query(`
          SELECT *
          FROM location_option AS lo
          WHERE lo.location_id = $1 AND lo.meet_id = $2
        `, [locationId, meetId]);
        if (locationOptions.length === 0) {
          res.status(400).json({ error: 'Invalid location ID.' });
          throw new Error('Invalid location ID.');
        }
      }

      for (const timeSegment of timeSegments) {
        const timeSegmentDate = new Date(timeSegment);
        if (timeSegmentDate < new Date(`${startDate}`) || timeSegmentDate > new Date(`${endDate}`)
          || timeSegment < startTime || timeSegment > endTime) {
          res.status(400).json({ error: 'Out of the range time segment.' });
          throw new Error('Invalid time segment.');
        }

        const { rows: existingAvailability } = await client.query(`
          SELECT * FROM availability
          WHERE time_segment = $1 AND usr_id = $2 AND meet_id = $3
        `, [timeSegment, usrId, meetId]);

        if (existingAvailability !== 0) {
          await client.query(`
            DELETE FROM availability_location
            WHERE availability_id = $1
          `, [existingAvailability[0].id]);
        }

        const availability = (await client.query(`
          INSERT INTO availability (time_segment, usr_id, meet_id)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [timeSegment, usrId, meetId])).rows[0];

        for (const locationId of locationIds) {
          const { rows: availabilityLocations } = await client.query(`
            SELECT *
            FROM availability_location AS al
              JOIN location_option AS lo ON lo.location_id = $1
            WHERE al.location_option_id = lo.id AND al.availability_id = $2
          `, [locationId, availability.id]);

          if (availabilityLocations.length === 0) {
            await client.query(`
              INSERT INTO availability_location (location_option_id, availability_id)
              VALUES ($1, $2)
            `, [locationId, availability.id]);
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to update availability.' });
  }
});

// POST /meets/:meetId/final-decision
// Make a final decision for a meet.
// Request body: { finalPlaceId, finalTime }

router.post('/:meetId/final-decision', meetExistsChecker, meetHolderChecker, async (req, res) => {

  const client = await getClient();
  try {
    const { meetId } = req.params;
    const { finalPlaceId, finalTime } = req.body;

    await client.query('BEGIN'); // Start transaction

    // Check if final decision already exists
    const { rowCount: existingCount } = await client.query(
      `SELECT 1 FROM final_decision WHERE meet_id = $1`,
      [meetId]
    );

    if (existingCount > 0) {
      throw new Error('Final decision already exists for this meeting.');
    }

    // Fetch meeting details
    const { rows: [meeting] } = await client.query(`
      SELECT start_time, 
            duration, 
            ($2::timestamp + duration) AS meeting_end_time
      FROM meet
      WHERE id = $1
  ` ,[meetId, finalTime]
    );

    if (!meeting) {
      throw new Error('Meeting not found.');
    }

    const { start_time: startTime, duration, meeting_end_time: meetingEndTime } = meeting;

    // Lock the target location for updates
    const { rowCount: locationCount } = await client.query(`
      SELECT 1 FROM location WHERE id = $1 FOR UPDATE`,
      [finalPlaceId]
    );

    if (locationCount === 0) {
      throw new Error('Location not found.');
    }

    // Check for time and place conflicts
    const { rowCount: conflictCount } = await client.query(`
      SELECT 1
      FROM final_decision AS fd
      JOIN meet AS m ON fd.meet_id = m.id
      WHERE fd.final_place_id = $1
        AND tstzrange($2::timestamp, $3::timestamp)
          && tstzrange(fd.final_time, fd.final_time + m.duration)
      `,
      [finalPlaceId, finalTime, meetingEndTime]
    );

    if (conflictCount > 0) {
      throw new Error('Time and place conflict detected.');
    }

    // Insert final decision
    await client.query(`
      INSERT INTO final_decision (meet_id, final_place_id, final_time)
      VALUES ($1, $2, $3)
      `,
      [meetId, finalPlaceId, finalTime]
    );

    await client.query('COMMIT'); // Commit transaction
    res.sendStatus(201);
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: err.message || 'Failed to make final decision.' });
  } finally {
    client.release(); // Release client back to the pool
  }
});


// GET /meets/:meetId/best-decision
// Get the most suitable decision for a meet.
// Query parameters: { limit = 5 }
// Response body: {[{ meetId, finalTime, locationId, locationName, availableUsrs }]}
router.get('/:meetId/best-decision', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;
    const { limit = 5 } = req.query;
    const { rows } = await query(`
        WITH meeting_duration AS ( -- 計算會議的開始時間和結束時間
            SELECT
                m.id AS meet_id,
                m.start_time AS start_time,
                (m.start_time + m.duration) AS end_time,
                m.duration,
                m.start_date AS start_date -- 添加 start_date 以便生成完整的 timestamp
            FROM meet AS m
        ),
        available_combinations AS ( -- 找到每個會議地點和時間段可用的組合
            SELECT
                a.meet_id,
                a.time_segment,
                l.id AS location_id,
                l.name AS location_name,
                COUNT(*) AS available_users
            FROM availability AS a
            JOIN availability_location AS al ON al.availability_id = a.id
            JOIN location_option AS lo ON lo.id = al.location_option_id
            JOIN location AS l ON l.id = lo.location_id
            GROUP BY a.meet_id, a.time_segment, l.id
        ),
        valid_combinations AS ( -- 過濾掉與其他會議時間衝突的地點和時間段
            SELECT
                ac.meet_id,
                ac.time_segment,
                ac.location_id,
                ac.location_name,
                ac.available_users
            FROM available_combinations AS ac
            JOIN meeting_duration AS md ON ac.meet_id = md.meet_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM final_decision AS fd
                JOIN meeting_duration AS md_other ON fd.meet_id = md_other.meet_id
                WHERE fd.final_place_id = ac.location_id
                  AND ac.time_segment BETWEEN
                      (md_other.start_date + md_other.start_time) AND -- 將 start_time 加到 start_date
                      (md_other.start_date + md_other.end_time)       -- 將 end_time 加到 start_date
            )
        ),
        ranked_combinations AS ( -- 根據每個地點和時間段的可用人數排序，並為每個會議排名
            SELECT
                vc.meet_id,
                vc.time_segment,
                vc.location_id,
                vc.location_name,
                vc.available_users,
                ROW_NUMBER() OVER (PARTITION BY vc.meet_id ORDER BY vc.available_users DESC) AS rank
            FROM valid_combinations AS vc
        )
        -- 返回用戶指定的前 N 個最佳選擇
        SELECT
            rc.meet_id AS "meetId",
            rc.time_segment AS "timeSegment",
            rc.location_id AS "locationId",
            rc.location_name AS "locationName",
            rc.available_users AS "availableUsrs"
        FROM ranked_combinations AS rc
        WHERE rc.meet_id = $1 AND rc.rank <= $2; -- 用戶指定的前 N 名
    `, [meetId, limit]);

    const items = rows.map(row => ({
      ...row,
      timeSegment: getYYYYMMDDHHMISS(row.timeSegment),
    }));

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch location options.' });
  }
});
export default router;
