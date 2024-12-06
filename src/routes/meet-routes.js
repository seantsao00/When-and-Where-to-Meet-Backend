import { Router } from 'express';
import { getClient, query } from '../db';

// Make sure to the meet exists.
const meetExistsChecker = async (req, res, next) => {
  const { meetId } = req.params;
  const { rows } = await query(`
    SELECT * FROM meet WHERE id = $1
  `, [meetId]);

  if (rows.length === 0) return res.sendStatus(404);
  next();
};

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

// POST /meet
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
    `, [meetName, meetDescription, isPublic, userId])).rows[0];
    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create meet.' });
  }
});

// PATCH /meet/:meetId
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

    if (updates.length > 0) {
      params.push(meetId);
      await query(`
        UPDATE meet SET ${updates.join(', ')} WHERE id = $${params.length}
      `, params);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update meet.' });
  }
});

// DELETE /meet/:meetId
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

// GET /meet/:meetId/location-options
// Get location options for a meet.
// Response body: { items: [{ locationOptionId, locationName, locationAddress, locationPrice, locationCapacity }] }
router.get('/:meetId/location-options', meetExistsChecker, async (req, res) => {
  try {
    const { meetId } = req.params;

    const { rows: items } = await query(`
      SELECT
        lo.id AS locationOptionId,
        l.name AS locationName,
        l.address AS locationAddress,
        l.price AS locationPrice,
        l.capacity AS locationCapacity
      FROM location_option AS lo
        INNER JOIN location AS l ON lo.location_id = l.id
      WHERE lo.meet_id = $1
    `, [meetId]);

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch location options.' });
  }
});

// GET /meet/:meetId/availabilities
// Get availability for a meet.
// Response body: { items: [{ timestamp, locationOptionIds: [locationOptionId] }] }
router.get('/:meetId/availabilities', meetExistsChecker, async (req, res) => {
  try {
    const userId = req.userId;
    const { meetId } = req.params;

    const { rows: availabilityWithLocationOptions } = await query(`
      SELECT
        a.timestamp,
        al.location_option_id
      FROM availability AS a
        LEFT JOIN availability_location AS al ON a.id = al.availability_id
      WHERE a.meet_id = $1 AND a.user_id = $2
    `, [meetId, userId]);

    if (availabilityWithLocationOptions.length === 0)
      return res.json({ items: [] });

    const items = Object.values(availabilityWithLocationOptions.reduce((map, row) => {
      if (!map[row.timestamp]) {
        map[row.timestamp] = { timestamp: row.timestamp, locationOptionIds: [] };
      }
      if (row.location_option_id) {
        map[row.timestamp].locationOptionIds.push(row.location_option_id);
      }
      return map;
    }, {}));

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
});

// POST /meet/:meetId/availabilities
// Add availability for a meet.
// Request body: { timestamp, locationOptionIds }
router.post('/:meetId/availabilities', meetExistsChecker, async (req, res) => {
  try {
    const userId = req.userId;
    const { meetId } = req.params;
    const { timestamp, locationOptionIds } = req.body;

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

      for (const locationOptionId of locationOptionIds) {
        const { rows: locationOptions } = await client.query(`
        SELECT * FROM location_option
        WHERE id = $1 AND meet_id = $2
      `, [locationOptionId, meetId]);
        if (locationOptions.length === 0) throw new Error('Invalid location option ID.');

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

export default router;
