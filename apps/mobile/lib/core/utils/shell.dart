// =============================================================================
// App Shell — Bottom navigation + side drawer
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/providers.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const List<_NavItem> _navItems = [
    _NavItem(path: '/tables', label: 'Tables', icon: Icons.grid_view_rounded),
    _NavItem(path: '/pos', label: 'POS', icon: Icons.point_of_sale_rounded),
    _NavItem(path: '/kitchen', label: 'Kitchen', icon: Icons.restaurant_rounded),
    _NavItem(path: '/dashboard', label: 'Dashboard', icon: Icons.home_rounded),
    _NavItem(path: '/menu', label: 'More', icon: Icons.menu_rounded),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final user = ref.watch(authProvider).user;

    int selectedIndex = 3; // Dashboard default
    for (var i = 0; i < _navItems.length; i++) {
      if (location.startsWith(_navItems[i].path)) {
        selectedIndex = i;
        break;
      }
    }

    return Scaffold(
      body: Row(
        children: [
          // Desktop-style side rail for larger screens
          if (MediaQuery.of(context).size.width > 800)
            _buildSideRail(context, ref, location, user),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: MediaQuery.of(context).size.width <= 800
          ? _buildBottomNav(context, selectedIndex)
          : null,
      endDrawer: _buildDrawer(context, ref, user),
    );
  }

  Widget _buildBottomNav(BuildContext context, int selectedIndex) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: RosTheme.bgBorder, width: 1),
        ),
      ),
      child: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (i) => context.go(_navItems[i].path),
        destinations: _navItems.map((item) => NavigationDestination(
          icon: Icon(item.icon),
          label: item.label,
        )).toList(),
      ),
    );
  }

  Widget _buildSideRail(BuildContext context, WidgetRef ref, String location, user) {
    return Container(
      width: 220,
      decoration: const BoxDecoration(
        color: RosTheme.bgCard,
        border: Border(right: BorderSide(color: RosTheme.bgBorder)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 48),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: RosTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.restaurant, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Text('ROS', style: TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                )),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: _allNavSections.map((section) {
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
          // User avatar at bottom
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
                        user?.roles.firstOrNull ?? 'Staff',
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref, user) {
    return Drawer(
      backgroundColor: RosTheme.bgCard,
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: RosTheme.primaryGradient,
            ),
            child: Row(
              children: [
                const Icon(Icons.restaurant, color: Colors.white, size: 28),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'ROS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      user?.name ?? '',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: _allNavSections.map((section) {
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
              await ref.read(authProvider.notifier).logout();
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

const List<Object> _allNavSections = [
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
