import { Router } from 'express';
import meetRouter from './meet-routes.js';
import userRouter from './usr-routes.js';

const router = Router();

router.use(async (res, req, next) => {
  const token = res.headers.authorization;
  if (token?.startsWith('Bearer ')) req.usrId = token.slice(7);

  next();
});

router.use('/meets', meetRouter);
router.use('/usrs', userRouter);

export default router;
