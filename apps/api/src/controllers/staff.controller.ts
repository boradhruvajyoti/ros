// =============================================================================
// Staff & HR Controller — Employees, User Accounts, Permissions & Attendance
// =============================================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { TelegramService } from '../services/telegram.service';
import { cacheDel } from '../lib/redis';
import { z } from 'zod';

export const FEATURE_MODULES = [
  // Primary Dining & Floor Operations
  {
    id: 'dashboard',
    category: '🍽️ Dining & Floor Operations',
    name: 'Dashboard Overview',
    description: 'Executive dashboard, real-time live revenue counters and activity feed',
    keyPermission: 'reports:view',
    permissions: ['reports:view'],
    submodules: [
      { id: 'dashboard_revenue', name: 'Live Revenue & Sales KPIs', description: 'Real-time gross/net sales, average check size, and hourly revenue curves' },
      { id: 'dashboard_activity', name: 'Floor Activity Feed', description: 'Live log of newly seated tables, open KOTs, and pending customer bills' },
      { id: 'dashboard_velocity', name: 'Dish Velocity & Fast Movers', description: 'Top performing dishes, category proportions, and table turnover pace' },
      { id: 'dashboard_actions', name: 'Quick Operations Jump', description: 'Instant shortcuts to KDS station, POS checkout, and table seating' },
    ],
  },
  {
    id: 'orders',
    category: '🍽️ Dining & Floor Operations',
    name: 'Current Orders',
    description: 'Live active orders queue, running KOT progress, and dining ticket advancement',
    keyPermission: 'orders:create',
    permissions: ['orders:create', 'orders:view', 'orders:edit', 'tables:view'],
    submodules: [
      { id: 'orders_live_queue', name: 'Live Orders Monitor', description: 'Real-time queue of all open Dine-In, Takeaway, and Delivery orders' },
      { id: 'orders_kot_progress', name: 'Running KOT Progress', description: 'Per-dish cooking status, preparation timers, and delay indicators' },
      { id: 'orders_status_bump', name: 'Order Status Advancement', description: 'Advance orders between Confirmed, Preparing, Ready, and Completed' },
      { id: 'orders_quick_settle', name: 'Quick Bill Settlement', description: 'Instant invoice generation, split payments, and receipt printing' },
    ],
  },
  {
    id: 'tables',
    category: '🍽️ Dining & Floor Operations',
    name: 'Tables & Floor Plan',
    description: 'Floor view, live table orders, KOT status advance, billing preview',
    keyPermission: 'tables:view',
    permissions: ['tables:view', 'tables:edit', 'orders:view', 'orders:edit', 'menu:view'],
    submodules: [
      { id: 'tables_floor_map', name: 'Interactive Floor Map', description: 'Visual table layout across zones: Main Hall, AC Room, Outdoor, Rooftop' },
      { id: 'tables_occupancy', name: 'Table Occupancy & Status', description: 'Live status: Available, Occupied, Reserved, Billed, Cleaning' },
      { id: 'tables_active_kots', name: 'Table Order & KOT Preview', description: 'View active order items, add dishes, reprint KOTs, and live bill estimate' },
      { id: 'tables_transfer', name: 'Table Transfer & Merge', description: 'Shift guests between tables, merge party tables, or split group checks' },
    ],
  },
  {
    id: 'pos',
    category: '🍽️ Dining & Floor Operations',
    name: 'Point of Sale (POS)',
    description: 'Touch order billing, table orders, cart modifiers, fast pay',
    keyPermission: 'orders:create',
    permissions: ['orders:create', 'orders:edit', 'payments:create', 'discount:apply', 'menu:view'],
    submodules: [
      { id: 'pos_touch_entry', name: 'Touch Order Entry Terminal', description: 'Visual menu grid with instant search, category tabs, and favorite dishes' },
      { id: 'pos_modifiers', name: 'Modifiers & Cooking Notes', description: 'Portion variants, spice level notes, extra toppings, and custom instructions' },
      { id: 'pos_split_pay', name: 'Multi-Mode Split Pay', description: 'Split bills across Cash, UPI QR, Credit Card, Gift Card, and Ledger' },
      { id: 'pos_discounts', name: 'Discounts & Promo Vouchers', description: 'Manager discount overrides, coupon redemption, and tax exemptions' },
    ],
  },
  {
    id: 'kitchen',
    category: '🍽️ Dining & Floor Operations',
    name: 'Kitchen Display (KDS)',
    description: 'Live KOT tickets, accept orders, cooking bump, partial/full cancel',
    keyPermission: 'kitchen:view',
    permissions: ['kitchen:view', 'kitchen:update', 'orders:view', 'menu:view'],
    submodules: [
      { id: 'kds_cook_station', name: 'Chef & Cook Station', description: 'Incoming KOT ticket queue, item prep status bump, and kitchen timer' },
      { id: 'kds_runner_station', name: 'Waiter & Runner Station', description: 'Ready to serve dish queue, table notifications, and served dish bump' },
      { id: 'kds_archive_undo', name: 'Served Archive & Undo', description: 'History of completed tickets with accidental complete undo restoration' },
      { id: 'kds_routing', name: 'Station Filtering & Routing', description: 'Filter orders by station: Grill, Bar, Tandoor, Dessert, Main Kitchen' },
    ],
  },
  {
    id: 'history',
    category: '🍽️ Dining & Floor Operations',
    name: 'Order History & Invoices',
    description: 'View previous orders, reprint receipts, audit customer bills',
    keyPermission: 'payments:view',
    permissions: ['orders:view', 'payments:view'],
    submodules: [
      { id: 'history_ledger', name: 'Closed Invoices Ledger', description: 'Searchable ledger of all historical, paid, and closed customer orders' },
      { id: 'history_reprint', name: 'Invoice & Receipt Reprint', description: 'Reprint thermal receipts, customer tax invoices, and payment slips' },
      { id: 'history_void_audit', name: 'Void & Cancel Audit Trail', description: 'Detailed records of bill voids, item cancellations, and refund reasons' },
      { id: 'history_filter', name: 'Payment Breakdown Filter', description: 'Filter past transactions by Cash, Card, UPI, Swiggy, Zomato, or Delivery' },
    ],
  },
  {
    id: 'reservations',
    category: '🍽️ Dining & Floor Operations',
    name: 'Table Reservations',
    description: 'Book tables, manage calendar, guest arrivals',
    keyPermission: 'reservations:view',
    permissions: ['reservations:view', 'reservations:create', 'reservations:edit', 'reservations:cancel'],
    submodules: [
      { id: 'res_calendar', name: 'Reservation Calendar & Slots', description: 'Daily booking calendar, lunch/dinner shift capacities, and table allocations' },
      { id: 'res_booking_mgmt', name: 'Guest Booking Management', description: 'Record guest contact, special dietary notes, advance deposit, and party size' },
      { id: 'res_checkin', name: 'Arrival Check-In & Seating', description: 'Instant guest check-in, auto-seat to table, or mark as No-Show / Cancelled' },
      { id: 'res_alerts', name: 'SMS & WhatsApp Confirmations', description: 'Automated booking confirmation and reminder alerts sent to guests' },
    ],
  },

  // Inventory & Kitchen Supply
  {
    id: 'menu',
    category: '📦 Inventory & Kitchen Supply',
    name: 'Menu & Category Management',
    description: 'Create dishes, prices, half/full variants, modifier groups',
    keyPermission: 'menu:create',
    permissions: ['menu:view', 'menu:create', 'menu:edit', 'menu:delete'],
    submodules: [
      { id: 'menu_dish_master', name: 'Dish & Item Catalog Master', description: 'Create/edit dishes, short codes, descriptions, and dietary badges' },
      { id: 'menu_categories', name: 'Category & Sub-Category Tree', description: 'Organize menu into Starters, Mains, Breads, Beverages, Desserts' },
      { id: 'menu_variants', name: 'Variants & Portion Pricing', description: 'Configure regular, large, half, full, combo portion sizes and custom prices' },
      { id: 'menu_modifiers', name: 'Modifier Groups & Add-ons', description: 'Create modifier groups with min/max selection rules and price additions' },
      { id: 'menu_86_toggle', name: 'Real-Time 86 / Out of Stock', description: 'Instantly mark dishes available or sold out across POS, Kiosk, and QR menu' },
    ],
  },
  {
    id: 'inventory',
    category: '📦 Inventory & Kitchen Supply',
    name: 'Stock & Inventory',
    description: 'Track ingredient stocks, low stock alerts, stock physical counts',
    keyPermission: 'inventory:view',
    permissions: ['inventory:view', 'inventory:adjust', 'inventory:count'],
    submodules: [
      { id: 'inv_live_balance', name: 'Raw Ingredient Stock Levels', description: 'Live balances of grocery, dairy, meat, spices, beverages, and packaging' },
      { id: 'inv_low_alerts', name: 'Low Stock & Wastage Alerts', description: 'Automated warnings when ingredients fall below minimum safety thresholds' },
      { id: 'inv_adjustments', name: 'Stock Adjustments & Write-offs', description: 'Record damaged items, expired ingredients, spoilage, and manual adjustments' },
      { id: 'inv_reconciliation', name: 'Physical Count & Stock Take', description: 'Periodic stock-take reconciliation comparing physical count against book balance' },
    ],
  },
  {
    id: 'production',
    category: '📦 Inventory & Kitchen Supply',
    name: 'Recipe Yields & Production',
    description: 'Batch production, sub-recipes, kitchen prep batch conversions',
    keyPermission: 'inventory:write-off',
    permissions: ['inventory:view', 'inventory:write-off'],
    submodules: [
      { id: 'prod_bom', name: 'Recipe Bill of Materials (BOM)', description: 'Attach raw ingredients and gram weights for automatic stock deduction' },
      { id: 'prod_batch_prep', name: 'Batch Prep & Sub-Recipes', description: 'Record kitchen prep conversions: sauces, gravies, dough, bulk marinades' },
      { id: 'prod_yield_tracking', name: 'Yield & Shrinkage Factors', description: 'Track raw-to-cooked yield percentages and shrinkage during preparation' },
      { id: 'prod_auto_deduct', name: 'Auto Ingredient Deduction', description: 'Real-time deduction of raw stock whenever a dish is ordered and bumped' },
    ],
  },
  {
    id: 'procurement',
    category: '📦 Inventory & Kitchen Supply',
    name: 'Procurement & Vendors',
    description: 'Purchase orders, supplier bills, goods receipt notes (GRN)',
    keyPermission: 'procurement:view',
    permissions: ['procurement:view', 'procurement:create', 'procurement:receive', 'procurement:approve'],
    submodules: [
      { id: 'proc_vendors', name: 'Supplier & Vendor Directory', description: 'Manage vendor contacts, GSTIN numbers, payment terms, and catalogs' },
      { id: 'proc_po', name: 'Purchase Orders (PO) Workflow', description: 'Draft, submit, approve, and send purchase orders directly to suppliers' },
      { id: 'proc_grn', name: 'Goods Receipt Notes (GRN)', description: 'Receive inward shipments, record quantity delivered vs ordered, and batch numbers' },
      { id: 'proc_invoices', name: 'Supplier Invoices & Payables', description: 'Track supplier bills, outstanding balances, payment status, and due dates' },
    ],
  },
  {
    id: 'transfers',
    category: '📦 Inventory & Kitchen Supply',
    name: 'Stock Transfers',
    description: 'Inter-branch stock transfers and central warehouse dispatch',
    keyPermission: 'inventory:transfer',
    permissions: ['inventory:view', 'inventory:transfer'],
    submodules: [
      { id: 'transfer_requisitions', name: 'Inter-Branch Stock Requests', description: 'Request raw ingredients and supplies from central commissary or sister outlets' },
      { id: 'transfer_dispatch', name: 'Dispatch & Transit Tracking', description: 'Approve, pack, and dispatch stock transfers with gate pass and transit tracking' },
      { id: 'transfer_receive', name: 'Inward Receiving & Verification', description: 'Accept incoming stock transfers, verify damaged goods, and update inventory' },
    ],
  },

  // Finance, HR & Management
  {
    id: 'customers',
    category: '💼 Finance, HR & Management',
    name: 'Customers CRM & Loyalty',
    description: 'Guest contacts, visit frequency, loyalty reward points',
    keyPermission: 'customers:view',
    permissions: ['customers:view', 'customers:create', 'loyalty:view'],
    submodules: [
      { id: 'cust_directory', name: 'Guest Directory & Profiles', description: 'Customer contact book, anniversary/birthday tracking, and dining preferences' },
      { id: 'cust_history', name: 'Visit Frequency & Lifetime Spend', description: 'Detailed visit timeline, total orders placed, average check size, and VIP tier' },
      { id: 'cust_loyalty', name: 'Loyalty Points Ledger', description: 'Automated points earn rules on spend, points balance check, and manual bonus grants' },
      { id: 'cust_segments', name: 'Tags & Customer Segmentation', description: 'Categorize guests: VIP, Regular, Family, Corporate, High Spender, At Risk' },
    ],
  },
  {
    id: 'staff',
    category: '💼 Finance, HR & Management',
    name: 'Staff & Team HR',
    description: 'Employee roster, attendance check-ins, staff accounts & access control',
    keyPermission: 'staff:view',
    permissions: ['staff:view', 'staff:create', 'staff:edit', 'attendance:view', 'attendance:manage'],
    submodules: [
      { id: 'staff_roster', name: 'Employee Directory & Profiles', description: 'Staff directory, designations, contact details, salary, and emergency info' },
      { id: 'staff_attendance', name: 'Attendance & Shift Clocking', description: 'Daily biometric / PIN check-in, working hours, and monthly attendance sheets' },
      { id: 'staff_rbac', name: 'Role-Based Access Control (RBAC)', description: 'Assign module and submodule permissions, custom roles, and security restrictions' },
      { id: 'staff_telegram', name: 'Telegram Notification Triggers', description: 'Configure automated real-time alert triggers delivered to staff Telegram bots' },
    ],
  },
  {
    id: 'expenses',
    category: '💼 Finance, HR & Management',
    name: 'Expenses & Payouts',
    description: 'Daily operational expenses, petty cash, payout vouchers',
    keyPermission: 'expenses:view',
    permissions: ['expenses:view', 'expenses:create', 'expenses:approve'],
    submodules: [
      { id: 'exp_daily_entry', name: 'Operational Expense Entry', description: 'Record daily out-of-pocket expenses: gas, ice, cleaning, local purchases' },
      { id: 'exp_petty_cash', name: 'Petty Cash & Drawer Register', description: 'Track petty cash opening float, cash payouts, and end-of-shift reconciliation' },
      { id: 'exp_categories', name: 'Categories & Cost Centers', description: 'Categorize expenses by Utilities, Kitchen, Logistics, Marketing, Repairs' },
      { id: 'exp_approvals', name: 'Receipts & Approval Workflow', description: 'Attach receipt photos, submit for manager approval, and export vouchers' },
    ],
  },
  {
    id: 'reports',
    category: '💼 Finance, HR & Management',
    name: 'Reports & P&L Analytics',
    description: 'Sales summaries, tax reports, item performance, profit & loss',
    keyPermission: 'reports:export',
    permissions: ['reports:view', 'reports:export'],
    submodules: [
      { id: 'rep_sales_summary', name: 'Sales & Revenue Summaries', description: 'Daily, weekly, monthly gross/net revenue, discounts, and net collection' },
      { id: 'rep_item_performance', name: 'Item & Category Performance', description: 'Rank best sellers, slow moving items, category profit margins, and peak hours' },
      { id: 'rep_tax_gst', name: 'Tax, GST & VAT Compliance', description: 'Output tax breakdown, CGST, SGST, IGST, VAT summary for accountant filing' },
      { id: 'rep_pnl_statement', name: 'Profit & Loss (P&L) Statement', description: 'Revenue vs COGS vs operational expenses breakdown for net profit calculation' },
    ],
  },

  // Growth, Marketing & Digital
  {
    id: 'ai-insights',
    category: '🚀 Growth, Marketing & Digital',
    name: 'AI Insights & Forecasts',
    description: 'AI revenue forecast, demand prediction, inventory wastage alerts',
    keyPermission: 'loyalty:adjust',
    permissions: ['reports:view', 'loyalty:adjust'],
    submodules: [
      { id: 'ai_revenue_forecast', name: 'Revenue & Demand Forecast', description: 'Machine learning forecast of next week sales volume and guest covers' },
      { id: 'ai_wastage_alerts', name: 'Wastage & Overstock Alerts', description: 'Smart anomaly detection for ingredients nearing expiration or excessive shrinkage' },
      { id: 'ai_menu_engineering', name: 'Menu Engineering & Pricing', description: 'Identify Stars, Plowhorses, Puzzles, and Dogs to optimize menu profitability' },
      { id: 'ai_staffing_recom', name: 'Rush Hour Staffing Recommendations', description: 'AI recommended staffing levels based on historical rush hour patterns' },
    ],
  },
  {
    id: 'marketing',
    category: '🚀 Growth, Marketing & Digital',
    name: 'Marketing & Promotions',
    description: 'Coupon codes, happy hour discounts, customer campaigns',
    keyPermission: 'price:override',
    permissions: ['customers:view', 'price:override'],
    submodules: [
      { id: 'mktg_coupons', name: 'Coupon Codes & Promo Rules', description: 'Create fixed amount / percentage discount codes with min spend and usage limits' },
      { id: 'mktg_happy_hours', name: 'Happy Hours & Timed Specials', description: 'Automate time-restricted discounts: weekday lunches, late night specials' },
      { id: 'mktg_broadcasts', name: 'SMS & WhatsApp Broadcasts', description: 'Send targeted promotional messages to customer segments and inactive diners' },
      { id: 'mktg_roi_tracker', name: 'Campaign Performance & ROI', description: 'Measure redemption counts, incremental sales generated, and promo ROI' },
    ],
  },
  {
    id: 'gift-cards',
    category: '🚀 Growth, Marketing & Digital',
    name: 'Gift Cards & Vouchers',
    description: 'Issue gift vouchers, redeem prepaid cards, customer balances',
    keyPermission: 'payments:refund',
    permissions: ['customers:view', 'payments:refund'],
    submodules: [
      { id: 'gc_issuance', name: 'Prepaid Gift Card Issuance', description: 'Create physical or digital gift cards with unique barcode/QR and prepaid balance' },
      { id: 'gc_balance_topup', name: 'Balance Check & Top-Up', description: 'Instant balance inquiry at POS, reload card balance with cash or UPI payment' },
      { id: 'gc_redemption', name: 'Redemption & Split Settlement', description: 'Accept gift card payments at checkout with PIN verification and receipt balance print' },
      { id: 'gc_liability', name: 'Liability & Audit Ledger', description: 'Track unredeemed liability, total card sales, and expired balance forfeiture' },
    ],
  },
  {
    id: 'feedback',
    category: '🚀 Growth, Marketing & Digital',
    name: 'Guest Feedback & Ratings',
    description: 'Customer ratings, food quality reviews, dining experience surveys',
    keyPermission: 'customers:edit',
    permissions: ['customers:view', 'customers:edit'],
    submodules: [
      { id: 'fb_qr_surveys', name: 'Digital QR Feedback Forms', description: 'Table QR code enabling guests to submit ratings on food, service, and ambiance' },
      { id: 'fb_rating_dashboard', name: 'Rating & Review Analytics', description: 'Aggregate Net Promoter Score (NPS), 5-star ratings, and sentiment distribution' },
      { id: 'fb_instant_alerts', name: 'Negative Feedback Alerts', description: 'Immediate Telegram alert to floor manager when a customer rates below 3 stars' },
      { id: 'fb_dish_quality', name: 'Dish & Service Quality Trends', description: 'Identify dishes and staff members with consistently low or high satisfaction ratings' },
    ],
  },
  {
    id: 'integrations',
    category: '🚀 Growth, Marketing & Digital',
    name: 'Aggregators & Online Channels',
    description: 'Zomato, Swiggy, UberEats, WhatsApp ordering channel integrations',
    keyPermission: 'branches:view',
    permissions: ['settings:view', 'branches:view'],
    submodules: [
      { id: 'int_aggregators', name: 'Food Aggregators (Zomato / Swiggy)', description: 'Centralized menu sync, store toggle, and incoming online orders acceptance' },
      { id: 'int_whatsapp', name: 'WhatsApp Conversational Ordering', description: 'Direct guest menu ordering, KOT generation, and payment via WhatsApp chat bot' },
      { id: 'int_riders', name: 'Delivery Fleet & Rider Dispatch', description: 'Assign in-house delivery drivers, track live delivery status, and capture COD' },
      { id: 'int_webhooks', name: 'Webhooks & Third-Party APIs', description: 'Webhook triggers for third-party accounting, CRM, and ERP integrations' },
    ],
  },

  // System, Tech & Administration
  {
    id: 'kiosk',
    category: '⚙️ System, Tech & Administration',
    name: 'Touch Kiosk System',
    description: 'Self-ordering guest kiosk mode with touch menu interface',
    keyPermission: 'orders:void',
    permissions: ['orders:create', 'orders:void'],
    submodules: [
      { id: 'kiosk_touch_ui', name: 'Self-Ordering Kiosk Mode', description: 'Guest-facing touch UI for ordering with visual food photography and modifiers' },
      { id: 'kiosk_showcase', name: 'Menu & Category Showcase', description: 'Highlight combos, chef specials, upsell prompts, and dietary preferences' },
      { id: 'kiosk_self_checkout', name: 'Self-Checkout UPI QR & Pay', description: 'Instant dynamic on-screen UPI QR generation and integrated POS terminal trigger' },
      { id: 'kiosk_device_lock', name: 'Kiosk Device Locks & PIN', description: 'Admin passkey lock to prevent guests from closing or exiting kiosk application' },
    ],
  },
  {
    id: 'franchise',
    category: '⚙️ System, Tech & Administration',
    name: 'Franchise HQ & Multi-Outlet',
    description: 'Franchise royalty fee tracking and central brand controls',
    keyPermission: 'branches:create',
    permissions: ['branches:view', 'branches:create'],
    submodules: [
      { id: 'fran_overview', name: 'Multi-Outlet Master Overview', description: 'Live bird\'s eye view of all franchise locations, revenue, and active tickets' },
      { id: 'fran_royalties', name: 'Royalty & Fee Share Ledger', description: 'Automated calculation and billing of franchise royalty fees and contributions' },
      { id: 'fran_central_menu', name: 'Central Master Menu Push', description: 'Push standardized master recipes, dishes, and brand assets to all franchise outlets' },
      { id: 'fran_benchmarks', name: 'Cross-Outlet Benchmarking', description: 'Compare outlet revenue, average check, table turnover, and customer satisfaction' },
    ],
  },
  {
    id: 'settings',
    category: '⚙️ System, Tech & Administration',
    name: 'Restaurant Settings',
    description: 'Restaurant taxes (GST/VAT), service charge, operating hours',
    keyPermission: 'settings:edit',
    permissions: ['settings:view', 'settings:edit'],
    submodules: [
      { id: 'set_profile', name: 'Profile & Invoice Branding', description: 'Restaurant legal name, FSSAI / Tax ID, logo, address, and receipt header/footer' },
      { id: 'set_tax_service', name: 'Taxes, GST & Service Charge', description: 'Configure CGST, SGST, VAT rates, service charge percentage, and roundoff rules' },
      { id: 'set_hours_shifts', name: 'Operating Hours & Shifts', description: 'Set open/close hours, lunch/dinner break shifts, and auto-close business day time' },
      { id: 'set_gateways', name: 'Payment Gateways & UPI QR', description: 'Configure merchant UPI IDs, Razorpay / Stripe keys, and bank account details' },
    ],
  },
  {
    id: 'hardware',
    category: '⚙️ System, Tech & Administration',
    name: 'Hardware & Printers Setup',
    description: 'Network thermal printers, cash drawer triggers, barcode scanners',
    keyPermission: 'cash:open',
    permissions: ['settings:view', 'cash:open'],
    submodules: [
      { id: 'hw_bill_printers', name: 'Thermal Receipt & Bill Printers', description: 'Configure network LAN, Wi-Fi, USB, and Bluetooth ESC/POS receipt printers' },
      { id: 'hw_kot_printers', name: 'Kitchen KOT Section Printers', description: 'Route order tickets to dedicated kitchen section printers: Kitchen, Bar, Grill' },
      { id: 'hw_cash_drawers', name: 'Cash Drawer Kick Triggers', description: 'Configure pulse trigger on bill print or manual manager drawer pop' },
      { id: 'hw_scanners', name: 'Barcode & QR Code Scanners', description: 'Configure USB/Bluetooth 2D barcode scanners for fast menu and voucher lookup' },
    ],
  },
  {
    id: 'audit-vault',
    category: '⚙️ System, Tech & Administration',
    name: 'Security Audit Vault',
    description: 'Immutable ledger of staff logins, bill voids, and sensitive actions',
    keyPermission: 'cash:close',
    permissions: ['settings:view', 'cash:close'],
    submodules: [
      { id: 'audit_login_ledger', name: 'Staff Login & Session Ledger', description: 'Immutable record of user logins, device fingerprints, IP addresses, and session times' },
      { id: 'audit_overrides', name: 'Sensitive Actions & Overrides', description: 'Audit logs for bill voids, item cancellations, discount overrides, and drawer opens' },
      { id: 'audit_reprints', name: 'Bill Reprint & Change Trail', description: 'Detailed log of every receipt reprint with user ID and timestamp' },
      { id: 'audit_security_log', name: 'Security & Permission Logs', description: 'Log of permission changes, password resets, export operations, and config edits' },
    ],
  },
];

