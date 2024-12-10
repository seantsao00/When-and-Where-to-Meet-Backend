import { Router } from 'express';
import { query } from '../db/index.js';

// Middleware that checks if a usr exists.
// If the usr does not exist, sends a 404 response.
// Usrs are considered to exist if they are not deleted.
const usrExistsChecker = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM usr WHERE id = $1 AND status != $2', [req.params.usrId, 'deleted']);
    if (result.rows.length === 0) {
      res.sendStatus(404);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

const usrAuthChecker = async (req, res, next) => {
  try {
    const usrId = req.usrId;
    const { usrId: targetUsrId } = req.params;
    if (usrId !== targetUsrId) {
      res.sendStatus(403);
    }
    next();
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

const router = Router();

// POST /usrs
// Registers a new usr.
// Request body: { name: string, email: string }
router.post('/', async (req, res) => {
  try {
    await query('INSERT INTO usr (name, email) VALUES ($1, $2)', [req.body.name, req.body.email]);
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /usrs/:usrId
// Returns a usr.
// Response body: { usrId: number, usrName: string, usrEmail: string, usrStatus: string }
router.get('/:usrId', usrExistsChecker, usrAuthChecker, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
          id AS usrId,
          name AS usrName,
          email AS usrEmail,
          status AS usrStatus
      FROM usr
      WHERE id = $1
    `, [req.params.usrId]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// PATCH /usrs/:usrId
// Updates a usr.
// Request body: { usrName?: string, usrEmail?: string }
router.patch('/:usrId', usrExistsChecker, usrAuthChecker, async (req, res) => {
  try {
    const { usrId } = req.params;

    const updates = [];
    const params = [];
    if (req.body.usrName) {
      updates.push(`name = $${params.length + 1}`);
      params.push(req.body.usrName);
    }
    if (req.body.usrEmail) {
      updates.push(`email = $${params.length + 1}`);
      params.push(req.body.usrEmail);
    }

    if (updates.length === 0) return res.sendStatus(400);

    params.push(usrId);
    await query(`
      UPDATE usr SET ${updates.join(', ')} WHERE id = $${params.length}
    `, params);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// DELETE /usrs/:usrId
// Deletes a usr.
router.delete('/:usrId', usrExistsChecker, usrAuthChecker, async (req, res) => {
  try {
    await query('DELETE FROM usr WHERE id = $1', [req.params.usrId]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /usrs/:usrId/participating-meets
// Returns all meets of a usr.
// Response body: { items: [{ meetId: number, meetName: string}] }
router.get('/:usrId/participating-meets', usrExistsChecker, usrAuthChecker, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
          meet.id AS meetId,
          meet.name AS meetName
      FROM meet
        JOIN participation ON meet.id = participation.meet_id
      WHERE participation.usr_id = $1
    `, [req.params.usrId]);

    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /usrs/:usrId/holding-meets
// Returns all meets held by a usr.
// Response body: { items: [{ meetId: number, meetName: string}] }
router.get('/:usrId/holding-meets', usrExistsChecker, usrAuthChecker, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
          id AS meetId,
          name AS meetName
      FROM meet
      WHERE holder_id = $1
    `, [req.params.usrId]);

    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;
