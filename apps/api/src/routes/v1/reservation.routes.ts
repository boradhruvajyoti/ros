import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { ReservationController } from '../../controllers/reservation.controller';

const router = Router();
router.use(auth());

router.get('/', asyncHandler(ReservationController.listReservations));
router.post('/', asyncHandler(ReservationController.createReservation));
router.patch('/:id/status', asyncHandler(ReservationController.updateStatus));

export default router;
