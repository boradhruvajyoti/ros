"use strict";
// =============================================================================
// ROS Shared Types — Orders
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDER_STATE_TRANSITIONS = void 0;
// Valid state transitions (enforced server-side)
exports.ORDER_STATE_TRANSITIONS = {
    DRAFT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SENT_TO_KITCHEN', 'BILLED', 'CANCELLED'],
    SENT_TO_KITCHEN: ['PREPARING', 'READY', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['SERVED', 'BILLED'],
    SERVED: ['BILLED'],
    BILLED: ['PARTIALLY_PAID', 'PAID', 'VOIDED', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'VOIDED'],
    PAID: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    COMPLETED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
    CANCELLED: [],
    VOIDED: [],
    REFUNDED: [],
    PARTIALLY_REFUNDED: ['REFUNDED'],
};
//# sourceMappingURL=order.types.js.map