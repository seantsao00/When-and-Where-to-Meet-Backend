import { Router } from 'express';
import meetRouter from './meet-routes.js';
import userRouter from './usr-routes.js';

const router = Router();

router.use(async (req, res, next) => {
  const token = req.headers.authorization;
  if (token?.startsWith('Bearer ')) req.usrId = token.slice(7);

  // The hardcoded value of '54088' is the admin usrId.
  req.admin = req.usrId === '54088';

  next();
});

router.use('/meets', meetRouter);
router.use('/usrs', userRouter);

export default router;
