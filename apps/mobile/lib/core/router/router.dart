// =============================================================================
// App Router — GoRouter with auth guard
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/providers.dart';
import '../../features/auth/login_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/tables/tables_screen.dart';
import '../../features/tables/table_detail_screen.dart';
import '../../features/pos/pos_screen.dart';
import '../../features/kitchen/kitchen_screen.dart';
import '../../features/orders/order_history_screen.dart';
import '../../features/orders/order_detail_screen.dart';
import '../../features/menu/menu_screen.dart';
import '../../features/inventory/inventory_screen.dart';
import '../../features/staff/staff_screen.dart';
import '../../features/reports/reports_screen.dart';
import '../../features/reservations/reservations_screen.dart';
import '../../features/customers/customers_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../utils/shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/tables',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final goingToLogin = state.matchedLocation == '/login';

      if (!isLoggedIn && !goingToLogin) return '/login';
      if (isLoggedIn && goingToLogin) return '/tables';
      return null;
    },
    routes: [
      // Login
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),

      // Main shell with bottom navigation
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/tables',
            builder: (context, state) => const TablesScreen(),
            routes: [
              GoRoute(
                path: ':tableId',
                builder: (context, state) => TableDetailScreen(
                  tableId: state.pathParameters['tableId']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/pos',
            builder: (context, state) => const PosScreen(),
          ),
          GoRoute(
            path: '/kitchen',
            builder: (context, state) => const KitchenScreen(),
          ),
          GoRoute(
            path: '/order-history',
            builder: (context, state) => const OrderHistoryScreen(),
            routes: [
              GoRoute(
                path: ':orderId',
                builder: (context, state) => OrderDetailScreen(
                  orderId: state.pathParameters['orderId']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/menu',
            builder: (context, state) => const MenuScreen(),
          ),
          GoRoute(
            path: '/inventory',
            builder: (context, state) => const InventoryScreen(),
          ),
          GoRoute(
            path: '/staff',
            builder: (context, state) => const StaffScreen(),
          ),
          GoRoute(
            path: '/reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: '/reservations',
            builder: (context, state) => const ReservationsScreen(),
          ),
          GoRoute(
            path: '/customers',
            builder: (context, state) => const CustomersScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
    ],
  );
});