export const TELEGRAM_NOTIFICATION_CATALOG = [
  {
    id: 'ORDER_QR_NEW',
    category: 'Orders & Service',
    name: 'QR Menu New Orders',
    description: 'Alert when a customer places an order via QR menu with table & order type (Dine In / Parcel)',
  },
  {
    id: 'KOT_SENT',
    category: 'Orders & Service',
    name: 'KOT Sent to Kitchen',
    description: 'Alert when an order is fired and KOT is routed to kitchen displays/printers',
  },
  {
    id: 'KOT_ACCEPTED',
    category: 'Kitchen Display',
    name: 'KDS Order Accepted',
    description: 'Alert when chef acknowledges/accepts ticket in kitchen display',
  },
  {
    id: 'FOOD_READY',
    category: 'Kitchen Display',
    name: 'Food Ready to Serve',
    description: 'Alert waitstaff when dishes are marked ready for pickup at pass',
  },
  {
    id: 'FOOD_SERVED',
    category: 'Orders & Service',
    name: 'Food Served to Table',
    description: 'Alert when order items are marked served at the guest table',
  },
  {
    id: 'BILL_PAID',
    category: 'Billing & Cash',
    name: 'Bill Paid & Settled',
    description: 'Real-time billing alert with table info, ordered items, amount, and item count',
  },
  {
    id: 'EXPENSE_RECORDED',
    category: 'Billing & Cash',
    name: 'Expense Recorded',
    description: 'Alert when operational expenses, petty cash, or payout vouchers are logged',
  },
  {
    id: 'ORDER_CANCELLED_TABLES',
    category: 'Cancellations & Voids',
    name: 'Order Cancelled (Floor / Tables)',
    description: 'Alert when items or full orders are cancelled on floor tables view',
  },
  {
    id: 'ORDER_CANCELLED_KITCHEN',
    category: 'Cancellations & Voids',
    name: 'Order Cancelled (Kitchen Display)',
    description: 'Alert when chef or kitchen supervisor voids/cancels items in KDS',
  },
  {
    id: 'TABLE_RESERVATION_NEW',
    category: 'Reservations & Service',
    name: 'New Table Reservation',
    description: 'Alert when a guest books a table reservation with guest details & time slot',
  },
  {
    id: 'LOW_STOCK_ALERT',
    category: 'Inventory & Stock',
    name: 'Low Stock Alert',
    description: 'Immediate alert when ingredient or item stock falls below safe threshold',
  },
  {
    id: 'INVENTORY_MODIFIED',
    category: 'Inventory & Stock',
    name: 'Stock & Inventory Updates',
    description: 'Alert when ingredient stocks, batches, or purchase adjustments occur',
  },
  {
    id: 'MENU_MODIFIED',
    category: 'Menu Management',
    name: 'Menu Item Add / Edit / Delete',
    description: 'Alert when dishes, prices, modifier groups, or category items are changed',
  },
  {
    id: 'DAILY_SALES_REPORT',
    category: 'Reports & Analytics',
    name: 'Daily Sales & Top Items Report',
    description: 'End-of-day summary with tablewise breakdown, total sales & top selling items',
  },
  {
    id: 'DAILY_EXPENSES_REPORT',
    category: 'Reports & Analytics',
    name: 'Daily Expenses Report',
    description: 'Daily operational expenses and petty cash payout summary',
  },
  {
    id: 'MONTHLY_REPORT',
    category: 'Reports & Analytics',
    name: 'Monthly P&L & Revenue Report',
    description: 'Month-end consolidated revenue, expenses, and net profit report',
  },
  {
    id: 'STAFF_MODIFIED',
    category: 'Administration',
    name: 'Staff Added / Modified',
    description: 'Alert when an employee profile, role, or access permission is modified',
  },
];

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  designation: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  salary: z.number().nonnegative().optional(),
  // User account creation options
  createUserAccount: z.boolean().optional(),
  password: z.string().min(4).optional(),
  roleName: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  telegramChatId: z.string().optional().nullable(),
  telegramUsername: z.string().optional().nullable(),
  telegramNotifications: z.array(z.string()).optional(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  salary: z.number().nonnegative().optional().nullable(),
  // User account modification options
  createUserAccount: z.boolean().optional(),
  password: z.string().min(4).optional().or(z.literal('')),
  roleName: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActiveUser: z.boolean().optional(),
  telegramChatId: z.string().optional().nullable(),
  telegramUsername: z.string().optional().nullable(),
  telegramNotifications: z.array(z.string()).optional(),
});

