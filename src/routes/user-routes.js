import { Router } from 'express';
import { query } from '../db/index.js';

// Middleware that checks if a user exists.
// If the user does not exist, sends a 404 response.
// Users are considered to exist if they are not deleted.
const userExistsChecker = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM user WHERE id = $1 AND status != $2', [req.params.userId, 'deleted']);
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

const userAuthChecker = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { userId: targetUserId } = req.params;
    if (userId !== targetUserId) {
      res.sendStatus(403);
    }
    next();
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

const router = Router();

// POST /users
// Registers a new user.
// Request body: { name: string, email: string }
router.post('/', async (req, res) => {
  try {
    await query('INSERT INTO user (name, email) VALUES ($1, $2)', [req.body.name, req.body.email]);
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /users/:userId
// Returns a user.
// Response body: { userId: number, userName: string, userEmail: string, userStatus: string }
router.get('/:userId', userExistsChecker, userAuthChecker, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
          id AS userId,
          name AS userName,
          email AS userEmail,
          status AS userStatus
      FROM user
      WHERE id = $1
    `, [req.params.userId]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// PATCH /users/:userId
// Updates a user.
// Request body: { userName?: string, userEmail?: string }
router.patch('/:userId', userExistsChecker, userAuthChecker, async (req, res) => {
  try {
    const { userId } = req.params;

    const updates = [];
    const params = [];
    if (req.body.userName) {
      updates.push(`name = $${params.length + 1}`);
      params.push(req.body.userName);
    }
    if (req.body.userEmail) {
      updates.push(`email = $${params.length + 1}`);
      params.push(req.body.userEmail);
    }

    if (updates.length === 0) return res.sendStatus(400);

    params.push(userId);
    await query(`
      UPDATE user SET ${updates.join(', ')} WHERE id = $${params.length}
    `, params);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// DELETE /users/:userId
// Deletes a user.
router.delete('/:userId', userExistsChecker, userAuthChecker, async (req, res) => {
  try {
    await query('DELETE FROM user WHERE id = $1', [req.params.userId]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /users/:userId/participating-meets
// Returns all meets of a user.
// Response body: { items: [{ meetId: number, meetName: string}] }
router.get('/:userId/participating-meets', userExistsChecker, userAuthChecker, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
          meet.id AS meetId,
          meet.name AS meetName
      FROM meet
        JOIN participation ON meet.id = participation.meet_id
      WHERE participation.user_id = $1
    `, [req.params.userId]);

    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET /users/:userId/holding-meets
// Returns all meets held by a user.
// Response body: { items: [{ meetId: number, meetName: string}] }
router.get('/:userId/holding-meets', userExistsChecker, userAuthChecker, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
          id AS meetId,
          name AS meetName
      FROM meet
      WHERE holder_id = $1
    `, [req.params.userId]);

    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;
