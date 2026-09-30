'use client';

import { useState, useMemo, useRef } from 'react';
import {
  HelpCircle, BookOpen, Search, ChevronRight, ChevronDown, Download,
  LayoutDashboard, ShoppingBag, Grid3X3, ChefHat, ClipboardList,
  CalendarDays, BookMarked, Package, Flame, Truck, ArrowLeftRight,
  Users, UserCheck, Wallet, BarChart3, Sparkles, Tag, Gift, Star,
  Radio, Smartphone, Building2, Settings, Printer, ShieldAlert,
  ShoppingCart, AlertCircle, CheckCircle2, Info, MessageSquare,
  Zap, ArrowRight, FileText, ExternalLink, Terminal, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuideSection {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  category: string;
  submodules: SubmoduleGuide[];
  faqs: FAQ[];
  workflows?: WorkflowExample[];
  troubleshooting?: TroubleshootItem[];
}

interface SubmoduleGuide {
  id: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
}

interface FAQ {
  q: string;
  a: string;
}

interface WorkflowExample {
  title: string;
  steps: string[];
}

interface TroubleshootItem {
  problem: string;
  solution: string;
}

// ─── Full Guide Data ───────────────────────────────────────────────────────────

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    title: 'Dashboard',
    description: 'Real-time command center with live revenue, active orders, and today\'s key metrics.',
    category: 'OPERATIONS',
    submodules: [
      {
        id: 'dashboard_metrics',
        title: 'Key Metric Cards',
        description: 'Four live KPI cards showing Today\'s Revenue, Total Orders, Active Dining Tables, and Average Order Value. All cards refresh automatically every 15 seconds.',
        steps: [
          'Navigate to Dashboard from the left sidebar',
          'View Today\'s Revenue – reflects all PAID and COMPLETED orders since midnight',
          'Check Total Orders – counts all order types (Dine-In, Takeaway, Delivery)',
          'Monitor Active Dining Tables – tables currently occupied',
          'See Average Order Value – calculated as Revenue ÷ Orders',
          'Click the ↺ Refresh button to force-refresh all data',
        ],
        tips: [
          'Dashboard auto-refreshes every 15 seconds — you rarely need to click Refresh',
          'Revenue only includes PAID orders; BILLED orders are not counted until payment is confirmed',
        ],
      },
      {
        id: 'dashboard_quickaccess',
        title: 'Quick Access Shortcuts',
        description: 'Four navigation shortcuts to the most-used operational modules.',
        steps: [
          'Click "Dining Tables" to jump directly to the floor plan',
          'Click "Kitchen (KDS)" to open the kitchen display system',
          'Click "Active Orders" to see all open orders',
          'Click "Order History" to view the historical invoice ledger',
        ],
      },
      {
        id: 'dashboard_activity',
        title: 'Recent Activity Feed',
        description: 'Live list of the 7 most recent orders with status, table/type, and amount.',
        steps: [
          'The activity feed shows the last 7 orders across all order types',
          'Each row shows: Order Number, Table or Order Type, Customer Name, Time, Status, Amount',
          'Status badges are color-coded: Blue=Confirmed, Amber=In Kitchen, Orange=Cooking, Green=Ready, Purple=Billed, Rose=Cancelled',
          'Click "View All" to navigate to the full Active Orders list',
        ],
      },
    ],
    faqs: [
      { q: 'Why does revenue show ₹0?', a: 'Revenue only appears after orders are marked PAID or COMPLETED. Check if orders are still in BILLED status awaiting payment collection.' },
      { q: 'Data seems stale even after refresh?', a: 'Try a hard browser refresh (Ctrl+Shift+R / Cmd+Shift+R). If still stale, check your internet connection.' },
      { q: 'Active tables shows 0 but tables are occupied?', a: 'Verify that tables have active orders in the Tables module. Tables without orders are counted as empty.' },
    ],
    troubleshooting: [
      { problem: 'Revenue shows ₹0', solution: 'Ensure orders are marked PAID, not just BILLED' },
      { problem: 'Dashboard not loading', solution: 'Check internet connection; clear browser cache' },
      { problem: 'Activity feed empty', solution: 'No orders created today yet — start creating orders via POS or Tables' },
    ],
  },

  {
    id: 'orders',
    icon: ShoppingBag,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'Active Orders',
    description: 'Live queue of all open orders with KOT progress, status advancement, and quick billing.',
    category: 'OPERATIONS',
    submodules: [
      {
        id: 'orders_statusflow',
        title: 'Order Status Pipeline',
        description: 'Orders flow through a defined status pipeline from creation to completion.',
        steps: [
          'DRAFT → Order created but not yet confirmed',
          'CONFIRMED → Order confirmed by staff',
          'SENT_TO_KITCHEN → KOT fired; kitchen receiving',
          'PREPARING → Chef accepted and cooking',
          'READY → Food cooked, waiting to be served',
          'SERVED → Food delivered to customer\'s table',
          'BILLED → Receipt/Invoice generated',
          'PAID → Payment collected and confirmed',
          'COMPLETED → Order fully closed',
          'CANCELLED → Order voided with reason',
        ],
        tips: ['Use filter tabs at the top to view only Dine-In, Takeaway, or Delivery orders'],
      },
      {
        id: 'orders_cancelitem',
        title: 'Cancel an Item from Order',
        description: 'Remove a specific dish from an active order.',
        steps: [
          'Open the order in Active Orders',
          'Click on the item you want to cancel',
          'Select "Cancel Item" from the action menu',
          'Choose a reason: Wrong Item / Customer Changed Mind / Out of Stock / Other',
          'Add an optional note for the cancellation',
          'Confirm — item removed, bill total updates automatically',
          'Cancellation is logged in the Audit Vault',
        ],
        tips: ['Manager PIN may be required for cancellations if configured in Security Settings'],
      },
      {
        id: 'orders_settle',
        title: 'Quick Bill Settlement',
        description: 'Fast checkout for any active order.',
        steps: [
          'Locate the order in Active Orders list',
          'Click the "₹ Settle" button on the order card',
          'Review the bill total (items + taxes + service charge)',
          'Select payment method: Cash, UPI, Card, Gift Card, or Split',
          'For Cash: Enter amount received — change is auto-calculated',
          'For UPI/Card: Select and confirm',
          'For Split: Add multiple payment splits',
          'Click "Confirm Payment" — receipt prints if printer configured',
        ],
      },
    ],
    workflows: [
      {
        title: 'Dine-In Complete Workflow',
        steps: [
          '1. Guest walks in → Host assigns table (Tables module)',
          '2. Waiter opens POS → Selects the table → Takes order → Sends to Kitchen',
          '3. Kitchen sees KOT → Accepts → Cooks → Marks READY',
          '4. Waiter delivers food → Marks SERVED on KDS',
          '5. Guest asks for bill → Click "Generate Bill" → Print receipt',
          '6. Collect payment → Mark PAID → Table resets to Available',
        ],
      },
      {
        title: 'Takeaway/Parcel Workflow',
        steps: [
          '1. Customer arrives or calls in',
          '2. Cashier opens POS → Select "Takeaway" → Add items',
          '3. Optionally link customer record for loyalty points',
          '4. Apply coupon if available → Confirm order',
          '5. KOT fires to kitchen → Kitchen prepares',
          '6. Pack food → Collect payment → Complete order',
        ],
      },
      {
        title: 'Delivery Workflow',
        steps: [
          '1. Order received via POS, Zomato/Swiggy, or WhatsApp bot',
          '2. Confirm order → KOT fires to kitchen',
          '3. Kitchen prepares and marks READY',
          '4. Assign delivery rider (Integrations → Riders)',
          '5. Mark as DISPATCHED → Rider delivers',
          '6. Mark DELIVERED → Record COD or confirm prepaid',
        ],
      },
    ],
    faqs: [
      { q: 'Can I add items to an order after KOT is sent?', a: 'Yes! Open the order, add items via POS — a new KOT fires for the added items.' },
      { q: 'What\'s the difference between BILLED and PAID?', a: 'BILLED = invoice generated but payment not yet collected. PAID = money received and confirmed.' },
      { q: 'Can I void an entire order?', a: 'Yes, Admins and Managers can void orders. Click "Void Order," provide a reason, and confirm. This is logged in the Audit Vault.' },
    ],
    troubleshooting: [
      { problem: 'Orders not updating in real-time', solution: 'Check the WiFi/connection indicator on screen; page may need refresh if socket dropped' },
      { problem: 'Cannot advance order status', solution: 'Ensure you have orders:edit permission in RBAC Settings' },
      { problem: 'Bill amount incorrect', solution: 'Verify tax rates in Restaurant Settings → Tax tab' },
    ],
  },

  {
    id: 'tables',
    icon: Grid3X3,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    title: 'Tables & Floor Plan',
    description: 'Interactive floor map, live table occupancy, order management, and table transfers.',
    category: 'OPERATIONS',
    submodules: [
      {
        id: 'tables_floormap',
        title: 'Interactive Floor Map',
        description: 'Visual layout of all your dining tables organized by zones.',
        steps: [
          'Navigate to Tables module',
          'See all tables color-coded by status: Green=Available, Red=Occupied, Yellow=Reserved, Purple=Billed, Grey=Cleaning',
          'Use zone filter tabs to view: Main Hall, AC Room, Outdoor, Rooftop, Bar',
          'Click any table to see its current status and order details',
        ],
        tips: ['Green tables are ready to seat. Always check before directing a customer to a table.'],
      },
      {
        id: 'tables_neworder',
        title: 'Seating Guests & Creating Orders',
        description: 'Seat guests at a table and start their order.',
        steps: [
          'Click on a Green (Available) table',
          'Select "New Order" or "Seat Guests"',
          'Enter the number of guests (pax count)',
          'You\'re redirected to POS or order entry for that table',
          'Add items from the menu and send to kitchen',
        ],
      },
      {
        id: 'tables_transfer',
        title: 'Table Transfer',
        description: 'Move guests and their order from one table to another.',
        steps: [
          'Click on the occupied source table',
          'Select "Transfer Table" from the action menu',
          'Choose the destination table from the available tables list',
          'Confirm the transfer',
          'All order items and bill move to the new table',
          'Source table becomes Available',
        ],
        tips: ['Destination table must be fully Available (no orders). Transfer the guests only after clearing the destination.'],
      },
      {
        id: 'tables_merge',
        title: 'Table Merge',
        description: 'Combine multiple tables\' orders into one consolidated bill.',
        steps: [
          'Click one of the tables to merge',
          'Select "Merge Table"',
          'Select one or more additional tables',
          'All orders consolidate under a single bill',
          'One table becomes the primary; others are freed',
        ],
      },
      {
        id: 'tables_billing',
        title: 'Generate Bill at Table',
        description: 'Create and settle the bill directly from the table view.',
        steps: [
          'Click on the occupied table',
          'Review the running bill in the side panel',
          'Click "Generate Bill" or "Bill Out"',
          'Review itemized bill with taxes and service charge',
          'Select payment method: Cash, Card, UPI, Split',
          'Confirm payment — table status resets to Available',
          'Receipt prints automatically if printer configured',
        ],
      },
    ],
    faqs: [
      { q: 'A table shows Occupied but guests have left. How do I reset it?', a: 'Click the table → if the order was COMPLETED or PAID, the table should auto-reset. If not, click "Mark Available/Clean" to manually reset.' },
      { q: 'Can I see what\'s ordered at a table without opening POS?', a: 'Yes! Click any occupied table — the side panel shows all ordered items, KOT status per dish, and the running bill.' },
      { q: 'How many tables can I manage?', a: 'There is no limit. Add tables in Settings → Floor Configuration.' },
    ],
    troubleshooting: [
      { problem: 'Table not resetting after payment', solution: 'Ensure order is marked COMPLETED, not just PAID. Check if there are pending draft items on the table.' },
      { problem: 'Table transfer not working', solution: 'Destination table must have zero active or draft orders' },
      { problem: 'Floor map not loading', solution: 'Refresh browser. If tables were added recently, they may need a page reload to appear.' },
    ],
  },

  {
    id: 'kitchen',
    icon: ChefHat,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'Kitchen Display System (KDS)',
    description: 'Digital KOT queue for chefs and waiters with status bumping and timer alerts.',
    category: 'OPERATIONS',
    submodules: [
      {
        id: 'kds_chef',
        title: 'Chef / Cook Station View',
        description: 'Incoming KOT tickets that need preparation.',
        steps: [
          'KDS opens automatically to Chef Station view for kitchen staff',
          'New KOT tickets appear with a sound alert (🔔 chime)',
          'Each ticket shows: Dish names, quantities, modifiers, notes, and time elapsed',
          'Color coding: Green (<5 min) → Amber (5-10 min) → Red (>10 min overdue)',
          'Click "Accept" to acknowledge a ticket — status changes to PREPARING',
          'Click "✓ Ready" per item when it\'s cooked and plated',
          'Click "All Ready" when the entire ticket is ready for service',
        ],
        tips: [
          'Use the 🔊 toggle to enable/disable sound alerts on the KDS screen',
          'Always accept tickets promptly — the POS operator and guests see the "Cooking" status',
        ],
      },
      {
        id: 'kds_waiter',
        title: 'Waiter / Runner Station View',
        description: 'Ready-to-serve dish queue for delivery to tables.',
        steps: [
          'When kitchen marks all items READY, the ticket moves to the Waiter Queue',
          'A sound alert fires (🔔 bell)',
          'Waiter picks up food and delivers to the table',
          'After delivery, click "✓ Served" on the ticket',
          'Ticket archives — order status updates to SERVED in the main system',
        ],
      },
      {
        id: 'kds_stations',
        title: 'Station Filtering',
        description: 'Filter KOT tickets by kitchen station for organized cooking.',
        steps: [
          'At top of KDS, use the Station Filter dropdown',
          'Select your station: All | Main Kitchen | Bar/Beverages | Grill | Tandoor | Dessert | Cold',
          'Only tickets routed to your station appear',
          'Station routing is configured per menu item category in Settings',
        ],
      },
      {
        id: 'kds_undo',
        title: 'Undo a Served Ticket',
        description: 'Restore a ticket that was accidentally marked served.',
        steps: [
          'Scroll to the "Served Archive" section at bottom of KDS',
          'Find the ticket (available for ~30 minutes after serving)',
          'Click "Undo Served" — ticket returns to Waiter Queue',
          'Useful when food is returned or wrong dish was served',
        ],
      },
    ],
    workflows: [
      {
        title: 'QR Self-Order Workflow',
        steps: [
          '1. Guest scans table QR code on their phone',
          '2. Digital menu opens in browser — guest adds items and places order',
          '3. Order auto-creates in system — Telegram alert fires to manager',
          '4. KOT automatically fires to kitchen display',
          '5. Chef cooks → Marks READY → Waiter serves → Marks SERVED',
          '6. Cashier generates bill and collects payment',
        ],
      },
    ],
    faqs: [
      { q: 'No tickets showing on KDS — what\'s wrong?', a: 'Check that orders have been "Sent to Kitchen" from POS or Tables module. KDS only shows orders with SENT_TO_KITCHEN or later status.' },
      { q: 'Can different chefs see only their station items?', a: 'Yes! Use Station Filtering to show only relevant items. Configure routing in Settings → Kitchen Stations.' },
      { q: 'What if internet drops while cooking?', a: 'Existing tickets remain visible on screen. New orders won\'t appear until connection restores. Keep paper KOT as backup.' },
    ],
    troubleshooting: [
      { problem: 'Sound not playing on new orders', solution: 'Allow audio autoplay in browser settings (click the lock icon in address bar)' },
      { problem: 'Tickets not updating', solution: 'Check the WiFi/Socket indicator — try refreshing if disconnected' },
      { problem: 'Wrong station showing tickets', solution: 'Check station routing rules in Settings → Kitchen Stations' },
    ],
  },

  {
    id: 'menu',
    icon: BookMarked,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    title: 'Menu Catalog',
    description: 'Build and manage your complete food catalog with categories, dishes, variants, and modifiers.',
    category: 'INVENTORY & MENU',
    submodules: [
      {
        id: 'menu_categories',
        title: 'Categories & Sub-Categories',
        description: 'Organize your menu into a logical hierarchy.',
        steps: [
          'In Menu module, click "Manage Categories"',
          'Click "+ Add Category" → Enter name (e.g., "Starters")',
          'For sub-categories: Select a Parent Category',
          'Set Sort Order (lower = appears first in menu)',
          'Save — categories are instantly available in POS and QR menu',
          'Edit or delete categories using the edit/trash icons',
        ],
        tips: ['Plan your category hierarchy before adding dishes. A good structure: Starters → Soups, Salads; Mains → Veg, Non-Veg; Breads; Beverages → Hot, Cold, Juices'],
      },
      {
        id: 'menu_adddish',
        title: 'Add a New Dish',
        description: 'Create a dish with complete details, pricing, and variants.',
        steps: [
          'Click "+ Add Dish" in the Menu module',
          'Enter Dish Name (as it should appear on menu and bills)',
          'Select the Category it belongs to',
          'Write an appetizing Description (optional but recommended)',
          'Select Food Type: VEG 🟢 / NON-VEG 🔴 / EGG 🟡 / VEGAN 🟤',
          'Select Spice Level: None / Mild / Medium / Hot / Extra Hot',
          'Choose Pricing Model: Single Price / Half-Full / Small-Medium-Large / Custom',
          'Enter price(s) for each variant',
          'Toggle "Available" to ON to make it visible in POS',
          'Click "Save Dish"',
        ],
        tips: [
          'Use "Custom" pricing model for dishes with unique portion names',
          'Item Letter Code (e.g., "PT" for Paneer Tikka) auto-generates for quick POS entry',
        ],
      },
      {
        id: 'menu_86',
        title: 'Real-Time 86 / Out of Stock Toggle',
        description: 'Instantly mark a dish as unavailable across all ordering channels.',
        steps: [
          'Find the dish in Menu list',
          'Click the toggle switch next to the dish name',
          'Grey = Out of Stock (86\'d) — item disappears from POS, QR menu, Kiosk',
          'Toggle back ON when item is available again',
        ],
        tips: ['The 86 toggle takes effect immediately across all ordering channels — no reload needed'],
      },
      {
        id: 'menu_ocr',
        title: 'AI Menu OCR Scanner',
        description: 'Import an existing printed menu using AI-powered text recognition.',
        steps: [
          'Click "📷 Scan Menu" button',
          'Upload a photo (JPG/PNG) or PDF of your printed menu',
          'Wait for AI to extract categories, dish names, and prices',
          'Review the detected items — correct any names or prices',
          'Click "Import All" to add all items to your digital menu',
        ],
      },
      {
        id: 'menu_pdf',
        title: 'Export Menu as PDF',
        description: 'Generate a professionally formatted printable menu PDF.',
        steps: [
          'Click "📄 Export PDF" button in Menu module',
          'A restaurant-grade PDF generates server-side',
          'Download starts automatically',
          'Use for physical menus, email attachments, or sharing',
        ],
      },
    ],
    faqs: [
      { q: 'My dish isn\'t showing in POS after I saved it', a: 'Check two toggles: "isAvailable" must be ON and "isActive" must be ON. Also verify the category is active.' },
      { q: 'Can I have the same dish in multiple categories?', a: 'No, each dish belongs to one category. Create a duplicate entry if you need it in two places.' },
      { q: 'What\'s the difference between isAvailable and isActive?', a: 'isActive = dish exists in system (admin can see it). isAvailable = dish shows for ordering. Turn isAvailable OFF for daily 86, keep isActive ON.' },
    ],
    troubleshooting: [
      { problem: 'Prices not updating in POS', solution: 'Refresh the POS browser tab after saving price changes in Menu' },
      { problem: 'Category not visible', solution: 'Ensure the category\'s isActive toggle is ON' },
      { problem: 'OCR scan returning empty results', solution: 'Use a high-contrast, well-lit image. Avoid blurry or skewed photos.' },
    ],
  },

  {
    id: 'staff',
    icon: UserCheck,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    title: 'Staff & Team HR',
    description: 'Employee records, attendance tracking, RBAC permissions, and Telegram notification setup.',
    category: 'FINANCE & TEAM',
    submodules: [
      {
        id: 'staff_addemployee',
        title: 'Add & Manage Employees',
        description: 'Create employee records with full HR details.',
        steps: [
          'Navigate to Staff module',
          'Click "+ Add Employee"',
          'Enter: Name, Department, Designation, Phone, Email',
          'Set Shift: Morning / Afternoon / Evening / Night',
          'Enter Salary (optional — for payroll reference)',
          'Save employee record',
        ],
      },
      {
        id: 'staff_loginaccount',
        title: 'Create Staff Login Account',
        description: 'Give an employee access to the admin panel.',
        steps: [
          'Open an employee record by clicking their card',
          'Click "Create Login Account"',
          'Enter their login email and initial password',
          'Assign Roles: Waiter / Chef / Cashier / Manager / Admin',
          'Staff can now log in with their credentials',
        ],
        tips: ['Share the initial password securely. Ask staff to change it on first login.'],
      },
      {
        id: 'staff_rbac',
        title: 'Role-Based Access Control (RBAC)',
        description: 'Control which modules and actions each staff member can access.',
        steps: [
          'Open the employee record',
          'Scroll to the Permissions section',
          'Option A — Use a Role Preset: Click "Apply Role Preset" → Choose from Waiter / Chef / Cashier / Manager / Full Admin',
          'Option B — Custom Permissions: Expand each module category → Toggle individual modules ON/OFF',
          'For granular control: Expand module submodules → Toggle specific action permissions',
          'Click "Save Permissions"',
          'Changes take effect on the employee\'s next login or page refresh',
        ],
        tips: [
          'Role Presets are the fastest way to set permissions for common roles',
          'Custom permissions override role presets — use carefully',
          'An employee can only access modules explicitly granted to them',
        ],
      },
      {
        id: 'staff_attendance',
        title: 'Attendance & Shift Tracking',
        description: 'Record daily attendance and working hours.',
        steps: [
          'Go to Staff → select the employee',
          'Click on today\'s attendance row',
          'Mark status: Present / Absent / Half Day / Leave',
          'Enter check-in time and check-out time',
          'Save — working hours are calculated automatically',
          'View monthly attendance sheet for payroll',
        ],
      },
      {
        id: 'staff_telegram',
        title: 'Telegram Notifications',
        description: 'Set up real-time alerts delivered to staff via Telegram.',
        steps: [
          'Staff member opens Telegram and searches for your restaurant\'s bot',
          'Starts the bot — receives a unique Chat ID',
          'In Staff module, open the employee record',
          'Scroll to Telegram section — enter Chat ID or Telegram username',
          'Toggle ON the notifications they should receive:',
          '   • 📱 New QR Menu Orders',
          '   • 🍳 KOT Sent to Kitchen',
          '   • 💰 Payment Received',
          '   • ⚠️ Low Stock Alert',
          '   • ⭐ Negative Guest Feedback',
          'Save — notifications start immediately',
        ],
      },
    ],
    faqs: [
      { q: 'Staff says they can\'t see a module they need', a: 'Check RBAC permissions for that employee. Grant the required module in Staff → Permissions.' },
      { q: 'Telegram notifications not arriving', a: 'Verify the Chat ID is correct. Ensure the employee has started the Telegram bot. Try resending a test notification.' },
      { q: 'Can one employee have multiple roles?', a: 'Yes! You can assign multiple roles. Permissions are the union of all assigned roles.' },
    ],
    troubleshooting: [
      { problem: 'Staff cannot log in', solution: 'Verify login account exists and is active. Reset password if needed.' },
      { problem: 'Module not visible to staff', solution: 'Grant module access in Staff → RBAC Permissions' },
      { problem: 'Attendance not saving', solution: 'Check that the date is correct and the employee record is active' },
    ],
  },

  {
    id: 'inventory',
    icon: Package,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10',
    title: 'Stock & Inventory',
    description: 'Track raw ingredient levels, receive stock, manage wastage, and get low stock alerts.',
    category: 'INVENTORY & MENU',
    submodules: [
      {
        id: 'inv_addingredient',
        title: 'Add an Ingredient',
        description: 'Create a new ingredient in your stock master.',
        steps: [
          'Navigate to Inventory module',
          'Click "+ Add Ingredient"',
          'Enter: Name (e.g., "Basmati Rice"), Category, Unit (KG/Litre/Piece/Packet)',
          'Enter Opening Stock quantity',
          'Set Cost per Unit (purchase cost)',
          'Set Low Stock Threshold — alert fires when stock drops below this',
          'Click Save',
        ],
      },
      {
        id: 'inv_adjust',
        title: 'Stock Adjustment (Add, Wastage, Correction)',
        description: 'Adjust stock levels for any reason.',
        steps: [
          'Click on an ingredient in the inventory list',
          'Click "Adjust Stock"',
          'Select type: Stock In (receiving) / Wastage (spoilage) / Adjustment (manual correction)',
          'Enter quantity (positive number)',
          'Add a note for the audit trail',
          'Click Save — stock level updates immediately',
        ],
      },
    ],
    faqs: [
      { q: 'Does the system auto-deduct stock when orders are placed?', a: 'Only if you\'ve configured Recipe BOMs in the Production module. Without BOMs, adjustments are manual.' },
      { q: 'Stock shows negative — how do I fix?', a: 'Create a Stock-In adjustment entry for the missing quantity. Then investigate where the discrepancy came from.' },
    ],
    troubleshooting: [
      { problem: 'Low stock alerts not appearing', solution: 'Check that Telegram notifications are configured for the relevant staff member' },
      { problem: 'Stock not updating', solution: 'Ensure the adjustment was saved (look for success toast message)' },
    ],
  },

  {
    id: 'settings',
    icon: Settings,
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-500/10',
    title: 'Restaurant Settings',
    description: 'Configure restaurant profile, GST rates, logo, pre-order policies, and security.',
    category: 'SETTINGS & SYSTEM',
    submodules: [
      {
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
          'Click "Save Changes"',
        ],
        tips: ['Restaurant Name and GSTIN appear on every bill. Double-check spelling before saving.'],
      },
      {
        id: 'settings_tax',
        title: 'Tax & Service Charge',
        description: 'Configure GST rates and service charges applied to all orders.',
        steps: [
          'In Settings, select "Tax" tab',
          'Enter CGST Rate (e.g., 2.5%)',
          'Enter SGST Rate (e.g., 2.5%) — CGST + SGST = Total GST (5%)',
          'Enter Service Charge % (e.g., 5%)',
          'Enter Packaging Fee (flat ₹ amount per takeaway/delivery order)',
          'Click "Save Changes"',
        ],
        tips: [
          '⚠️ Changing tax rates only affects NEW orders — past bills are not retroactively updated',
          'For 18% GST: Set CGST = 9% and SGST = 9%',
          'Service charge is optional per consumer protection law — inform customers',
        ],
      },
      {
        id: 'settings_logo',
        title: 'Logo & Branding',
        description: 'Upload your restaurant logo for bills and QR menu.',
        steps: [
          'In Settings, select "Logo" tab',
          'Click "Upload Logo" and select your image (JPG/PNG, max 10MB)',
          'System auto-downscales to optimal receipt size',
          'Preview the logo appearance',
          'Click Save — appears on all digital invoices, QR menu, and kiosk',
        ],
      },
      {
        id: 'settings_preorder',
        title: 'Pre-Order & Reservation Policy',
        description: 'Configure online booking policies and no-show handling.',
        steps: [
          'In Settings, select "Pre-Order" tab',
          'Toggle "Online Pre-Ordering" ON or OFF',
          'Set "No-Show Grace Period" (e.g., 30 minutes)',
          'Select No-Show Policy: Reallocate Table / Chargeable Hourly / Free Hold',
          'If Chargeable: Set holding charge per hour (e.g., ₹150)',
          'Set restaurant slug (unique URL for your booking page)',
          'Write a Welcome Note for guests',
          'Copy the pre-order link to share with customers',
          'Click Save',
        ],
      },
    ],
    faqs: [
      { q: 'I changed the restaurant name — will old bills show the old name?', a: 'Yes. Past bills are stored with the name at time of printing. Only new bills use the updated name.' },
      { q: 'How do I set GST to 18%?', a: 'Set CGST = 9% and SGST = 9% in the Tax tab. The total of CGST + SGST = 18% GST.' },
    ],
    troubleshooting: [
      { problem: 'Settings not saving', solution: 'Check all required fields are filled. Look for validation error messages highlighted in red.' },
      { problem: 'Logo not appearing on bills', solution: 'Ensure logo was saved successfully. Try uploading a smaller image (under 5MB).' },
    ],
  },

  {
    id: 'reports',
    icon: BarChart3,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    title: 'Reports & P&L Analytics',
    description: 'Sales summaries, tax reports, item performance, and profit & loss statements.',
    category: 'FINANCE & TEAM',
    submodules: [
      {
        id: 'reports_sales',
        title: 'Sales & Revenue Summary',
        description: 'View gross revenue, order counts, and payment breakdown.',
        steps: [
          'Navigate to Reports module',
          'Default shows Today\'s data',
          'Use period selector: Today / Last 7 Days / This Month',
          'See: Total Revenue, Total Orders, Gross Profit, Net Profit',
          'View Dine-In vs Takeaway vs Delivery breakdown',
          'Tax section shows CGST, SGST, and taxable sales',
        ],
      },
      {
        id: 'reports_export',
        title: 'Export Reports',
        description: 'Download financial data as CSV for accountants.',
        steps: [
          'In Reports, click "📥 Export CSV" button',
          'A CSV file downloads with all key metrics',
          'Use for: Accountant submissions, GST filing, spreadsheet analysis',
        ],
      },
    ],
    faqs: [
      { q: 'Reports don\'t match my bank deposits', a: 'Check for mismatched payment modes — some UPI payments may have been recorded as cash. Use the Audit Vault payment log as the authoritative source.' },
      { q: 'How do I prepare GST filing reports?', a: 'Use Reports → Tax Report for the filing period → Export CSV → Share with your accountant.' },
    ],
    troubleshooting: [
      { problem: 'Revenue in Reports different from POS total', solution: 'Reports count only PAID orders. Check for orders in BILLED status awaiting payment.' },
      { problem: 'Export not downloading', solution: 'Allow file downloads in your browser settings (check the address bar for a blocked download icon).' },
    ],
  },

  {
    id: 'customers',
    icon: Users,
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
    title: 'Customers CRM & Loyalty',
    description: 'Guest profiles, visit history, loyalty points, and customer segmentation.',
    category: 'FINANCE & TEAM',
    submodules: [
      {
        id: 'cust_addcustomer',
        title: 'Add & Manage Customers',
        description: 'Create guest profiles for personalized service and loyalty tracking.',
        steps: [
          'Navigate to Customers module',
          'Click "+ Add Customer"',
          'Enter: Name, Phone, Email',
          'Add Date of Birth and Anniversary (for automated perks)',
          'Note dietary preferences if any',
          'Save — customer can now be linked to orders',
        ],
      },
      {
        id: 'cust_loyalty',
        title: 'Loyalty Points Management',
        description: 'Earn and redeem loyalty points for customers.',
        steps: [
          'Points are earned automatically after payment is confirmed',
          'Earn rate is configurable (e.g., 1 point per ₹10 spent)',
          'To redeem: At POS checkout, search for customer',
          'Their point balance appears — click "Redeem Points"',
          'Enter points to redeem — reduces the bill amount',
          'Points deducted and receipt shows redemption',
        ],
      },
    ],
    faqs: [
      { q: 'Customer not found at POS', a: 'Search by phone number — it\'s the most unique identifier. Name search may have spelling variations.' },
      { q: 'Loyalty points not adding after payment', a: 'Verify the earn rules are configured in Loyalty Settings. Ensure the customer profile was linked to the order before payment.' },
    ],
    troubleshooting: [
      { problem: 'Birthday perk not triggering', solution: 'Verify date of birth is entered correctly (DD/MM/YYYY format). Check birthday alert is configured.' },
    ],
  },

  {
    id: 'expenses',
    icon: Wallet,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
    title: 'Expenses & Payouts',
    description: 'Track daily operational expenses, petty cash, and payout vouchers.',
    category: 'FINANCE & TEAM',
    submodules: [
      {
        id: 'exp_addexpense',
        title: 'Record an Expense',
        description: 'Log any operational expense with category and receipt.',
        steps: [
          'Navigate to Expenses module',
          'Click "+ Add Expense"',
          'Enter Amount (₹)',
          'Select Category: Kitchen / Utilities / Staff / Marketing / Maintenance / Logistics / Other',
          'Write a short Description',
          'Select Payment Mode: Cash / Bank Transfer / UPI',
          'Change date if recording a past expense',
          'Optionally attach receipt photo for approval',
          'Click Submit',
        ],
      },
      {
        id: 'exp_petty_cash',
        title: 'Petty Cash Reconciliation',
        description: 'Track cash drawer float and end-of-day cash balance.',
        steps: [
          'At day start: Record Opening Cash Float amount',
          'Record all cash expenses throughout the day',
          'At day end: Click "End of Day Reconciliation"',
          'Enter actual cash counted in drawer',
          'System shows variance (expected vs actual)',
          'Investigate and explain any variance',
        ],
      },
    ],
    faqs: [
      { q: 'Expense category I need isn\'t available', a: 'Ask your admin to add custom expense categories in Expense Settings.' },
    ],
    troubleshooting: [
      { problem: 'Receipt photo upload failing', solution: 'Ensure image file is under 5MB. Compress the image if needed.' },
    ],
  },

  {
    id: 'reservations',
    icon: CalendarDays,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10',
    title: 'Table Reservations',
    description: 'Advance table bookings, guest check-in, no-show policy, and automated confirmations.',
    category: 'OPERATIONS',
    submodules: [
      {
        id: 'res_create',
        title: 'Create a Reservation',
        description: 'Book a table for a guest in advance.',
        steps: [
          'Navigate to Reservations',
          'Click "+ New Reservation"',
          'Enter Guest Name and Phone',
          'Select Date & Time of visit',
          'Enter Party Size (number of guests)',
          'Select Table Preference (optional)',
          'Add Special Notes: Birthday, Anniversary, Dietary',
          'Record Advance Deposit if taken',
          'Click Save — SMS/WhatsApp confirmation sent to guest',
        ],
      },
      {
        id: 'res_checkin',
        title: 'Guest Check-In on Arrival',
        description: 'Seat a guest when they arrive for their reservation.',
        steps: [
          'In Reservations calendar, find the booking',
          'When guest arrives, click their booking',
          'Click "Check In & Seat"',
          'Select the actual table to assign',
          'Table changes to Occupied in floor plan',
          'Start taking their order immediately',
        ],
      },
      {
        id: 'res_noshow',
        title: 'Handle No-Shows',
        description: 'Manage guests who don\'t arrive for their reservation.',
        steps: [
          'After the grace period expires, find the reservation',
          'Click "Mark No-Show"',
          'Action taken per your configured No-Show Policy:',
          '  • Reallocate Table: Table becomes immediately Available',
          '  • Chargeable Hold: Holding fee charged per your rate',
          '  • Free Hold: Continue holding without charge',
        ],
      },
    ],
    faqs: [
      { q: 'Guest didn\'t receive confirmation SMS', a: 'Check that an SMS gateway is configured in integrations. Also verify the guest phone number is correct.' },
    ],
    troubleshooting: [
      { problem: 'Reservation not showing in calendar', solution: 'Verify the correct date was entered. Check if date filter is set to show future bookings.' },
    ],
  },

  {
    id: 'marketing',
    icon: Tag,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    title: 'Marketing & Promotions',
    description: 'Coupon codes, happy hours, customer broadcasts, and campaign ROI tracking.',
    category: 'MARKETING & GROWTH',
    submodules: [
      {
        id: 'mktg_coupon',
        title: 'Create a Coupon Code',
        description: 'Set up discount codes for customers.',
        steps: [
          'Navigate to Marketing → Coupons',
          'Click "+ New Coupon"',
          'Enter a memorable Code (e.g., DIWALI20)',
          'Select Discount Type: Flat ₹ Amount or Percentage %',
          'Set Minimum Order Value required',
          'Set Maximum Discount cap (for percentage discounts)',
          'Set Usage Limit (total redemptions) and Per Customer Limit',
          'Set Validity: Start Date and End Date',
          'Select Applicable Order Types: All / Dine-In / Delivery',
          'Save — code is immediately usable at POS',
        ],
      },
      {
        id: 'mktg_happyhour',
        title: 'Set Up Happy Hours',
        description: 'Auto-apply discounts during specific time windows.',
        steps: [
          'Go to Marketing → Happy Hours',
          'Click "+ New Happy Hour"',
          'Set Time Range: e.g., 3:00 PM – 6:00 PM',
          'Select Days: Weekdays / Weekends / All Days',
          'Select Applicable Categories: e.g., Beverages, Starters',
          'Set Discount percentage',
          'Save — auto-applies during configured time window',
        ],
      },
    ],
    faqs: [
      { q: 'Coupon not applying in POS', a: 'Check coupon is active, within validity dates, and the order meets the minimum spend requirement.' },
    ],
    troubleshooting: [
      { problem: 'Happy hour not triggering', solution: 'Verify the time range is correct and the current time falls within it. Check day-of-week settings.' },
    ],
  },

  {
    id: 'hardware',
    icon: Printer,
    iconColor: 'text-gray-400',
    iconBg: 'bg-gray-500/10',
    title: 'Hardware & Printers',
    description: 'Configure network printers, cash drawers, and barcode scanners.',
    category: 'SETTINGS & SYSTEM',
    submodules: [
      {
        id: 'hw_receiptprinter',
        title: 'Configure Receipt Printer',
        description: 'Set up the customer bill printer at the counter.',
        steps: [
          'Navigate to Hardware → Receipt Printers',
          'Click "+ Add Printer"',
          'Select Connection: Network (LAN/WiFi) / USB / Bluetooth',
          'For Network: Enter printer IP address and port (usually 9100)',
          'Select printer model or choose "ESC/POS Compatible"',
          'Set Paper Width: 58mm or 80mm',
          'Configure Header: Restaurant name will auto-populate',
          'Set Footer message (e.g., "Thank you for dining with us!")',
          'Click "Test Print" — verify a test receipt prints',
          'Click Save',
        ],
        tips: ['Most network printers use port 9100. Check your printer\'s user manual if this doesn\'t work.'],
      },
      {
        id: 'hw_kotprinter',
        title: 'Configure KOT Kitchen Printers',
        description: 'Set up printers for different kitchen sections.',
        steps: [
          'Navigate to Hardware → KOT Printers',
          'Add a printer per kitchen section (Main Kitchen, Bar, Grill)',
          'For each: Enter IP + Port and connection type',
          'Set Category Routing: Which menu categories print to this printer',
          'Test print and save each section printer',
        ],
      },
    ],
    faqs: [
      { q: 'Printer was working and now it\'s not', a: 'First check if the printer IP address changed (DHCP can reassign IPs). Set a static IP on your printer for reliability.' },
      { q: 'KOT going to the wrong station printer', a: 'Check category routing rules in Hardware → KOT Printers. Ensure menu item categories match printer routing.' },
    ],
    troubleshooting: [
      { problem: 'Printer shows offline', solution: 'Check power cable, network cable, and verify printer is on same WiFi network as your admin computer.' },
      { problem: 'Garbled printout text', solution: 'Wrong paper width configured. Switch between 58mm and 80mm in printer settings.' },
      { problem: 'Cash drawer not opening', solution: 'Verify serial cable connection between printer and cash drawer. Check pulse trigger settings.' },
    ],
  },

  {
    id: 'audit-vault',
    icon: ShieldAlert,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'Security Audit Vault',
    description: 'Immutable log of all staff logins, bill voids, discount overrides, and sensitive actions.',
    category: 'SETTINGS & SYSTEM',
    submodules: [
      {
        id: 'audit_loginledger',
        title: 'Staff Login Ledger',
        description: 'Track all staff logins and session activity.',
        steps: [
          'Navigate to Audit Vault → Login Ledger tab',
          'See all login events with: Staff Name, Time, Device/Browser, IP Address',
          'Failed login attempts are highlighted in red',
          'Filter by date range and staff member',
        ],
      },
      {
        id: 'audit_sensitive',
        title: 'Sensitive Actions Log',
        description: 'Review all voids, cancellations, and overrides.',
        steps: [
          'Navigate to Audit Vault → Sensitive Actions tab',
          'Filter by action type: VOID / CANCEL / DISCOUNT / DRAWER_OPEN',
          'Each log shows: Timestamp, Staff, Action, Details, Reason',
          'Click any entry to see full context and order details',
        ],
        tips: ['Regularly review the Sensitive Actions log to detect unauthorized voids or excessive discounting'],
      },
    ],
    faqs: [
      { q: 'Can I delete logs from the Audit Vault?', a: 'No. The Audit Vault is an immutable ledger — logs cannot be deleted or modified by anyone, including admins. This protects your business.' },
      { q: 'How long are logs retained?', a: 'Logs are retained based on your subscription plan. Contact support for your retention period.' },
    ],
    troubleshooting: [
      { problem: 'Cannot find a specific void event', solution: 'Widen the date range filter and search by order number rather than by action type.' },
    ],
  },
];