const punchAttendanceSchema = z.object({
  employeeId: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']),
  notes: z.string().optional(),
});

export class StaffController {
  static async listEmployees(req: Request, res: Response) {
    const employees = await prisma.employee.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid!, isActive: true },
      include: {
        attendance: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = employees.map((e) => e.userId).filter(Boolean) as string[];
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              isActive: true,
              telegramChatId: true,
              telegramUsername: true,
              telegramNotifications: true,
              branchRoles: {
                include: {
                  role: {
                    include: {
                      permissions: { include: { permission: true } },
                    },
                  },
                },
              },
            },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = employees.map((emp) => {
      const user = emp.userId ? userMap.get(emp.userId) : null;
      let parsedTelegramNotifs: string[] = [];
      if (user?.telegramNotifications) {
        try {
          parsedTelegramNotifs = JSON.parse(user.telegramNotifications);
        } catch {
          parsedTelegramNotifs = [];
        }
      }
      return {
        ...emp,
        user: user
          ? {
              id: user.id,
              email: user.email,
              telegramChatId: user.telegramChatId,
              telegramUsername: user.telegramUsername,
              telegramNotifications: parsedTelegramNotifs,
              roles: user.branchRoles.map((br) => br.role.name),
              permissions: Array.from(
                new Set(user.branchRoles.flatMap((br) => br.role.permissions.map((p) => p.permission.code)))
              ),
            }
          : null,
      };
    });

