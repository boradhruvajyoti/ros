"use strict";
// =============================================================================
// ROS Shared Types — Real-time Events
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKitchenRoomKey = exports.getRoomKey = void 0;
// Socket.IO room naming convention
const getRoomKey = (tenantId, branchId) => `tenant:${tenantId}:branch:${branchId}`;
exports.getRoomKey = getRoomKey;
const getKitchenRoomKey = (tenantId, branchId, stationId) => `tenant:${tenantId}:branch:${branchId}:station:${stationId}`;
exports.getKitchenRoomKey = getKitchenRoomKey;
//# sourceMappingURL=events.types.js.map