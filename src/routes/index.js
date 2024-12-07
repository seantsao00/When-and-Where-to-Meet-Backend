import { Router } from 'express';
import meetRouter from './meet-routes';
import userRouter from './user-routes';

const router = Router();

router.use(async (res, req, next) => {
  const token = res.headers.authorization;
  if (token?.startsWith('Bearer ')) req.userId = token.slice(7);

  next();
});

router.use('/meets', meetRouter);
router.use('/users', userRouter);

export default router;
