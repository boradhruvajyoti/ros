import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getRoboticsFleet, dispatchRobot, recallRobotToDock } from '../../controllers/robotics.controller';

const router = Router();

router.use(auth());
router.get('/fleet', getRoboticsFleet);
router.post('/dispatch/:robotId', dispatchRobot);
router.post('/recall/:robotId', recallRobotToDock);

export default router;
