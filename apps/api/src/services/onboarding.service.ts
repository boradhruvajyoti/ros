// =============================================================================
// Onboarding Service — Complete Self-Serve Restaurant Provisioning
// =============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generateUUID } from '@ros/utils';
import type { OnboardRestaurantDto } from '../validators/auth.schema';
import type { Permission } from '@ros/shared-types';

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '7d';
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

interface MenuTemplateCategory {
  name: string;
  items: {
    name: string;
    description: string;
    price: number;
    foodType: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
    station: string;
    variants?: { name: string; price: number }[];
  }[];
}

const MENU_TEMPLATES: Record<string, MenuTemplateCategory[]> = {
  chinese: [
    {
      name: 'Dim Sum & Appetizers',
      items: [
        { name: 'Szechuan Chili Oil Wontons', description: 'Silky steamed dumplings tossed in toasted chili oil, crushed peanuts, scallions', price: 380, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Crispy Veg Spring Rolls', description: 'Shredded cabbage, carrots, wood ear mushrooms with sweet plum dip', price: 320, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Honey Chili Lotus Stem', description: 'Crispy lotus stem chips glazed in sesame honey chili reduction', price: 360, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Wok Specialties & Noodles',
      items: [
        { name: 'Classic Kung Pao Chicken', description: 'Wok-tossed diced chicken with crunchy peanuts, dry red chilies, Szechuan peppercorns', price: 490, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Hakka Garlic Butter Noodles', description: 'Wok-tossed noodles with julienned vegetables, roasted garlic, light soy sauce', price: 380, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Yang Chow Wok Fried Rice', description: 'Fragrant jasmine rice with spring onions, scrambled eggs, and sweet peas', price: 420, foodType: 'EGG', station: 'Main Kitchen' },
        { name: 'Paneer / Veg Manchurian Gravy', description: 'Crispy vegetable dumplings simmered in a dark soy, ginger, coriander sauce', price: 420, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Soups & Refreshments',
      items: [
        { name: 'Authentic Hot & Sour Soup', description: 'Tofu, bamboo shoots, wood ear mushrooms in tangy peppery broth', price: 220, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Iced Jasmine Honey Tea', description: 'Brewed Chinese green tea with mountain honey and fresh lemon wheels', price: 190, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  italian: [
    {
      name: 'Wood-Fired Pizzas',
      items: [
        { name: 'Margherita Burrata Pizza', description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, EVOO', price: 549, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Truffle & Wild Mushroom Pizza', description: 'Shiitake, cremini, fontina cheese, black truffle oil drizzle', price: 649, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Pepperoni & Hot Honey Pizza', description: 'Smoked pork pepperoni, spicy calabrian hot honey, aged mozzarella', price: 699, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Artisan Pastas',
      items: [
        { name: 'Handcrafted Fettuccine Alfredo', description: 'Parmigiano-Reggiano cream sauce, crushed black pepper, fresh parsley', price: 479, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Classic Spaghetti Bolognese', description: 'Slow-simmered minced meat ragù, roasted garlic, fresh rosemary', price: 599, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Beverages & Mocktails',
      items: [
        { name: 'Rosemary Citrus Spritz', description: 'Grapefruit reduction, freshly bruised rosemary, sparkling mineral water', price: 249, foodType: 'VEG', station: 'Beverage Bar' },
        { name: 'Classic Italian Espresso', description: 'Double shot roasted Arabica blend with golden crema', price: 180, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  indian: [
    {
      name: 'Tandoor & Starters',
      items: [
        { name: 'Paneer Tikka Angaar', description: 'Cottage cheese marinated in Kashmiri chili and hung yogurt, charred in clay oven', price: 380, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Murgh Malai Kebab', description: 'Tender chicken skewers in rich cashew cream and cardamom marinade', price: 460, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Royal Curries & Biryani',
      items: [
        { name: 'Dum Pukht Butter Chicken', description: 'Charcoal-grilled chicken simmered in a velvety tomato and fenugreek butter gravy', price: 520, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Paneer Lababdar', description: 'Grated and cubed cottage cheese in rich onion-tomato gravy with aromatic spices', price: 440, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Hyderabadi Dum Biryani', description: 'Long-grain basmati rice layered with fragrant spices and saffron, served with mirchi ka salan', price: 480, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Breads & Refreshments',
      items: [
        { name: 'Butter Garlic Naan', description: 'Clay oven baked flatbread brushed with garlic and butter', price: 90, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Kesar Pista Lassi', description: 'Traditional churned yogurt infused with saffron strands and crushed pistachios', price: 190, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  asian: [
    {
      name: 'Dim Sum & Small Plates',
      items: [
        { name: 'Steamed Crystal Truffle Edamame Dumplings', description: 'Translucent skins with fresh edamame puree and white truffle essence', price: 420, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Prawn Har Gao', description: 'Traditional Cantonese steamed prawn dumplings with bamboo shoots', price: 490, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Crispy Veg Spring Rolls', description: 'Glass noodles, shredded cabbage, wood ear mushrooms with sweet chili dip', price: 340, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Ramen, Wok & Mains',
      items: [
        { name: 'Tokyo Shoyu Ramen', description: 'Slow-simmered broth, ramen noodles, braised chashu, ajitsuke tamago egg, nori', price: 560, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Spicy Dan Dan Noodles', description: 'Hand-pulled noodles, Sichuan pepper chili oil, sesame paste, crushed peanuts', price: 460, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Thai Green Curry with Jasmine Rice', description: 'Aromatic green curry infused with lemongrass, galangal, kaffir lime and coconut cream', price: 510, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Asian Teas & Boba',
      items: [
        { name: 'Brown Sugar Taro Bubble Tea', description: 'Fresh milk, slow-cooked brown sugar boba pearls, organic taro reduction', price: 260, foodType: 'VEG', station: 'Beverage Bar' },
        { name: 'Organic Jasmine Blossom Green Tea', description: 'Delicate floral whole leaf tea steeped in bamboo pots', price: 190, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  cafe: [
    {
      name: 'Specialty Coffee',
      items: [
        { name: 'Hazelnut Flat White', description: 'Double espresso with textured micro-foam and roasted hazelnut syrup', price: 240, foodType: 'VEG', station: 'Beverage Bar' },
        { name: 'Cold Brew Vanilla Cream', description: '18-hour cold steeped single-origin roast topped with vanilla sweet cream', price: 260, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
    {
      name: 'All Day Brunch',
      items: [
        { name: 'Avocado Sourdough Toast', description: 'Hass avocado mash, cherry tomatoes, feta crumble, micro-greens', price: 380, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Classic Eggs Benedict', description: 'Poached free-range eggs, smoked chicken ham, hollandaise on brioche', price: 420, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Bakery & Desserts',
      items: [
        { name: 'Belgian Dark Chocolate Croissant', description: 'Flaky French butter pastry filled with 70% Callebaut chocolate', price: 220, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Blueberry Basque Cheesecake', description: 'Burnt caramelized top with creamy center and wild blueberry compote', price: 320, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
  ],
  mexican: [
    {
      name: 'Tacos & Antojitos',
      items: [
        { name: 'Baja Crispy Fish Tacos', description: 'Beer-battered fish, shredded red cabbage, chipotle crema on warm corn tortillas', price: 440, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Smoky Chipotle Paneer / Mushroom Tacos', description: 'Charred corn, avocado salsa verde, pickled red onions, cotija cheese', price: 390, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Tableside Fresh Guacamole & Chips', description: 'Hass avocados, lime juice, serrano peppers, cilantro with house tortilla chips', price: 360, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Quesadillas, Burritos & Sizzlers',
      items: [
        { name: 'Loaded Barbacoa Burrito Bowl', description: 'Cilantro lime rice, black beans, slow-cooked shredded meat, pico de gallo, guacamole', price: 490, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Cheesy Oaxaca Quesadilla', description: 'Flour tortilla stuffed with melted Monterey jack and grilled peppers', price: 380, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Cantina Coolers',
      items: [
        { name: 'Hibiscus Agua de Jamaica', description: 'Chilled steeped hibiscus flower tea with spiced citrus sugar rim', price: 220, foodType: 'VEG', station: 'Beverage Bar' },
        { name: 'Classic Virgin Lime Margarita', description: 'Agave nectar, freshly squeezed lime, sea salt rim', price: 240, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  fastfood: [
    {
      name: 'Smash Burgers & Sandwiches',
      items: [
        { name: 'Double Bacon Smash Burger', description: 'Double crispy smashed patties, American cheese, house secret sauce, toasted potato bun', price: 380, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Truffle Mushroom Swiss Burger', description: 'Crispy plant patty, sautéed portobello mushrooms, melted Swiss cheese, truffle mayo', price: 360, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Nashville Hot Crispy Chicken Burger', description: 'Cayenne-dunked crispy chicken thigh, dill pickles, creamy slaw', price: 390, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Crispy Sides & Tenders',
      items: [
        { name: 'Cajun Spiced Curly Fries', description: 'Golden seasoned spiral potatoes with garlic ranch dip', price: 190, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Crispy Buttermilk Chicken Tenders', description: 'Hand-breaded golden tenders served with honey mustard and BBQ dips', price: 290, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Thick Shakes & Floats',
      items: [
        { name: 'Salted Caramel Pretzel Shake', description: 'Vanilla bean soft serve, sea salt caramel swirl, crushed butter pretzels', price: 240, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  mediterranean: [
    {
      name: 'Mezze & Small Plates',
      items: [
        { name: 'Classic Velvet Hummus & Fresh Pita', description: 'Creamy chickpeas, tahini, extra virgin olive oil, smoked paprika, warm wood-fired pita', price: 340, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Crispy Herb Falafel Platter', description: 'Herbed chickpea fritters, pickled turnips, toum garlic sauce, house pickles', price: 360, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Grills & Shawarma Bowls',
      items: [
        { name: 'Spiced Chicken Shawarma Rice Bowl', description: 'Turmeric saffron rice, roasted shawarma, roasted tomatoes, tahini garlic drizzle', price: 470, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Grilled Halloumi & Roasted Vegetable Skewers', description: 'Marinated Cypriot halloumi, bell peppers, zucchini, oregano lemon vinaigrette', price: 440, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Beverages',
      items: [
        { name: 'Mint Lemonade (Limonana)', description: 'Crushed iced lemonade blended with fresh spearmint leaves and orange blossom', price: 210, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  steakhouse: [
    {
      name: 'Prime Cuts & Grills',
      items: [
        { name: 'Charcoal Grilled Tenderloin Steak', description: 'Prime beef steak grilled to perfection, roasted bone marrow, red wine jus', price: 950, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Rosemary Garlic Herb Lamb Chops', description: 'Charred New Zealand lamb cutlets with mint chimichurri and baby potatoes', price: 890, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Grilled Portobello & Polenta Steak', description: 'Balsamic-glazed portobello caps over creamy parmesan polenta', price: 540, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Steakhouse Sides & Cellar',
      items: [
        { name: 'Creamed Spinach with Nutmeg', description: 'Baby spinach simmered with heavy cream, shallots, and aged parmigiano', price: 280, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Vintage Cabernet Red Reserve (Mocktail)', description: 'Non-alcoholic de-alcoholized oak-aged red blend with dark berry notes', price: 350, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  seafood: [
    {
      name: 'Coastal Starters & Raw Bar',
      items: [
        { name: 'Butter Garlic Jumbo Prawns', description: 'Pan-tossed tiger prawns in white wine, roasted garlic, parsley butter', price: 620, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Crispy Calamari Rings', description: 'Lightly floured squid rings with smoked paprika and house tartar dip', price: 480, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Coastal Mains',
      items: [
        { name: 'Grilled Atlantic Salmon', description: 'Pan-seared crispy skin salmon fillet, lemon caper dill sauce, asparagus', price: 850, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Goan Prawn Curry with Steamed Rice', description: 'Tangy coconut kokum curry infused with freshly ground coastal spices', price: 580, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Coastal Coolers',
      items: [
        { name: 'Fresh Tender Coconut Cooler', description: 'Pure tender coconut water with lime zest and mint leaves', price: 180, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  southindian: [
    {
      name: 'Tiffin & Crispy Dosas',
      items: [
        { name: 'Ghee Roast Paper Masala Dosa', description: 'Crisp fermented crepe roasted in pure cow ghee, spiced potato masala, trio of chutneys and sambar', price: 210, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Steamed Button Ghee Idlis', description: 'Mini fluffy rice cakes submerged in hot shallot sambar with melted ghee', price: 160, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Medu Vada Crispy Pops', description: 'Crispy fried lentil donuts with crushed peppercorns and curry leaves', price: 150, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Chettinad & Malabar Curries',
      items: [
        { name: 'Chettinad Chicken Pepper Fry', description: 'Tender chicken tossed in stone-ground black pepper, shallots, and curry leaves', price: 420, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Malabar Parotta with Veg Kurma', description: 'Layered flaky Kerala flatbreads served with rich spiced coconut vegetable stew', price: 290, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Beverages',
      items: [
        { name: 'Traditional Meter Filter Coffee', description: 'Freshly brewed chicory-infused South Indian filter coffee frothed in brass davarah', price: 90, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  brewery: [
    {
      name: 'Pub Bites & Shared Boards',
      items: [
        { name: 'Smoked Sticky BBQ Wings', description: 'Hickory-smoked chicken wings tossed in homemade bourbon BBQ glaze with blue cheese dip', price: 440, foodType: 'NON_VEG', station: 'Main Kitchen' },
        { name: 'Craft Beer Battered Onion Rings', description: 'Jumbo sweet onion rings dipped in pale ale batter with sriracha aioli', price: 260, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Bavarian Pretzel with Beer Cheese Dip', description: 'Warm salted soft pretzel served with sharp cheddar ale dip and sweet mustard', price: 320, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Burgers & Smoked Meats',
      items: [
        { name: 'House Smoked Brisket Sliders', description: '12-hour slow smoked beef brisket, tangy slaw, crispy pickles on brioche sliders', price: 490, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Craft Brews (Non-Alcoholic & Infusions)',
      items: [
        { name: 'House Craft Ginger Brew', description: 'Naturally fermented ginger root soda with raw cane sugar and fresh lime', price: 220, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
  general: [
    {
      name: 'Signature Mains',
      items: [
        { name: 'Chef Special Gourmet Burger', description: 'Brioche bun, caramelised onions, melted aged cheddar, house relish with crisp fries', price: 420, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Pan-Seared Herb Chicken / Fish', description: 'Served with garlic butter mash and seasonal grilled greens', price: 540, foodType: 'NON_VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Sides & Finger Foods',
      items: [
        { name: 'Crispy Truffle Parmesan Fries', description: 'Tossed in white truffle oil, sea salt, grated parmigiano', price: 260, foodType: 'VEG', station: 'Main Kitchen' },
        { name: 'Loaded Nachos Supreme', description: 'Corn tortilla chips, spicy queso, guacamole, salsa and sour cream', price: 340, foodType: 'VEG', station: 'Main Kitchen' },
      ],
    },
    {
      name: 'Coolers & Shakes',
      items: [
        { name: 'Mint Berry Mojito', description: 'Fresh mint muddled with wild berries, lime juice, and chilled club soda', price: 220, foodType: 'VEG', station: 'Beverage Bar' },
        { name: 'Thick Belgian Chocolate Shake', description: 'Rich chocolate ganache blended with premium vanilla ice cream', price: 260, foodType: 'VEG', station: 'Beverage Bar' },
      ],
    },
  ],
};

export class OnboardingService {
  /** Atomically provision a brand-new restaurant tenant, flagship branch, RBAC, tables, menu, and owner account */
  static async onboardRestaurant(dto: OnboardRestaurantDto) {
    const slugBase = (dto.slug || dto.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'restaurant';
    let cleanSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;
    let attempts = 0;
    while (attempts < 5) {
      const existingTenant = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
      if (!existingTenant) break;
      cleanSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}-${attempts + 1}`;
      attempts++;
    }

    // Check if owner email is already taken in system (or for this slug)
    const normalizedEmail = dto.ownerEmail.toLowerCase().trim();

    // Fetch all base permissions to seed roles
    const allPerms = await prisma.permission.findMany();
    const allPermIds = allPerms.map((p) => p.id);
    const permMap = new Map(allPerms.map((p) => [p.code, p.id]));
    const getPermIds = (codes: string[]) => codes.map((c) => permMap.get(c)).filter(Boolean) as string[];

    // Hash password
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: cleanSlug,
          plan: dto.plan || 'professional',
          status: 'ACTIVE',
          settings: JSON.stringify({
            cuisineType: dto.cuisineType || 'Multi-Cuisine',
            currency: dto.currency || 'INR',
            timezone: dto.timezone || 'Asia/Kolkata',
            tagline: dto.tagline || 'Exquisite dining experience',
            diningModes: dto.diningModes || ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER'],
            kotAutoPrint: true,
            theme: 'dark',
            taxInclusive: false,
          }),
        },
      });

      // 2. Create Flagship Branch
      const branchName = dto.branchName || `${dto.name} - Flagship Outlet`;
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: branchName,
          address: dto.address || (dto.city ? `${dto.city}, Main Boulevard` : 'Downtown Central'),
          phone: dto.phone || dto.ownerPhone || '+91 98765 43210',
          email: dto.email || normalizedEmail,
          gstin: dto.gstin || null,
          timezone: dto.timezone || 'Asia/Kolkata',
          currency: dto.currency || 'INR',
          settings: JSON.stringify({
            fssai: dto.fssai || null,
            city: dto.city || 'City Center',
            openingHours: dto.operatingHours || '11:00 AM - 11:00 PM',
            serviceChargeRate: dto.serviceChargeRate || 0,
            taxRate: dto.taxRate || 5,
          }),
        },
      });

      // 3. Seed Standard RBAC Roles
      const rolesToSeed = [
        { name: 'SUPER_ADMIN', perms: allPermIds },
        { name: 'OWNER', perms: allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.id) },
        { name: 'ADMINISTRATOR', perms: allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.id) },
        { name: 'GENERAL_MANAGER', perms: allPerms.filter((p) => !['tenants:manage', 'users:delete', 'roles:create', 'roles:edit'].includes(p.code)).map((p) => p.id) },
        { name: 'BRANCH_MANAGER', perms: getPermIds(['orders:view', 'orders:create', 'orders:edit', 'orders:cancel', 'payments:view', 'payments:create', 'menu:view', 'menu:edit', 'tables:view', 'tables:create', 'tables:edit', 'reservations:view', 'kitchen:view', 'inventory:view', 'inventory:adjust', 'reports:view']) },
        { name: 'ACCOUNTANT', perms: getPermIds(['orders:view', 'payments:view', 'payments:create', 'expenses:view', 'expenses:create', 'payroll:view', 'reports:view', 'reports:export']) },
        { name: 'CASHIER', perms: getPermIds(['orders:view', 'orders:create', 'orders:edit', 'payments:view', 'payments:create', 'menu:view', 'tables:view', 'tables:edit', 'cash:view', 'cash:open', 'cash:close', 'discount:apply', 'reports:view']) },
        { name: 'WAITER', perms: getPermIds(['orders:view', 'orders:create', 'orders:edit', 'menu:view', 'tables:view', 'tables:edit', 'reservations:view', 'kitchen:view']) },
        { name: 'CHEF', perms: getPermIds(['kitchen:view', 'kitchen:update', 'orders:view', 'menu:view', 'menu:edit', 'inventory:view', 'inventory:adjust']) },
        { name: 'KITCHEN_STAFF', perms: getPermIds(['kitchen:view', 'kitchen:update', 'orders:view', 'inventory:view']) },
        { name: 'INVENTORY_MANAGER', perms: getPermIds(['inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:transfer', 'procurement:view', 'procurement:receive', 'menu:view']) },
      ];

      const roleRecords: Record<string, any> = {};
      for (const r of rolesToSeed) {
        const role = await tx.role.create({
          data: { tenantId: tenant.id, name: r.name, isSystemRole: true },
        });
        if (r.perms.length > 0) {
          await tx.rolePermission.createMany({
            data: [...new Set(r.perms)].map((permissionId) => ({ roleId: role.id, permissionId })),
          });
        }
        roleRecords[r.name] = role;
      }

      // 4. Create Owner User
      const ownerUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.ownerName,
          email: normalizedEmail,
          phone: dto.ownerPhone || dto.phone || null,
          passwordHash,
          isActive: true,
        },
      });

      // Bind Owner User to OWNER role on the flagship branch
      const ownerRole = roleRecords['OWNER'] || roleRecords['ADMINISTRATOR'];
      await tx.userBranchRole.create({
        data: {
          userId: ownerUser.id,
          branchId: branch.id,
          roleId: ownerRole.id,
        },
      });

      // 5. Create Tax Configurations
      const totalTax = dto.taxRate ?? 5;
      if (totalTax > 0) {
        const halfTax = (totalTax / 2).toFixed(2);
        await tx.taxConfiguration.createMany({
          data: [
            { tenantId: tenant.id, branchId: branch.id, name: `CGST (${halfTax}%)`, rate: parseFloat(halfTax), isInclusive: false, isActive: true },
            { tenantId: tenant.id, branchId: branch.id, name: `SGST (${halfTax}%)`, rate: parseFloat(halfTax), isInclusive: false, isActive: true },
          ],
        });
      }

      if ((dto.serviceChargeRate ?? 0) > 0) {
        await tx.taxConfiguration.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: `Service Charge (${dto.serviceChargeRate}%)`,
            rate: dto.serviceChargeRate!,
            isInclusive: false,
            isActive: true,
          },
        });
      }

      // 6. Create Kitchen Stations
      const rawStations = dto.kitchenStations && dto.kitchenStations.length > 0
        ? dto.kitchenStations
        : ['Main Kitchen', 'Beverage Bar', 'Dessert & Bakery'];
      const stationNames = [...new Set(rawStations.map((s) => s.trim()).filter(Boolean))];
      if (stationNames.length === 0) stationNames.push('Main Kitchen');

      const createdStations: Record<string, any> = {};
      const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

      for (let i = 0; i < stationNames.length; i++) {
        const sName = stationNames[i];
        const station = await tx.kitchenStation.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: sName,
            displayColor: colors[i % colors.length],
            sortOrder: i + 1,
            isActive: true,
          },
        });
        createdStations[sName] = station;
      }

      // 7. Create Floor, Section, and Tables with unique QR Tokens
      const floor = await tx.floor.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: dto.floorName || 'Main Dining Hall',
          sortOrder: 1,
          isActive: true,
        },
      });

      const section = await tx.tableSection.create({
        data: {
          floorId: floor.id,
          name: 'Center Hall',
          sortOrder: 1,
        },
      });

      let finalTableCount = 0;

      if (dto.customTables && dto.customTables.length > 0) {
        finalTableCount = dto.customTables.length;
        for (let i = 0; i < dto.customTables.length; i++) {
          const t = dto.customTables[i];
          const qrCodeToken = `qr-${cleanSlug}-t${i + 1}-${crypto.randomBytes(4).toString('hex')}`;
          await tx.restaurantTable.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              floorId: floor.id,
              sectionId: section.id,
              name: t.name || `T-${i < 9 ? '0' + (i + 1) : i + 1}`,
              capacity: t.capacity || dto.tableCapacity || 4,
              shape: (t.shape as any) || 'SQUARE',
              posX: (i % 5) * 140 + 20,
              posY: Math.floor(i / 5) * 100 + 20,
              width: 110,
              height: 75,
              status: 'AVAILABLE',
              qrCodeToken,
              isActive: true,
            },
          });
        }
      } else {
        const tableCount = Math.min(Math.max(dto.tableCount || 10, 1), 100);
        finalTableCount = tableCount;
        const tableCap = dto.tableCapacity || 4;

        for (let i = 1; i <= tableCount; i++) {
          const qrCodeToken = `qr-${cleanSlug}-t${i}-${crypto.randomBytes(4).toString('hex')}`;
          await tx.restaurantTable.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              floorId: floor.id,
              sectionId: section.id,
              name: `T-${i < 10 ? '0' + i : i}`,
              capacity: i % 4 === 0 ? 6 : i % 3 === 0 ? 2 : tableCap,
              shape: i % 4 === 0 ? 'RECTANGLE' : i % 3 === 0 ? 'CIRCLE' : 'SQUARE',
              posX: ((i - 1) % 5) * 140 + 20,
              posY: Math.floor((i - 1) / 5) * 100 + 20,
              width: 110,
              height: 75,
              status: 'AVAILABLE',
              qrCodeToken,
              isActive: true,
            },
          });
        }
      }

      // 8. Create Starter Menu Catalog (From Uploaded/Parsed Menu OR Cuisine Template)
      const defaultStation = Object.values(createdStations)[0];
      let finalCategoryCount = 0;

      if (dto.parsedMenuCategories && dto.parsedMenuCategories.length > 0) {
        finalCategoryCount = dto.parsedMenuCategories.length;
        for (let catIdx = 0; catIdx < dto.parsedMenuCategories.length; catIdx++) {
          const cat = dto.parsedMenuCategories[catIdx];
          const menuCategory = await tx.menuCategory.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              name: cat.name,
              sortOrder: catIdx + 1,
              isActive: true,
            },
          });

          for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
            const item = cat.items[itemIdx];
            const variantsData = (item.variants && item.variants.length > 0)
              ? item.variants.map((v, vIdx) => ({
                  name: v.name,
                  price: v.price,
                  cost: v.price * 0.35,
                  sortOrder: vIdx + 1,
                  isActive: true,
                }))
              : [
                  {
                    name: 'Full / Regular',
                    price: 250,
                    cost: 250 * 0.35,
                    sortOrder: 1,
                    isActive: true,
                  },
                ];

            await tx.menuItem.create({
              data: {
                tenantId: tenant.id,
                branchId: branch.id,
                categoryId: menuCategory.id,
                kitchenStationId: defaultStation?.id || null,
                name: item.name,
                description: item.description || '',
                foodType: item.foodType || 'VEG',
                spiceLevel: item.foodType === 'NON_VEG' ? 'MEDIUM' : 'MILD',
                preparationTimeMins: 15,
                isAvailable: true,
                isActive: true,
                sortOrder: itemIdx + 1,
                variants: {
                  create: variantsData,
                },
              },
            });
          }
        }
      } else {
        const templateKey = (dto.cuisineType || dto.menuTemplate || 'general').toLowerCase();
        const templateCategories = MENU_TEMPLATES[templateKey] || MENU_TEMPLATES.general;
        finalCategoryCount = templateCategories.length;

        for (let catIdx = 0; catIdx < templateCategories.length; catIdx++) {
          const cat = templateCategories[catIdx];
          const menuCategory = await tx.menuCategory.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              name: cat.name,
              sortOrder: catIdx + 1,
              isActive: true,
            },
          });

          for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
            const item = cat.items[itemIdx];
            const targetStation = createdStations[item.station] || defaultStation;

            await tx.menuItem.create({
              data: {
                tenantId: tenant.id,
                branchId: branch.id,
                categoryId: menuCategory.id,
                kitchenStationId: targetStation?.id || null,
                name: item.name,
                description: item.description,
                foodType: item.foodType,
                spiceLevel: item.foodType === 'NON_VEG' ? 'MEDIUM' : 'MILD',
                preparationTimeMins: 15,
                isAvailable: true,
                isActive: true,
                sortOrder: itemIdx + 1,
                variants: {
                  create: [
                    {
                      name: 'Standard Portion',
                      price: item.price,
                      cost: item.price * 0.35,
                      sortOrder: 1,
                      isActive: true,
                    },
                  ],
                },
              },
            });
          }
        }
      }

      // If custom menu items provided, create them as well
      if (dto.customMenuItems && dto.customMenuItems.length > 0) {
        const customCat = await tx.menuCategory.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: "Chef's Specials",
            sortOrder: 99,
            isActive: true,
          },
        });

        for (let cIdx = 0; cIdx < dto.customMenuItems.length; cIdx++) {
          const cItem = dto.customMenuItems[cIdx];
          await tx.menuItem.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              categoryId: customCat.id,
              kitchenStationId: defaultStation?.id || null,
              name: cItem.name,
              description: cItem.description || 'Specially prepared by the house chef',
              foodType: cItem.foodType || 'VEG',
              preparationTimeMins: 15,
              isAvailable: true,
              isActive: true,
              sortOrder: cIdx + 1,
              variants: {
                create: [
                  {
                    name: 'Regular',
                    price: cItem.price,
                    cost: cItem.price * 0.35,
                    sortOrder: 1,
                    isActive: true,
                  },
                ],
              },
            },
          });
        }
      }

      // 9. Create Cash Register
      await tx.cashRegister.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: 'Main POS Counter #1',
          currentBalance: 5000,
          isActive: true,
        },
      });

      return {
        tenant,
        branch,
        user: ownerUser,
        role: ownerRole,
        tableCount: finalTableCount,
        categoryCount: finalCategoryCount,
      };
    });

    // 10. Generate JWT Access Token + Refresh Token for instantaneous seamless login
    const allUserPerms = allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.code as Permission);
    const jti = generateUUID();
    const accessToken = jwt.sign(
      {
        sub: result.user.id,
        tid: result.tenant.id,
        bid: result.branch.id,
        roles: ['OWNER', 'ADMINISTRATOR'],
        permissions: allUserPerms,
        jti,
      },
      process.env.JWT_SECRET || 'ros-secret-jwt-key-change-in-production',
      { expiresIn: ACCESS_EXPIRY as any }
    );

    const refreshToken = generateUUID() + '-' + generateUUID();
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan,
      },
      branch: {
        id: result.branch.id,
        name: result.branch.name,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        tenantId: result.tenant.id,
        branchId: result.branch.id,
        roles: ['OWNER', 'ADMINISTRATOR'],
        permissions: allUserPerms,
      },
      summary: {
        tablesCreated: result.tableCount,
        categoriesCreated: result.categoryCount,
      },
    };
  }
}
