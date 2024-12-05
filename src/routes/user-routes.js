import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.post('/', async (req, res) => {
  try {
    await query('INSERT INTO user(name, email) VALUES($1, $2)', [req.body.name, req.body.email]);
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;
