// =============================================================================
// API v1 — Route aggregator
// =============================================================================

import { Router } from 'express';
import { apiRateLimit } from '../middlewares/rateLimit.middleware';
import authRoutes from './v1/auth.routes';
import tenantRoutes from './v1/tenant.routes';
import branchRoutes from './v1/branch.routes';
import userRoutes from './v1/user.routes';
import menuRoutes from './v1/menu.routes';
import tableRoutes from './v1/table.routes';
import orderRoutes from './v1/order.routes';
import kitchenRoutes from './v1/kitchen.routes';
import paymentRoutes from './v1/payment.routes';
import reservationRoutes from './v1/reservation.routes';
import customerRoutes from './v1/customer.routes';
import inventoryRoutes from './v1/inventory.routes';
import procurementRoutes from './v1/procurement.routes';
import staffRoutes from './v1/staff.routes';
import expenseRoutes from './v1/expense.routes';
import reportRoutes from './v1/report.routes';
import settingsRoutes from './v1/settings.routes';
import notificationRoutes from './v1/notification.routes';
import integrationsRoutes from './v1/integrations.routes';
import transferRoutes from './v1/transfer.routes';
import marketingRoutes from './v1/marketing.routes';
import aiRoutes from './v1/ai.routes';
import feedbackRoutes from './v1/feedback.routes';
import superadminRoutes from './v1/superadmin.routes';
import hardwareRoutes from './v1/hardware.routes';
import auditRoutes from './v1/audit.routes';
import productionRoutes from './v1/production.routes';
import giftcardRoutes from './v1/giftcard.routes';
import kioskRoutes from './v1/kiosk.routes';
import drivethruRoutes from './v1/drivethru.routes';
import iotRoutes from './v1/iot.routes';
import franchiseRoutes from './v1/franchise.routes';
import expediterRoutes from './v1/expediter.routes';

export const router = Router();

// Apply global API rate limit (auth has its own stricter limit)
router.use(apiRateLimit);

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/branches', branchRoutes);
router.use('/users', userRoutes);
router.use('/menu', menuRoutes);
router.use('/tables', tableRoutes);
router.use('/orders', orderRoutes);
router.use('/kitchen', kitchenRoutes);
router.use('/payments', paymentRoutes);
router.use('/reservations', reservationRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/procurement', procurementRoutes);
router.use('/staff', staffRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/transfers', transferRoutes);
router.use('/marketing', marketingRoutes);
router.use('/ai', aiRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/super-admin', superadminRoutes);
router.use('/hardware', hardwareRoutes);
router.use('/audit', auditRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/production', productionRoutes);
router.use('/giftcards', giftcardRoutes);
router.use('/gift-cards', giftcardRoutes);
router.use('/kiosk', kioskRoutes);
router.use('/drivethru', drivethruRoutes);
router.use('/drive-thru', drivethruRoutes);
router.use('/iot', iotRoutes);
router.use('/franchise', franchiseRoutes);
router.use('/expediter', expediterRoutes);

export default router;
