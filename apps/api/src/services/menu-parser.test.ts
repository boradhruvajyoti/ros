import test from 'node:test';
import assert from 'node:assert';
import { MenuParserService } from './menu-parser.service';
import os from 'os';
import fs from 'fs';

test('MenuParserService — Parses menu text with Full/Half variant prices and cleans temp files', async () => {
  const sampleMenu = `
STARTERS & SOUPS
1. Veg Manchow Soup - 180 (Crispy noodles, spicy ginger broth) [VEG]
2. Kung Pao Chicken Dumplings - Half: 220, Full: 380 (Tossed in toasted Szechuan chili oil) [NON_VEG]
3. Crispy Honey Chili Lotus Stem - 320 (Glazed in sesame honey reduction) [VEG]

MAIN COURSE & NOODLES
4. Classic Butter Chicken - Half: 260, Full: 480 (Rich cashew tomato butter sauce) [NON_VEG]
5. Hakka Garlic Noodles - Half: 190, Full: 340 (Julienned greens, roasted garlic) [VEG]
  `;

  const result = await MenuParserService.parseMenuUpload({
    sampleText: sampleMenu,
    fileName: 'test-menu.txt',
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.serverFileCleanedUp, true);
  assert.strictEqual(result.categories.length, 2);

  // Verify Starters & Soups
  const starters = result.categories.find((c) => c.name.includes('STARTERS'));
  assert.ok(starters, 'Starters category should exist');
  assert.strictEqual(starters.items.length, 3);

  // Verify Dumplings with Half and Full pricing
  const dumplings = starters.items.find((i) => i.name.includes('Dumplings'));
  assert.ok(dumplings, 'Dumplings item should exist');
  assert.strictEqual(dumplings.foodType, 'NON_VEG');
  assert.ok(dumplings.variants && dumplings.variants.length === 2, 'Dumplings should have Half and Full variants');
  assert.strictEqual(dumplings.variants[0].name, 'Half');
  assert.strictEqual(dumplings.variants[0].price, 220);
  assert.strictEqual(dumplings.variants[1].name, 'Full');
  assert.strictEqual(dumplings.variants[1].price, 380);

  // Verify Butter Chicken in Main Course
  const mains = result.categories.find((c) => c.name.includes('MAIN'));
  assert.ok(mains, 'Main course category should exist');
  const butterChicken = mains.items.find((i) => i.name.includes('Butter Chicken'));
  assert.ok(butterChicken, 'Butter Chicken should exist');
  assert.strictEqual(butterChicken.foodType, 'NON_VEG');
  assert.strictEqual(butterChicken.variants?.[0].price, 260);
  assert.strictEqual(butterChicken.variants?.[1].price, 480);
});

test('MenuParserService — Base64 image creates and purges temporary disk file', async () => {
  // 1x1 transparent PNG base64
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const result = await MenuParserService.parseMenuUpload({
    imageBase64: dummyBase64,
    fileName: 'menu-card-scan.png',
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.serverFileCleanedUp, true);
  assert.ok(result.categories.length > 0);
});
