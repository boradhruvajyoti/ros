// =============================================================================
// Order History Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  List<Order> _orders = [];
  bool _loading = true;
  int _page = 1;
  bool _hasMore = true;
  String? _statusFilter;

  final _statusOptions = ['ALL', 'DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN',
    'PREPARING', 'READY', 'SERVED', 'BILLED', 'PAID', 'COMPLETED', 'CANCELLED'];

  @override
  void initState() {
    super.initState();
    _loadOrders(reset: true);
  }

  Future<void> _loadOrders({bool reset = false}) async {
    if (reset) {
      setState(() { _page = 1; _hasMore = true; _orders = []; _loading = true; });
    }
    try {
      final api = ref.read(apiClientProvider);
      final params = {
        'page': _page.toString(),
        'limit': '20',
        if (_statusFilter != null && _statusFilter != 'ALL') 'status': _statusFilter!,
      };
      final data = await api.get<Map<String, dynamic>>('/orders', queryParameters: params);
      final list = (data['orders'] as List<dynamic>? ?? data['data'] as List<dynamic>? ?? [])
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList();

      setState(() {
        if (reset) _orders = list;
        else _orders.addAll(list);
        _hasMore = list.length >= 20;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => _loadOrders(reset: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // Status filter
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              children: _statusOptions.map((s) {
                final selected = (_statusFilter ?? 'ALL') == s;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(s.replaceAll('_', ' '), style: const TextStyle(fontSize: 11)),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => _statusFilter = s == 'ALL' ? null : s);
                      _loadOrders(reset: true);
                    },
                    selectedColor: RosTheme.primary.withOpacity(0.15),
                    labelStyle: TextStyle(
                        color: selected ? RosTheme.primary : RosTheme.textSecondary),
                  ),
                );
              }).toList(),
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: RosTheme.primary))
                : _orders.isEmpty
                    ? const Center(
                        child: Text('No orders found',
                            style: TextStyle(color: RosTheme.textSecondary)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length + (_hasMore ? 1 : 0),
                        itemBuilder: (ctx, i) {
                          if (i == _orders.length) {
                            return Center(
                              child: TextButton(
                                onPressed: () {
                                  _page++;
                                  _loadOrders();
                                },
                                child: const Text('Load More'),
                              ),
                            );
                          }
                          return _OrderTile(
                            order: _orders[i],
                            onTap: () => context.push('/order-history/${_orders[i].id}'),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final Order order;
  final VoidCallback onTap;
  const _OrderTile({required this.order, required this.onTap});

  Color get _statusColor => switch (order.status) {
    'DRAFT' => RosTheme.textMuted,
    'CONFIRMED' || 'SENT_TO_KITCHEN' => RosTheme.info,
    'PREPARING' => RosTheme.warning,
    'READY' || 'SERVED' => RosTheme.secondary,
    'BILLED' || 'PARTIALLY_PAID' => RosTheme.accent,
    'PAID' || 'COMPLETED' => RosTheme.statusAvailable,
    'CANCELLED' || 'VOIDED' => RosTheme.danger,
    _ => RosTheme.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: RosTheme.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: RosTheme.bgBorder),
        ),
        child: Row(
          children: [
            // Order type icon
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                order.type == 'DINE_IN' ? Icons.table_restaurant_rounded
                  : order.type == 'DELIVERY' ? Icons.delivery_dining_rounded
                  : Icons.takeout_dining_rounded,
                color: RosTheme.textSecondary, size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('#${order.orderNumber}',
                          style: const TextStyle(
                              color: RosTheme.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          order.status.replaceAll('_', ' '),
                          style: TextStyle(
                              color: _statusColor, fontSize: 9, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Text(
                        order.type.replaceAll('_', ' '),
                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                      ),
                      if (order.table != null) ...[
                        const Text(' · ', style: TextStyle(color: RosTheme.textMuted)),
                        Text(order.table!.name,
                            style: const TextStyle(color: RosTheme.textMuted, fontSize: 11)),
                      ],
                      const Text(' · ', style: TextStyle(color: RosTheme.textMuted)),
                      Text(
                        DateFormat('d MMM, h:mm a').format(order.createdAt),
                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('₹${order.total.toStringAsFixed(0)}',
                    style: const TextStyle(
                        color: RosTheme.primary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700)),
                Text('${order.items.length} items',
                    style: const TextStyle(color: RosTheme.textMuted, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
