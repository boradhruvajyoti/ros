// =============================================================================
// Help & User Guide Screen — Complete Tenant Admin Reference
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ─── Data Models ──────────────────────────────────────────────────────────────

class HelpStep {
  final String text;
  const HelpStep(this.text);
}

class HelpTip {
  final String text;
  const HelpTip(this.text);
}

class HelpSubmodule {
  final String id;
  final String title;
  final String description;
  final List<String> steps;
  final List<String> tips;
  const HelpSubmodule({
    required this.id,
    required this.title,
    required this.description,
    required this.steps,
    this.tips = const [],
  });
}

class HelpFAQ {
  final String question;
  final String answer;
  const HelpFAQ({required this.question, required this.answer});
}

class TroubleshootItem {
  final String problem;
  final String solution;
  const TroubleshootItem({required this.problem, required this.solution});
}

class WorkflowExample {
  final String title;
  final List<String> steps;
  const WorkflowExample({required this.title, required this.steps});
}

class HelpSection {
  final String id;
  final IconData icon;
  final Color iconColor;
  final String title;
  final String description;
  final String category;
  final List<HelpSubmodule> submodules;
  final List<HelpFAQ> faqs;
  final List<TroubleshootItem> troubleshooting;
  final List<WorkflowExample> workflows;

  const HelpSection({
    required this.id,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.description,
    required this.category,
    required this.submodules,
    this.faqs = const [],
    this.troubleshooting = const [],
    this.workflows = const [],
  });
}

// ─── Guide Data ───────────────────────────────────────────────────────────────

