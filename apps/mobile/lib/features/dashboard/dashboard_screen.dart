// =============================================================================
// Dashboard Screen — Minimalist, Clean & Eye-Comfort Revenue & Stats Overview
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/models.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: const Text(
          'Overview',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: RosTheme.textPrimary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Refresh Overview',
            onPressed: () {
              HapticFeedback.selectionClick();
              ref.invalidate(dashboardProvider);
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: dashAsync.when(
        data: (data) => _buildDashboard(context, data, user?.name),
        loading: () => const Center(
          child: CircularProgressIndicator(color: RosTheme.primary),
        ),
        error: (err, _) => _buildFallback(context, ref),
      ),
    );
  }

  Widget _buildDashboard(
      BuildContext context, Map<String, dynamic> data, String? name) {
    final todayRevenue = parseDouble(data['todayRevenue'], 0.0);
    final todayOrders = parseInt(data['todayOrders'], 0);
    final activeOrders = parseInt(data['activeOrders'], 0);
    final avgOrder = parseDouble(data['avgOrderValue'], 0.0);
    final nowFormatted = DateFormat('EEEE, d MMMM').format(DateTime.now());

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Greeting Header ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Good ${_greeting()}, ${name?.split(' ').first ?? 'Staff'}',
                  style: const TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  nowFormatted,
                  style: const TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── 4 Minimalist KPI Cards (2x2 Grid) ──
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.45,
            children: [
              _MinimalKpiCard(
                label: "Today's Revenue",
                value: '₹${NumberFormat('#,##,###').format(todayRevenue.toInt())}',
                icon: Icons.trending_up_rounded,
                iconColor: RosTheme.secondary,
                subtitle: 'Gross receipts',
              ),
              _MinimalKpiCard(
                label: 'Total Orders',
                value: '$todayOrders',
                icon: Icons.receipt_long_rounded,
                iconColor: const Color(0xFF38BDF8),
                subtitle: '$activeOrders active right now',
              ),
              _MinimalKpiCard(
                label: 'Avg Order Value',
                value: '₹${avgOrder.toStringAsFixed(0)}',
                icon: Icons.query_stats_rounded,
                iconColor: const Color(0xFFA78BFA),
                subtitle: 'Per order ticket',
              ),
              _MinimalKpiCard(
                label: 'Active Queue',
                value: '$activeOrders',
                icon: Icons.soup_kitchen_rounded,
                iconColor: RosTheme.warning,
                subtitle: 'In kitchen / tables',
              ),
            ],
          ),

          const SizedBox(height: 22),

          // ── Quick Navigation Section ──
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 2),
            child: Text(
              'QUICK ACCESS',
              style: TextStyle(
                color: RosTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
              ),
            ),
          ),
          const SizedBox(height: 10),

          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1.15,
            children: const [
              _MinimalQuickAction(
                icon: Icons.table_restaurant_rounded,
                label: 'Tables',
                route: '/tables',
              ),
              _MinimalQuickAction(
                icon: Icons.receipt_long_rounded,
                label: 'Orders',
                route: '/current-orders',
              ),
              _MinimalQuickAction(
                icon: Icons.soup_kitchen_rounded,
                label: 'Kitchen',
                route: '/kitchen',
              ),
              _MinimalQuickAction(
                icon: Icons.history_rounded,
                label: 'History',
                route: '/order-history',
              ),
              _MinimalQuickAction(
                icon: Icons.bar_chart_rounded,
                label: 'Reports',
                route: '/reports',
              ),
              _MinimalQuickAction(
                icon: Icons.settings_outlined,
                label: 'Settings',
                route: '/settings',
              ),
            ],
          ),

          const SizedBox(height: 22),

          // ── Weekly Revenue Trend Chart (Minimalist & Soothing) ──
          if (data['revenueChart'] != null) ...[
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 2),
              child: Text(
                'WEEKLY TREND',
                style: TextStyle(
                  color: RosTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ),
            const SizedBox(height: 10),
            _MinimalRevenueChart(
                chartData: data['revenueChart'] as List<dynamic>),
          ],
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
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline_rounded,
                    color: RosTheme.secondary, size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Loading live overview data. Use shortcuts below.',
                    style: TextStyle(
                      color: RosTheme.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1.15,
            children: const [
              _MinimalQuickAction(
                  icon: Icons.table_restaurant_rounded,
                  label: 'Tables',
                  route: '/tables'),
              _MinimalQuickAction(
                  icon: Icons.receipt_long_rounded,
                  label: 'Orders',
                  route: '/current-orders'),
              _MinimalQuickAction(
                  icon: Icons.soup_kitchen_rounded,
                  label: 'Kitchen',
                  route: '/kitchen'),
              _MinimalQuickAction(
                  icon: Icons.history_rounded,
                  label: 'History',
                  route: '/order-history'),
              _MinimalQuickAction(
                  icon: Icons.bar_chart_rounded,
                  label: 'Reports',
                  route: '/reports'),
              _MinimalQuickAction(
                  icon: Icons.settings_outlined,
                  label: 'Settings',
                  route: '/settings'),
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

// ── Minimalist KPI Card Widget ──
class _MinimalKpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final String? subtitle;

  const _MinimalKpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: RosTheme.bgBorder,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: RosTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 14),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                  letterSpacing: -0.5,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 1),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// ── Minimalist Quick Action Button ──
class _MinimalQuickAction extends ConsumerWidget {
  final IconData icon;
  final String label;
  final String route;

  const _MinimalQuickAction({
    required this.icon,
    required this.label,
    required this.route,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        refreshScreenRouteData(ref, route);
        context.go(route);
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: RosTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: RosTheme.bgBorder),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: RosTheme.textPrimary, size: 18),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Minimalist Revenue Chart ──
class _MinimalRevenueChart extends StatelessWidget {
  final List<dynamic> chartData;
  const _MinimalRevenueChart({required this.chartData});

  @override
  Widget build(BuildContext context) {
    if (chartData.isEmpty) return const SizedBox();

    final spots = chartData.asMap().entries.map((e) {
      final amount = parseDouble(e.value['amount'], 0.0);
      return FlSpot(e.key.toDouble(), amount);
    }).toList();

    return Container(
      height: 160,
      padding: const EdgeInsets.fromLTRB(12, 16, 16, 12),
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
              strokeWidth: 0.8,
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 36,
                getTitlesWidget: (v, m) => Text(
                  '₹${(v / 1000).toStringAsFixed(0)}k',
                  style: const TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                  ),
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
                    return Text(
                      label,
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                      ),
                    );
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
              curveSmoothness: 0.35,
              color: RosTheme.secondary,
              barWidth: 2.2,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    RosTheme.secondary.withValues(alpha: 0.2),
                    RosTheme.secondary.withValues(alpha: 0.0),
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