// ─── Category groups for sidebar ─────────────────────────────────────────────
const CATEGORIES = ['OPERATIONS', 'INVENTORY & MENU', 'FINANCE & TEAM', 'MARKETING & GROWTH', 'SETTINGS & SYSTEM'];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'OPERATIONS': ShoppingCart,
  'INVENTORY & MENU': Package,
  'FINANCE & TEAM': BarChart3,
  'MARKETING & GROWTH': Tag,
  'SETTINGS & SYSTEM': Settings,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedSubmodule, setExpandedSubmodule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'faq' | 'troubleshoot' | 'workflows'>('guide');
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_SECTIONS;
    const q = searchQuery.toLowerCase();
    return GUIDE_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.submodules.some(
          (sm) =>
            sm.title.toLowerCase().includes(q) ||
            sm.description.toLowerCase().includes(q) ||
            sm.steps.some((step) => step.toLowerCase().includes(q))
        ) ||
        s.faqs.some((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const currentSection = activeSection ? GUIDE_SECTIONS.find((s) => s.id === activeSection) : null;

  const handleExportGuide = (format: 'md' | 'txt') => {
    let content = '';
    if (format === 'md') {
      content = `# Restaurant OS — Tenant Admin User Guide\n\n`;
      GUIDE_SECTIONS.forEach((section) => {
        content += `## ${section.title}\n${section.description}\n\n`;
        section.submodules.forEach((sm) => {
          content += `### ${sm.title}\n${sm.description}\n\n**Steps:**\n`;
          sm.steps.forEach((step) => (content += `- ${step}\n`));
          content += '\n';
        });
        if (section.faqs.length) {
          content += `### FAQs\n`;
          section.faqs.forEach((faq) => {
            content += `**Q: ${faq.q}**\nA: ${faq.a}\n\n`;
          });
        }
        if (section.troubleshooting?.length) {
          content += `### Troubleshooting\n`;
          section.troubleshooting.forEach((t) => {
            content += `- **${t.problem}**: ${t.solution}\n`;
          });
          content += '\n';
        }
      });
    } else {
      content = `RESTAURANT OS — TENANT ADMIN USER GUIDE\n${'='.repeat(50)}\n\n`;
      GUIDE_SECTIONS.forEach((section) => {
        content += `${section.title.toUpperCase()}\n${'-'.repeat(40)}\n${section.description}\n\n`;
        section.submodules.forEach((sm) => {
          content += `  ${sm.title}\n  ${sm.description}\n\n  Steps:\n`;
          sm.steps.forEach((step, i) => (content += `  ${i + 1}. ${step}\n`));
          content += '\n';
        });
        if (section.faqs.length) {
          content += `  FAQs:\n`;
          section.faqs.forEach((faq) => {
            content += `  Q: ${faq.q}\n  A: ${faq.a}\n\n`;
          });
        }
        content += '\n';
      });
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ROS-TenantAdmin-UserGuide.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Restaurant OS — Tenant Admin User Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #111827; line-height: 1.7; font-size: 13px; }
    .cover { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 80px 60px; min-height: 200px; }
    .cover h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .cover p { font-size: 14px; opacity: 0.7; }
    .cover .badge { display: inline-block; background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-top: 16px; }
    .toc { padding: 40px 60px; background: #f8fafc; }
    .toc h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }
    .toc-item { padding: 6px 0; border-bottom: 1px dotted #e2e8f0; display: flex; justify-content: space-between; }
    .toc-item span { color: #475569; }
    .section { padding: 40px 60px; border-bottom: 2px solid #f1f5f9; }
    .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .section-icon { width: 48px; height: 48px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .section h2 { font-size: 22px; font-weight: 800; color: #0f172a; }
    .section .desc { color: #64748b; font-size: 13px; margin-top: 4px; }
    .submodule { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
    .submodule h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .submodule p { color: #64748b; margin-bottom: 12px; font-size: 12px; }
    ol { padding-left: 20px; }
    ol li { padding: 3px 0; color: #374151; }
    .faq-section { margin-top: 24px; }
    .faq-section h3 { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a; border-left: 4px solid #6366f1; padding-left: 12px; }
    .faq-item { margin-bottom: 16px; background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; }
    .faq-item strong { color: #1e293b; display: block; margin-bottom: 6px; }
    .faq-item p { color: #64748b; font-size: 12px; }
    .troubleshoot { margin-top: 24px; }
    .troubleshoot h3 { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a; border-left: 4px solid #ef4444; padding-left: 12px; }
    .trouble-item { display: flex; gap: 12px; margin-bottom: 10px; background: #fff7ed; border-radius: 8px; padding: 12px; border: 1px solid #fed7aa; }
    .trouble-prob { font-weight: 600; color: #9a3412; min-width: 180px; font-size: 12px; }
    .trouble-sol { color: #78350f; font-size: 12px; }
    .workflow { background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #bbf7d0; }
    .workflow h4 { font-size: 14px; font-weight: 700; color: #14532d; margin-bottom: 10px; }
    .workflow ol li { color: #166534; }
    .footer { background: #0f172a; color: white; padding: 30px 60px; text-align: center; }
    .footer p { opacity: 0.6; font-size: 11px; }
    @media print { .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="cover">
    <h1>🍽️ Restaurant OS</h1>
    <h1>Tenant Admin — Complete User Guide</h1>
    <p>Comprehensive step-by-step guide covering all modules, workflows, FAQs, and troubleshooting</p>
    <div class="badge">Version 2.0 | September 2026 | Tenant Administrator</div>
  </div>
  
  <div class="toc">
    <h2>Table of Contents</h2>
    ${GUIDE_SECTIONS.map((s, i) => `
      <div class="toc-item">
        <span>${i + 1}. ${s.title}</span>
        <span>${s.category}</span>
      </div>
    `).join('')}
  </div>

  ${GUIDE_SECTIONS.map((section) => `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">📋</div>
        <div>
          <h2>${section.title}</h2>
          <p class="desc">${section.description}</p>
        </div>
      </div>
      
      ${section.submodules.map((sm) => `
        <div class="submodule">
          <h3>${sm.title}</h3>
          <p>${sm.description}</p>
          <ol>
            ${sm.steps.map((step) => `<li>${step}</li>`).join('')}
          </ol>
          ${sm.tips ? `<p style="margin-top:10px;color:#4338ca;font-size:11px;"><strong>💡 Tips:</strong> ${sm.tips.join(' • ')}</p>` : ''}
        </div>
      `).join('')}

      ${section.workflows?.length ? `
        <div class="troubleshoot">
          <h3>📋 Workflow Examples</h3>
          ${section.workflows.map((w) => `
            <div class="workflow">
              <h4>${w.title}</h4>
              <ol>${w.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${section.faqs.length ? `
        <div class="faq-section">
          <h3>❓ Frequently Asked Questions</h3>
          ${section.faqs.map((faq) => `
            <div class="faq-item">
              <strong>Q: ${faq.q}</strong>
              <p>A: ${faq.a}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${section.troubleshooting?.length ? `
        <div class="troubleshoot">
          <h3>🔧 Troubleshooting</h3>
          ${section.troubleshooting.map((t) => `
            <div class="trouble-item">
              <div class="trouble-prob">❌ ${t.problem}</div>
              <div class="trouble-sol">✅ ${t.solution}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <p>Restaurant OS (ROS) — Enterprise Multi-Tenant Cloud POS</p>
    <p>For technical support: support@restaurantos.cloud | This document is confidential and intended for authorized tenant administrators only.</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 800);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-0 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Help & User Guide</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete step-by-step documentation for every module and workflow on this admin panel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportGuide('md')}
              className="gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl border-border/70"
            >
              <FileText className="w-3.5 h-3.5" />
              .md
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportGuide('txt')}
              className="gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl border-border/70"
            >
              <Terminal className="w-3.5 h-3.5" />
              .txt
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              className="gap-1.5 text-xs font-bold h-8 px-4 rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-5 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules, steps, FAQs..."
            className="pl-10 h-10 text-sm rounded-xl bg-background/60 border-border/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Left: Module List */}
        <div className="w-64 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="p-3 border-b border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Modules</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
            {/* All sections button */}
            <button
              onClick={() => setActiveSection(null)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2',
                !activeSection
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              All Modules
              <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 font-bold">
                {GUIDE_SECTIONS.length}
              </Badge>
            </button>

            {CATEGORIES.map((cat) => {
              const CatIcon = CATEGORY_ICONS[cat];
              const catSections = filteredSections.filter((s) => s.category === cat);
              if (!catSections.length) return null;
              return (
                <div key={cat}>
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest px-3 pt-3 pb-1">
                    {cat}
                  </p>
                  {catSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => { setActiveSection(section.id); setExpandedSubmodule(null); setActiveTab('guide'); }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
                          activeSection === section.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        )}
                      >
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', activeSection === section.id ? section.iconColor : '')} />
                        <span className="truncate">{section.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right: Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto rounded-2xl border border-border/60 bg-card no-scrollbar">
          {!activeSection ? (
            /* All modules grid view */
            <div className="p-6 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {searchQuery ? `Results for "${searchQuery}"` : 'All Modules'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filteredSections.length} module{filteredSections.length !== 1 ? 's' : ''} found — click any module to view the detailed guide
                </p>
              </div>

              {filteredSections.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs mt-1">Try different search terms</p>
                </div>
              ) : (
                CATEGORIES.map((cat) => {
                  const catSections = filteredSections.filter((s) => s.category === cat);
                  if (!catSections.length) return null;
                  return (
                    <div key={cat}>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{cat}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catSections.map((section) => {
                          const Icon = section.icon;
                          return (
                            <button
                              key={section.id}
                              onClick={() => { setActiveSection(section.id); setExpandedSubmodule(null); setActiveTab('guide'); }}
                              className="group text-left p-4 rounded-2xl border border-border/60 hover:border-primary/40 bg-background/50 hover:bg-muted/20 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', section.iconBg)}>
                                  <Icon className={cn('w-4.5 h-4.5', section.iconColor)} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-foreground truncate">{section.title}</p>
                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 ml-2" />
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{section.description}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] text-muted-foreground/60">{section.submodules.length} guides</span>
                                    {section.faqs.length > 0 && <span className="text-[10px] text-muted-foreground/60">{section.faqs.length} FAQs</span>}
                                    {section.workflows?.length && <span className="text-[10px] text-muted-foreground/60">{section.workflows.length} workflows</span>}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : currentSection ? (
            /* Module detail view */
            <div>
              {/* Module header */}
              <div className="sticky top-0 z-10 border-b border-border/50 bg-card px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    ← All Modules
                  </button>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-xs font-semibold text-foreground">{currentSection.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', currentSection.iconBg)}>
                    <currentSection.icon className={cn('w-5 h-5', currentSection.iconColor)} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground">{currentSection.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{currentSection.description}</p>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 mt-4">
                  {[
                    { id: 'guide', label: 'How-To Guide', icon: BookOpen },
                    { id: 'faq', label: `FAQs (${currentSection.faqs.length})`, icon: MessageSquare },
                    ...(currentSection.troubleshooting?.length ? [{ id: 'troubleshoot', label: 'Troubleshoot', icon: AlertCircle }] : []),
                    ...(currentSection.workflows?.length ? [{ id: 'workflows', label: 'Workflows', icon: Zap }] : []),
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          activeTab === tab.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        <TabIcon className="w-3 h-3" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* How-To Guide Tab */}
                {activeTab === 'guide' && (
                  <div className="space-y-4">
                    {currentSection.submodules.map((sm) => (
                      <div key={sm.id} className="rounded-2xl border border-border/60 bg-background/50 overflow-hidden">
                        <button
                          onClick={() => setExpandedSubmodule(expandedSubmodule === sm.id ? null : sm.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-all text-left"
                        >
                          <div>
                            <p className="text-sm font-bold text-foreground">{sm.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{sm.description}</p>
                          </div>
                          {expandedSubmodule === sm.id
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          }
                        </button>
                        {expandedSubmodule === sm.id && (
                          <div className="border-t border-border/40 p-4 space-y-4">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step-by-Step</p>
                              <ol className="space-y-2">
                                {sm.steps.map((step, i) => (
                                  <li key={i} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center mt-0.5">
                                      {i + 1}
                                    </span>
                                    <span className="text-sm text-foreground/80 leading-relaxed">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                            {sm.tips && sm.tips.length > 0 && (
                              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 space-y-1">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Info className="w-3 h-3" /> Pro Tips
                                </p>
                                {sm.tips.map((tip, i) => (
                                  <p key={i} className="text-xs text-blue-300/80 leading-relaxed">{tip}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* FAQ Tab */}
                {activeTab === 'faq' && (
                  <div className="space-y-3">
                    {currentSection.faqs.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No FAQs for this module yet.</p>
                      </div>
                    ) : (
                      currentSection.faqs.map((faq, i) => (
                        <div key={i} className="rounded-xl border border-border/60 bg-background/50 p-4">
                          <div className="flex gap-3">
                            <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              Q
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-bold text-foreground">{faq.q}</p>
                              <div className="flex gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                  A
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Troubleshooting Tab */}
                {activeTab === 'troubleshoot' && currentSection.troubleshooting && (
                  <div className="space-y-3">
                    {currentSection.troubleshooting.map((t, i) => (
                      <div key={i} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">{t.problem}</p>
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <p className="text-sm text-muted-foreground leading-relaxed">{t.solution}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Workflows Tab */}
                {activeTab === 'workflows' && currentSection.workflows && (
                  <div className="space-y-4">
                    {currentSection.workflows.map((wf, i) => (
                      <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          {wf.title}
                        </h3>
                        <div className="space-y-2">
                          {wf.steps.map((step, si) => (
                            <div key={si} className="flex items-start gap-3">
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-1" />
                              <p className="text-sm text-foreground/80 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
