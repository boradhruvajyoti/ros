// =============================================================================
// App Shell — Dynamic Role-Based Navigation, Profile Menu & Logout
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import '../../features/auth/telegram_connection_sheet.dart';
import '../../features/auth/outlet_switcher_sheet.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

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

    final navItems = isSuperAdmin
        ? _superAdminBottomNav
        : _getFilteredBottomNav(user, isSuperAdmin);

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
      bottomNavigationBar: (MediaQuery.of(context).size.width <= 800 && navItems.isNotEmpty)
          ? _buildBottomNav(context, ref, selectedIndex, navItems)
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
        // Compact Outlet Switcher chip (when not Platform SuperAdmin)
        if (!isSuperAdmin)
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              OutletSwitcherSheet.show(context);
            },
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: RosTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: RosTheme.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.storefront_rounded, color: RosTheme.primary, size: 14),
                  const SizedBox(width: 4),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 80),
                    child: Text(
                      user?.branchName ?? 'Outlet',
                      style: const TextStyle(
                        color: RosTheme.primary,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down_rounded, color: RosTheme.primary, size: 16),
                ],
              ),
            ),
          ),
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
                  backgroundColor: RosTheme.primary.withValues(alpha: 0.2),
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
                  color: RosTheme.textMuted.withValues(alpha: 0.3),
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
                  backgroundColor: RosTheme.primary.withValues(alpha: 0.15),
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
            Row(
              children: [
                Expanded(
                  child: _buildInfoRow(
                    icon: Icons.location_on_rounded,
                    title: 'Active Branch',
                    value: user?.branchName ?? user?.branchId ?? 'Main Branch',
                  ),
                ),
                if (!isSuperAdmin)
                  TextButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      OutletSwitcherSheet.show(context);
                    },
                    icon: const Icon(Icons.swap_horiz_rounded, size: 15, color: RosTheme.primary),
                    label: const Text(
                      'Switch',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: RosTheme.primary,
                      ),
                    ),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              icon: Icons.wifi_tethering_rounded,
              title: 'Connection',
              value: 'Live Server (ros.oxomsoft.com)',
              valueColor: RosTheme.secondary,
            ),

            if (user?.hasTelegramAccess == true) ...[
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
            ],

            if (isRouteAccessible('/settings', user)) ...[
              const SizedBox(height: 14),
              // Action button for Settings
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    Navigator.pop(ctx);
                    refreshScreenRouteData(ref, '/settings');
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
            ],
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
                  backgroundColor: RosTheme.danger.withValues(alpha: 0.12),
                  foregroundColor: RosTheme.danger,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: RosTheme.danger.withValues(alpha: 0.3)),
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
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
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

  Widget _buildBottomNav(BuildContext context, WidgetRef ref, int selectedIndex, List<_NavItem> items) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: RosTheme.bgBorder, width: 1),
        ),
      ),
      child: NavigationBar(
        selectedIndex: selectedIndex.clamp(0, items.length - 1),
        onDestinationSelected: (i) {
          HapticFeedback.selectionClick();
          refreshScreenRouteData(ref, items[i].path);
          context.go(items[i].path);
        },
        destinations: items.map((item) => NavigationDestination(
          icon: Icon(item.icon),
          label: item.label,
        )).toList(),
      ),
    );
  }

  static List<_NavItem> _getFilteredBottomNav(AuthUser? user, bool isSuperAdmin) {
    if (isSuperAdmin) return _superAdminBottomNav;
    if (user == null) return [];

    if (user.isTenantAdmin) {
      return const [
        _NavItem(path: '/tables', label: 'Tables', icon: Icons.grid_view_rounded),
        _NavItem(path: '/current-orders', label: 'Current', icon: Icons.receipt_long_rounded),
        _NavItem(path: '/kitchen', label: 'Kitchen', icon: Icons.restaurant_rounded),
        _NavItem(path: '/order-history', label: 'History', icon: Icons.history_rounded),
        _NavItem(path: '/dashboard', label: 'Dashboard', icon: Icons.home_rounded),
      ];
    }

    const candidates = [
      _NavItem(path: '/tables', label: 'Tables', icon: Icons.grid_view_rounded),
      _NavItem(path: '/current-orders', label: 'Current', icon: Icons.receipt_long_rounded),
      _NavItem(path: '/kitchen', label: 'Kitchen', icon: Icons.restaurant_rounded),
      _NavItem(path: '/order-history', label: 'History', icon: Icons.history_rounded),
      _NavItem(path: '/menu', label: 'Menu', icon: Icons.menu_book_rounded),
      _NavItem(path: '/inventory', label: 'Inventory', icon: Icons.inventory_2_rounded),
      _NavItem(path: '/reservations', label: 'Bookings', icon: Icons.event_seat_rounded),
      _NavItem(path: '/customers', label: 'Customers', icon: Icons.people_rounded),
      _NavItem(path: '/staff', label: 'Staff', icon: Icons.badge_rounded),
      _NavItem(path: '/reports', label: 'Reports', icon: Icons.bar_chart_rounded),
      _NavItem(path: '/dashboard', label: 'Dashboard', icon: Icons.home_rounded),
      _NavItem(path: '/settings', label: 'Settings', icon: Icons.settings_rounded),
    ];

    final allowed = candidates.where((item) => isRouteAccessible(item.path, user)).toList();
    if (allowed.isEmpty) {
      return const [_NavItem(path: '/login', label: 'Home', icon: Icons.home_rounded)];
    }
    return allowed.take(5).toList();
  }

  static List<Object> _getFilteredNavSections(AuthUser? user, bool isSuperAdmin) {
    if (isSuperAdmin) return _superAdminNavSections;
    if (user == null) return [];
    if (user.isTenantAdmin) return _restaurantNavSections;

    final allowedSections = <Object>[];
    _SectionDivider? currentDivider;
    int itemsUnderCurrentDivider = 0;

    for (final section in _restaurantNavSections) {
      if (section is _SectionDivider) {
        currentDivider = section;
        itemsUnderCurrentDivider = 0;
        continue;
      }
      final item = section as _NavItem;
      if (isRouteAccessible(item.path, user)) {
        if (currentDivider != null && itemsUnderCurrentDivider == 0) {
          allowedSections.add(currentDivider);
        }
        allowedSections.add(item);
        itemsUnderCurrentDivider++;
      }
    }

    return allowedSections;
  }

  Widget _buildSideRail(BuildContext context, WidgetRef ref, String location, AuthUser? user, bool isSuperAdmin) {
    final sections = _getFilteredNavSections(user, isSuperAdmin);

    return Container(
      width: 235,
      decoration: const BoxDecoration(
        color: RosTheme.bgCard,
        border: Border(right: BorderSide(color: RosTheme.bgBorder)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isSuperAdmin
                        ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                        : RosTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSuperAdmin
                          ? const Color(0xFF6366F1).withValues(alpha: 0.3)
                          : RosTheme.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Icon(
                    isSuperAdmin ? Icons.hub_rounded : Icons.restaurant,
                    color: isSuperAdmin ? const Color(0xFF818CF8) : RosTheme.primary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isSuperAdmin ? 'Platform Root' : (user?.tenantName ?? 'Restaurant OS'),
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        isSuperAdmin ? 'SaaS Control Plane' : 'Culinary OS',
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Divider(color: RosTheme.bgBorder, height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              children: sections.map((section) {
                if (section is _SectionDivider) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(10, 14, 10, 4),
                    child: Text(
                      section.label,
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                      ),
                    ),
                  );
                }
                final item = section as _NavItem;
                final isActive = location.startsWith(item.path);
                return Container(
                  margin: const EdgeInsets.only(bottom: 2),
                  child: InkWell(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      refreshScreenRouteData(ref, item.path);
                      context.go(item.path);
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
                      decoration: BoxDecoration(
                        color: isActive
                            ? (isSuperAdmin
                                ? const Color(0xFF6366F1).withValues(alpha: 0.12)
                                : RosTheme.primary.withValues(alpha: 0.12))
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isActive
                              ? (isSuperAdmin
                                  ? const Color(0xFF6366F1).withValues(alpha: 0.3)
                                  : RosTheme.primary.withValues(alpha: 0.3))
                              : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            item.icon,
                            size: 17,
                            color: isActive
                                ? (isSuperAdmin ? const Color(0xFF818CF8) : RosTheme.primary)
                                : RosTheme.textMuted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              item.label,
                              style: TextStyle(
                                color: isActive
                                    ? RosTheme.textPrimary
                                    : RosTheme.textSecondary,
                                fontSize: 12.5,
                                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isActive)
                            Container(
                              width: 5,
                              height: 5,
                              decoration: BoxDecoration(
                                color: isSuperAdmin ? const Color(0xFF818CF8) : RosTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
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
                  radius: 15,
                  backgroundColor: RosTheme.primary.withValues(alpha: 0.15),
                  child: Text(
                    (user?.name ?? 'U').substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
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
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        isSuperAdmin ? 'Super Admin' : (user?.roles.firstOrNull ?? 'Staff'),
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout_rounded, color: RosTheme.danger, size: 17),
                  tooltip: 'Logout',
                  visualDensity: VisualDensity.compact,
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
    final sections = _getFilteredNavSections(user, isSuperAdmin);

    return Drawer(
      backgroundColor: RosTheme.bgCard,
      child: SafeArea(
        child: Column(
          children: [
            // Minimalist Drawer Header
            Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              decoration: const BoxDecoration(
                color: RosTheme.bgElevated,
                border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: isSuperAdmin
                          ? const Color(0xFF6366F1).withValues(alpha: 0.15)
                          : RosTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSuperAdmin
                            ? const Color(0xFF6366F1).withValues(alpha: 0.3)
                            : RosTheme.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Icon(
                      isSuperAdmin ? Icons.hub_rounded : Icons.restaurant,
                      color: isSuperAdmin ? const Color(0xFF818CF8) : RosTheme.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isSuperAdmin ? 'Platform Control' : (user?.tenantName ?? 'ROS Mobile'),
                          style: const TextStyle(
                            color: RosTheme.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 1),
                        Text(
                          user?.name ?? user?.email ?? '',
                          style: const TextStyle(
                            color: RosTheme.textMuted,
                            fontSize: 11,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Branch Switcher Bar in Drawer for Fast Outlet Switching
            if (!isSuperAdmin)
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
                child: InkWell(
                  onTap: () {
                    Navigator.pop(context);
                    OutletSwitcherSheet.show(context);
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: RosTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: RosTheme.primary.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.storefront_rounded, color: RosTheme.primary, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Operating Branch',
                                style: TextStyle(color: RosTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600),
                              ),
                              Text(
                                user?.branchName ?? 'Select Outlet',
                                style: const TextStyle(color: RosTheme.primary, fontSize: 12.5, fontWeight: FontWeight.w700),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.swap_horiz_rounded, color: RosTheme.primary, size: 18),
                      ],
                    ),
                  ),
                ),
              ),

            // Navigation items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                children: sections.map((section) {
                  if (section is _SectionDivider) {
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(10, 14, 10, 4),
                      child: Text(
                        section.label,
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                        ),
                      ),
                    );
                  }
                  final item = section as _NavItem;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 2),
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        Navigator.pop(context);
                        refreshScreenRouteData(ref, item.path);
                        context.go(item.path);
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(item.icon, color: RosTheme.textMuted, size: 18),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                item.label,
                                style: const TextStyle(
                                  color: RosTheme.textSecondary,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Minimalist Bottom Logout Bar
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: RosTheme.bgBorder)),
              ),
              child: InkWell(
                onTap: () async {
                  Navigator.pop(context);
                  await _confirmLogout(context, ref);
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: RosTheme.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: RosTheme.danger.withValues(alpha: 0.2)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.logout_rounded, color: RosTheme.danger, size: 16),
                      SizedBox(width: 8),
                      Text(
                        'Logout Account',
                        style: TextStyle(
                          color: RosTheme.danger,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
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

// =============================================================================
// Submodule ID map — module path -> list of submodule IDs
// If a staff user has ANY 'sub:<id>' from a module's list, they can access that module.
// =============================================================================
const Map<String, List<String>> _moduleSubmoduleMap = {
  '/dashboard':      ['dashboard_revenue', 'dashboard_activity', 'dashboard_velocity', 'dashboard_actions'],
  '/current-orders': ['orders_live_queue', 'orders_kot_progress', 'orders_status_bump', 'orders_quick_settle'],
  '/tables':         ['tables_floor_map', 'tables_occupancy', 'tables_active_kots', 'tables_transfer'],
  '/pos':            ['pos_touch_entry', 'pos_modifiers', 'pos_split_pay', 'pos_discounts'],
  '/kitchen':        ['kds_cook_station', 'kds_runner_station', 'kds_archive_undo', 'kds_routing'],
  '/order-history':  ['history_ledger', 'history_reprint', 'history_void_audit', 'history_filter'],
  '/reservations':   ['res_calendar', 'res_booking_mgmt', 'res_checkin', 'res_alerts'],
  '/menu':           ['menu_dish_master', 'menu_categories', 'menu_variants', 'menu_modifiers', 'menu_86_toggle'],
  '/inventory':      ['inv_live_balance', 'inv_low_alerts', 'inv_adjustments', 'inv_reconciliation'],
  '/promotions':     ['promo_coupons', 'promo_thresholds', 'promo_combos', 'promo_cashier_presets'],
  '/customers':      ['cust_directory', 'cust_history', 'cust_loyalty', 'cust_segments'],
  '/staff':          ['staff_roster', 'staff_attendance', 'staff_rbac', 'staff_telegram'],
  '/reports':        ['rep_sales_summary', 'rep_item_performance', 'rep_tax_gst', 'rep_pnl_statement'],
  '/settings':       ['set_profile', 'set_tax_service', 'set_hours_shifts', 'set_gateways'],
};

/// Check if a user has access to a specific submodule ID
bool hasSubmoduleAccess(AuthUser? user, String submoduleId) {
  if (user == null) return false;
  if (user.isPlatformAdmin || user.isTenantAdmin) return true;
  return user.permissions.contains('sub:$submoduleId') || user.permissions.contains(submoduleId);
}

/// Check if a route is accessible: either via module-level perm OR any sub: perm for that module
bool isRouteAccessible(String path, AuthUser? user) {
  if (user == null) return false;
  if (user.isPlatformAdmin || user.isTenantAdmin) return true;

  final cleanPath = path.split('?').first;

  if (cleanPath.startsWith('/super-admin')) {
    return user.isPlatformAdmin;
  }

  // Extract base module route, e.g. '/order-history/123' -> '/order-history'
  final segments = cleanPath.split('/').where((s) => s.isNotEmpty).toList();
  final baseRoute = segments.isNotEmpty ? '/${segments.first}' : cleanPath;

  // Module key from path, e.g. '/current-orders' -> 'orders', '/order-history' -> 'history'
  String getModuleKey(String route) {
    if (route == '/current-orders' || route == '/orders') return 'orders';
    if (route == '/order-history') return 'history';
    return route.replaceAll('/', '');
  }

  final modKey = getModuleKey(baseRoute);
  final hasGranular = user.permissions.any((p) => p.startsWith('sub:') || p.startsWith('module:') || p.startsWith('mod:'));

  if (hasGranular) {
    final subIds = _moduleSubmoduleMap[baseRoute] ?? _moduleSubmoduleMap['/$modKey'] ?? [];
    final hasModPerm = user.permissions.contains('module:$modKey') || user.permissions.contains('mod:$modKey');
    final hasSubPerm = subIds.any((sid) => user.permissions.contains('sub:$sid') || user.permissions.contains(sid));
    return hasModPerm || hasSubPerm;
  }

  // Legacy fallback for old accounts without granular permissions
  bool checkAccess(String routePath, List<String> modulePerms) {
    if (user.hasAnyPermission(modulePerms)) return true;
    final subIds = _moduleSubmoduleMap[routePath] ?? [];
    return subIds.any((sid) => user.permissions.contains('sub:$sid') || user.permissions.contains(sid));
  }

  if (baseRoute == '/dashboard') {
    return checkAccess('/dashboard', ['reports:view']);
  }
  if (baseRoute == '/tables') {
    return checkAccess('/tables', ['tables:view', 'tables:edit']);
  }
  if (baseRoute == '/current-orders') {
    return checkAccess('/current-orders', ['orders:view', 'orders:create']);
  }
  if (baseRoute == '/pos') {
    return checkAccess('/pos', ['orders:create', 'payments:create']);
  }
  if (baseRoute == '/kitchen') {
    return checkAccess('/kitchen', ['kitchen:view', 'kitchen:update']);
  }
  if (baseRoute == '/order-history') {
    return checkAccess('/order-history', ['payments:view', 'orders:view']);
  }
  if (baseRoute == '/menu') {
    return checkAccess('/menu', ['menu:view', 'menu:create', 'menu:edit']);
  }
  if (baseRoute == '/inventory') {
    return checkAccess('/inventory', ['inventory:view']);
  }
  if (baseRoute == '/promotions' || baseRoute == '/marketing') {
    return checkAccess('/promotions', ['marketing:view', 'marketing:manage', 'menu:view', 'reports:view']);
  }
  if (baseRoute == '/staff') {
    return checkAccess('/staff', ['staff:view', 'staff:create']);
  }
  if (baseRoute == '/reports') {
    return checkAccess('/reports', ['reports:view', 'reports:export']);
  }
  if (baseRoute == '/reservations') {
    return checkAccess('/reservations', ['reservations:view']);
  }
  if (baseRoute == '/customers') {
    return checkAccess('/customers', ['customers:view']);
  }
  if (baseRoute == '/settings') {
    return checkAccess('/settings', ['settings:view', 'settings:edit']);
  }

  return false;
}

/// Compute the best landing route for the user role
String getDefaultLandingRoute(AuthUser? user) {
  if (user == null) return '/login';
  if (user.isPlatformAdmin) return '/super-admin';
  if (user.isTenantAdmin) return '/tables';

  const routePriority = [
    '/tables', '/kitchen', '/current-orders', '/order-history',
    '/menu', '/inventory', '/promotions', '/reservations', '/customers', '/reports',
    '/staff', '/dashboard', '/settings',
  ];

  for (final route in routePriority) {
    if (isRouteAccessible(route, user)) return route;
  }

  return '/login';
}

const List<Object> _restaurantNavSections = [
  _SectionDivider('OPERATIONS'),
  _NavItem(path: '/tables',         label: 'Tables',           icon: Icons.grid_view_rounded),
  _NavItem(path: '/current-orders', label: 'Current Orders',   icon: Icons.receipt_long_rounded),
  _NavItem(path: '/kitchen',        label: 'Kitchen (KDS)',    icon: Icons.restaurant_rounded),
  _NavItem(path: '/order-history',  label: 'Order History',    icon: Icons.history_rounded),
  _NavItem(path: '/reservations',   label: 'Reservations',     icon: Icons.event_seat_rounded),
  _SectionDivider('INVENTORY & MENU'),
  _NavItem(path: '/menu',           label: 'Menu Catalog',     icon: Icons.menu_book_rounded),
  _NavItem(path: '/inventory',      label: 'Stock Inventory',  icon: Icons.inventory_2_rounded),
  _SectionDivider('FINANCE & MARKETING'),
  _NavItem(path: '/promotions',     label: 'Promotions & Offers', icon: Icons.campaign_rounded),
  _NavItem(path: '/customers',      label: 'Customers & CRM',  icon: Icons.people_rounded),
  _NavItem(path: '/staff',          label: 'Staff & Team',     icon: Icons.badge_rounded),
  _NavItem(path: '/reports',        label: 'Sales & Reports',  icon: Icons.bar_chart_rounded),
  _SectionDivider('SETTINGS & SYSTEM'),
  _NavItem(path: '/dashboard',      label: 'Dashboard',        icon: Icons.dashboard_rounded),
  _NavItem(path: '/settings',       label: 'Settings',         icon: Icons.settings_rounded),
];

const List<Object> _superAdminNavSections = [
  _SectionDivider('PLATFORM SAAS CONTROL'),
  _NavItem(path: '/super-admin', label: 'Platform Control', icon: Icons.hub_rounded),
  _SectionDivider('CONFIGURATION'),
  _NavItem(path: '/settings', label: 'Settings', icon: Icons.settings_rounded),
];
