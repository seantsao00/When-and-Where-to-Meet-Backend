import { Router } from 'express';
import { query } from '../db/index.js';
import { adminChecker, usrAuthChecker, usrExistsChecker } from './middlewares.js';

const router = Router();

// POST /usrs
// Registers a new usr.
// Request body: { name: string, email: string }
// Response body: { usrId: number }
router.post('/', async (req, res) => {
  try {
    const { id } = (await query(`
      INSERT INTO usr (name, email)
      VALUES ($1, $2)
      RETURNING id
    `, [req.body.name, req.body.email])).rows[0];

    res.status(201).json({ usrId: id });
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
    console.log(req.params);
    const { rows } = await query(`
      SELECT
          id AS "usrId",
          name AS "usrName",
          email AS "usrEmail",
          status AS "usrStatus"
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

// POST /usrs/:usrId/ban
// Bans a usr.
router.post('/:usrId/ban', usrExistsChecker, adminChecker, async (req, res) => {
  try {
    await query('UPDATE usr SET status = $1 WHERE id = $2', ['banned', req.params.usrId]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;
