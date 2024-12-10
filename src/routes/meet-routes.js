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
  const usrId = req.usrId;
  const { meetId } = req.params;
  const { holderId } = (await query(`
    SELECT holder_id AS "holderId" FROM meet WHERE id = $1
  `, [meetId])).rows[0];
  if (usrId !== holderId) return res.sendStatus(403);
  next();
};

const router = Router();

// GET /meets
// Get all meets' id and details, ordered by id.
// Query parameters: { offset = 0, limit = 10 }
// Response body: { items: [{ id, meetName, meetDescription, isPublic, holderId, startTime, endTime, startDate, endDate, duration }] }
router.get('/', async (req, res) => {
  try {
    const { offset = 0, limit = 10 } = req.query;
    const { rows: items } = await query(`
      SELECT
        id,
        name AS "meetName",
        description AS "meetDescription",
        is_public AS "isPublic",
        holder_id AS "holderId",
        start_time AS "startTime",
        end_time AS "endTime",
        start_date AS "startDate",
        end_date AS "endDate",
        duration AS "meetDuration"
      FROM meet
      WHERE status = 'active'
      ORDER BY id
      OFFSET $1 LIMIT $2
    `, [offset, limit]);

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
    const { meetName, meetDescription, isPublic, start_time, end_time, start_date, end_date, duration } = req.body;

    const { id } = (await query(`
      INSERT INTO meet (name, description, is_public, holder_id, start_time, end_time, start_date, end_date, duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [meetName, meetDescription, isPublic, usrId, start_time, end_time, start_date, end_date, duration])).rows[0];

    res.json({ id });
  } catch (err) {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to create meet.' });
  }
});

// GET /meets/:meetId
// Get a meet's details.
// Response body: { meetName, meetDescription, isPublic, holderId, startTime, endTime, startDate, endDate, duration, finalDecision: { locationId, locationName, locationAddress, locationPrice, locationCapacity, finalTime } }
router.get('/:meetId', meetExistsChecker, async (req, res) => {
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

    const { meetName, meetDescription, isPublic, holderId, holderName, startTime,
      endTime, startDate, endDate, duration } = rows[0];

    const finalDecision = rows.map(row => ({
      locationId: row.locationId,
      locationName: row.locationName,
      locationAddress: row.locationAddress,
      locationPrice: row.locationPrice,
      locationCapacity: row.locationCapacity,
      finalTime: row.finalTime,
    }));

    res.json({
      meetName, meetDescription, isPublic, holderId, holderName, startTime,
      endTime, startDate, endDate, duration, finalDecision,
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
    }), {});

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

    if (rows.length === 0)
      return res.json({ items: [] });

    const items = Object.values(rows.reduce((map, row) => {
      if (!map[row.time_segment]) {
        map[row.time_segment] = { time_segment: row.time_segment, locations: [] };
      }
      if (row.location_option_id) {
        map[row.time_segment].locations.push({ locationId: row.locationId, locationName: row.locationName, locationAddress: row.locationAddress, locationPrice: row.locationPrice, locationCapacity: row.locationCapacity });
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
    const { timeSegment } = req.params;
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
      if (timeSegment < startTime || timeSegment > endTime || startDate > timeSegment || endDate < timeSegment) {
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

// DELETE /meets/:meetId/availabilities/:usrId/:time_segment
// Delete availability for a meet at a specific time_segment.
router.delete('/:meetId/availabilities/:usrId/:time_segment', meetExistsChecker, async (req, res, next) => {
  const usrId = req.usrId;
  const { targetusrId } = req.params;

  if (usrId === targetusrId) return next();

  meetHolderChecker(req, res, next);
}, async (req, res) => {
  try {
    const { meetId, usrId: targetusrId, time_segment } = req.params;

    const client = await getClient();
    try {
      const { rows: availabilities } = await client.query(`
        SELECT * FROM availability
        WHERE time_segment = $1 AND usr_id = $2 AND meet_id = $3
      `, [time_segment, targetusrId, meetId]);
      if (availabilities.length === 0) {
        res.sendStatus(404);
        throw new Error('Availability not found.');
      }

      await client.query(`
        DELETE FROM availability
        WHERE time_segment = $1 AND usr_id = $2 AND meet_id = $3
      `, [time_segment, targetusrId, meetId]);
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
        if (timeSegment < startTime || timeSegment > endTime || startDate > timeSegment || endDate < timeSegment) {
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
      if (existingFinalDecision.length > 0) {
        res.status(400).json({ error: 'Final decision already made.' });
        throw new Error('Final decision already made.');
      }

      const { rows: sameTimeLocationFinalDecisions } = await client.query(`
        SELECT * FROM final_decision
        WHERE final_time = $1 AND final_place_id = $2
      `, [finalTime, finalPlaceId]);
      if (sameTimeLocationFinalDecisions.length > 0) {
        res.status(400).json({ error: 'Final decision already made.' });
        throw new Error('Final decision already made.');
      }

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
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to make final decision.' });
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
    const { rows: items } = await query(`
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
            rc.meet_id,
            rc.time_segment,
            rc.location_id,
            rc.location_name,
            rc.available_users
        FROM ranked_combinations AS rc
        WHERE rc.meet_id = $1 AND rc.rank <= $2; -- 用戶指定的前 N 名

    `, [meetId, limit]);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch location options.' });
  }
});
export default router;
