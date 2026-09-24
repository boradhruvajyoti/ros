import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { CustomerController } from '../../controllers/customer.controller';

const router = Router();
router.use(auth());

router.get('/', asyncHandler(CustomerController.listCustomers));
router.post('/', asyncHandler(CustomerController.createCustomer));

export default router;
