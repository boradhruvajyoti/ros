'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, Plus, Search, Clock, Calendar, Shield, Phone,
  Mail, CheckCircle2, XCircle, AlertCircle, Briefcase, Award, Users, Loader2,
  Trash2, Key, Check, Lock, ShieldCheck, Eye, EyeOff, Sparkles, User, AlertTriangle,
  Edit3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
  phone?: string | null;
  email?: string | null;
  shift?: string | null;
  salary?: number | null;
  userId?: string | null;
  user?: {
    id: string;
    email: string;
    telegramChatId?: string | null;
    telegramUsername?: string | null;
    telegramNotifications?: string[];
    roles: string[];
    permissions: string[];
  } | null;
  attendance?: Array<{
    id: string;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
    checkInAt?: string | null;
    checkOutAt?: string | null;
    date: string;
  }>;
}

const FEATURE_MODULES = [
  // Primary Dining & Floor Operations
  {
    id: 'dashboard',
    category: '🍽️ Dining & Floor Operations',
    name: 'Dashboard Overview',
    icon: '📊',
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
    icon: '🛍️',
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
    icon: '🍽️',
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
    icon: '🛒',
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
    name: 'Kitchen Display System (KDS)',
    icon: '👨‍🍳',
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
    icon: '📜',
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
    icon: '📅',
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
    icon: '📖',
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
    icon: '📦',
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
    icon: '🔥',
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
    icon: '🚚',
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
    icon: '🔄',
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
    icon: '👥',
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
    icon: '👤',
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
    icon: '💰',
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
    icon: '📊',
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
    icon: '✨',
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
    icon: '🏷️',
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
    icon: '🎁',
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
    icon: '⭐',
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
    name: 'Aggregators & Online Integrations',
    icon: '📻',
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
    icon: '📱',
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
    icon: '🏢',
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
    icon: '⚙️',
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
    icon: '🖨️',
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
    icon: '🛡️',
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

const FEATURE_CATEGORIES = Array.from(new Set(FEATURE_MODULES.map((m) => m.category)));

const ROLE_PRESETS = [
  {
    id: 'WAITER',
    name: '🍽️ Waiter / Dining Captain',
    modules: ['pos', 'tables', 'orders', 'history'],
  },
  {
    id: 'CHEF',
    name: '👨‍🍳 Kitchen Chef / Line Cook',
    modules: ['kitchen', 'inventory', 'production'],
  },
  {
    id: 'CASHIER',
    name: '💳 Cashier / Front Counter',
    modules: ['pos', 'orders', 'history', 'expenses', 'gift-cards'],
  },
  {
    id: 'MANAGER',
    name: '📋 Floor Manager',
    modules: [
      'dashboard', 'orders', 'pos', 'tables', 'history', 'reservations', 'menu',
      'inventory', 'customers', 'expenses', 'reports', 'feedback'
    ],
  },
  {
    id: 'ADMIN',
    name: '👑 Full-Access General Manager',
    modules: FEATURE_MODULES.map((m) => m.id),
  },
];

const TELEGRAM_NOTIFICATION_OPTIONS = [
  {
    id: 'ORDER_QR_NEW',
    category: 'Orders & Tables',
    name: '📱 QR Menu New Orders',
    description: 'Alert when guest places an order via QR menu with table & type (Dine-In/Parcel)',
  },
  {
    id: 'KOT_SENT',
    category: 'Orders & Tables',
    name: '🍳 KOT Sent to Kitchen',
    description: 'Alert when an order is fired and sent to the kitchen',
  },
  {
    id: 'KOT_ACCEPTED',
    category: 'Kitchen Display',
    name: '👨‍🍳 KDS Ticket Accepted',
    description: 'Alert when chef accepts a ticket in kitchen display',
  },
  {
    id: 'FOOD_READY',
    category: 'Kitchen Display',
    name: '🔔 Food Ready to Serve',
    description: 'Alert waitstaff when dishes are cooked and ready for pickup at pass',
  },
  {
    id: 'FOOD_SERVED',
    category: 'Orders & Tables',
    name: '🥗 Food Served to Table',
    description: 'Alert when food is marked as served at the table',
  },
  {
    id: 'BILL_PAID',
    category: 'Billing & Cash',
    name: '💳 Bill Paid & Settled',
    description: 'Instant notification with table, bill items, total amount and item count',
  },
  {
    id: 'EXPENSE_RECORDED',
    category: 'Billing & Cash',
    name: '💰 Expense / Payout Logged',
    description: 'Alert when operational expenses, petty cash, or payout vouchers are recorded',
  },
  {
    id: 'ORDER_CANCELLED_TABLES',
    category: 'Cancellations & Voids',
    name: '❌ Cancelled on Tables View',
    description: 'Alert when an order or items are cancelled from the Tables floor plan',
  },
  {
    id: 'ORDER_CANCELLED_KITCHEN',
    category: 'Cancellations & Voids',
    name: '🚫 Cancelled on Kitchen Display',
    description: 'Alert when chef cancels or voids items on the KDS display',
  },
  {
    id: 'TABLE_RESERVATION_NEW',
    category: 'Reservations & Service',
    name: '📅 New Table Reservation',
    description: 'Alert when a guest books a table reservation with guest details & time slot',
  },
  {
    id: 'LOW_STOCK_ALERT',
    category: 'Inventory & Stock',
    name: '⚠️ Low Stock Warning',
    description: 'Immediate alert when ingredient stock falls below safe threshold',
  },
  {
    id: 'INVENTORY_MODIFIED',
    category: 'Inventory & Stock',
    name: '📦 Stock & Inventory Changes',
    description: 'Alert on inventory adjustments, stock updates and purchases',
  },
  {
    id: 'MENU_MODIFIED',
    category: 'Menu Management',
    name: '🍽️ Menu Dish Add / Edit / Delete',
    description: 'Alert when dish catalog, pricing or availability changes',
  },
  {
    id: 'DAILY_SALES_REPORT',
    category: 'Reports & Analytics',
    name: '📊 Daily Sales & Top Selling Items',
    description: 'End-of-day summary with tablewise breakdown and top performers',
  },
  {
    id: 'DAILY_EXPENSES_REPORT',
    category: 'Reports & Analytics',
    name: '💸 Daily Expenses Report',
    description: 'Daily operational expenses and petty cash disbursements',
  },
  {
    id: 'MONTHLY_REPORT',
    category: 'Reports & Analytics',
    name: '📈 Monthly Financial Report',
    description: 'Month-end consolidated revenue, expenses, and net profit report',
  },
  {
    id: 'STAFF_MODIFIED',
    category: 'Administration',
    name: '👤 Staff Added / Modified',
    description: 'Alert when staff roster, role permissions or accounts are changed',
  },
];

const DESIGNATION_CATEGORIES = [
  {
    category: '👨‍💼 Management & Leadership',
    designations: [
      'General Manager',
      'Assistant General Manager',
      'Restaurant Manager',
      'Cafe Manager',
      'Operations Manager',
      'Floor Manager',
      'Shift Supervisor',
      'Duty Manager',
    ],
  },
  {
    category: '🍽️ Front of House & Guest Service',
    designations: [
      'F&B Captain',
      'Head Waiter',
      'Waiter / Server',
      'Waitress / Server',
      'Host / Hostess',
      'Food Runner',
      'Busser',
      'Head Cashier',
      'Cashier / Billing Staff',
      'POS Operator',
      'Order Taker',
      'Delivery Rider',
    ],
  },
  {
    category: '☕ Beverage, Bar & Cafe',
    designations: [
      'Head Barista',
      'Barista',
      'Junior Barista',
      'Head Bartender',
      'Bartender / Mixologist',
      'Barback',
      'Sommelier / Wine Steward',
      'Juice & Beverage Maker',
    ],
  },
  {
    category: '👨‍🍳 Kitchen & Culinary (Back of House)',
    designations: [
      'Executive Chef',
      'Head Chef',
      'Head Cook',
      'Executive Sous Chef',
      'Sous Chef',
      'Chef de Partie (CDP)',
      'Demi Chef de Partie',
      'Commis I (Senior Cook)',
      'Commis II (Cook)',
      'Commis III (Junior Cook)',
      'Line Cook / Short Order Cook',
      'Assistant Cook',
      'Pastry Chef / Baker',
      'Pizza Chef / Pizzaiolo',
      'Tandoor / Grill Master',
      'Chinese / Wok Chef',
      'South Indian Chef',
      'Prep Cook / Kitchen Helper',
    ],
  },
  {
    category: '📦 Inventory, Stewarding & Support',
    designations: [
      'Storekeeper / Inventory Manager',
      'Procurement Executive',
      'Chief Steward',
      'Kitchen Steward / Dishwasher',
      'Housekeeping / Cleaner',
      'Security Officer',
    ],
  },
];

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<Employee | null>(null);

  // Add Form State
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Kitchen');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSalary, setNewSalary] = useState('');

  // User Account & Role Feature State (Add)
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRolePreset, setSelectedRolePreset] = useState<string>('WAITER');
  const [selectedModules, setSelectedModules] = useState<string[]>(['pos', 'tables', 'history']);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [selectedTelegramNotifs, setSelectedTelegramNotifs] = useState<string[]>([
    'ORDER_QR_NEW',
    'KOT_SENT',
    'FOOD_READY',
    'BILL_PAID',
  ]);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('Kitchen');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editCreateUserAccount, setEditCreateUserAccount] = useState(false);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editSelectedRolePreset, setEditSelectedRolePreset] = useState<string>('CUSTOM');
  const [editSelectedModules, setEditSelectedModules] = useState<string[]>([]);
  const [editTelegramChatId, setEditTelegramChatId] = useState('');
  const [editTelegramUsername, setEditTelegramUsername] = useState('');
  const [editSelectedTelegramNotifs, setEditSelectedTelegramNotifs] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['staff-employees'],
    queryFn: () => apiGet<Employee[]>('/staff/employees'),
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: any) => apiPost('/staff/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Staff member registered successfully');
      setIsAddModalOpen(false);
      resetAddForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to add staff member';
      toast.error('Registration Failed', msg);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/staff/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Staff Member Updated', 'Employee details, user account and permissions saved.');
      setEditingEmployee(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to update staff member';
      toast.error('Update Failed', msg);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => apiDelete(`/staff/employees/${employeeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Staff Member Deleted', 'Employee record and user account access removed.');
      setDeleteConfirmEmp(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to delete staff member';
      toast.error('Deletion Failed', msg);
    },
  });

  const punchAttendanceMutation = useMutation({
    mutationFn: (data: { employeeId: string; status: 'PRESENT' | 'LEAVE' | 'ABSENT' }) =>
      apiPost('/staff/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Attendance updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    },
  });

  const resetAddForm = () => {
    setNewName('');
    setNewDept('Kitchen');
    setNewDesignation('');
    setNewPhone('');
    setNewEmail('');
    setNewSalary('');
    setCreateUserAccount(false);
    setUserPassword('');
    setSelectedRolePreset('WAITER');
    setSelectedModules(['pos', 'tables', 'history']);
    setTelegramChatId('');
    setTelegramUsername('');
    setSelectedTelegramNotifs(['ORDER_QR_NEW', 'KOT_SENT', 'FOOD_READY', 'BILL_PAID']);
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedRolePreset(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedModules(preset.modules);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
    setSelectedRolePreset('CUSTOM');
  };

  const toggleTelegramNotif = (notifId: string) => {
    setSelectedTelegramNotifs((prev) =>
      prev.includes(notifId) ? prev.filter((id) => id !== notifId) : [...prev, notifId]
    );
  };

  const toggleEditTelegramNotif = (notifId: string) => {
    setEditSelectedTelegramNotifs((prev) =>
      prev.includes(notifId) ? prev.filter((id) => id !== notifId) : [...prev, notifId]
    );
  };

  const toggleCategoryModules = (category: string) => {
    const categoryModuleIds = FEATURE_MODULES.filter((m) => m.category === category).map((m) => m.id);
    const allSelected = categoryModuleIds.every((id) => selectedModules.includes(id));
    if (allSelected) {
      setSelectedModules((prev) => prev.filter((id) => !categoryModuleIds.includes(id)));
    } else {
      setSelectedModules((prev) => Array.from(new Set([...prev, ...categoryModuleIds])));
    }
    setSelectedRolePreset('CUSTOM');
  };

  const handleSelectAllModules = () => {
    if (selectedModules.length === FEATURE_MODULES.length) {
      setSelectedModules([]);
      setSelectedRolePreset('CUSTOM');
    } else {
      setSelectedModules(FEATURE_MODULES.map((m) => m.id));
      setSelectedRolePreset('ADMIN');
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditDept(emp.department || 'Kitchen');
    setEditDesignation(emp.designation || 'Staff');
    setEditPhone(emp.phone || '');
    setEditEmail(emp.email || emp.user?.email || '');
    setEditSalary(emp.salary ? String(emp.salary) : '');
    setEditCreateUserAccount(Boolean(emp.userId || emp.user));
    setEditUserPassword('');
    setEditShowPassword(false);
    setEditTelegramChatId(emp.user?.telegramChatId || '');
    setEditTelegramUsername(emp.user?.telegramUsername || '');
    setEditSelectedTelegramNotifs(emp.user?.telegramNotifications || []);

    // Compute which feature modules are active for this employee using exact keyPermission
    const userPerms = new Set(emp.user?.permissions || []);
    let matched: string[] = [];
    if (userPerms.size > 0) {
      matched = FEATURE_MODULES.filter((m) => userPerms.has(m.keyPermission)).map((m) => m.id);
    } else {
      matched = [];
    }
    setEditSelectedModules(matched);

    const roleName = emp.user?.roles?.[0] || 'CUSTOM';
    const foundPreset = ROLE_PRESETS.find(
      (p) =>
        (p.id === roleName || p.name.includes(roleName)) &&
        p.modules.length === matched.length &&
        p.modules.every((mId) => matched.includes(mId))
    );
    setEditSelectedRolePreset(foundPreset ? foundPreset.id : 'CUSTOM');
  };

  const handleApplyEditPreset = (presetId: string) => {
    setEditSelectedRolePreset(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setEditSelectedModules(preset.modules);
    }
  };

  const toggleEditModule = (moduleId: string) => {
    setEditSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
    setEditSelectedRolePreset('CUSTOM');
  };

  const toggleEditCategoryModules = (category: string) => {
    const categoryModuleIds = FEATURE_MODULES.filter((m) => m.category === category).map((m) => m.id);
    const allSelected = categoryModuleIds.every((id) => editSelectedModules.includes(id));
    if (allSelected) {
      setEditSelectedModules((prev) => prev.filter((id) => !categoryModuleIds.includes(id)));
    } else {
      setEditSelectedModules((prev) => Array.from(new Set([...prev, ...categoryModuleIds])));
    }
    setEditSelectedRolePreset('CUSTOM');
  };

  const handleSelectAllEditModules = () => {
    if (editSelectedModules.length === FEATURE_MODULES.length) {
      setEditSelectedModules([]);
      setEditSelectedRolePreset('CUSTOM');
    } else {
      setEditSelectedModules(FEATURE_MODULES.map((m) => m.id));
      setEditSelectedRolePreset('ADMIN');
    }
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editName.trim() || !editDesignation.trim()) {
      toast.error('Required Fields Missing', 'Please provide full name and designation.');
      return;
    }

    if (editCreateUserAccount && !editEmail.trim()) {
      toast.error('Email Required', 'Please provide an email address for user login access.');
      return;
    }

    if (editCreateUserAccount && !editingEmployee.userId && (!editUserPassword || editUserPassword.length < 6)) {
      toast.error('Password Required', 'Please set an initial password with at least 6 characters for the new user account.');
      return;
    }

    const selectedPerms = Array.from(
      new Set(
        FEATURE_MODULES.filter((m) => editSelectedModules.includes(m.id)).flatMap((m) => m.permissions)
      )
    );

    const payload: any = {
      name: editName.trim(),
      department: editDept,
      designation: editDesignation.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      salary: parseFloat(editSalary) || 0,
      createUserAccount: editCreateUserAccount,
      roleName: editSelectedRolePreset !== 'CUSTOM' ? editSelectedRolePreset : editDesignation.trim(),
      permissions: editCreateUserAccount ? selectedPerms : undefined,
      telegramChatId: editTelegramChatId.trim() || null,
      telegramUsername: editTelegramUsername.trim() || null,
      telegramNotifications: editSelectedTelegramNotifs,
    };

    if (editUserPassword.trim()) {
      payload.password = editUserPassword.trim();
    }

    updateEmployeeMutation.mutate({ id: editingEmployee.id, data: payload });
  };

  const departments = ['ALL', 'Kitchen', 'Service', 'Bar', 'Management', 'Cashier', 'Cleaning'];

  const filteredStaff = employees.filter((e) => {
    const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const activeCount = employees.filter((e) => e.attendance?.[0]?.status === 'PRESENT').length;
  const totalPayroll = employees.reduce((s, e) => s + (parseFloat(String(e.salary ?? 0)) || 0), 0);
  const salariedCount = employees.filter((e) => (parseFloat(String(e.salary ?? 0)) || 0) > 0).length;
  const accountsCount = employees.filter((e) => Boolean(e.userId || e.user)).length;

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesignation.trim()) {
      toast.error('Required Fields Missing', 'Please provide full name and designation.');
      return;
    }

    if (createUserAccount) {
      if (!newEmail.trim()) {
        toast.error('Email Required', 'Please provide an email address for the user account login.');
        return;
      }
      if (!userPassword || userPassword.length < 6) {
        toast.error('Invalid Password', 'Password must be at least 6 characters long.');
        return;
      }
    }

    // Collect all permissions for selected feature modules
    const selectedPerms = Array.from(
      new Set(
        FEATURE_MODULES.filter((m) => selectedModules.includes(m.id)).flatMap((m) => m.permissions)
      )
    );

    createEmployeeMutation.mutate({
      name: newName.trim(),
      department: newDept,
      designation: newDesignation.trim(),
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      salary: parseFloat(newSalary) || 0,
      createUserAccount,
      password: createUserAccount ? userPassword : undefined,
      roleName: createUserAccount ? selectedRolePreset : undefined,
      permissions: createUserAccount ? selectedPerms : undefined,
      telegramChatId: telegramChatId.trim() || undefined,
      telegramUsername: telegramUsername.trim() || undefined,
      telegramNotifications: selectedTelegramNotifs,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-card via-card/80 to-muted/40 border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              👥
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                Staff &amp; User Accounts Management
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Enroll staff members, create restaurant user login accounts, configure feature access permissions, and manage rosters.
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            resetAddForm();
            setIsAddModalOpen(true);
          }}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md rounded-2xl h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Total Staff Roster</span>
          <p className="text-2xl font-black text-foreground mt-2">{employees.length} members</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{accountsCount} login accounts enabled</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Currently Clocked In</span>
          <p className="text-2xl font-black text-emerald-500 mt-2">{activeCount} Active</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">On duty shift</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Monthly Payroll</span>
          <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(totalPayroll)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{salariedCount} salaried staff</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Active User Logins</span>
          <p className="text-2xl font-black text-indigo-400 mt-2">{accountsCount} Users</p>
          <p className="text-[11px] text-indigo-400 mt-0.5 font-medium">RBAC role access</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'directory', label: 'Staff Directory & Accounts' },
          { id: 'attendance', label: 'Live Attendance & Roster' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, designation or login email..."
                className="pl-10 h-11 bg-card border-border rounded-xl"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDept(d)}
                  className={cn(
                    'px-3.5 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer',
                    selectedDept === d
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {d === 'ALL' ? 'All Departments' : d}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading staff members and accounts...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-bold text-foreground">No staff members found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Add your kitchen chefs, managers, waitstaff, and cashiers to manage accounts, rosters, and feature permissions.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add First Team Member
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((emp) => {
                const isClockedIn = emp.attendance?.[0]?.status === 'PRESENT';
                const hasLoginAccount = Boolean(emp.userId || emp.user);

                return (
                  <Card key={emp.id} className="border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-4 rounded-3xl shadow-sm flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="space-y-3 min-w-0">
                      {/* Top Row: Name, Designation & Status */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base text-foreground flex items-center gap-1.5 truncate">
                            {emp.name}
                          </h3>
                          <p className="text-xs text-primary font-bold truncate">{emp.designation}</p>
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full mt-1.5 inline-block truncate max-w-full">
                            {emp.department}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {isClockedIn ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                              ● On Duty
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border shrink-0">
                              Off Duty
                            </span>
                          )}

                          {hasLoginAccount ? (
                            <Badge className="bg-indigo-600/15 text-indigo-400 border-indigo-500/30 font-bold text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                              <Key className="w-3 h-3" /> Account Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground font-medium text-[10px] px-2 py-0.5 rounded-lg shrink-0">
                              No Login Account
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 text-xs text-muted-foreground pt-1 min-w-0">
                        {emp.phone && (
                          <p className="flex items-center gap-2 truncate min-w-0">
                            <Phone className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="truncate">{emp.phone}</span>
                          </p>
                        )}
                        {emp.email && (
                          <p className="flex items-center gap-2 truncate min-w-0">
                            <Mail className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="truncate">{emp.email}</span>
                          </p>
                        )}
                      </div>

                      {/* User Account Role Details */}
                      {hasLoginAccount && emp.user && (
                        <div className="p-2.5 rounded-2xl bg-muted/40 border border-border text-[11px] space-y-1 min-w-0">
                          <div className="flex items-center justify-between text-muted-foreground font-medium gap-1">
                            <span className="shrink-0">Role:</span>
                            <span className="font-bold text-foreground truncate">{emp.user.roles?.[0] || 'STAFF'}</span>
                          </div>
                          {emp.user.permissions?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              <span>Accessible Features: </span>
                              <strong className="text-foreground">{emp.user.permissions.length} modules granted</strong>
                            </div>
                          )}
                          {emp.user.telegramChatId && (
                            <div className="pt-1 mt-1 border-t border-border/50 flex items-center justify-between text-[10px]">
                              <span className="text-sky-400 font-medium flex items-center gap-1">
                                ✈️ Telegram Active
                              </span>
                              <span className="text-muted-foreground font-mono">
                                {emp.user.telegramUsername ? `@${emp.user.telegramUsername}` : emp.user.telegramChatId}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2">
                      <span className="text-xs font-black text-foreground">
                        {formatCurrency(emp.salary || 0)} / mo
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={isClockedIn ? 'outline' : 'default'}
                          onClick={() =>
                            punchAttendanceMutation.mutate({
                              employeeId: emp.id,
                              status: isClockedIn ? 'ABSENT' : 'PRESENT',
                            })
                          }
                          className="text-xs h-8 rounded-xl font-bold"
                        >
                          {isClockedIn ? 'Punch Out' : 'Punch In'}
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          title="Modify Staff Profile & Permissions"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmEmp(emp)}
                          title="Delete Staff Member & Account"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Attendance Tracker */}
      {activeTab === 'attendance' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-4 rounded-3xl shadow-sm">
          <CardTitle className="text-base font-bold">Duty Attendance Roster</CardTitle>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff members enrolled in roster.</p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => {
                const isClockedIn = emp.attendance?.[0]?.status === 'PRESENT';
                return (
                  <div key={emp.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-accent/30">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation} · Dept: {emp.department}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isClockedIn ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          ● Present
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                          Off Duty
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          punchAttendanceMutation.mutate({
                            employeeId: emp.id,
                            status: isClockedIn ? 'ABSENT' : 'PRESENT',
                          })
                        }
                        className="text-xs h-8 rounded-xl font-bold"
                      >
                        Toggle Status
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ADD STAFF MEMBER & USER ACCOUNT MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border-border bg-card shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" /> Add Staff Member &amp; User Account
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Register employee profile, set salary, provision a login account, and configure Telegram notifications.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <form id="add-staff-form" onSubmit={handleCreateEmployee} className="space-y-5">
                {/* Section 1: Staff Details */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Employee Profile
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Full Name *</label>
                      <Input
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Harish Kumar"
                        className="h-10 rounded-xl"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Department *</label>
                      <select
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                      >
                        <option>Kitchen</option>
                        <option>Service</option>
                        <option>Bar</option>
                        <option>Management</option>
                        <option>Cashier</option>
                        <option>Cleaning</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Designation *</label>
                      <select
                        required
                        value={
                          DESIGNATION_CATEGORIES.some((c) => c.designations.includes(newDesignation))
                            ? newDesignation
                            : newDesignation ? 'CUSTOM' : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            if (DESIGNATION_CATEGORIES.some((c) => c.designations.includes(newDesignation))) {
                              setNewDesignation('');
                            }
                          } else {
                            setNewDesignation(val);
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-card text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="" disabled>Select Designation...</option>
                        {DESIGNATION_CATEGORIES.map((cat) => (
                          <optgroup key={cat.category} label={cat.category}>
                            {cat.designations.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </optgroup>
                        ))}
                        <optgroup label="✨ Custom">
                          <option value="CUSTOM">+ Custom / Other Designation</option>
                        </optgroup>
                      </select>

                      {(!DESIGNATION_CATEGORIES.some((c) => c.designations.includes(newDesignation)) || newDesignation === '') && (
                        <Input
                          required
                          value={newDesignation}
                          onChange={(e) => setNewDesignation(e.target.value)}
                          placeholder="Type custom designation (e.g. Head Roaster)"
                          className="h-10 rounded-xl mt-1.5"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Phone Number</label>
                      <Input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Monthly Salary (₹)</label>
                      <Input
                        type="number"
                        value={newSalary}
                        onChange={(e) => setNewSalary(e.target.value)}
                        placeholder="25000"
                        className="h-10 font-bold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Email Address {createUserAccount && <span className="text-rose-500">* (used for login)</span>}
                    </label>
                    <Input
                      type="email"
                      required={createUserAccount}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="staff@restaurant.in"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Section 2: User Account & Feature Permissions */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Provision User Login Account</h4>
                        <p className="text-[11px] text-muted-foreground">Allow this staff member to log in to ROS from browser or mobile.</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createUserAccount}
                        onChange={(e) => setCreateUserAccount(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {createUserAccount && (
                    <div className="space-y-4 pt-2 border-t border-border/70 animate-fade-in">
                      {/* Password Field */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Set Account Password *</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            required={createUserAccount}
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            placeholder="Min. 6 characters (e.g. Staff@123)"
                            className="h-10 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Role Presets */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground block">
                          Role Presets <span className="text-muted-foreground font-normal">(Click to quickly preselect features)</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ROLE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleApplyPreset(preset.id)}
                              className={cn(
                                'p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                                selectedRolePreset === preset.id
                                    ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/40'
                                    : 'bg-card border-border text-foreground hover:bg-muted'
                              )}
                            >
                              <span>{preset.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {preset.modules.length} features
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feature Permissions Matrix (Categorized) */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between pb-1 border-b border-border/40">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-primary" /> Feature Access Permissions ({selectedModules.length}/{FEATURE_MODULES.length})
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAllModules}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            {selectedModules.length === FEATURE_MODULES.length ? 'Deselect All' : 'Select All Features'}
                          </button>
                        </div>

                        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                          {FEATURE_CATEGORIES.map((category) => {
                            const catModules = FEATURE_MODULES.filter((m) => m.category === category);
                            const selectedInCat = catModules.filter((m) => selectedModules.includes(m.id)).length;
                            const isAllInCatSelected = selectedInCat === catModules.length;

                            return (
                              <div
                                key={category}
                                className="p-3 rounded-2xl border border-border/70 bg-card/60 space-y-2.5 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-foreground tracking-tight">
                                      {category}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                                        selectedInCat > 0
                                          ? 'bg-primary/15 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      )}
                                    >
                                      {selectedInCat}/{catModules.length} Active
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleCategoryModules(category)}
                                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                                  >
                                    {isAllInCatSelected ? 'Clear Category' : 'Select Category'}
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {catModules.map((mod) => {
                                    const isSelected = selectedModules.includes(mod.id);
                                    return (
                                      <div
                                        key={mod.id}
                                        onClick={() => toggleModule(mod.id)}
                                        className={cn(
                                          'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
                                          isSelected
                                            ? 'bg-primary/10 border-primary/50 text-foreground shadow-xs ring-1 ring-primary/20'
                                            : 'bg-background/80 border-border/50 text-muted-foreground hover:border-border'
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            'w-4 h-4 rounded-md mt-0.5 flex items-center justify-center text-[10px] font-black shrink-0 border',
                                            isSelected
                                              ? 'bg-primary text-primary-foreground border-primary'
                                              : 'border-muted-foreground/40 bg-background'
                                          )}
                                        >
                                          {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1">
                                            <span>{mod.icon}</span> <span>{mod.name}</span>
                                          </p>
                                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                            {mod.description}
                                          </p>
                                          {(mod as any).submodules && (mod as any).submodules.length > 0 && (
                                            <div className="mt-2 pt-1.5 border-t border-border/40 flex flex-wrap gap-1">
                                              {(mod as any).submodules.map((sub: any) => (
                                                <span
                                                  key={sub.id}
                                                  className={cn(
                                                    'text-[9px] px-1.5 py-0.5 rounded-md font-medium tracking-tight',
                                                    isSelected
                                                      ? 'bg-primary/20 text-foreground border border-primary/30 font-semibold'
                                                      : 'bg-muted/80 text-muted-foreground border border-border/40'
                                                  )}
                                                  title={sub.description}
                                                >
                                                  • {sub.name}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Telegram Bot Alerts Configuration */}
                {createUserAccount && (
                  <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-base">
                          ✈️
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Telegram Notifications for Staff</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Configure which operational events this staff member will receive on their connected Telegram bot.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sky-500/20">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Staff Telegram Chat ID</label>
                        <Input
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          placeholder="e.g. 123456789"
                          className="h-10 rounded-xl font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">User gets this by sending /start to your bot</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Telegram Username (Optional)</label>
                        <Input
                          value={telegramUsername}
                          onChange={(e) => setTelegramUsername(e.target.value)}
                          placeholder="e.g. chef_rajesh"
                          className="h-10 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {/* Operational Triggers Matrix */}
                    <div className="space-y-2 pt-2 border-t border-sky-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          🔔 Select Operational Alerts ({selectedTelegramNotifs.length}/14)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTelegramNotifs.length === TELEGRAM_NOTIFICATION_OPTIONS.length) {
                              setSelectedTelegramNotifs([]);
                            } else {
                              setSelectedTelegramNotifs(TELEGRAM_NOTIFICATION_OPTIONS.map((o) => o.id));
                            }
                          }}
                          className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
                        >
                          {selectedTelegramNotifs.length === TELEGRAM_NOTIFICATION_OPTIONS.length ? 'Deselect All' : 'Select All 14 Alerts'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 no-scrollbar">
                        {TELEGRAM_NOTIFICATION_OPTIONS.map((opt) => {
                          const isChecked = selectedTelegramNotifs.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              onClick={() => toggleTelegramNotif(opt.id)}
                              className={cn(
                                'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
                                isChecked
                                  ? 'bg-sky-500/10 border-sky-500/40 text-foreground'
                                  : 'bg-card border-border/60 text-muted-foreground hover:border-border'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-4 h-4 rounded-md mt-0.5 flex items-center justify-center text-[10px] font-black shrink-0 border',
                                  isChecked
                                    ? 'bg-sky-500 text-white border-sky-500'
                                    : 'border-muted-foreground/40 bg-background'
                                )}
                              >
                                {isChecked && <Check className="w-3 h-3" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground leading-tight">
                                  {opt.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {opt.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-staff-form"
                disabled={createEmployeeMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6"
              >
                {createEmployeeMutation.isPending ? 'Enrolling...' : 'Save & Enroll Staff'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          EDIT STAFF MEMBER & USER ACCOUNT MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <Card className="w-full max-w-2xl border-border bg-card shadow-2xl my-8 max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-primary" /> Modify Staff &amp; Permissions
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Update profile, credentials, active status, module access permissions, and Telegram alerts.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <form id="edit-staff-form" onSubmit={handleUpdateEmployee} className="space-y-5">
                {/* Section 1: Staff Details */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Employee Profile
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Full Name *</label>
                      <Input
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Harish Kumar"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Department *</label>
                      <select
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                      >
                        <option>Kitchen</option>
                        <option>Service</option>
                        <option>Bar</option>
                        <option>Management</option>
                        <option>Cashier</option>
                        <option>Cleaning</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Designation *</label>
                      <select
                        required
                        value={
                          DESIGNATION_CATEGORIES.some((c) => c.designations.includes(editDesignation))
                            ? editDesignation
                            : editDesignation ? 'CUSTOM' : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            if (DESIGNATION_CATEGORIES.some((c) => c.designations.includes(editDesignation))) {
                              setEditDesignation('');
                            }
                          } else {
                            setEditDesignation(val);
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-card text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="" disabled>Select Designation...</option>
                        {DESIGNATION_CATEGORIES.map((cat) => (
                          <optgroup key={cat.category} label={cat.category}>
                            {cat.designations.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </optgroup>
                        ))}
                        <optgroup label="✨ Custom">
                          <option value="CUSTOM">+ Custom / Other Designation</option>
                        </optgroup>
                      </select>

                      {(!DESIGNATION_CATEGORIES.some((c) => c.designations.includes(editDesignation)) || editDesignation === '') && (
                        <Input
                          required
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                          placeholder="Type custom designation (e.g. Head Roaster)"
                          className="h-10 rounded-xl mt-1.5"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Phone Number</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Monthly Salary (₹)</label>
                      <Input
                        type="number"
                        value={editSalary}
                        onChange={(e) => setEditSalary(e.target.value)}
                        placeholder="25000"
                        className="h-10 font-bold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Email Address {editCreateUserAccount && <span className="text-rose-500">* (used for login)</span>}
                    </label>
                    <Input
                      type="email"
                      required={editCreateUserAccount}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="staff@restaurant.in"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Section 2: User Account & Feature Permissions */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {editingEmployee.userId ? 'Manage User Login Account & Permissions' : 'Provision User Login Account'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {editingEmployee.userId
                            ? 'Configure which modules and panels this account is allowed to access.'
                            : 'Create login credentials for this staff member.'}
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCreateUserAccount}
                        onChange={(e) => setEditCreateUserAccount(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {editCreateUserAccount && (
                    <div className="space-y-4 pt-2 border-t border-border/70 animate-fade-in">
                      {/* Password Field */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          {editingEmployee.userId ? 'Change Password (Leave blank to keep unchanged)' : 'Set Account Password *'}
                        </label>
                        <div className="relative">
                          <Input
                            type={editShowPassword ? 'text' : 'password'}
                            required={!editingEmployee.userId && editCreateUserAccount}
                            value={editUserPassword}
                            onChange={(e) => setEditUserPassword(e.target.value)}
                            placeholder={editingEmployee.userId ? '•••••••• (Enter new password to change)' : 'Min. 6 characters (e.g. Staff@123)'}
                            className="h-10 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setEditShowPassword(!editShowPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Role Presets */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground block">
                          Role Presets <span className="text-muted-foreground font-normal">(Click to quickly preselect features)</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ROLE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleApplyEditPreset(preset.id)}
                              className={cn(
                                'p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                                editSelectedRolePreset === preset.id
                                  ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/40'
                                  : 'bg-card border-border text-foreground hover:bg-muted'
                              )}
                            >
                              <span>{preset.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {preset.modules.length} features
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feature Permissions Matrix (Categorized) */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between pb-1 border-b border-border/40">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-primary" /> Feature Access Permissions ({editSelectedModules.length}/{FEATURE_MODULES.length})
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAllEditModules}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            {editSelectedModules.length === FEATURE_MODULES.length ? 'Deselect All' : 'Select All Features'}
                          </button>
                        </div>

                        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                          {FEATURE_CATEGORIES.map((category) => {
                            const catModules = FEATURE_MODULES.filter((m) => m.category === category);
                            const selectedInCat = catModules.filter((m) => editSelectedModules.includes(m.id)).length;
                            const isAllInCatSelected = selectedInCat === catModules.length;

                            return (
                              <div
                                key={category}
                                className="p-3 rounded-2xl border border-border/70 bg-card/60 space-y-2.5 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-foreground tracking-tight">
                                      {category}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                                        selectedInCat > 0
                                          ? 'bg-primary/15 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      )}
                                    >
                                      {selectedInCat}/{catModules.length} Active
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleEditCategoryModules(category)}
                                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                                  >
                                    {isAllInCatSelected ? 'Clear Category' : 'Select Category'}
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {catModules.map((mod) => {
                                    const isSelected = editSelectedModules.includes(mod.id);
                                    return (
                                      <div
                                        key={mod.id}
                                        onClick={() => toggleEditModule(mod.id)}
                                        className={cn(
                                          'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
                                          isSelected
                                            ? 'bg-primary/10 border-primary/50 text-foreground shadow-xs ring-1 ring-primary/20'
                                            : 'bg-background/80 border-border/50 text-muted-foreground hover:border-border'
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            'w-4 h-4 rounded-md mt-0.5 flex items-center justify-center text-[10px] font-black shrink-0 border',
                                            isSelected
                                              ? 'bg-primary text-primary-foreground border-primary'
                                              : 'border-muted-foreground/40 bg-background'
                                          )}
                                        >
                                          {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1">
                                            <span>{mod.icon}</span> <span>{mod.name}</span>
                                          </p>
                                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                            {mod.description}
                                          </p>
                                          {(mod as any).submodules && (mod as any).submodules.length > 0 && (
                                            <div className="mt-2 pt-1.5 border-t border-border/40 flex flex-wrap gap-1">
                                              {(mod as any).submodules.map((sub: any) => (
                                                <span
                                                  key={sub.id}
                                                  className={cn(
                                                    'text-[9px] px-1.5 py-0.5 rounded-md font-medium tracking-tight',
                                                    isSelected
                                                      ? 'bg-primary/20 text-foreground border border-primary/30 font-semibold'
                                                      : 'bg-muted/80 text-muted-foreground border border-border/40'
                                                  )}
                                                  title={sub.description}
                                                >
                                                  • {sub.name}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Telegram Bot Alerts Configuration */}
                {editCreateUserAccount && (
                  <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-base">
                          ✈️
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Telegram Notifications for Staff</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Configure which operational events this staff member will receive on their connected Telegram bot.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sky-500/20">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Staff Telegram Chat ID</label>
                        <Input
                          value={editTelegramChatId}
                          onChange={(e) => setEditTelegramChatId(e.target.value)}
                          placeholder="e.g. 123456789"
                          className="h-10 rounded-xl font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">User gets this by sending /start to your bot</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Telegram Username (Optional)</label>
                        <Input
                          value={editTelegramUsername}
                          onChange={(e) => setEditTelegramUsername(e.target.value)}
                          placeholder="e.g. chef_rajesh"
                          className="h-10 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {/* Operational Triggers Matrix */}
                    <div className="space-y-2 pt-2 border-t border-sky-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          🔔 Select Operational Alerts ({editSelectedTelegramNotifs.length}/14)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (editSelectedTelegramNotifs.length === TELEGRAM_NOTIFICATION_OPTIONS.length) {
                              setEditSelectedTelegramNotifs([]);
                            } else {
                              setEditSelectedTelegramNotifs(TELEGRAM_NOTIFICATION_OPTIONS.map((o) => o.id));
                            }
                          }}
                          className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
                        >
                          {editSelectedTelegramNotifs.length === TELEGRAM_NOTIFICATION_OPTIONS.length ? 'Deselect All' : 'Select All 14 Alerts'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 no-scrollbar">
                        {TELEGRAM_NOTIFICATION_OPTIONS.map((opt) => {
                          const isChecked = editSelectedTelegramNotifs.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              onClick={() => toggleEditTelegramNotif(opt.id)}
                              className={cn(
                                'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
                                isChecked
                                  ? 'bg-sky-500/10 border-sky-500/40 text-foreground'
                                  : 'bg-card border-border/60 text-muted-foreground hover:border-border'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-4 h-4 rounded-md mt-0.5 flex items-center justify-center text-[10px] font-black shrink-0 border',
                                  isChecked
                                    ? 'bg-sky-500 text-white border-sky-500'
                                    : 'border-muted-foreground/40 bg-background'
                                )}
                              >
                                {isChecked && <Check className="w-3 h-3" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground leading-tight">
                                  {opt.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {opt.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEmployee(null)}
                className="rounded-xl px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-staff-form"
                disabled={updateEmployeeMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6"
              >
                {updateEmployeeMutation.isPending ? 'Saving...' : 'Update Staff Member'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl rounded-3xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Remove Staff Member</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion of employee &amp; account</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5 text-foreground">
              <p>
                Are you sure you want to remove <strong className="text-rose-400 font-bold">{deleteConfirmEmp.name}</strong> ({deleteConfirmEmp.designation})?
              </p>
              {deleteConfirmEmp.userId && (
                <p className="text-rose-300 text-[11px]">
                  ⚠️ This employee has an active user account (<strong>{deleteConfirmEmp.email}</strong>). Their login access to this restaurant will be permanently revoked.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmEmp(null)}
                disabled={deleteEmployeeMutation.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteEmployeeMutation.mutate(deleteConfirmEmp.id)}
                disabled={deleteEmployeeMutation.isPending}
                className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
              >
                {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
