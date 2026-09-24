export type KotStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED';
export type KotItemStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED';
export interface KotSummary {
    id: string;
    kotNumber: string;
    orderId: string;
    orderNumber: string;
    tableId?: string;
    tableName?: string;
    orderType: string;
    stationId: string;
    stationName: string;
    status: KotStatus;
    priority: number;
    itemCount: number;
    createdAt: string;
    ageMinutes: number;
}
export interface KotItem {
    id: string;
    orderItemId: string;
    menuItemName: string;
    variantName?: string;
    quantity: number;
    modifiers: string[];
    notes?: string;
    status: KotItemStatus;
}
//# sourceMappingURL=kitchen.types.d.ts.map