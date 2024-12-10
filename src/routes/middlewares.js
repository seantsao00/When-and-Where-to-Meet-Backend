import { query } from '../db/index.js';

// Middleware that checks if a usr exists.
// If the usr does not exist, sends a 404 response.
// Usrs are considered to exist if they are not deleted.
const usrExistsChecker = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM usr WHERE id = $1 AND status != $2', [req.params.usrId, 'deleted']);
    if (result.rows.length === 0) {
      return res.sendStatus(404);
    }
    next();
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

const usrAuthChecker = async (req, res, next) => {
  try {
    if (req.admin) return next();

    const usrId = req.usrId;
    const { usrId: targetUsrId } = req.params;
    if (usrId !== targetUsrId) {
      return res.sendStatus(403);
    }
    next();
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

const adminChecker = async (req, res, next) => {
  try {
    if (!req.admin) return res.sendStatus(403);
    next();
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

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
  if (req.admin) return next();

  const usrId = req.usrId;
  const { meetId } = req.params;
  const { holderId } = (await query(`
    SELECT holder_id AS "holderId" FROM meet WHERE id = $1
  `, [meetId])).rows[0];
  if (usrId !== holderId) return res.sendStatus(403);
  next();
};

const meetParticipantChecker = async (req, res, next) => {
  if (req.admin) return next();

  const usrId = req.usrId;
  const { meetId } = req.params;
  const { rows } = await query(`
    SELECT * FROM participation WHERE meet_id = $1 AND usr_id = $2 AND is_pending = false
  `, [meetId, usrId]);
  if (rows.length === 0) return res.sendStatus(403);
  next();
};

const locationExistsChecker = async (req, res, next) => {
  const { locationId } = req.params;
  const { rows } = await query(`
    SELECT * FROM location WHERE id = $1
  `, [locationId]);

  if (rows.length === 0) return res.sendStatus(404);
  next();
};

export { adminChecker, locationExistsChecker, meetExistsChecker, meetHolderChecker, meetParticipantChecker, usrAuthChecker, usrExistsChecker };