    sendSuccess(res, enriched);
  }

  static async createEmployee(req: Request, res: Response) {
    const data = createEmployeeSchema.parse(req.body);
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    let createdUserId: string | null = null;

    // If user account creation is requested
    if (data.createUserAccount && data.email && data.password) {
      const normalizedEmail = data.email.toLowerCase().trim();

      // Check if user account already exists in this tenant
      const existingUser = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: normalizedEmail,
          },
        },
      });

      if (existingUser) {
        throw new AppError(
          ErrorCodes.ALREADY_EXISTS,
          `A user account with email "${normalizedEmail}" already exists for this restaurant.`,
          409
        );
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create a unique staff role for this user account so their permissions are exact and isolated
      const cleanBaseName = (data.roleName || data.designation || 'STAFF').toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const role = await prisma.role.create({
        data: {
          tenantId,
          name: `${cleanBaseName}_${Date.now().toString(36).toUpperCase()}`,
          description: `${data.designation || cleanBaseName} User Role`,
        },
      });

      // Assign ONLY the selected permissions to this role
      if (data.permissions && data.permissions.length > 0) {
        for (const code of data.permissions) {
          // Ensure permission exists in DB
          let perm = await prisma.permission.findUnique({ where: { code } });
          if (!perm) {
            perm = await prisma.permission.create({
              data: {
                code,
                category: code.split(':')[0] || 'general',
                description: `${code} feature access`,
              },
            });
          }

          // Link to role
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
        }
      }

      // Create User with Telegram connection preferences
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          name: data.name,
          email: normalizedEmail,
          phone: data.phone || null,
          passwordHash,
          isActive: true,
          telegramChatId: data.telegramChatId || null,
          telegramUsername: data.telegramUsername ? data.telegramUsername.replace(/^@/, '') : null,
          telegramNotifications: data.telegramNotifications ? JSON.stringify(data.telegramNotifications) : null,
          branchRoles: {
            create: {
              branchId,
              roleId: role.id,
            },
          },
        },
      });

      createdUserId = newUser.id;
    }

    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        department: data.department,
        designation: data.designation,
        phone: data.phone || null,
        email: data.email || null,
        salary: data.salary || 0,
        userId: createdUserId,
        tenantId,
        branchId,
      },
    });

    // Notify Superadmin / Staff on Telegram
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        tenantId,
        'STAFF_MODIFIED',
        `👤 <b>Staff Member Added</b>\n\n• <b>Name:</b> ${data.name}\n• <b>Designation:</b> ${data.designation}\n• <b>Department:</b> ${data.department}\n• <b>Email:</b> ${data.email || 'None'}\n• <b>Added By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Staff Alert Error]:', e));
    });

    sendSuccess(res, employee, 201);
  }

  static async updateEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const data = updateEmployeeSchema.parse(req.body);
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Staff member not found', 404);
    }

    let linkedUserId = employee.userId;

    // Handle user account updates or creation
    if (data.createUserAccount || linkedUserId) {
      const emailToUse = (data.email || employee.email)?.toLowerCase().trim();

      if (linkedUserId) {
        // User account exists — update credentials, status, and permissions
        const user = await prisma.user.findFirst({
          where: { id: linkedUserId, tenantId },
        });

        if (user) {
          const userUpdates: any = {
            name: data.name || user.name,
            phone: data.phone !== undefined ? data.phone : user.phone,
          };

          if (data.isActiveUser !== undefined) {
            userUpdates.isActive = data.isActiveUser;
          }

          if (data.telegramChatId !== undefined) {
            userUpdates.telegramChatId = data.telegramChatId || null;
          }

          if (data.telegramUsername !== undefined) {
            userUpdates.telegramUsername = data.telegramUsername ? data.telegramUsername.replace(/^@/, '') : null;
          }

          if (data.telegramNotifications !== undefined) {
            userUpdates.telegramNotifications = JSON.stringify(data.telegramNotifications || []);
          }

          if (emailToUse && emailToUse !== user.email) {
            // Check uniqueness
            const clash = await prisma.user.findFirst({
              where: { tenantId, email: emailToUse, id: { not: user.id } },
            });
            if (clash) {
              throw new AppError(
                ErrorCodes.ALREADY_EXISTS,
                `Email "${emailToUse}" is already in use by another account.`,
                409
              );
            }
            userUpdates.email = emailToUse;
          }

          if (data.password && data.password.trim().length >= 4) {
            userUpdates.passwordHash = await bcrypt.hash(data.password.trim(), 10);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: userUpdates,
          });

          // Handle role & permissions update
          if (data.permissions !== undefined || data.roleName !== undefined) {
            const cleanBaseName = (data.roleName || data.designation || employee.designation || 'STAFF')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '_');
            const uniqueRoleName = `${cleanBaseName}_${employee.id.slice(-6).toUpperCase()}`;

            // Check if user currently has an existing branch role
            const existingUbr = await prisma.userBranchRole.findFirst({
              where: { userId: user.id, branchId },
              include: { role: true },
            });

            const isSharedOrSystemRole = (name: string) =>
              ['OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'WAITER', 'CHEF', 'CASHIER', 'MANAGER', 'STAFF'].includes(name) ||
              !name.includes('_');

            let role: any = existingUbr?.role;
            if (!role || isSharedOrSystemRole(role.name)) {
              const foundRole = await prisma.role.findFirst({
                where: { tenantId, name: uniqueRoleName },
              });
              if (!foundRole) {
                role = await prisma.role.create({
                  data: {
                    tenantId,
                    name: uniqueRoleName,
                    description: `${data.designation || cleanBaseName} Staff Role`,
                  },
                });
              } else {
                role = foundRole;
              }
            }

            // If permissions array is provided, sync permissions for this isolated role
            if (data.permissions && Array.isArray(data.permissions)) {
              await prisma.rolePermission.deleteMany({
                where: { roleId: role.id },
              });

              for (const code of data.permissions) {
                let perm = await prisma.permission.findUnique({ where: { code } });
                if (!perm) {
                  perm = await prisma.permission.create({
                    data: {
                      code,
                      category: code.split(':')[0] || 'general',
                      description: `${code} feature access`,
                    },
                  });
                }

                await prisma.rolePermission.create({
                  data: {
                    roleId: role.id,
                    permissionId: perm.id,
                  },
                });
              }
            }

            // Ensure UserBranchRole points to this isolated role
            await prisma.userBranchRole.deleteMany({
              where: { userId: user.id, branchId },
            });

            await prisma.userBranchRole.create({
              data: {
                userId: user.id,
                branchId,
                roleId: role.id,
              },
            });
          }
        }
      } else if (data.createUserAccount && emailToUse && data.password) {
        // Provisioning a new user login account for existing staff member
        const clash = await prisma.user.findFirst({
          where: { tenantId, email: emailToUse },
        });
        if (clash) {
          throw new AppError(
            ErrorCodes.ALREADY_EXISTS,
            `Email "${emailToUse}" is already in use by another account.`,
            409
          );
        }

        const passwordHash = await bcrypt.hash(data.password.trim(), 10);
        const cleanBaseName = (data.roleName || data.designation || employee.designation || 'STAFF')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_');
        const uniqueRoleName = `${cleanBaseName}_${employee.id.slice(-6).toUpperCase()}`;

        let role = await prisma.role.findFirst({
          where: { tenantId, name: uniqueRoleName },
        });

        if (!role) {
          role = await prisma.role.create({
            data: {
              tenantId,
              name: uniqueRoleName,
              description: `${data.designation || cleanBaseName} Staff Role`,
            },
          });
        }

        if (data.permissions && data.permissions.length > 0) {
          await prisma.rolePermission.deleteMany({
            where: { roleId: role.id },
          });

          for (const code of data.permissions) {
            let perm = await prisma.permission.findUnique({ where: { code } });
            if (!perm) {
              perm = await prisma.permission.create({
                data: {
                  code,
                  category: code.split(':')[0] || 'general',
                  description: `${code} feature access`,
                },
              });
            }

            await prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: perm.id,
              },
            });
          }
        }

        const newUser = await prisma.user.create({
          data: {
            tenantId,
            name: data.name || employee.name,
            email: emailToUse,
            phone: data.phone || employee.phone || null,
            passwordHash,
            isActive: true,
            telegramChatId: data.telegramChatId || null,
            telegramUsername: data.telegramUsername ? data.telegramUsername.replace(/^@/, '') : null,
            telegramNotifications: data.telegramNotifications ? JSON.stringify(data.telegramNotifications) : null,
            branchRoles: {
              create: {
                branchId,
                roleId: role.id,
              },
            },
          },
        });

        linkedUserId = newUser.id;
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : employee.name,
        department: data.department !== undefined ? data.department : employee.department,
        designation: data.designation !== undefined ? data.designation : employee.designation,
        phone: data.phone !== undefined ? data.phone : employee.phone,
        email: data.email !== undefined ? data.email : employee.email,
        salary: data.salary !== undefined ? (data.salary ?? 0) : (employee.salary ?? 0),
        userId: linkedUserId,
      },
      include: {
        attendance: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Notify Superadmin / Staff on Telegram
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        tenantId,
        'STAFF_MODIFIED',
        `👤 <b>Staff Member Updated</b>\n\n• <b>Name:</b> ${updatedEmployee.name}\n• <b>Designation:</b> ${updatedEmployee.designation}\n• <b>Department:</b> ${updatedEmployee.department}\n• <b>Updated By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Staff Alert Error]:', e));
    });

    sendSuccess(res, updatedEmployee);
  }

  static async deleteEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const tenantId = req.user!.tid;

    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Staff member not found', 404);
    }

    // If staff member has a linked login account, deactivate and remove branch roles
    if (employee.userId) {
      await prisma.userBranchRole.deleteMany({
        where: { userId: employee.userId },
      });

      await prisma.user.updateMany({
        where: { id: employee.userId, tenantId },
        data: { isActive: false, deletedAt: new Date() },
      });
    }

    // Clean up dependent employee records
    await prisma.attendanceRecord.deleteMany({ where: { employeeId: id } });
    await prisma.employeeShift.deleteMany({ where: { employeeId: id } });
    await prisma.leaveRecord.deleteMany({ where: { employeeId: id } });
    await prisma.employee.delete({ where: { id } });

    // Notify Superadmin on Telegram
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        tenantId,
        'STAFF_MODIFIED',
        `👤 <b>Staff Member Removed</b>\n\n• <b>Name:</b> ${employee.name}\n• <b>Designation:</b> ${employee.designation}\n• <b>Department:</b> ${employee.department}\n• <b>Removed By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Staff Alert Error]:', e));
    });

    sendSuccess(res, { message: 'Staff member removed successfully' });
  }

  static async listAvailablePermissions(req: Request, res: Response) {
    sendSuccess(res, {
      modules: FEATURE_MODULES,
      telegramNotifications: TELEGRAM_NOTIFICATION_CATALOG,
    });
  }

  static async punchAttendance(req: Request, res: Response) {
    const data = punchAttendanceSchema.parse(req.body);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: today,
        },
      },
      create: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        employeeId: data.employeeId,
        date: today,
        checkInAt: new Date(),
        status: data.status,
        notes: data.notes || null,
      },
      update: {
        checkOutAt: new Date(),
        status: data.status,
      },
    });

    sendSuccess(res, record);
  }

  static async listRoles(req: Request, res: Response) {
    const roles = await prisma.role.findMany({
      where: {
        tenantId: req.user!.tid,
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userBranchRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, roles);
  }

  static async listShifts(req: Request, res: Response) {
    const shifts = await prisma.shift.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { employeeShifts: { include: { employee: true } } },
      orderBy: { startTime: 'asc' },
    });
    sendSuccess(res, shifts);
  }

  static async listAttendance(req: Request, res: Response) {
    const records = await prisma.attendanceRecord.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { employee: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
    sendSuccess(res, records);
  }

  static async disconnectStaffTelegram(req: Request, res: Response) {
    const { id } = req.params;
    const tenantId = req.user!.tid;

    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Staff member not found', 404);
    }

    if (employee.userId) {
      const user = await prisma.user.findUnique({
        where: { id: employee.userId },
      });
      const previousChatId = user?.telegramChatId;
      const previousUsername = user?.telegramUsername?.toLowerCase();
      const previousPhone = user?.phone?.replace(/\D/g, '');

      await prisma.user.update({
        where: { id: employee.userId },
        data: {
          telegramChatId: null,
          telegramUsername: null,
          telegramNotifications: null,
        },
      });

      // Purge cache
      await cacheDel(`tg_otp:${employee.userId}`);
      await cacheDel(`tg_chat_user:${employee.userId}`);
      if (previousUsername) {
        await cacheDel(`tg_chat_username:${previousUsername}`);
        await cacheDel(`tg_username_to_user:${previousUsername}`);
      }
      if (previousPhone) {
        await cacheDel(`tg_chat_phone:${previousPhone}`);
        await cacheDel(`tg_phone_to_user:${previousPhone.slice(-10)}`);
      }

      if (previousChatId) {
        try {
          await TelegramService.sendMessage(
            previousChatId,
            `🔌 <b>ROS Restaurant OS — Telegram Disconnected</b>\n\nYour Telegram connection for <b>${employee.name}</b> has been disconnected by the Restaurant Admin.\nAll notification subscriptions and linked credentials have been cleared from the database.`
          );
        } catch {}
      }
    }

    sendSuccess(res, {
      message: 'Staff Telegram connection and all associated credentials completely deleted from database.',
    });
  }
}
