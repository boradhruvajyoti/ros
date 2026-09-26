// =============================================================================
// Reports Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../core/models/models.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String _period = 'today';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final data = await api.get<Map<String, dynamic>>(
        '/reports/summary',
        queryParameters: {'period': _period},
      );
      setState(() { _data = data; _loading = false; });
    } catch (e) {
      try {
        // Fallback to dashboard
        final api = ref.read(apiClientProvider);
        final data = await api.get<Map<String, dynamic>>('/reports/dashboard');
        setState(() { _data = data; _loading = false; });
      } catch (_) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & P&L'),
        actions: [
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _period,
              dropdownColor: RosTheme.bgCard,
              style: const TextStyle(color: RosTheme.textSecondary, fontSize: 13),
              items: const [
                DropdownMenuItem(value: 'today', child: Text('Today')),
                DropdownMenuItem(value: 'week', child: Text('This Week')),
                DropdownMenuItem(value: 'month', child: Text('This Month')),
              ],
              onChanged: (v) {
                if (v != null) { setState(() => _period = v); _load(); }
              },
            ),
          ),
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: RosTheme.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Revenue
                  _SectionTitle('Revenue Summary'),
                  const SizedBox(height: 8),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 1.6,
                    children: [
                      _ReportCard('Total Revenue',
                          '₹${NumberFormat('#,##,###').format(parseDouble(_data?['totalRevenue'] ?? _data?['todayRevenue'], 0.0).toInt())}',
                          Icons.currency_rupee_rounded, RosTheme.primaryGradient),
                      _ReportCard('Orders',
                          '${parseInt(_data?['totalOrders'] ?? _data?['todayOrders'], 0)}',
                          Icons.receipt_long_rounded, RosTheme.greenGradient),
                      _ReportCard('Avg Order',
                          '₹${parseDouble(_data?['avgOrderValue'], 0.0).toStringAsFixed(0)}',
                          Icons.trending_up_rounded,
                          const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFD97706)])),
                      _ReportCard('Customers',
                          '${parseInt(_data?['uniqueCustomers'] ?? _data?['totalCustomers'], 0)}',
                          Icons.people_rounded,
                          const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)])),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Payment methods breakdown
                  if (_data?['paymentBreakdown'] != null) ...[
                    _SectionTitle('Payment Methods'),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: RosTheme.bgCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: RosTheme.bgBorder),
                      ),
                      child: Column(
                        children: (_data!['paymentBreakdown'] as Map<String, dynamic>)
                            .entries
                            .map((e) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    children: [
                                      Text(e.key, style: const TextStyle(color: RosTheme.textSecondary)),
                                      const Spacer(),
                                      Text('₹${parseDouble(e.value, 0.0).toStringAsFixed(0)}',
                                          style: const TextStyle(color: RosTheme.primary, fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Top items
                  if (_data?['topItems'] != null) ...[
                    _SectionTitle('Top Selling Items'),
                    const SizedBox(height: 8),
                    ...(_data!['topItems'] as List<dynamic>)
                        .take(5)
                        .mapIndexed((i, item) => Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: RosTheme.bgCard,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: RosTheme.bgBorder),
                              ),
                              child: Row(children: [
                                Container(
                                  width: 28, height: 28,
                                  decoration: BoxDecoration(
                                    color: RosTheme.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Center(child: Text('${i + 1}',
                                      style: const TextStyle(color: RosTheme.primary, fontWeight: FontWeight.w700))),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Text(
                                  item['name'] as String? ?? 'Item',
                                  style: const TextStyle(color: RosTheme.textPrimary, fontWeight: FontWeight.w500),
                                )),
                                Text('${item['quantity'] ?? 0} sold',
                                    style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                              ]),
                            ))
                        .toList(),
                  ],
                ],
              ),
            ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) => Text(title,
      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600));
}

class _ReportCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final LinearGradient gradient;
  const _ReportCard(this.label, this.value, this.icon, this.gradient);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(color: gradient.colors.first.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white70, size: 18),
          const Spacer(),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
        ],
      ),
    );
  }
}

extension IndexedIterable<E> on Iterable<E> {
  Iterable<T> mapIndexed<T>(T Function(int index, E item) f) sync* {
    var index = 0;
    for (final item in this) {
      yield f(index, item);
      index++;
    }
  }
}
