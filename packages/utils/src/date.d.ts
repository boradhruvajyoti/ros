export declare function nowInTimezone(timezone: string): Date;
export declare function startOfDayInTz(date: Date, timezone: string): Date;
export declare function endOfDayInTz(date: Date, timezone: string): Date;
export declare function formatDate(date: Date, fmt?: string): string;
export declare function formatDateTime(date: Date): string;
export declare function getDateRangeForPeriod(period: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days', timezone?: string): {
    from: Date;
    to: Date;
};
//# sourceMappingURL=date.d.ts.map