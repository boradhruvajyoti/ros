import test from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingService } from './onboarding.service';
import { prisma } from '../lib/prisma';

test('OnboardingService — Provisions a new restaurant atomically with all modules', async () => {
  const uniqueTag = `test-${Date.now()}`;
  const payload = {
    name: `Test Bistro ${uniqueTag}`,
    slug: `test-bistro-${uniqueTag}`,
    cuisineType: 'italian',
    plan: 'professional' as const,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    city: 'Bengaluru',
    address: '100 Feet Road, Indiranagar',
    phone: '+91 9123456789',
    operatingHours: '11:00 AM - 11:00 PM',
    taxRate: 5,
    serviceChargeRate: 5,
    diningModes: ['DINE_IN', 'TAKEAWAY', 'QR_ORDER'],
    kitchenStations: ['Main Kitchen', 'Beverage Bar'],
    floorName: 'Ground Floor Dining',
    tableCount: 8,
    tableCapacity: 4,
    menuTemplate: 'italian',
    ownerName: 'Chef Giovanni',
    ownerEmail: `giovanni.${uniqueTag}@testbistro.com`,
    ownerPassword: 'Password@123',
    ownerPhone: '+91 9123456789',
  };

  const result = await OnboardingService.onboardRestaurant(payload);

  assert.ok(result.accessToken, 'Access token should be returned');
  assert.ok(result.refreshToken, 'Refresh token should be returned');
  assert.equal(result.tenant.name, payload.name);
  assert.equal(result.user.email, payload.ownerEmail.toLowerCase());
  assert.equal(result.summary.tablesCreated, 8);
  assert.ok(result.summary.categoriesCreated >= 2);

  // Verify records in DB
  const dbTenant = await prisma.tenant.findUnique({
    where: { id: result.tenant.id },
    include: {
      branches: true,
      users: true,
      restaurantTables: true,
      menuCategories: true,
      menuItems: true,
      taxConfigurations: true,
      kitchenStations: true,
    },
  });

  assert.ok(dbTenant, 'Tenant must exist in DB');
  assert.equal(dbTenant.branches.length, 1);
  assert.equal(dbTenant.users.length, 1);
  assert.equal(dbTenant.restaurantTables.length, 8);
  assert.ok(dbTenant.menuCategories.length >= 2);
  assert.ok(dbTenant.menuItems.length >= 5);
  assert.equal(dbTenant.kitchenStations.length, 2);
  assert.equal(dbTenant.taxConfigurations.length, 3); // CGST, SGST, Service Charge
});
