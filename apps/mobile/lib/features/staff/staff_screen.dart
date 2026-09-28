// =============================================================================
// Staff Screen — Restaurant & Cafe Staff Directory & Management
// Full designation dropdowns, platform feature permissions & Telegram notifications
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

// ── Designation Categories & Options for Cafe / Restaurant ───────────────────
class DesignationGroup {
  final String category;
  final List<String> items;

  const DesignationGroup({required this.category, required this.items});
}

const List<DesignationGroup> kDesignationCategories = [
  DesignationGroup(
    category: '👨‍💼 Management & Leadership',
    items: [
      'General Manager',
      'Assistant General Manager',
      'Restaurant Manager',
      'Cafe Manager',
      'Operations Manager',
      'Floor Manager',
      'Shift Supervisor',
      'Duty Manager',
    ],
  ),
  DesignationGroup(
    category: '🍽️ Front of House & Guest Service',
    items: [
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
  ),
  DesignationGroup(
    category: '☕ Beverage, Bar & Cafe',
    items: [
      'Head Barista',
      'Barista',
      'Junior Barista',
      'Head Bartender',
      'Bartender / Mixologist',
      'Barback',
      'Sommelier / Wine Steward',
      'Juice & Beverage Maker',
    ],
  ),
  DesignationGroup(
    category: '👨‍🍳 Kitchen & Culinary (Back of House)',
    items: [
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
  ),
  DesignationGroup(
    category: '📦 Inventory, Stewarding & Support',
    items: [
      'Storekeeper / Inventory Manager',
      'Procurement Executive',
      'Chief Steward',
      'Kitchen Steward / Dishwasher',
      'Housekeeping / Cleaner',
      'Security Officer',
    ],
  ),
];

const List<String> kDepartments = [
  'Kitchen',
  'Service',
  'Bar',
  'Management',
  'Cashier',
  'Cleaning',
];

// ── Feature Modules Definition (All Latest Platform Features) ───────────────
class FeatureModuleItem {
  final String id;
  final String name;
  final String icon;
  final String description;
  final List<String> permissions;

  const FeatureModuleItem({
    required this.id,
    required this.name,
    required this.icon,
    required this.description,
    required this.permissions,
  });
}

const List<FeatureModuleItem> kPlatformFeatureModules = [
  // Primary Operations
  FeatureModuleItem(
    id: 'dashboard',
    name: 'Dashboard Overview',
    icon: '📊',
    description: 'Executive dashboard, real-time live revenue counters & feed',
    permissions: ['reports:view'],
  ),
  FeatureModuleItem(
    id: 'tables',
    name: 'Tables & Floor',
    icon: '🍽️',
    description: 'Floor view, live table orders, KOT status & billing preview',
    permissions: ['tables:view', 'tables:edit', 'orders:view', 'orders:edit', 'menu:view'],
  ),
  FeatureModuleItem(
    id: 'pos',
    name: 'Point of Sale (POS)',
    icon: '🛒',
    description: 'Touch order billing, table orders, cart modifiers & fast pay',
    permissions: ['orders:create', 'orders:edit', 'payments:create', 'discount:apply', 'menu:view'],
  ),
  FeatureModuleItem(
    id: 'kitchen',
    name: 'Kitchen Display (KDS)',
    icon: '👨‍🍳',
    description: 'Live KOT tickets, cooking bump, partial/full items cancel',
    permissions: ['kitchen:view', 'kitchen:update', 'orders:view', 'menu:view'],
  ),
  FeatureModuleItem(
    id: 'history',
    name: 'Order History & Invoices',
    icon: '📜',
    description: 'View past orders, reprint receipts, audit customer bills',
    permissions: ['orders:view', 'payments:view'],
  ),
  FeatureModuleItem(
    id: 'reservations',
    name: 'Table Reservations',
    icon: '📅',
    description: 'Book tables, manage calendar, guest arrivals & schedule',
    permissions: ['reservations:view', 'reservations:create', 'reservations:edit', 'reservations:cancel'],
  ),

  // Inventory & Kitchen
  FeatureModuleItem(
    id: 'menu',
    name: 'Menu & Categories',
    icon: '📖',
    description: 'Create dishes, prices, half/full variants, modifier groups',
    permissions: ['menu:view', 'menu:create', 'menu:edit', 'menu:delete'],
  ),
  FeatureModuleItem(
    id: 'inventory',
    name: 'Stock & Inventory',
    icon: '📦',
    description: 'Track ingredient stocks, low stock alerts, stock physical counts',
    permissions: ['inventory:view', 'inventory:adjust', 'inventory:count'],
  ),
  FeatureModuleItem(
    id: 'production',
    name: 'Recipe Yields & Production',
    icon: '🔥',
    description: 'Batch production, sub-recipes, kitchen prep batch conversions',
    permissions: ['inventory:view', 'inventory:write-off'],
  ),
  FeatureModuleItem(
    id: 'procurement',
    name: 'Procurement & Vendors',
    icon: '🚚',
    description: 'Purchase orders, supplier bills, goods receipt notes (GRN)',
    permissions: ['procurement:view', 'procurement:create', 'procurement:receive', 'procurement:approve'],
  ),
  FeatureModuleItem(
    id: 'transfers',
    name: 'Stock Transfers',
    icon: '🔄',
    description: 'Inter-branch stock transfers and central warehouse dispatch',
    permissions: ['inventory:view', 'inventory:transfer'],
  ),

  // Finance & Management
  FeatureModuleItem(
    id: 'customers',
    name: 'Customers CRM & Loyalty',
    icon: '👥',
    description: 'Guest contacts, visit frequency, loyalty reward points',
    permissions: ['customers:view', 'customers:create', 'loyalty:view'],
  ),
  FeatureModuleItem(
    id: 'staff',
    name: 'Staff & Team HR',
    icon: '👤',
    description: 'Employee roster, attendance check-ins, staff accounts & RBAC',
    permissions: ['staff:view', 'staff:create', 'staff:edit', 'attendance:view', 'attendance:manage'],
  ),
  FeatureModuleItem(
    id: 'expenses',
    name: 'Expenses & Payouts',
    icon: '💰',
    description: 'Daily operational expenses, petty cash, payout vouchers',
    permissions: ['expenses:view', 'expenses:create', 'expenses:approve'],
  ),
  FeatureModuleItem(
    id: 'reports',
    name: 'Reports & P&L Analytics',
    icon: '📊',
    description: 'Sales summaries, tax reports, item performance, profit & loss',
    permissions: ['reports:view', 'reports:export'],
  ),

  // Growth & Engagement
  FeatureModuleItem(
    id: 'ai-insights',
    name: 'AI Insights & Forecasts',
    icon: '✨',
    description: 'AI revenue forecast, demand prediction, inventory wastage alerts',
    permissions: ['reports:view', 'loyalty:adjust'],
  ),
  FeatureModuleItem(
    id: 'marketing',
    name: 'Marketing & Promotions',
    icon: '🏷️',
    description: 'Coupon codes, happy hour discounts, customer campaigns',
    permissions: ['customers:view', 'price:override'],
  ),
  FeatureModuleItem(
    id: 'gift-cards',
    name: 'Gift Cards & Vouchers',
    icon: '🎁',
    description: 'Issue gift vouchers, redeem prepaid cards, customer balances',
    permissions: ['customers:view', 'payments:refund'],
  ),
  FeatureModuleItem(
    id: 'feedback',
    name: 'Guest Feedback & Ratings',
    icon: '⭐',
    description: 'Customer ratings, food quality reviews, dining experience surveys',
    permissions: ['customers:view', 'customers:edit'],
  ),
  FeatureModuleItem(
    id: 'integrations',
    name: 'Online Integrations',
    icon: '📻',
    description: 'Zomato, Swiggy, UberEats, WhatsApp ordering channel integrations',
    permissions: ['settings:view', 'branches:view'],
  ),

  // Operations & Tech
  FeatureModuleItem(
    id: 'kiosk',
    name: 'Touch Kiosk System',
    icon: '📱',
    description: 'Self-ordering guest kiosk mode with touch menu interface',
    permissions: ['orders:create', 'orders:void'],
  ),
  FeatureModuleItem(
    id: 'franchise',
    name: 'Franchise HQ & Outlets',
    icon: '🏢',
    description: 'Franchise royalty fee tracking and central brand controls',
    permissions: ['branches:view', 'branches:create'],
  ),
  FeatureModuleItem(
    id: 'settings',
    name: 'Restaurant Settings',
    icon: '⚙️',
    description: 'Restaurant taxes (GST/VAT), service charge, operating hours',
    permissions: ['settings:view', 'settings:edit'],
  ),
  FeatureModuleItem(
    id: 'hardware',
    name: 'Hardware & Printers',
    icon: '🖨️',
    description: 'Network thermal printers, cash drawer triggers, barcode scanners',
    permissions: ['settings:view', 'cash:open'],
  ),
  FeatureModuleItem(
    id: 'audit-vault',
    name: 'Security Audit Vault',
    icon: '🛡️',
    description: 'Immutable ledger of staff logins, bill voids, and sensitive actions',
    permissions: ['settings:view', 'cash:close'],
  ),
];

// ── Role Presets ─────────────────────────────────────────────────────────────
class RolePreset {
  final String id;
  final String label;
  final List<String> modules;

  const RolePreset({required this.id, required this.label, required this.modules});
}

final List<RolePreset> kRolePresets = [
  const RolePreset(
    id: 'WAITER',
    label: '🍽️ Waiter / Server',
    modules: ['pos', 'tables', 'history'],
  ),
  const RolePreset(
    id: 'CHEF',
    label: '👨‍🍳 Kitchen Chef',
    modules: ['kitchen', 'inventory', 'production'],
  ),
  const RolePreset(
    id: 'CASHIER',
    label: '💳 Cashier / Billing',
    modules: ['pos', 'history', 'expenses', 'gift-cards'],
  ),
  const RolePreset(
    id: 'MANAGER',
    label: '📋 Floor Manager',
    modules: [
      'dashboard', 'pos', 'tables', 'history', 'reservations', 'menu',
      'inventory', 'customers', 'expenses', 'reports', 'feedback'
    ],
  ),
  RolePreset(
    id: 'ADMIN',
    label: '⚡ Full Administrator',
    modules: kPlatformFeatureModules.map((m) => m.id).toList(),
  ),
];

// ── Telegram Notification Options (All Latest Events) ────────────────────────
class TelegramNotifOption {
  final String id;
  final String category;
  final String name;
  final String description;

  const TelegramNotifOption({
    required this.id,
    required this.category,
    required this.name,
    required this.description,
  });
}

const List<TelegramNotifOption> kTelegramNotifOptions = [
  TelegramNotifOption(
    id: 'ORDER_QR_NEW',
    category: 'Orders & Tables',
    name: '📱 QR Menu New Orders',
    description: 'Alert when guest places an order via QR menu',
  ),
  TelegramNotifOption(
    id: 'KOT_SENT',
    category: 'Orders & Tables',
    name: '🍳 KOT Sent to Kitchen',
    description: 'Alert when order tickets are fired to the kitchen',
  ),
  TelegramNotifOption(
    id: 'KOT_ACCEPTED',
    category: 'Kitchen Display',
    name: '👨‍🍳 KDS Ticket Accepted',
    description: 'Alert when chef accepts a ticket in kitchen display',
  ),
  TelegramNotifOption(
    id: 'FOOD_READY',
    category: 'Kitchen Display',
    name: '🔔 Food Ready to Serve',
    description: 'Alert waitstaff when dishes are cooked and ready at pass',
  ),
  TelegramNotifOption(
    id: 'FOOD_SERVED',
    category: 'Orders & Tables',
    name: '🥗 Food Served to Table',
    description: 'Alert when food is delivered and marked served',
  ),
  TelegramNotifOption(
    id: 'BILL_PAID',
    category: 'Billing & Cash',
    name: '💳 Bill Paid & Settled',
    description: 'Instant notification with bill items, total amount & mode',
  ),
  TelegramNotifOption(
    id: 'EXPENSE_RECORDED',
    category: 'Billing & Cash',
    name: '💰 Expense / Payout Logged',
    description: 'Alert when operational expenses or petty cash are recorded',
  ),
  TelegramNotifOption(
    id: 'ORDER_CANCELLED_TABLES',
    category: 'Cancellations & Voids',
    name: '❌ Cancelled on Tables View',
    description: 'Alert when an order is cancelled from floor tables plan',
  ),
  TelegramNotifOption(
    id: 'ORDER_CANCELLED_KITCHEN',
    category: 'Cancellations & Voids',
    name: '🚫 Cancelled on Kitchen Display',
    description: 'Alert when chef cancels or voids items in KDS',
  ),
  TelegramNotifOption(
    id: 'TABLE_RESERVATION_NEW',
    category: 'Reservations & Service',
    name: '📅 New Table Reservation',
    description: 'Alert when a guest books a table reservation',
  ),
  TelegramNotifOption(
    id: 'LOW_STOCK_ALERT',
    category: 'Inventory & Stock',
    name: '⚠️ Low Stock Warning',
    description: 'Alert when ingredient stock drops below safe threshold',
  ),
  TelegramNotifOption(
    id: 'INVENTORY_MODIFIED',
    category: 'Inventory & Stock',
    name: '📦 Stock & Inventory Changes',
    description: 'Alert on inventory adjustments, stock updates & purchases',
  ),
  TelegramNotifOption(
    id: 'MENU_MODIFIED',
    category: 'Menu Management',
    name: '🍽️ Menu Dish Add / Edit / Delete',
    description: 'Alert when dishes, prices or category availability change',
  ),
  TelegramNotifOption(
    id: 'DAILY_SALES_REPORT',
    category: 'Reports & Analytics',
    name: '📊 Daily Sales & Bestsellers Report',
    description: 'End-of-day summary with revenue & top selling items',
  ),
  TelegramNotifOption(
    id: 'DAILY_EXPENSES_REPORT',
    category: 'Reports & Analytics',
    name: '💸 Daily Expenses Report',
    description: 'Daily operational expenses & petty cash payouts summary',
  ),
  TelegramNotifOption(
    id: 'MONTHLY_REPORT',
    category: 'Reports & Analytics',
    name: '📈 Monthly Financial Report',
    description: 'Month-end consolidated revenue, expenses & P&L report',
  ),
  TelegramNotifOption(
    id: 'STAFF_MODIFIED',
    category: 'Administration',
    name: '👤 Staff Added / Modified',
    description: 'Alert when staff roster, role permissions or accounts change',
  ),
];

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen> {
  String _searchQuery = '';
  String _selectedDept = 'ALL';

  @override
  Widget build(BuildContext context) {
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: const Text('Staff & HR Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(staffProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showStaffSheet(context, null),
        backgroundColor: RosTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Add Staff', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search staff by name, designation or email...',
                hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 13),
                prefixIcon: const Icon(Icons.search_rounded, color: RosTheme.textMuted, size: 20),
                filled: true,
                fillColor: RosTheme.bgElevated,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: RosTheme.bgBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: RosTheme.bgBorder),
                ),
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
            ),
          ),

          // Department Filter Chips
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildDeptChip('ALL', 'All Depts'),
                ...kDepartments.map((d) => _buildDeptChip(d, d)),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Staff List
          Expanded(
            child: staffAsync.when(
              data: (list) {
                final filtered = list.where((m) {
                  final matchesSearch = _searchQuery.isEmpty ||
                      m.name.toLowerCase().contains(_searchQuery) ||
                      (m.designation?.toLowerCase().contains(_searchQuery) ?? false) ||
                      m.email.toLowerCase().contains(_searchQuery);
                  final matchesDept = _selectedDept == 'ALL' ||
                      (m.department?.toUpperCase() == _selectedDept.toUpperCase());
                  return matchesSearch && matchesDept;
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline_rounded,
                              size: 48, color: RosTheme.textMuted.withValues(alpha: 0.5)),
                          const SizedBox(height: 12),
                          const Text(
                            'No staff members found',
                            style: TextStyle(
                              color: RosTheme.textSecondary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final m = filtered[i];
                    return _buildStaffCard(m);
                  },
                );
              },
              loading: () =>
                  const Center(child: CircularProgressIndicator(color: RosTheme.primary)),
              error: (e, _) => Center(
                child: Text('$e', style: const TextStyle(color: RosTheme.textSecondary)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeptChip(String id, String label) {
    final isSelected = _selectedDept.toUpperCase() == id.toUpperCase();
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : RosTheme.textSecondary,
          ),
        ),
        selected: isSelected,
        selectedColor: RosTheme.primary,
        backgroundColor: RosTheme.bgElevated,
        showCheckmark: false,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(
            color: isSelected ? RosTheme.primary : RosTheme.bgBorder,
          ),
        ),
        onSelected: (_) {
          HapticFeedback.selectionClick();
          setState(() => _selectedDept = id);
        },
      ),
    );
  }

  Widget _buildStaffCard(StaffMember m) {
    final hasTelegram = m.telegramNotifications.isNotEmpty || (m.telegramChatId?.isNotEmpty == true);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: RosTheme.bgBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: RosTheme.primary.withValues(alpha: 0.15),
                child: Text(
                  m.name.isNotEmpty ? m.name.substring(0, 1).toUpperCase() : 'S',
                  style: const TextStyle(
                    color: RosTheme.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            m.name,
                            style: const TextStyle(
                              color: RosTheme.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: m.isActive
                                ? RosTheme.secondary.withValues(alpha: 0.15)
                                : RosTheme.danger.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            m.isActive ? 'Active' : 'Inactive',
                            style: TextStyle(
                              color: m.isActive ? RosTheme.secondary : RosTheme.danger,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    // Prominent Designation
                    Text(
                      m.designation?.isNotEmpty == true ? m.designation! : 'Staff Member',
                      style: const TextStyle(
                        color: RosTheme.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                    if (m.department?.isNotEmpty == true)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'Dept: ${m.department}',
                          style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                        ),
                      ),
                    if (m.email.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          m.email,
                          style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                        ),
                      ),
                    if (m.phone?.isNotEmpty == true)
                      Padding(
                        padding: const EdgeInsets.only(top: 1),
                        child: Text(
                          '📞 ${m.phone}',
                          style: const TextStyle(color: RosTheme.textSecondary, fontSize: 11),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),
          const Divider(height: 1, color: RosTheme.bgBorder),
          const SizedBox(height: 10),

          // Badges & Action Buttons
          Row(
            children: [
              // Telegram Status Badge
              if (hasTelegram)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF229ED9).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF229ED9).withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.send_rounded, size: 12, color: Color(0xFF229ED9)),
                      const SizedBox(width: 4),
                      Text(
                        '${m.telegramNotifications.length} Telegram Alerts',
                        style: const TextStyle(
                          color: Color(0xFF229ED9),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'No Telegram Alerts',
                    style: TextStyle(color: RosTheme.textMuted, fontSize: 10),
                  ),
                ),

              const Spacer(),

              // Edit Button
              InkWell(
                onTap: () => _showStaffSheet(context, m),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: RosTheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.edit_rounded, size: 14, color: RosTheme.primary),
                      SizedBox(width: 4),
                      Text(
                        'Edit & Access',
                        style: TextStyle(
                          color: RosTheme.primary,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // Delete Button
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, size: 18, color: RosTheme.danger),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () => _confirmDeleteStaff(m),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showStaffSheet(BuildContext context, StaffMember? staff) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _StaffFormSheet(staff: staff),
    ).then((_) {
      ref.invalidate(staffProvider);
    });
  }

  Future<void> _confirmDeleteStaff(StaffMember m) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Remove Staff Member?', style: TextStyle(color: RosTheme.textPrimary)),
        content: Text(
          'Are you sure you want to remove "${m.name}"? This action cannot be undone.',
          style: const TextStyle(color: RosTheme.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: RosTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: RosTheme.danger),
            child: const Text('Remove', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final api = ref.read(apiClientProvider);
        await api.delete('/staff/employees/${m.id}');
        ref.invalidate(staffProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Staff member "${m.name}" removed'),
              backgroundColor: RosTheme.secondary,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to remove staff: $e'), backgroundColor: RosTheme.danger),
          );
        }
      }
    }
  }
}

