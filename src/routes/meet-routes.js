import { Router } from 'express';
import { getClient, query } from '../db/index.js';

// Make sure to the meet exists.
// If it does not exist, return 404.
// Meets are considered to exist if they are active.
const meetExistsChecker = async (req, res, next) => {
  const { meetId } = req.params;
  const { rows } = await query(`
    SELECT * FROM meet WHERE id = $1 AND status = 'active'
  `, [meetId]);

  if (rows.length === 0) return res.sendStatus(404);
  next();
};

// Make sure the requester is the holder of the meet.
const meetHolderChecker = async (req, res, next) => {
  const userId = req.userId;
  const { meetId } = req.params;
  const { holderId } = (await query(`
    SELECT holder_id FROM meet WHERE id = $1
  `, [meetId]))[0];

  if (userId !== holderId) return res.sendStatus(403);
  next();
};

const router = Router();

// GET /meets
// Get all meets' id and details, ordered by id.
// Query parameters: { offset = 0, limit = 10 }
// Response body: { items: [{ id, meetName, meetDescription, isPublic, holderId, locationId? }] }
router.get('/', async (req, res) => {
  try {
    const { offset = 0, limit = 10 } = req.query;
    const { rows } = await query(`
      SELECT
        id,
        name AS meetName,
        description AS meetDescription,
        is_public AS isPublic,
        holder_id AS holderId,
        location_id AS locationId
      FROM meet
      WHERE status = 'active'
      ORDER BY id
      OFFSET $1 LIMIT $2
    `, [offset, limit]);

    const items = rows.map(row => ({
      ...row,
      locationId: row.locationId === null ? undefined : row.locationId,
    }));

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meets.' });
  }
});

// POST /meets
// Create a new meet.
// Request body: { meetName, meetDescription, isPublic }
// Response body: { id }
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { meetName, meetDescription, isPublic } = req.body;

    const { id } = (await query(`
      INSERT INTO meet (name, description, is_public, holder_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [meetName, meetDescription, isPublic, userId])).rows[0];
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create meet.' });
  }
});

// GET /meets/:meetId
// Get a meet's details.
// Response body: { meetName, meetDescription, isPublic, holderId, locationId? }
router.get('/:meetId', meetExistsChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const { rows } = await query(`
      SELECT
        name AS meetName,
        description AS meetDescription,
        is_public AS isPublic,
        holder_id AS holderId,
        location_id AS locationId
      FROM meet
      WHERE id = $1
    `, [meetId]);
    if (rows.length === 0) return res.sendStatus(404);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
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
    res.status(500).json({ error: 'Failed to delete meet.' });
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
        l.id AS locationId,
        l.name AS locationName,
        l.address AS locationAddress,
        l.price AS locationPrice,
        l.capacity AS locationCapacity
      FROM location_option AS lo
        JOIN location AS l ON lo.location_id = l.id
      WHERE lo.meet_id = $1
    `, [meetId]);

    res.json({ items });
  } catch (err) {
    console.error(err);
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
      res.sendStatus(201);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add location options.' });
  }
});

// GET /meets/:meetId/availabilities
// Get availability of all users for a meet.
// Response body: { items: [{ userId, username, userEmail, availabilities: [{ timestamp, locations: [{ locationId, locationName, locationAddress, locationPrice, locationCapacity }] }] }] }
router.get('/:meetId/availabilities', meetExistsChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const { rows } = await query(`
      SELECT
        u.id AS userId,
        u.name AS username,
        u.email AS userEmail,
        a.timestamp AS timestamp,
        l.id AS locationId,
        l.name AS locationName,
        l.address AS locationAddress,
        l.price AS locationPrice,
        l.capacity AS locationCapacity
      FROM availability AS a
        JOIN user AS u ON u.id = a.user_id
        JOIN availability_location AS al ON al.availability_id = a.id
        JOIN location_option AS lo ON lo.id = al.location_option_id
        JOIN location AS l ON l.id = lo.location_id
      WHERE a.meet_id = $1
    `, [meetId]);

    const items = Object.values(rows.reduce((map, row) => {
      if (!map[row.userId]) {
        map[row.userId] = { userId: row.userId, username: row.username, userEmail: row.userEmail, availabilities: [] };
      }
      if (!map[row.userId].availabilities.find(a => a.timestamp === row.timestamp)) {
        map[row.userId].availabilities.push({ timestamp: row.timestamp, locations: [] });
      }
      const availability = map[row.userId].availabilities.find(a => a.timestamp === row.timestamp);
      availability.locations.push({
        locationId: row.locationId,
        locationName: row.locationName,
        locationAddress: row.locationAddress,
        locationPrice: row.locationPrice,
        locationCapacity: row.locationCapacity,
      });
      return map;
    }), {});

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
});

