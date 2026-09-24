"use strict";
// =============================================================================
// Date utilities
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowInTimezone = nowInTimezone;
exports.startOfDayInTz = startOfDayInTz;
exports.endOfDayInTz = endOfDayInTz;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.getDateRangeForPeriod = getDateRangeForPeriod;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
function nowInTimezone(timezone) {
    return (0, date_fns_tz_1.toZonedTime)(new Date(), timezone);
}
function startOfDayInTz(date, timezone) {
    const zoned = (0, date_fns_tz_1.toZonedTime)(date, timezone);
    return (0, date_fns_tz_1.fromZonedTime)((0, date_fns_1.startOfDay)(zoned), timezone);
}
function endOfDayInTz(date, timezone) {
    const zoned = (0, date_fns_tz_1.toZonedTime)(date, timezone);
    return (0, date_fns_tz_1.fromZonedTime)((0, date_fns_1.endOfDay)(zoned), timezone);
}
function formatDate(date, fmt = 'dd MMM yyyy') {
    return (0, date_fns_1.format)(date, fmt);
}
function formatDateTime(date) {
    return (0, date_fns_1.format)(date, 'dd MMM yyyy, hh:mm a');
}
function getDateRangeForPeriod(period, timezone = 'Asia/Kolkata') {
    const now = (0, date_fns_tz_1.toZonedTime)(new Date(), timezone);
    switch (period) {
        case 'today':
            return { from: (0, date_fns_1.startOfDay)(now), to: (0, date_fns_1.endOfDay)(now) };
        case 'yesterday': {
            const y = (0, date_fns_1.subDays)(now, 1);
            return { from: (0, date_fns_1.startOfDay)(y), to: (0, date_fns_1.endOfDay)(y) };
        }
        case 'last_7_days':
            return { from: (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 6)), to: (0, date_fns_1.endOfDay)(now) };
        case 'last_30_days':
            return { from: (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 29)), to: (0, date_fns_1.endOfDay)(now) };
        case 'this_month':
            return { from: (0, date_fns_1.startOfMonth)(now), to: (0, date_fns_1.endOfMonth)(now) };
        default:
            return { from: (0, date_fns_1.startOfDay)(now), to: (0, date_fns_1.endOfDay)(now) };
    }
}
//# sourceMappingURL=date.js.map