final List<HelpSection> kHelpSections = [
  HelpSection(
    id: 'dashboard',
    icon: Icons.dashboard_rounded,
    iconColor: const Color(0xFF10B981),
    title: 'Dashboard',
    description: 'Real-time command center showing live revenue, orders, and today\'s key metrics.',
    category: 'OPERATIONS',
    submodules: [
      HelpSubmodule(
        id: 'dashboard_metrics',
        title: 'Key Metric Cards',
        description: 'Four live KPI cards auto-refreshing every 15 seconds.',
        steps: [
          'Navigate to Dashboard from the bottom navigation or side menu',
          'Today\'s Revenue — all PAID and COMPLETED orders since midnight',
          'Total Orders — counts all types (Dine-In, Takeaway, Delivery)',
          'Active Dining Tables — tables currently occupied',
          'Average Order Value — Revenue ÷ Orders',
          'Tap the ↺ Refresh button to force a manual refresh',
        ],
        tips: [
          'Dashboard auto-refreshes every 15s — manual refresh is rarely needed',
          'Revenue only shows PAID orders; BILLED orders don\'t count until payment',
        ],
      ),
      HelpSubmodule(
        id: 'dashboard_activity',
        title: 'Recent Activity Feed',
        description: 'Live list of the 7 most recent orders with status and amount.',
        steps: [
          'Scroll down on the Dashboard to see the activity feed',
          'Each row shows: Order #, Table/Type, Customer, Time, Status, Amount',
          'Color-coded badges: Blue=Confirmed, Amber=Kitchen, Green=Ready, Purple=Billed',
          'Tap "View All" to go to Active Orders module',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Revenue shows ₹0 — why?', answer: 'Revenue only appears after orders are marked PAID or COMPLETED. Billed orders don\'t count until payment is collected.'),
      HelpFAQ(question: 'Dashboard data seems stale?', answer: 'Pull-to-refresh on mobile or tap the Refresh button. If still stale, check your internet connection.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Revenue shows ₹0', solution: 'Mark orders as PAID, not just BILLED'),
      TroubleshootItem(problem: 'Dashboard not loading', solution: 'Check internet connection; try pull-to-refresh'),
    ],
  ),

  HelpSection(
    id: 'tables',
    icon: Icons.table_restaurant_rounded,
    iconColor: const Color(0xFFF97316),
    title: 'Tables & Floor Plan',
    description: 'Interactive floor map, live occupancy, order management, and table transfers.',
    category: 'OPERATIONS',
    submodules: [
      HelpSubmodule(
        id: 'tables_floormap',
        title: 'Interactive Floor Map',
        description: 'Visual layout of all dining tables with live status colors.',
        steps: [
          'Navigate to Tables module',
          'Green = Available (ready to seat)',
          'Red/Orange = Occupied (guests dining)',
          'Yellow = Reserved (pre-booked)',
          'Purple = Billed (awaiting payment)',
          'Grey = Cleaning (between covers)',
          'Use zone filter tabs: Main Hall, AC Room, Outdoor, Rooftop, Bar',
          'Tap any table to see its status and order details',
        ],
      ),
      HelpSubmodule(
        id: 'tables_seat',
        title: 'Seating Guests & Creating Orders',
        description: 'Start a table order by seating guests.',
        steps: [
          'Tap a Green (Available) table on the floor map',
          'Select "New Order" or "Seat Guests"',
          'Enter number of guests (pax count)',
          'Redirected to POS or order entry for that table',
          'Add items and send to kitchen',
        ],
      ),
      HelpSubmodule(
        id: 'tables_transfer',
        title: 'Table Transfer',
        description: 'Move guests and their order to a different table.',
        steps: [
          'Tap the occupied source table',
          'Select "Transfer Table" from the options',
          'Choose the destination table (must be Available)',
          'Confirm — entire order moves to the new table',
          'Source table becomes Available',
        ],
        tips: ['Destination table must have zero active orders before you can transfer to it'],
      ),
      HelpSubmodule(
        id: 'tables_bill',
        title: 'Generate Bill at Table',
        description: 'Create and settle a bill from the table view.',
        steps: [
          'Tap the occupied table',
          'Review the running bill in the panel',
          'Tap "Generate Bill" or "Bill Out"',
          'Review itemized bill with taxes and service charge',
          'Select payment: Cash, Card, UPI, or Split',
          'Confirm — table resets to Available',
        ],
      ),
    ],
    workflows: [
      WorkflowExample(
        title: 'Complete Dine-In Workflow',
        steps: [
          '1. Guest arrives → Host taps Available table → Select "Seat Guests"',
          '2. Waiter opens POS → Selects table → Adds items → Sends to Kitchen',
          '3. KDS shows ticket → Chef accepts → Cooks → Marks Ready',
          '4. Waiter delivers food → Marks Served on KDS',
          '5. Guest asks for bill → Tap "Generate Bill" → Print/show receipt',
          '6. Collect payment → Mark PAID → Table resets to Available',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Table still shows Occupied after guests left?', answer: 'If the order was COMPLETED, the table should auto-reset. If not, tap the table and select "Mark Available/Clean" to manually reset.'),
      HelpFAQ(question: 'Can I see what\'s ordered without opening POS?', answer: 'Yes! Tap any occupied table — the panel shows all ordered items, KOT status per dish, and the running bill estimate.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Table not resetting after payment', solution: 'Ensure order is COMPLETED, not just PAID. Check for pending draft items.'),
      TroubleshootItem(problem: 'Cannot transfer table', solution: 'Destination table must be fully Available with no draft orders'),
    ],
  ),

  HelpSection(
    id: 'orders',
    icon: Icons.shopping_bag_rounded,
    iconColor: const Color(0xFF3B82F6),
    title: 'Active Orders',
    description: 'Live queue of all open orders with KOT progress, status advancement, and quick billing.',
    category: 'OPERATIONS',
    submodules: [
      HelpSubmodule(
        id: 'orders_pipeline',
        title: 'Order Status Pipeline',
        description: 'Understanding how orders flow from creation to completion.',
        steps: [
          'DRAFT → Created but not confirmed',
          'CONFIRMED → Staff confirmed the order',
          'SENT_TO_KITCHEN → KOT fired to kitchen',
          'PREPARING → Chef accepted and cooking',
          'READY → Food cooked, waiting for service',
          'SERVED → Food delivered to customer',
          'BILLED → Invoice generated, awaiting payment',
          'PAID → Payment collected and confirmed',
          'COMPLETED → Order fully closed',
          'CANCELLED → Order voided',
        ],
      ),
      HelpSubmodule(
        id: 'orders_settle',
        title: 'Quick Bill Settlement',
        description: 'Fast checkout for any active order.',
        steps: [
          'Find the order in Active Orders list',
          'Tap the "₹ Settle" button on the order card',
          'Review the bill total (items + taxes + service charge)',
          'Select payment: Cash, UPI, Card, Gift Card, or Split',
          'For Cash: Enter received amount — change is auto-calculated',
          'Tap "Confirm Payment" — receipt prints if printer configured',
        ],
      ),
      HelpSubmodule(
        id: 'orders_cancel',
        title: 'Cancel an Item from Order',
        description: 'Remove a specific dish from an active order.',
        steps: [
          'Open the order in Active Orders',
          'Tap the item you want to cancel',
          'Select "Cancel Item"',
          'Choose reason: Wrong Item / Customer Changed / Out of Stock / Other',
          'Confirm — item removed, bill total updates',
          'Cancellation logged in Audit Vault',
        ],
        tips: ['Manager PIN may be required for cancellations if configured in Security Settings'],
      ),
    ],
    workflows: [
      WorkflowExample(
        title: 'Takeaway/Parcel Workflow',
        steps: [
          '1. Customer arrives or calls in',
          '2. Cashier opens POS → Select "Takeaway" → Add items',
          '3. Optionally link customer record for loyalty points',
          '4. Apply coupon if available → Confirm order',
          '5. KOT fires to kitchen → Kitchen prepares',
          '6. Pack food → Collect payment → Complete order',
        ],
      ),
      WorkflowExample(
        title: 'Delivery Workflow',
        steps: [
          '1. Order via POS, Zomato/Swiggy, or WhatsApp bot',
          '2. Confirm order → KOT fires to kitchen automatically',
          '3. Kitchen prepares and marks Ready',
          '4. Assign delivery rider (Integrations → Riders)',
          '5. Mark Dispatched → Rider delivers',
          '6. Mark Delivered → Record COD or confirm prepaid',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Can I add items after KOT is sent?', answer: 'Yes! Open the order, add items via POS — a new KOT fires for the added items only.'),
      HelpFAQ(question: 'Difference between BILLED and PAID?', answer: 'BILLED = invoice generated but payment not yet collected. PAID = money received and confirmed.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Orders not updating in real-time', solution: 'Check internet connection; try pulling down to refresh'),
      TroubleshootItem(problem: 'Cannot advance order status', solution: 'Verify you have orders:edit permission in RBAC Settings'),
    ],
  ),

  HelpSection(
    id: 'kitchen',
    icon: Icons.kitchen_rounded,
    iconColor: const Color(0xFFF59E0B),
    title: 'Kitchen Display (KDS)',
    description: 'Digital KOT queue for chefs and waiters with status bumping and timer alerts.',
    category: 'OPERATIONS',
    submodules: [
      HelpSubmodule(
        id: 'kds_chef',
        title: 'Chef / Cook Station',
        description: 'Incoming KOT tickets that need preparation.',
        steps: [
          'New KOT tickets appear with a sound alert',
          'Each ticket shows: Dishes, quantities, modifiers, notes, time elapsed',
          'Green (<5 min) → Amber (5-10 min) → Red (>10 min overdue)',
          'Tap "Accept" to acknowledge — status changes to PREPARING',
          'Tap "✓ Ready" per item when cooked and plated',
          'Tap "All Ready" when entire ticket is ready for service',
        ],
        tips: ['Always accept tickets promptly — the POS operator sees the status change in real-time'],
      ),
      HelpSubmodule(
        id: 'kds_waiter',
        title: 'Waiter / Runner Station',
        description: 'Ready dishes queue for delivery to tables.',
        steps: [
          'When kitchen marks all items Ready, ticket moves to Waiter Queue',
          'Sound alert fires to notify waiter',
          'Pick up food and deliver to the table',
          'After delivery, tap "✓ Served"',
          'Ticket archives — order status updates to SERVED',
        ],
      ),
    ],
    workflows: [
      WorkflowExample(
        title: 'QR Self-Order → Kitchen Workflow',
        steps: [
          '1. Guest scans table QR on their phone',
          '2. Browses digital menu → Places order',
          '3. KOT auto-fires to KDS without staff intervention',
          '4. Chef accepts → Cooks → Marks Ready',
          '5. Waiter delivers → Marks Served',
          '6. Cashier generates bill → Collects payment',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'No tickets showing on KDS?', answer: 'Check that orders have been "Sent to Kitchen" from POS or Tables. KDS only shows orders with SENT_TO_KITCHEN or later status.'),
      HelpFAQ(question: 'Can different chefs see only their station?', answer: 'Yes! Use Station Filtering to show only relevant items. Configure routing in Settings → Kitchen Stations.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Sound not playing on new orders', solution: 'Ensure phone is not on silent. Check app notification permissions.'),
      TroubleshootItem(problem: 'Tickets not updating', solution: 'Check WiFi/data connection; pull to refresh'),
    ],
  ),

  HelpSection(
    id: 'menu',
    icon: Icons.menu_book_rounded,
    iconColor: const Color(0xFFA855F7),
    title: 'Menu Catalog',
    description: 'Build and manage your food catalog with categories, dishes, variants, and availability.',
    category: 'INVENTORY & MENU',
    submodules: [
      HelpSubmodule(
        id: 'menu_categories',
        title: 'Categories & Sub-Categories',
        description: 'Organize your menu into a logical hierarchy.',
        steps: [
          'In Menu module, tap "Manage Categories"',
          'Tap "+ Add Category" → Enter name (e.g., "Starters")',
          'For sub-categories: Select a Parent Category',
          'Set Sort Order (lower number = appears first)',
          'Save — available instantly in POS and QR menu',
        ],
        tips: ['Plan your category hierarchy before adding dishes. Example: Starters → Veg/Non-Veg Starters'],
      ),
      HelpSubmodule(
        id: 'menu_dish',
        title: 'Add a New Dish',
        description: 'Create a dish with complete details, pricing, and variants.',
        steps: [
          'Tap "+ Add Dish" in Menu module',
          'Enter Dish Name (as it appears on menu and bills)',
          'Select the Category',
          'Add an appetizing Description',
          'Select Food Type: VEG 🟢 / NON-VEG 🔴 / EGG 🟡 / VEGAN 🟤',
          'Select Spice Level: None / Mild / Medium / Hot / Extra Hot',
          'Choose Pricing: Single / Half-Full / Small-Medium-Large / Custom',
          'Enter price(s) for each variant',
          'Toggle "Available" to ON',
          'Tap "Save Dish"',
        ],
      ),
      HelpSubmodule(
        id: 'menu_86',
        title: 'Real-Time 86 / Out of Stock Toggle',
        description: 'Instantly mark a dish unavailable across all ordering channels.',
        steps: [
          'Find the dish in the Menu list',
          'Tap the toggle switch next to the dish name',
          'Grey = Out of Stock (86\'d) — disappears from POS, QR, Kiosk',
          'Toggle back ON when available again',
        ],
        tips: ['The 86 toggle takes effect immediately — no reload needed on any device'],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Dish not showing in POS after saving?', answer: 'Check both toggles: "isAvailable" must be ON and "isActive" must be ON. Also verify the category is active.'),
      HelpFAQ(question: 'What\'s the difference between isAvailable and isActive?', answer: 'isActive = dish exists in system. isAvailable = dish shows for ordering. Use isAvailable for daily 86 (out of stock).'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Prices not updating in POS', solution: 'Refresh/restart the POS module after saving price changes in Menu'),
      TroubleshootItem(problem: 'Category not visible', solution: 'Ensure the category\'s isActive toggle is ON'),
    ],
  ),

  HelpSection(
    id: 'staff',
    icon: Icons.badge_rounded,
    iconColor: const Color(0xFF06B6D4),
    title: 'Staff & Team HR',
    description: 'Employee records, attendance, RBAC permissions, and Telegram notification setup.',
    category: 'FINANCE & TEAM',
    submodules: [
      HelpSubmodule(
        id: 'staff_add',
        title: 'Add & Manage Employees',
        description: 'Create employee records with full HR details.',
        steps: [
          'Navigate to Staff module',
          'Tap "+ Add Employee"',
          'Enter: Name, Department, Designation, Phone, Email',
          'Set Shift: Morning / Afternoon / Evening / Night',
          'Enter Salary (optional)',
          'Save employee record',
        ],
      ),
      HelpSubmodule(
        id: 'staff_login',
        title: 'Create Staff Login Account',
        description: 'Give an employee access to the admin panel.',
        steps: [
          'Open an employee record by tapping their card',
          'Tap "Create Login Account"',
          'Enter their login email and initial password',
          'Assign Roles: Waiter / Chef / Cashier / Manager / Admin',
          'Staff can now log in with their credentials',
        ],
        tips: ['Share the initial password securely. Ask staff to change it on first login.'],
      ),
      HelpSubmodule(
        id: 'staff_rbac',
        title: 'Role-Based Access Control (RBAC)',
        description: 'Control which modules each staff member can access.',
        steps: [
          'Open the employee record',
          'Scroll to Permissions section',
          'Option A — Apply Role Preset: Tap → Choose Waiter / Chef / Cashier / Manager / Admin',
          'Option B — Custom: Expand each module category → Toggle ON/OFF',
          'Tap "Save Permissions"',
          'Changes take effect on next login or app restart',
        ],
        tips: [
          'Role Presets are the fastest way to set permissions for common roles',
          'Staff can only access modules explicitly granted to them',
        ],
      ),
      HelpSubmodule(
        id: 'staff_attendance',
        title: 'Attendance & Shift Tracking',
        description: 'Record daily attendance and working hours.',
        steps: [
          'Go to Staff → select the employee',
          'Tap today\'s attendance row',
          'Mark status: Present / Absent / Half Day / Leave',
          'Enter check-in and check-out times',
          'Save — working hours calculated automatically',
          'View monthly attendance sheet for payroll',
        ],
      ),
      HelpSubmodule(
        id: 'staff_telegram',
        title: 'Telegram Notification Setup',
        description: 'Set up real-time alerts via Telegram.',
        steps: [
          'Staff opens Telegram and finds the restaurant\'s bot',
          'Starts the bot → receives a unique Chat ID',
          'In Staff module, open the employee record',
          'Enter the Telegram Chat ID or username',
          'Toggle ON desired notifications:',
          '  • New QR Menu Orders',
          '  • KOT Sent to Kitchen',
          '  • Payment Received',
          '  • Low Stock Alert',
          '  • Negative Guest Feedback (below 3 stars)',
          'Save — notifications start immediately',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Staff can\'t see a module they need?', answer: 'Check RBAC permissions for that employee in Staff → Permissions. Grant the required module access.'),
      HelpFAQ(question: 'Telegram notifications not arriving?', answer: 'Verify the Chat ID is correct. Ensure the employee has started the Telegram bot. Check if they\'ve blocked the bot.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Staff cannot log in', solution: 'Verify login account exists and is active. Reset password if needed.'),
      TroubleshootItem(problem: 'Module not visible to staff', solution: 'Grant module access in Staff → RBAC Permissions'),
    ],
  ),

  HelpSection(
    id: 'inventory',
    icon: Icons.inventory_2_rounded,
    iconColor: const Color(0xFF14B8A6),
    title: 'Stock & Inventory',
    description: 'Track ingredient levels, receive stock, manage wastage, and get low stock alerts.',
    category: 'INVENTORY & MENU',
    submodules: [
      HelpSubmodule(
        id: 'inv_add',
        title: 'Add an Ingredient',
        description: 'Create a new ingredient in your stock master.',
        steps: [
          'Navigate to Inventory module',
          'Tap "+ Add Ingredient"',
          'Enter: Name, Category, Unit (KG/Litre/Piece/Packet)',
          'Enter Opening Stock quantity',
          'Set Cost per Unit (purchase cost)',
          'Set Low Stock Threshold (alert fires when stock drops below this)',
          'Tap Save',
        ],
      ),
      HelpSubmodule(
        id: 'inv_adjust',
        title: 'Stock Adjustment',
        description: 'Adjust stock for receiving, wastage, or manual correction.',
        steps: [
          'Tap an ingredient in the inventory list',
          'Tap "Adjust Stock"',
          'Select type: Stock In / Wastage / Adjustment',
          'Enter quantity',
          'Add a note for the audit trail',
          'Tap Save — stock updates immediately',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Does system auto-deduct stock when orders are placed?', answer: 'Only if Recipe BOMs are configured in the Production module. Without BOMs, adjustments must be done manually.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Low stock alerts not appearing', solution: 'Check that Telegram notifications are configured for the relevant staff member'),
    ],
  ),

  HelpSection(
    id: 'reports',
    icon: Icons.bar_chart_rounded,
    iconColor: const Color(0xFF8B5CF6),
    title: 'Reports & P&L Analytics',
    description: 'Sales summaries, tax reports, item performance, and profit & loss statements.',
    category: 'FINANCE & TEAM',
    submodules: [
      HelpSubmodule(
        id: 'reports_sales',
        title: 'Sales & Revenue Summary',
        description: 'View gross revenue, order counts, and payment breakdown.',
        steps: [
          'Navigate to Reports module',
          'Default shows Today\'s data',
          'Use period selector: Today / Last 7 Days / This Month',
          'See: Total Revenue, Orders, Gross Profit, Net Profit',
          'View Dine-In vs Takeaway vs Delivery breakdown',
          'Tax section shows CGST, SGST, and taxable sales',
        ],
      ),
      HelpSubmodule(
        id: 'reports_export',
        title: 'Export Reports as CSV',
        description: 'Download financial data for accountants.',
        steps: [
          'In Reports, tap "📥 Export CSV" button',
          'CSV file downloads to your device',
          'Share via email for accountant/GST filing',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Reports don\'t match my bank deposits?', answer: 'Check for payment mode mismatches — some UPI payments may be recorded as cash. Use Audit Vault payment log as the authoritative source.'),
      HelpFAQ(question: 'How do I prepare GST filing reports?', answer: 'Use Reports → Tax Report for the filing period → Export CSV → Share with your accountant.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Revenue in Reports differs from POS', solution: 'Reports count only PAID orders. Check for BILLED orders still awaiting payment.'),
    ],
  ),

  HelpSection(
    id: 'settings',
    icon: Icons.settings_rounded,
    iconColor: const Color(0xFF94A3B8),
    title: 'Restaurant Settings',
    description: 'Configure restaurant profile, GST rates, logo, pre-order policies, and security.',
    category: 'SETTINGS & SYSTEM',
    submodules: [
      HelpSubmodule(
        id: 'settings_general',
        title: 'General Profile Settings',
        description: 'Set your restaurant\'s legal name, contact info, and registration numbers.',
        steps: [
          'Navigate to Settings',
          'Select "General" tab',
          'Enter: Restaurant Name, Branch Name, Phone, Email',
          'Enter GSTIN (15-digit GST Registration Number)',
          'Enter FSSAI License Number',
          'Enter full address for invoices',
          'Tap "Save Changes"',
        ],
        tips: ['Restaurant Name and GSTIN appear on every bill. Double-check spelling.'],
      ),
      HelpSubmodule(
        id: 'settings_tax',
        title: 'Tax & Service Charge',
        description: 'Configure GST rates and service charges for all orders.',
        steps: [
          'In Settings, select "Tax" tab',
          'Enter CGST Rate (e.g., 2.5%)',
          'Enter SGST Rate (e.g., 2.5%) — CGST + SGST = Total GST',
          'Enter Service Charge % (e.g., 5%)',
          'Enter Packaging Fee flat amount (e.g., ₹25)',
          'Tap "Save Changes"',
        ],
        tips: [
          '⚠️ Changing tax rates only affects NEW orders — past bills unchanged',
          'For 18% GST: Set CGST = 9% and SGST = 9%',
        ],
      ),
      HelpSubmodule(
        id: 'settings_preorder',
        title: 'Pre-Order & Reservation Policy',
        description: 'Configure online booking policies and no-show handling.',
        steps: [
          'In Settings, select "Pre-Order" tab',
          'Toggle "Online Pre-Ordering" ON or OFF',
          'Set "No-Show Grace Period" (e.g., 30 minutes)',
          'Select No-Show Policy: Reallocate / Chargeable Hourly / Free Hold',
          'If Chargeable: Set holding charge per hour',
          'Set restaurant slug (unique URL for booking page)',
          'Write a Welcome Note for guests',
          'Copy and share the pre-order link',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Changed restaurant name — will old bills show old name?', answer: 'Yes. Past bills are stored with the name at time of printing. Only new bills use the updated name.'),
      HelpFAQ(question: 'How to set GST to 18%?', answer: 'Set CGST = 9% and SGST = 9% in the Tax tab. CGST + SGST = 18%.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Settings not saving', solution: 'Check all required fields are filled; look for red validation errors'),
      TroubleshootItem(problem: 'Logo not appearing on bills', solution: 'Ensure logo was saved. Try uploading a smaller image (under 5MB).'),
    ],
  ),

  HelpSection(
    id: 'reservations',
    icon: Icons.event_rounded,
    iconColor: const Color(0xFF6366F1),
    title: 'Table Reservations',
    description: 'Advance table bookings, guest check-in, no-show policy, and confirmations.',
    category: 'OPERATIONS',
    submodules: [
      HelpSubmodule(
        id: 'res_create',
        title: 'Create a Reservation',
        description: 'Book a table for a guest in advance.',
        steps: [
          'Navigate to Reservations',
          'Tap "+ New Reservation"',
          'Enter Guest Name and Phone',
          'Select Date & Time of visit',
          'Enter Party Size',
          'Add Special Notes: Birthday, Anniversary, Dietary',
          'Record Advance Deposit if taken',
          'Tap Save — SMS/WhatsApp confirmation sent to guest',
        ],
      ),
      HelpSubmodule(
        id: 'res_checkin',
        title: 'Guest Check-In on Arrival',
        description: 'Seat a guest who arrives for their reservation.',
        steps: [
          'In Reservations calendar, find the booking',
          'When guest arrives, tap their booking',
          'Tap "Check In & Seat"',
          'Select the actual table',
          'Table changes to Occupied in floor plan',
        ],
      ),
    ],
    faqs: [
      HelpFAQ(question: 'Guest didn\'t receive confirmation SMS?', answer: 'Check that an SMS gateway is configured. Also verify the guest phone number is correct and has proper country code.'),
    ],
    troubleshooting: [
      TroubleshootItem(problem: 'Reservation not showing in calendar', solution: 'Verify the correct date was entered. Check if date filter is set correctly.'),
    ],
  ),
];

// ─── Screen ───────────────────────────────────────────────────────────────────

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> with SingleTickerProviderStateMixin {
  String _searchQuery = '';
  HelpSection? _selectedSection;
  late TabController _tabController;
  int _expandedSubmodule = -1;

  List<HelpSection> get _filteredSections {
    if (_searchQuery.trim().isEmpty) return kHelpSections;
    final q = _searchQuery.toLowerCase();
    return kHelpSections.where((s) {
      return s.title.toLowerCase().contains(q) ||
          s.description.toLowerCase().contains(q) ||
          s.submodules.any(
            (sm) =>
                sm.title.toLowerCase().contains(q) ||
                sm.description.toLowerCase().contains(q) ||
                sm.steps.any((step) => step.toLowerCase().contains(q)),
          ) ||
          s.faqs.any((f) => f.question.toLowerCase().contains(q) || f.answer.toLowerCase().contains(q));
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      body: _selectedSection == null
          ? _buildModuleList(isDark)
          : _buildModuleDetail(isDark),
    );
  }

  // ─── Module List Screen ──────────────────────────────────────────────────────

  Widget _buildModuleList(bool isDark) {
    final sections = _filteredSections;
    final categories = sections.map((s) => s.category).toSet().toList();

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 180,
          pinned: true,
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF6366F1).withOpacity(0.15),
                    const Color(0xFF3B82F6).withOpacity(0.05),
                  ],
                ),
              ),
              padding: const EdgeInsets.fromLTRB(20, 80, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
                        ),
                        child: const Icon(Icons.help_outline_rounded, color: Color(0xFF6366F1), size: 22),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Help & User Guide',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'Step-by-step guide for every module',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.white54 : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Search bar
                  Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      children: [
                        const SizedBox(width: 12),
                        Icon(Icons.search_rounded, size: 18, color: isDark ? Colors.white38 : Colors.black38),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            onChanged: (v) => setState(() => _searchQuery = v),
                            decoration: InputDecoration(
                              hintText: 'Search modules, steps, FAQs...',
                              hintStyle: TextStyle(
                                fontSize: 13,
                                color: isDark ? Colors.white38 : Colors.black38,
                              ),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          title: const Text('Help Center', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          actions: [
            IconButton(
              onPressed: _showExportSheet,
              icon: const Icon(Icons.download_rounded),
              tooltip: 'Export Guide',
            ),
          ],
        ),

        if (sections.isEmpty)
          const SliverFillRemaining(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.search_off_rounded, size: 48, color: Colors.black26),
                  SizedBox(height: 12),
                  Text('No results found', style: TextStyle(fontWeight: FontWeight.w600)),
                  Text('Try different search terms', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                final cat = categories[i];
                final catSections = sections.where((s) => s.category == cat).toList();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                      ),
                    ),
                    ...catSections.map((section) => _buildSectionCard(section, isDark)),
                    if (i == categories.length - 1) const SizedBox(height: 80),
                  ],
                );
              },
              childCount: categories.length,
            ),
          ),
      ],
    );
  }

  Widget _buildSectionCard(HelpSection section, bool isDark) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedSection = section;
          _expandedSubmodule = -1;
          _tabController = TabController(
            length: _getTabCount(section),
            vsync: this,
          );
        });
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: section.iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(section.icon, color: section.iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    section.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    section.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white54 : const Color(0xFF64748B),
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: [
                      _chip('${section.submodules.length} guides', isDark),
                      if (section.faqs.isNotEmpty) _chip('${section.faqs.length} FAQs', isDark),
                      if (section.workflows.isNotEmpty) _chip('${section.workflows.length} workflows', isDark),
                    ],
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: isDark ? Colors.white38 : Colors.black26),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white54 : const Color(0xFF64748B),
        ),
      ),
    );
  }

  // ─── Module Detail Screen ────────────────────────────────────────────────────

  int _getTabCount(HelpSection section) {
    int count = 1; // How-To Guide always present
    if (section.faqs.isNotEmpty) count++;
    if (section.troubleshooting.isNotEmpty) count++;
    if (section.workflows.isNotEmpty) count++;
    return count;
  }

  Widget _buildModuleDetail(bool isDark) {
    final section = _selectedSection!;
    final tabCount = _getTabCount(section);

    final tabs = [
      const Tab(text: 'How-To Guide'),
      if (section.faqs.isNotEmpty) const Tab(text: 'FAQs'),
      if (section.troubleshooting.isNotEmpty) const Tab(text: 'Troubleshoot'),
      if (section.workflows.isNotEmpty) const Tab(text: 'Workflows'),
    ];

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => setState(() => _selectedSection = null),
        ),
        title: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: section.iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(section.icon, color: section.iconColor, size: 16),
            ),
            const SizedBox(width: 10),
            Text(section.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          indicatorColor: const Color(0xFF6366F1),
          labelColor: const Color(0xFF6366F1),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGuideTab(section, isDark),
          if (section.faqs.isNotEmpty) _buildFAQTab(section, isDark),
          if (section.troubleshooting.isNotEmpty) _buildTroubleshootTab(section, isDark),
          if (section.workflows.isNotEmpty) _buildWorkflowTab(section, isDark),
        ],
      ),
    );
  }

  // How-To Guide Tab
  Widget _buildGuideTab(HelpSection section, bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: section.submodules.length,
      itemBuilder: (context, i) {
        final sm = section.submodules[i];
        final isExpanded = _expandedSubmodule == i;
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isExpanded
                  ? const Color(0xFF6366F1).withOpacity(0.4)
                  : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Column(
            children: [
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                title: Text(
                  sm.title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                subtitle: Text(
                  sm.description,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                  ),
                ),
                trailing: AnimatedRotation(
                  turns: isExpanded ? 0.5 : 0,
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: isDark ? Colors.white38 : Colors.black38,
                  ),
                ),
                onTap: () => setState(() => _expandedSubmodule = isExpanded ? -1 : i),
              ),
              if (isExpanded)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      Text(
                        'STEP-BY-STEP',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...sm.steps.asMap().entries.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF6366F1).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  '${entry.key + 1}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF6366F1),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  entry.value,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isDark ? Colors.white70 : const Color(0xFF374151),
                                    height: 1.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (sm.tips.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.lightbulb_outline_rounded, size: 14, color: Color(0xFF3B82F6)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'PRO TIPS',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1,
                                      color: const Color(0xFF3B82F6).withOpacity(0.8),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              ...sm.tips.map(
                                (tip) => Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    '• $tip',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF3B82F6),
                                      height: 1.4,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  // FAQ Tab
  Widget _buildFAQTab(HelpSection section, bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: section.faqs.length,
      itemBuilder: (context, i) {
        final faq = section.faqs[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'Q',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFF59E0B)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      faq.question,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'A',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      faq.answer,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white60 : const Color(0xFF475569),
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // Troubleshoot Tab
  Widget _buildTroubleshootTab(HelpSection section, bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: section.troubleshooting.length,
      itemBuilder: (context, i) {
        final item = section.troubleshooting[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFEF4444).withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item.problem,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF10B981), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item.solution,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white60 : const Color(0xFF475569),
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // Workflows Tab
  Widget _buildWorkflowTab(HelpSection section, bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: section.workflows.length,
      itemBuilder: (context, i) {
        final wf = section.workflows[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.bolt_rounded, color: Color(0xFF10B981), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    wf.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...wf.steps.map(
                (step) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.arrow_right_rounded, color: Color(0xFF10B981), size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          step,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? Colors.white70 : const Color(0xFF374151),
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Export Sheet
  void _showExportSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Export User Guide',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              const Text(
                'Save the complete guide to your device',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 20),
              _exportOption(
                icon: Icons.picture_as_pdf_rounded,
                color: const Color(0xFFEF4444),
                title: 'Export as PDF',
                subtitle: 'Print-ready professional document',
                onTap: () {
                  Navigator.pop(context);
                  _exportGuideText(format: 'PDF');
                },
              ),
              const SizedBox(height: 10),
              _exportOption(
                icon: Icons.code_rounded,
                color: const Color(0xFF6366F1),
                title: 'Export as Markdown (.md)',
                subtitle: 'For documentation and GitHub pages',
                onTap: () {
                  Navigator.pop(context);
                  _exportGuideText(format: 'MD');
                },
              ),
              const SizedBox(height: 10),
              _exportOption(
                icon: Icons.text_snippet_rounded,
                color: const Color(0xFF10B981),
                title: 'Export as Plain Text (.txt)',
                subtitle: 'Universal text format',
                onTap: () {
                  Navigator.pop(context);
                  _exportGuideText(format: 'TXT');
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _exportOption({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
            const Spacer(),
            const Icon(Icons.chevron_right_rounded, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  void _exportGuideText({required String format}) {
    String content = '';
    final isMarkdown = format == 'MD';
    final isPDF = format == 'PDF';

    if (isMarkdown || isPDF) {
      content = '# Restaurant OS — Tenant Admin User Guide\n\n';
      for (final section in kHelpSections) {
        content += '## ${section.title}\n${section.description}\n\n';
        for (final sm in section.submodules) {
          content += '### ${sm.title}\n${sm.description}\n\n**Steps:**\n';
          for (var i = 0; i < sm.steps.length; i++) {
            content += '${i + 1}. ${sm.steps[i]}\n';
          }
          if (sm.tips.isNotEmpty) {
            content += '\n💡 **Tips:**\n';
            for (final tip in sm.tips) {
              content += '- $tip\n';
            }
          }
          content += '\n';
        }
        if (section.faqs.isNotEmpty) {
          content += '### FAQs\n\n';
          for (final faq in section.faqs) {
            content += '**Q: ${faq.question}**\n\nA: ${faq.answer}\n\n';
          }
        }
        if (section.troubleshooting.isNotEmpty) {
          content += '### Troubleshooting\n\n';
          for (final t in section.troubleshooting) {
            content += '- **${t.problem}**: ${t.solution}\n';
          }
          content += '\n';
        }
        if (section.workflows.isNotEmpty) {
          content += '### Workflow Examples\n\n';
          for (final wf in section.workflows) {
            content += '**${wf.title}:**\n';
            for (final step in wf.steps) {
              content += '  - $step\n';
            }
            content += '\n';
          }
        }
        content += '---\n\n';
      }
    } else {
      // Plain text
      content = 'RESTAURANT OS — TENANT ADMIN USER GUIDE\n${'=' * 50}\n\n';
      for (final section in kHelpSections) {
        content += '${section.title.toUpperCase()}\n${'-' * 40}\n${section.description}\n\n';
        for (final sm in section.submodules) {
          content += '  ${sm.title}\n  ${sm.description}\n\n  Steps:\n';
          for (var i = 0; i < sm.steps.length; i++) {
            content += '  ${i + 1}. ${sm.steps[i]}\n';
          }
          content += '\n';
        }
        if (section.faqs.isNotEmpty) {
          content += '  FAQs:\n';
          for (final faq in section.faqs) {
            content += '  Q: ${faq.question}\n  A: ${faq.answer}\n\n';
          }
        }
        content += '\n';
      }
    }

    Clipboard.setData(ClipboardData(text: content));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text('User Guide copied to clipboard as $format!'),
          ],
        ),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
