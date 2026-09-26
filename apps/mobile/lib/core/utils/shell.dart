// =============================================================================
// App Shell — Dynamic Role-Based Navigation, Profile Menu & Logout
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import '../../features/auth/telegram_connection_sheet.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const List<_NavItem> _restaurantBottomNav = [
    _NavItem(path: '/tables', label: 'Tables', icon: Icons.grid_view_rounded),
    _NavItem(path: '/pos', label: 'POS', icon: Icons.point_of_sale_rounded),
    _NavItem(path: '/kitchen', label: 'Kitchen', icon: Icons.restaurant_rounded),
    _NavItem(path: '/dashboard', label: 'Dashboard', icon: Icons.home_rounded),
    _NavItem(path: '/menu', label: 'More', icon: Icons.menu_rounded),
  ];

  static const List<_NavItem> _superAdminBottomNav = [
    _NavItem(path: '/super-admin', label: 'Platform Control', icon: Icons.hub_rounded),
    _NavItem(path: '/settings', label: 'Settings', icon: Icons.settings_rounded),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final authState = ref.watch(authProvider);
    ref.watch(socketProvider); // Maintain active real-time socket connection
    final user = authState.user;
    final isSuperAdmin = user?.isPlatformAdmin ?? false;

    final navItems = isSuperAdmin ? _superAdminBottomNav : _restaurantBottomNav;

    int selectedIndex = 0;
    for (var i = 0; i < navItems.length; i++) {
      if (location.startsWith(navItems[i].path)) {
        selectedIndex = i;
        break;
      }
    }

    return Scaffold(
      appBar: _buildTopBar(context, ref, user, isSuperAdmin),
      body: Row(
        children: [
          // Side rail for tablets/desktop
          if (MediaQuery.of(context).size.width > 800)
            _buildSideRail(context, ref, location, user, isSuperAdmin),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: MediaQuery.of(context).size.width <= 800
          ? _buildBottomNav(context, selectedIndex, navItems)
          : null,
      endDrawer: _buildDrawer(context, ref, user, isSuperAdmin),
    );
  }

  PreferredSizeWidget _buildTopBar(
    BuildContext context,
    WidgetRef ref,
    AuthUser? user,
    bool isSuperAdmin,
  ) {
    final tenantName = user?.tenantName ?? 'Restaurant OS';
    final roleName = isSuperAdmin
        ? 'Platform Admin'
        : (user?.roles.isNotEmpty == true ? user!.roles.first : 'Staff');

    return AppBar(
      elevation: 0,
      backgroundColor: RosTheme.bgCard,
      surfaceTintColor: Colors.transparent,
      titleSpacing: 16,
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              gradient: isSuperAdmin
                  ? const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)])
                  : RosTheme.primaryGradient,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isSuperAdmin ? Icons.hub_rounded : Icons.restaurant_rounded,
              color: Colors.white,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isSuperAdmin ? 'Platform HQ' : tenantName,
                  style: const TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: RosTheme.secondary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      roleName,
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        // Profile menu avatar button
        GestureDetector(
          onTap: () => _showProfileModal(context, ref, user, isSuperAdmin),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: RosTheme.bgElevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor: RosTheme.primary.withOpacity(0.2),
                  child: Text(
                    (user?.name.isNotEmpty == true ? user!.name[0] : 'U').toUpperCase(),
                    style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 80),
                  child: Text(
                    user?.name.split(' ').first ?? 'Profile',
                    style: const TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(Icons.arrow_drop_down_rounded, color: RosTheme.textMuted, size: 18),
              ],
            ),
          ),
        ),
        // Direct Quick Logout Icon Button
        IconButton(
          tooltip: 'Sign Out',
          icon: const Icon(Icons.logout_rounded, color: RosTheme.danger, size: 20),
          onPressed: () => _confirmLogout(context, ref),
        ),
        // Drawer toggle
        Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: RosTheme.textSecondary, size: 22),
            onPressed: () => Scaffold.of(ctx).openEndDrawer(),
          ),
        ),
        const SizedBox(width: 4),
      ],
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(color: RosTheme.bgBorder, height: 1),
      ),
    );
  }

  void _showProfileModal(
    BuildContext context,
    WidgetRef ref,
    AuthUser? user,
    bool isSuperAdmin,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: RosTheme.textMuted.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // User Header
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: RosTheme.primary.withOpacity(0.15),
                  child: Text(
                    (user?.name.isNotEmpty == true ? user!.name[0] : 'U').toUpperCase(),
                    style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'User Profile',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        user?.email ?? '',
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        children: [
                          if (isSuperAdmin)
                            _buildRoleBadge('PLATFORM SUPERADMIN', const Color(0xFF6366F1))
                          else
                            ...(user?.roles ?? ['STAFF']).map(
                              (r) => _buildRoleBadge(r, RosTheme.primary),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Divider(color: RosTheme.bgBorder),
            const SizedBox(height: 12),

            // Tenant & Branch info
            _buildInfoRow(
              icon: Icons.store_rounded,
              title: 'Restaurant',
              value: user?.tenantName ?? user?.tenantId ?? 'Default',
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              icon: Icons.location_on_rounded,
              title: 'Active Branch',
              value: user?.branchId ?? 'Main Branch',
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              icon: Icons.wifi_tethering_rounded,
              title: 'Connection',
              value: 'Live Server (ros.oxomsoft.com)',
              valueColor: RosTheme.secondary,
            ),

            const SizedBox(height: 14),

            // Telegram Alerts & Bot Connection Button
            GestureDetector(
              onTap: () {
                Navigator.pop(ctx);
                TelegramConnectionSheet.show(context);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF229ED9).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: const Color(0xFF229ED9).withValues(alpha: 0.35),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF229ED9).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.send_rounded,
                        color: Color(0xFF229ED9),
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Telegram Alerts & Bot',
                            style: TextStyle(
                              color: RosTheme.textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Connect account for live KOT & bills',
                            style: TextStyle(
                              color: RosTheme.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 14,
                      color: Color(0xFF229ED9),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 14),
            // Action buttons
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/settings');
                },
                icon: const Icon(Icons.settings_rounded, size: 18),
                label: const Text('Account & Settings'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.bgElevated,
                  foregroundColor: RosTheme.textPrimary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: RosTheme.bgBorder),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _confirmLogout(context, ref);
                },
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('Sign Out'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.danger.withOpacity(0.12),
                  foregroundColor: RosTheme.danger,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: RosTheme.danger.withOpacity(0.3)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleBadge(String role, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        role.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: RosTheme.textMuted),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(color: RosTheme.textMuted, fontSize: 13)),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? RosTheme.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        title: const Text('Sign Out', style: TextStyle(color: RosTheme.textPrimary)),
        content: const Text(
          'Are you sure you want to sign out of your account?',
          style: TextStyle(color: RosTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: RosTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: RosTheme.danger),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authProvider.notifier).logout();
    }
  }

  Widget _buildBottomNav(BuildContext context, int selectedIndex, List<_NavItem> items) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: RosTheme.bgBorder, width: 1),
        ),
      ),
      child: NavigationBar(
        selectedIndex: selectedIndex.clamp(0, items.length - 1),
        onDestinationSelected: (i) => context.go(items[i].path),
        destinations: items.map((item) => NavigationDestination(
          icon: Icon(item.icon),
          label: item.label,
        )).toList(),
      ),
    );
  }

  Widget _buildSideRail(BuildContext context, WidgetRef ref, String location, AuthUser? user, bool isSuperAdmin) {
    final sections = isSuperAdmin ? _superAdminNavSections : _restaurantNavSections;

    return Container(
      width: 230,
      decoration: const BoxDecoration(
        color: RosTheme.bgCard,
        border: Border(right: BorderSide(color: RosTheme.bgBorder)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: isSuperAdmin
                        ? const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)])
                        : RosTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isSuperAdmin ? Icons.hub_rounded : Icons.restaurant,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('ROS', style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    )),
                    Text(
                      isSuperAdmin ? 'Platform HQ' : (user?.tenantName ?? 'Restaurant OS'),
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: sections.map((section) {
                if (section is _SectionDivider) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(8, 16, 8, 4),
                    child: Text(
                      section.label,
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                  );
                }
                final item = section as _NavItem;
                final isActive = location.startsWith(item.path);
                return Container(
                  margin: const EdgeInsets.only(bottom: 2),
                  child: ListTile(
                    dense: true,
                    leading: Icon(
                      item.icon,
                      size: 18,
                      color: isActive ? RosTheme.primary : RosTheme.textMuted,
                    ),
                    title: Text(
                      item.label,
                      style: TextStyle(
                        color: isActive ? RosTheme.primary : RosTheme.textSecondary,
                        fontSize: 13,
                        fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                    selected: isActive,
                    selectedTileColor: RosTheme.primary.withOpacity(0.1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    onTap: () => context.go(item.path),
                  ),
                );
              }).toList(),
            ),
          ),
          // User profile at bottom
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: RosTheme.bgBorder)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: RosTheme.primary.withOpacity(0.2),
                  child: Text(
                    (user?.name ?? 'U').substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        user?.name ?? '',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        isSuperAdmin ? 'Super Admin' : (user?.roles.firstOrNull ?? 'Owner'),
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout, color: RosTheme.danger, size: 18),
                  onPressed: () => _confirmLogout(context, ref),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref, AuthUser? user, bool isSuperAdmin) {
    final sections = isSuperAdmin ? _superAdminNavSections : _restaurantNavSections;

    return Drawer(
      backgroundColor: RosTheme.bgCard,
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              gradient: isSuperAdmin
                  ? const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF4338CA)])
                  : RosTheme.primaryGradient,
            ),
            child: Row(
              children: [
                Icon(
                  isSuperAdmin ? Icons.hub_rounded : Icons.restaurant,
                  color: Colors.white,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isSuperAdmin ? 'Platform Control' : 'ROS Mobile',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        user?.name ?? user?.email ?? '',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: sections.map((section) {
                if (section is _SectionDivider) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Text(
                      section.label,
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                  );
                }
                final item = section as _NavItem;
                return ListTile(
                  leading: Icon(item.icon, color: RosTheme.textSecondary, size: 20),
                  title: Text(item.label, style: const TextStyle(
                    color: RosTheme.textSecondary,
                    fontSize: 14,
                  )),
                  onTap: () {
                    Navigator.pop(context);
                    context.go(item.path);
                  },
                );
              }).toList(),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: RosTheme.danger),
            title: const Text('Logout', style: TextStyle(color: RosTheme.danger)),
            onTap: () async {
              Navigator.pop(context);
              await _confirmLogout(context, ref);
            },
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _NavItem {
  final String path;
  final String label;
  final IconData icon;
  const _NavItem({required this.path, required this.label, required this.icon});
}

class _SectionDivider {
  final String label;
  const _SectionDivider(this.label);
}

const List<Object> _restaurantNavSections = [
  _SectionDivider('OPERATIONS'),
  _NavItem(path: '/tables', label: 'Tables', icon: Icons.grid_view_rounded),
  _NavItem(path: '/pos', label: 'Point of Sale', icon: Icons.point_of_sale_rounded),
  _NavItem(path: '/kitchen', label: 'Kitchen Display', icon: Icons.restaurant_rounded),
  _NavItem(path: '/order-history', label: 'Order History', icon: Icons.receipt_long_rounded),
  _NavItem(path: '/reservations', label: 'Reservations', icon: Icons.event_seat_rounded),
  _SectionDivider('MENU & INVENTORY'),
  _NavItem(path: '/menu', label: 'Menu Catalog', icon: Icons.menu_book_rounded),
  _NavItem(path: '/inventory', label: 'Inventory', icon: Icons.inventory_2_rounded),
  _SectionDivider('PEOPLE & FINANCE'),
  _NavItem(path: '/customers', label: 'Customers', icon: Icons.people_rounded),
  _NavItem(path: '/staff', label: 'Staff & HR', icon: Icons.badge_rounded),
  _NavItem(path: '/reports', label: 'Reports', icon: Icons.bar_chart_rounded),
  _SectionDivider('SYSTEM'),
  _NavItem(path: '/dashboard', label: 'Dashboard', icon: Icons.home_rounded),
  _NavItem(path: '/settings', label: 'Settings', icon: Icons.settings_rounded),
];

const List<Object> _superAdminNavSections = [
  _SectionDivider('PLATFORM SAAS CONTROL'),
  _NavItem(path: '/super-admin', label: 'Platform Control', icon: Icons.hub_rounded),
  _SectionDivider('CONFIGURATION'),
  _NavItem(path: '/settings', label: 'Settings', icon: Icons.settings_rounded),
];
