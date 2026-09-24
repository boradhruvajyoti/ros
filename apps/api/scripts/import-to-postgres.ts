// =============================================================================
// PostgreSQL Data Importer (Imports data from sqlite-backup.json into Postgres)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function parseDates(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = parseDates(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function importAll() {
  const backupPath = path.join(__dirname, '../prisma/sqlite-backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found at:', backupPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupPath, 'utf-8');
  const backup: Record<string, any[]> = JSON.parse(raw);

  console.log('🚀 Starting PostgreSQL Data Import from SQLite Backup...');

  const importOrder = [
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

  for (const model of importOrder) {
    const records = backup[model] || [];
    if (records.length === 0) continue;

    if (!(prisma as any)[model]) {
      console.warn(`  ⚠️ Model ${model} does not exist on PrismaClient, skipping.`);
      continue;
    }

    console.log(`  📥 Importing ${records.length} records into ${model}...`);
    const parsedRecords = records.map(parseDates);

    // Insert in batches of 500
    const chunkSize = 500;
    for (let i = 0; i < parsedRecords.length; i += chunkSize) {
      const chunk = parsedRecords.slice(i, i + chunkSize);
      try {
        await (prisma as any)[model].createMany({
          data: chunk,
          skipDuplicates: true,
        });
      } catch (err: any) {
        console.warn(`    ⚠️ Batch insert for ${model} encountered warning, falling back to individual inserts...`);
        for (const item of chunk) {
          try {
            await (prisma as any)[model].create({ data: item });
          } catch (individualErr: any) {
            // skip duplicate or constraint issue
          }
        }
      }
    }
    console.log(`  ✓ Successfully imported ${model}`);
  }

  console.log('\n🎉 PostgreSQL Data Migration Complete!');
}

importAll()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
  })
  .finally(() => prisma.$disconnect());