// GET /meets/:meetId/availabilities/:userId
// Get availability for a meet.
// Response body: { items: [{ timestamp, locations: [{ locationId, locationName, locationAddress, locationPrice, locationCapacity }] }] }
router.get('/:meetId/availabilities/:userId', meetExistsChecker, async (req, res, next) => {
  const userId = req.userId;
  const { targetUserId } = req.params;

  if (userId === targetUserId) return next();

  meetHolderChecker(req, res, next);
}, async (req, res) => {
  try {
    const { meetId, userId: targetUserId } = req.params;

    const { rows } = await query(`
      SELECT
        a.timestamp,
        l.id AS locationId,
        l.name AS locationName,
        l.address AS locationAddress,
        l.price AS locationPrice,
        l.capacity AS locationCapacity,
      FROM availability AS a
        JOIN availability_location AS al ON al.availability_id = a.id
        JOIN location_option AS lo ON lo.id = al.location_option_id
        JOIN location AS l ON l.id = lo.location_id
      WHERE a.meet_id = $1 AND a.user_id = $2
    `, [meetId, targetUserId]);

    if (rows.length === 0)
      return res.json({ items: [] });

    const items = Object.values(rows.reduce((map, row) => {
      if (!map[row.timestamp]) {
        map[row.timestamp] = { timestamp: row.timestamp, locations: [] };
      }
      if (row.location_option_id) {
        map[row.timestamp].locations.push({ locationId: row.locationId, locationName: row.locationName, locationAddress: row.locationAddress, locationPrice: row.locationPrice, locationCapacity: row.locationCapacity });
      }
      return map;
    }, {}));

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
});

// POST /meets/:meetId/availabilities/:userId/:timestamp
// Add availability for a meet.
// Request body: { locationIds: [locationId] }
router.post('/:meetId/availabilities/:userId/:timestamp', meetExistsChecker, async (req, res) => {
  try {
    const userId = req.userId;
    const { meetId, userId: targetUserId } = req.params;
    const { timestamp } = req.params;
    const { locationIds } = req.body;

    if (userId !== targetUserId) return res.sendStatus(403);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows: existingAvailability } = await client.query(`
        SELECT * FROM availability
        WHERE timestamp = $1 AND user_id = $2 AND meet_id = $3
      `, [timestamp, userId, meetId]);

      let availability;
      if (existingAvailability.length === 0) {
        availability = (await client.query(`
          INSERT INTO availability (timestamp, user_id, meet_id)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [timestamp, userId, meetId])).rows[0];
      } else {
        availability = existingAvailability[0];
      }

      for (const locationId of locationIds) {
        const { rows: locationOptions } = await client.query(`
          SELECT *
          FROM location_option AS lo
          WHERE lo.location_id = $1 AND lo.meet_id = $2
        `, [locationId, meetId]);
        if (locationOptions.length === 0) return req.status(400).json({ error: 'Invalid location ID' });
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
    res.status(500).json({ error: 'Failed to add availability.' });
  }
});

// DELETE /meets/:meetId/availabilities/:userId/:timestamp
// Delete availability for a meet at a specific timestamp.
router.delete('/:meetId/availabilities/:userId/:timestamp', meetExistsChecker, async (req, res, next) => {
  const userId = req.userId;
  const { targetUserId } = req.params;

  if (userId === targetUserId) return next();

  meetHolderChecker(req, res, next);
}, async (req, res) => {
  try {
    const { meetId, userId: targetUserId, timestamp } = req.params;

    const { rows: availabilities } = await query(`
      SELECT * FROM availability
      WHERE timestamp = $1 AND user_id = $2 AND meet_id = $3
    `, [timestamp, targetUserId, meetId]);
    if (availabilities.length === 0) return res.sendStatus(404);

    await query(`
      DELETE FROM availability
      WHERE timestamp = $1 AND user_id = $2 AND meet_id = $3
    `, [timestamp, targetUserId, meetId]);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete availability.' });
  }
});

// POST /meets/:meetId/final-decision
// Make a final decision for a meet.
// Request body: { finalPlaceId, finalTime }
router.post('/:meetId/final-decision', meetExistsChecker, meetHolderChecker, async (req, res) => {
  try {
    const { meetId } = req.params;
    const { finalPlaceId, finalTime } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows: existingFinalDecision } = await client.query(`
        SELECT * FROM final_decision
        WHERE meet_id = $1
      `, [meetId]);
      if (existingFinalDecision.length > 0) return res.status(400).json({ error: 'Final decision already made.' });

      const { rows: sameTimeLocationFinalDecisions } = await client.query(`
        SELECT * FROM final_decision
        WHERE final_time = $1 AND final_place_id = $2
      `, [finalTime, finalPlaceId]);
      if (sameTimeLocationFinalDecisions.length > 0) return res.status(400).json({ error: 'Final decision already made for this time and location.' });

      await client.query(`
        INSERT INTO final_decision (meet_id, final_place_id, final_time)
        VALUES ($1, $2, $3)
      `, [meetId, finalPlaceId, finalTime]);

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
    res.status(500).json({ error: 'Failed to make final decision.' });
  }
});

export default router;
