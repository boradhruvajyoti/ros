// =============================================================================
// Dashboard Screen — Revenue, Stats & Charts
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(dashboardProvider),
          ),
        ],
      ),
      body: dashAsync.when(
        data: (data) => _buildDashboard(context, data, user?.name),
        loading: () => const Center(
            child: CircularProgressIndicator(color: RosTheme.primary)),
        error: (err, _) => _buildFallback(context, ref),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, Map<String, dynamic> data, String? name) {
    final todayRevenue = (data['todayRevenue'] as num?)?.toDouble() ?? 0.0;
    final todayOrders = data['todayOrders'] as int? ?? 0;
    final activeOrders = data['activeOrders'] as int? ?? 0;
    final avgOrder = (data['avgOrderValue'] as num?)?.toDouble() ?? 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting
          Text(
            'Good ${_greeting()}, ${name?.split(' ').first ?? 'Chef'} 👋',
            style: const TextStyle(
              color: RosTheme.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const Text("Here's what's happening today",
              style: TextStyle(color: RosTheme.textMuted, fontSize: 14)),
          const SizedBox(height: 20),

          // KPI Cards
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _KpiCard(
                label: "Today's Revenue",
                value: '₹${NumberFormat('#,##,###').format(todayRevenue.toInt())}',
                icon: Icons.currency_rupee_rounded,
                gradient: RosTheme.primaryGradient,
                subtitle: 'Total collected',
              ),
              _KpiCard(
                label: 'Orders Today',
                value: '$todayOrders',
                icon: Icons.receipt_long_rounded,
                gradient: RosTheme.greenGradient,
                subtitle: '$activeOrders active',
              ),
              _KpiCard(
                label: 'Avg Order Value',
                value: '₹${avgOrder.toStringAsFixed(0)}',
                icon: Icons.trending_up_rounded,
                gradient: const LinearGradient(
                  colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                ),
                subtitle: 'Per order',
              ),
              _KpiCard(
                label: 'Active Orders',
                value: '$activeOrders',
                icon: Icons.pending_actions_rounded,
                gradient: const LinearGradient(
                  colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                ),
                subtitle: 'Pending',
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Revenue chart placeholder (if data available)
          if (data['revenueChart'] != null) ...[
            const Text('Revenue This Week',
                style: TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            _RevenueChart(chartData: data['revenueChart'] as List<dynamic>),
          ],

          const SizedBox(height: 20),

          // Quick actions
          const Text('Quick Actions',
              style: TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1.1,
            children: [
              _QuickAction(icon: Icons.grid_view_rounded, label: 'Tables', route: '/tables'),
              _QuickAction(icon: Icons.point_of_sale_rounded, label: 'POS', route: '/pos'),
              _QuickAction(icon: Icons.restaurant_rounded, label: 'Kitchen', route: '/kitchen'),
              _QuickAction(icon: Icons.people_rounded, label: 'Customers', route: '/customers'),
              _QuickAction(icon: Icons.bar_chart_rounded, label: 'Reports', route: '/reports'),
              _QuickAction(icon: Icons.settings_rounded, label: 'Settings', route: '/settings'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFallback(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Dashboard',
            style: TextStyle(color: RosTheme.textPrimary, fontSize: 22, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: RosTheme.info),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Dashboard data loading. Use the quick actions below.',
                    style: TextStyle(color: RosTheme.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1.1,
            children: [
              _QuickAction(icon: Icons.grid_view_rounded, label: 'Tables', route: '/tables'),
              _QuickAction(icon: Icons.point_of_sale_rounded, label: 'POS', route: '/pos'),
              _QuickAction(icon: Icons.restaurant_rounded, label: 'Kitchen', route: '/kitchen'),
              _QuickAction(icon: Icons.people_rounded, label: 'Customers', route: '/customers'),
              _QuickAction(icon: Icons.bar_chart_rounded, label: 'Reports', route: '/reports'),
              _QuickAction(icon: Icons.settings_rounded, label: 'Settings', route: '/settings'),
            ],
          ),
        ],
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final LinearGradient gradient;
  final String? subtitle;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white70, size: 18),
              const Spacer(),
              if (subtitle != null)
                Text(subtitle!,
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 10)),
            ],
          ),
          const Spacer(),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _RevenueChart extends StatelessWidget {
  final List<dynamic> chartData;
  const _RevenueChart({required this.chartData});

  @override
  Widget build(BuildContext context) {
    if (chartData.isEmpty) return const SizedBox();

    final spots = chartData.asMap().entries.map((e) {
      final amount = (e.value['amount'] as num?)?.toDouble() ?? 0.0;
      return FlSpot(e.key.toDouble(), amount);
    }).toList();

    return Container(
      height: 180,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: null,
            getDrawingHorizontalLine: (_) => const FlLine(
              color: RosTheme.bgBorder,
              strokeWidth: 1,
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40,
                getTitlesWidget: (v, m) => Text(
                  '₹${(v / 1000).toStringAsFixed(0)}k',
                  style: const TextStyle(
                      color: RosTheme.textMuted, fontSize: 9),
                ),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, m) {
                  final idx = v.toInt();
                  if (idx >= 0 && idx < chartData.length) {
                    final label = chartData[idx]['label'] as String? ?? '';
                    return Text(label,
                        style: const TextStyle(
                            color: RosTheme.textMuted, fontSize: 9));
                  }
                  return const Text('');
                },
              ),
            ),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              gradient: RosTheme.primaryGradient,
              barWidth: 2.5,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    RosTheme.primary.withOpacity(0.3),
                    RosTheme.primary.withOpacity(0.0),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends ConsumerWidget {
  final IconData icon;
  final String label;
  final String route;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.route,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => context.go(route),
      child: Container(
        decoration: BoxDecoration(
          color: RosTheme.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: RosTheme.bgBorder),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: RosTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: RosTheme.primary, size: 22),
            ),
            const SizedBox(height: 6),
            Text(label,
                style: const TextStyle(
                    color: RosTheme.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