// ── Add / Edit Staff Form Sheet ─────────────────────────────────────────────
class _StaffFormSheet extends ConsumerStatefulWidget {
  final StaffMember? staff;
  const _StaffFormSheet({this.staff});

  @override
  ConsumerState<_StaffFormSheet> createState() => _StaffFormSheetState();
}

class _StaffFormSheetState extends ConsumerState<_StaffFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _customDesignationController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _salaryController;
  late final TextEditingController _passwordController;
  late final TextEditingController _telegramChatIdController;
  late final TextEditingController _telegramUsernameController;

  late String _selectedDept;
  late String _selectedDesignation;
  bool _isCustomDesignation = false;
  late bool _createAccount;
  late bool _isActive;
  String? _selectedRolePreset;
  final Set<String> _selectedModules = {};
  final Set<String> _selectedTelegramEvents = {};
  bool _submitting = false;

  bool _showPermissionsSection = false;
  bool _showTelegramSection = false;

  @override
  void initState() {
    super.initState();
    final s = widget.staff;
    _nameController = TextEditingController(text: s?.name ?? '');
    _phoneController = TextEditingController(text: s?.phone ?? '');
    _emailController = TextEditingController(text: s?.email ?? '');
    _salaryController = TextEditingController(text: s?.salary != null ? s!.salary!.toStringAsFixed(0) : '');
    _passwordController = TextEditingController();
    _telegramChatIdController = TextEditingController(text: s?.telegramChatId ?? '');
    _telegramUsernameController = TextEditingController(text: s?.telegramUsername ?? '');

    _selectedDept = s?.department ?? 'Kitchen';
    _isActive = s?.isActive ?? true;
    _createAccount = s != null ? (s.userId?.isNotEmpty == true || s.email.isNotEmpty) : false;

    // Check designation
    final existingDesig = s?.designation ?? 'Waiter / Server';
    bool isKnown = false;
    for (final group in kDesignationCategories) {
      if (group.items.contains(existingDesig)) {
        isKnown = true;
        break;
      }
    }

    if (isKnown) {
      _selectedDesignation = existingDesig;
      _customDesignationController = TextEditingController();
      _isCustomDesignation = false;
    } else {
      _selectedDesignation = 'CUSTOM';
      _customDesignationController = TextEditingController(text: existingDesig);
      _isCustomDesignation = true;
    }

    // Initialize telegram notifications
    if (s?.telegramNotifications != null) {
      _selectedTelegramEvents.addAll(s!.telegramNotifications);
    }

    // Initialize modules from permissions or default role preset
    if (s != null && s.permissions.isNotEmpty) {
      for (final mod in kPlatformFeatureModules) {
        if (mod.permissions.any((p) => s.permissions.contains(p))) {
          _selectedModules.add(mod.id);
        }
      }
    } else {
      // Default to Waiter role preset
      _applyRolePreset('WAITER');
    }
  }

  void _applyRolePreset(String roleId) {
    setState(() {
      _selectedRolePreset = roleId;
      _selectedModules.clear();
      final preset = kRolePresets.firstWhere((p) => p.id == roleId, orElse: () => kRolePresets.first);
      _selectedModules.addAll(preset.modules);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _customDesignationController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _salaryController.dispose();
    _passwordController.dispose();
    _telegramChatIdController.dispose();
    _telegramUsernameController.dispose();
    super.dispose();
  }

  List<String> _collectPermissions() {
    final permissions = <String>{};
    for (final modId in _selectedModules) {
      final mod = kPlatformFeatureModules.firstWhere((m) => m.id == modId, orElse: () => kPlatformFeatureModules.first);
      permissions.addAll(mod.permissions);
    }
    return permissions.toList();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final designation = _isCustomDesignation
        ? _customDesignationController.text.trim()
        : _selectedDesignation;

    if (designation.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select or specify a designation'),
          backgroundColor: RosTheme.danger,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      final isEditing = widget.staff != null;

      final permissions = _collectPermissions();
      final telegramNotifs = _selectedTelegramEvents.toList();

      final payload = <String, dynamic>{
        'name': _nameController.text.trim(),
        'department': _selectedDept,
        'designation': designation,
        if (_phoneController.text.trim().isNotEmpty) 'phone': _phoneController.text.trim(),
        if (_emailController.text.trim().isNotEmpty) 'email': _emailController.text.trim(),
        if (_salaryController.text.trim().isNotEmpty)
          'salary': double.tryParse(_salaryController.text.trim()) ?? 0,
        if (_createAccount || isEditing) ...{
          'createUserAccount': true,
          if (_passwordController.text.trim().isNotEmpty)
            'password': _passwordController.text.trim(),
          'roleName': _selectedRolePreset ?? 'STAFF',
          'permissions': permissions,
          'telegramChatId': _telegramChatIdController.text.trim().isNotEmpty
              ? _telegramChatIdController.text.trim()
              : null,
          'telegramUsername': _telegramUsernameController.text.trim().isNotEmpty
              ? _telegramUsernameController.text.trim().replaceAll('@', '')
              : null,
          'telegramNotifications': telegramNotifs,
        },
        if (isEditing) 'isActiveUser': _isActive,
      };

      if (isEditing) {
        await api.put('/staff/employees/${widget.staff!.id}', data: payload);
      } else {
        await api.post('/staff/employees', data: payload);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isEditing
                  ? 'Staff "${_nameController.text.trim()}" updated successfully!'
                  : 'Staff "${_nameController.text.trim()}" registered successfully!',
            ),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save staff: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.staff != null;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 20,
        right: 20,
        top: 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: RosTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isEditing ? Icons.manage_accounts_rounded : Icons.person_add_rounded,
                      color: RosTheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEditing ? 'Edit Staff & Permissions' : 'Add New Staff Member',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: RosTheme.textPrimary,
                          ),
                        ),
                        Text(
                          isEditing
                              ? 'Modify profile, platform access & Telegram alerts'
                              : 'Assign designation, department, platform access & Telegram',
                          style: const TextStyle(fontSize: 11, color: RosTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Full Name *
              TextFormField(
                controller: _nameController,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: _inputDecoration('Full Name *', 'e.g. Rahul Sharma'),
                validator: (val) =>
                    val == null || val.trim().isEmpty ? 'Please enter staff name' : null,
              ),
              const SizedBox(height: 12),

              // Department Dropdown
              DropdownButtonFormField<String>(
                initialValue: _selectedDept,
                dropdownColor: RosTheme.bgElevated,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: _inputDecoration('Department *', null),
                items: kDepartments
                    .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedDept = val);
                },
              ),
              const SizedBox(height: 12),

              // ── Comprehensive Designation Dropdown ──────────────────────────
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Designation *',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: RosTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: RosTheme.bgBorder),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _isCustomDesignation ? 'CUSTOM' : _selectedDesignation,
                        isExpanded: true,
                        dropdownColor: RosTheme.bgElevated,
                        style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                        items: [
                          ...kDesignationCategories.expand((group) => [
                                DropdownMenuItem<String>(
                                  enabled: false,
                                  value: 'HEADER_${group.category}',
                                  child: Text(
                                    group.category,
                                    style: const TextStyle(
                                      color: RosTheme.primary,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                ...group.items.map((item) => DropdownMenuItem<String>(
                                      value: item,
                                      child: Padding(
                                        padding: const EdgeInsets.only(left: 10),
                                        child: Text(item),
                                      ),
                                    )),
                              ]),
                          const DropdownMenuItem<String>(
                            value: 'CUSTOM',
                            child: Text(
                              '✨ + Custom / Other Designation',
                              style: TextStyle(
                                color: RosTheme.secondary,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                        onChanged: (val) {
                          if (val == null || val.startsWith('HEADER_')) return;
                          setState(() {
                            if (val == 'CUSTOM') {
                              _isCustomDesignation = true;
                            } else {
                              _isCustomDesignation = false;
                              _selectedDesignation = val;
                            }
                          });
                        },
                      ),
                    ),
                  ),
                  if (_isCustomDesignation) ...[
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _customDesignationController,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: _inputDecoration(
                        'Type Custom Designation *',
                        'e.g. Master Roaster / Executive Sommelier',
                      ),
                      validator: (val) => _isCustomDesignation && (val == null || val.trim().isEmpty)
                          ? 'Please enter designation'
                          : null,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),

              // Phone & Monthly Salary
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: _inputDecoration('Phone Number', '+91 9876543210'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _salaryController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: _inputDecoration('Salary (₹/mo)', '25000'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // ── Active Status (if editing) ──────────────────────────────────
              if (isEditing)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isActive ? Icons.check_circle_rounded : Icons.cancel_rounded,
                        size: 18,
                        color: _isActive ? RosTheme.secondary : RosTheme.danger,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Staff Member Active Status',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: RosTheme.textPrimary,
                          ),
                        ),
                      ),
                      Switch(
                        value: _isActive,
                        activeThumbColor: RosTheme.secondary,
                        onChanged: (val) => setState(() => _isActive = val),
                      ),
                    ],
                  ),
                ),

              // ── User Account Login Toggle ───────────────────────────────────
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: RosTheme.bgBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.key_rounded, size: 18, color: RosTheme.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Enable App & POS Login Account',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: RosTheme.textPrimary,
                        ),
                      ),
                    ),
                    Switch(
                      value: _createAccount,
                      activeThumbColor: RosTheme.primary,
                      onChanged: (val) => setState(() => _createAccount = val),
                    ),
                  ],
                ),
              ),

              if (_createAccount) ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: _inputDecoration('Login Email *', 'staff@cafe.com'),
                  validator: (val) => _createAccount && (val == null || val.trim().isEmpty)
                      ? 'Email required for account login'
                      : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: _inputDecoration(
                    isEditing ? 'New Password (leave blank to keep current)' : 'Login Password',
                    'Default: Pass@123',
                  ),
                ),
              ],

              const SizedBox(height: 14),

              // ── Platform Feature Modules & Permissions Section ──────────────
              Container(
                decoration: BoxDecoration(
                  color: RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: RosTheme.bgBorder),
                ),
                child: Column(
                  children: [
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.security_rounded, color: RosTheme.primary, size: 20),
                      title: Text(
                        'Feature Access Permissions (${_selectedModules.length}/${kPlatformFeatureModules.length})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: RosTheme.textPrimary,
                        ),
                      ),
                      subtitle: const Text(
                        'Select role preset or toggle individual platform features',
                        style: TextStyle(fontSize: 10, color: RosTheme.textMuted),
                      ),
                      trailing: Icon(
                        _showPermissionsSection ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                        color: RosTheme.textSecondary,
                      ),
                      onTap: () => setState(() => _showPermissionsSection = !_showPermissionsSection),
                    ),

                    if (_showPermissionsSection) ...[
                      const Divider(height: 1, color: RosTheme.bgBorder),
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Role Presets Chips
                            const Text(
                              'QUICK ROLE PRESETS',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: RosTheme.textMuted,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: kRolePresets.map((preset) {
                                final isSelected = _selectedRolePreset == preset.id;
                                return ActionChip(
                                  label: Text(
                                    preset.label,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: isSelected ? Colors.white : RosTheme.textSecondary,
                                    ),
                                  ),
                                  backgroundColor: isSelected ? RosTheme.primary : RosTheme.bgCard,
                                  side: BorderSide(
                                    color: isSelected ? RosTheme.primary : RosTheme.bgBorder,
                                  ),
                                  onPressed: () => _applyRolePreset(preset.id),
                                );
                              }).toList(),
                            ),

                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'PLATFORM FEATURE MODULES',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: RosTheme.textMuted,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                Row(
                                  children: [
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _selectedRolePreset = null;
                                          _selectedModules.addAll(kPlatformFeatureModules.map((m) => m.id));
                                        });
                                      },
                                      child: const Text('Select All', style: TextStyle(fontSize: 11, color: RosTheme.primary)),
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _selectedRolePreset = null;
                                          _selectedModules.clear();
                                        });
                                      },
                                      child: const Text('Clear', style: TextStyle(fontSize: 11, color: RosTheme.danger)),
                                    ),
                                  ],
                                ),
                              ],
                            ),

                            // List of Feature Checkboxes
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: kPlatformFeatureModules.length,
                              itemBuilder: (ctx, idx) {
                                final mod = kPlatformFeatureModules[idx];
                                final isChecked = _selectedModules.contains(mod.id);
                                return CheckboxListTile(
                                  dense: true,
                                  value: isChecked,
                                  activeColor: RosTheme.primary,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                                  title: Row(
                                    children: [
                                      Text(mod.icon, style: const TextStyle(fontSize: 14)),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          mod.name,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: RosTheme.textPrimary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  subtitle: Text(
                                    mod.description,
                                    style: const TextStyle(fontSize: 10, color: RosTheme.textMuted),
                                  ),
                                  onChanged: (val) {
                                    setState(() {
                                      _selectedRolePreset = null;
                                      if (val == true) {
                                        _selectedModules.add(mod.id);
                                      } else {
                                        _selectedModules.remove(mod.id);
                                      }
                                    });
                                  },
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // ── Telegram Notifications Section ──────────────────────────────
              Container(
                decoration: BoxDecoration(
                  color: RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF229ED9).withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.send_rounded, color: Color(0xFF229ED9), size: 20),
                      title: Text(
                        'Telegram Notifications (${_selectedTelegramEvents.length}/${kTelegramNotifOptions.length})',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: RosTheme.textPrimary,
                        ),
                      ),
                      subtitle: const Text(
                        'Configure staff bot chat & real-time operational alerts',
                        style: TextStyle(fontSize: 10, color: RosTheme.textMuted),
                      ),
                      trailing: Icon(
                        _showTelegramSection ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                        color: RosTheme.textSecondary,
                      ),
                      onTap: () => setState(() => _showTelegramSection = !_showTelegramSection),
                    ),

                    if (_showTelegramSection) ...[
                      const Divider(height: 1, color: RosTheme.bgBorder),
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Telegram Chat ID & Username Inputs
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _telegramChatIdController,
                                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12),
                                    decoration: _inputDecoration('Telegram Chat ID', 'e.g. 123456789'),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextFormField(
                                    controller: _telegramUsernameController,
                                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12),
                                    decoration: _inputDecoration('Telegram Username', '@john_doe'),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'REAL-TIME ALERT SUBSCRIBED EVENTS',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: RosTheme.textMuted,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                Row(
                                  children: [
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _selectedTelegramEvents.addAll(kTelegramNotifOptions.map((e) => e.id));
                                        });
                                      },
                                      child: const Text('Select All', style: TextStyle(fontSize: 11, color: Color(0xFF229ED9))),
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _selectedTelegramEvents.clear();
                                        });
                                      },
                                      child: const Text('Clear', style: TextStyle(fontSize: 11, color: RosTheme.danger)),
                                    ),
                                  ],
                                ),
                              ],
                            ),

                            // List of Telegram Event Checkboxes
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: kTelegramNotifOptions.length,
                              itemBuilder: (ctx, idx) {
                                final opt = kTelegramNotifOptions[idx];
                                final isChecked = _selectedTelegramEvents.contains(opt.id);
                                return CheckboxListTile(
                                  dense: true,
                                  value: isChecked,
                                  activeColor: const Color(0xFF229ED9),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                                  title: Text(
                                    opt.name,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: RosTheme.textPrimary,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${opt.category} • ${opt.description}',
                                    style: const TextStyle(fontSize: 10, color: RosTheme.textMuted),
                                  ),
                                  onChanged: (val) {
                                    setState(() {
                                      if (val == true) {
                                        _selectedTelegramEvents.add(opt.id);
                                      } else {
                                        _selectedTelegramEvents.remove(opt.id);
                                      }
                                    });
                                  },
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Submit Button
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        isEditing ? 'Save Changes' : 'Register Staff Member',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                      ),
              ),
              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, String? hint) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      labelStyle: const TextStyle(color: RosTheme.textSecondary, fontSize: 12),
      hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
      filled: true,
      fillColor: RosTheme.bgCard,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: RosTheme.bgBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: RosTheme.bgBorder),
      ),
    );
  }
}
