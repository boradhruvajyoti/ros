// =============================================================================
// SQLite Data Exporter (Exports all SQLite records to JSON for Postgres migration)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportAll() {
  console.log('🔄 Exporting all data from SQLite (dev.db)...');

  const data: Record<string, any[]> = {};

  const models = [
    'permission',
    'tenant',
    'branch',
    'user',
    'role',
    'rolePermission',
    'userBranchRole',
    'refreshToken',
    'floor',
    'restaurantTable',
    'kitchenStation',
    'taxConfiguration',
    'cashRegister',
    'menuCategory',
    'menuItem',
    'modifierGroup',
    'modifier',
    'menuItemModifierGroup',
    'order',
    'orderItem',
    'orderItemModifier',
    'kot',
    'kotItem',
    'payment',
    'reservation',
    'customer',
    'inventoryCategory',
    'inventoryItem',
    'supplier',
    'purchaseOrder',
    'purchaseOrderItem',
    'stockMovement',
    'recipe',
    'recipeIngredient',
    'stockTransfer',
    'stockTransferItem',
    'expenseCategory',
    'expense',
    'payrollRecord',
    'leaveRequest',
    'staffShift',
    'attendance',
    'feedback',
    'marketingCampaign',
    'giftCard',
    'integrationConfig',
    'notificationTemplate',
    'auditLog',
  ];

  for (const model of models) {
    if ((prisma as any)[model]) {
      try {
        const records = await (prisma as any)[model].findMany();
        data[model] = records;
        console.log(`  ✓ ${model}: ${records.length} records`);
      } catch (err: any) {
        console.warn(`  ⚠️ Could not export ${model}:`, err.message);
      }
    }
  }

  const outputPath = path.join(__dirname, '../prisma/sqlite-backup.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\n✅ Backup successfully saved to ${outputPath}`);
}

exportAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
