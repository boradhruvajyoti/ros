// =============================================================================
// Table Detail Screen — Active order management for a table
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

class TableDetailScreen extends ConsumerStatefulWidget {
  final String tableId;
  const TableDetailScreen({super.key, required this.tableId});

  @override
  ConsumerState<TableDetailScreen> createState() => _TableDetailScreenState();
}

class _TableDetailScreenState extends ConsumerState<TableDetailScreen> {
  RestaurantTable? _table;
  Order? _activeOrder;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTable();
  }

  Future<void> _loadTable() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);

      // Get table detail
      final tableData = await api.get<Map<String, dynamic>>(
        '/tables/${widget.tableId}',
      );
      final table = RestaurantTable.fromJson(tableData['table'] as Map<String, dynamic>? ?? tableData);

      // Get active order if occupied
      Order? order;
      if (table.status == 'OCCUPIED') {
        try {
          final orders = await api.get<List<dynamic>>('/orders/active');
          final orderList = orders
              .map((e) => Order.fromJson(e as Map<String, dynamic>))
              .where((o) => o.tableId == widget.tableId)
              .toList();
          if (orderList.isNotEmpty) order = orderList.first;
        } catch (_) {}
      }

      setState(() {
        _table = table;
        _activeOrder = order;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _newOrder() async {
    // Navigate to POS with table pre-selected
    ref.read(cartProvider.notifier).setTable(widget.tableId);
    ref.read(cartProvider.notifier).setOrderType('DINE_IN');
    context.go('/pos');
  }

  Future<void> _updateTableStatus(String status) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/tables/${widget.tableId}', data: {'status': status});
      _loadTable();
      ref.invalidate(tablesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: RosTheme.primary)),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Table Detail')),
        body: Center(child: Text(_error!)),
      );
    }

    final table = _table!;
    final statusColor = switch (table.status) {
      'AVAILABLE' => RosTheme.statusAvailable,
      'OCCUPIED' => RosTheme.statusOccupied,
      'RESERVED' => RosTheme.statusReserved,
      'CLEANING' => RosTheme.statusCleaning,
      _ => RosTheme.textMuted,
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(table.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadTable,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Table status card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: RosTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: statusColor.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.table_restaurant_rounded,
                      color: statusColor,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          table.name,
                          style: const TextStyle(
                            color: RosTheme.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text('${table.capacity} seats',
                            style: const TextStyle(color: RosTheme.textMuted)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            table.status.replaceAll('_', ' '),
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Active Order Card
            if (_activeOrder != null) ...[
              const Text('Active Order',
                  style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              _ActiveOrderCard(order: _activeOrder!, onRefresh: _loadTable),
            ],

            // Action buttons
            const SizedBox(height: 20),
            const Text('Actions',
                style: TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),

            if (table.status == 'AVAILABLE') ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _newOrder,
                  icon: const Icon(Icons.add_shopping_cart_rounded),
                  label: const Text('Create New Order'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _updateTableStatus('BLOCKED'),
                  icon: const Icon(Icons.block_rounded),
                  label: const Text('Mark as Blocked'),
                ),
              ),
            ],

            if (table.status == 'OCCUPIED' && _activeOrder == null) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _newOrder,
                  icon: const Icon(Icons.receipt_rounded),
                  label: const Text('View / Manage Order'),
                ),
              ),
            ],

            if (table.status == 'CLEANING') ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.check_circle_rounded),
                  label: const Text('Mark as Available'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.statusAvailable),
                ),
              ),
            ],

            if (table.status == 'BLOCKED') ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.lock_open_rounded),
                  label: const Text('Unblock Table'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.statusAvailable),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActiveOrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onRefresh;
  const _ActiveOrderCard({required this.order, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('#${order.orderNumber}',
                  style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 15,
                      fontWeight: FontWeight.w700)),
              _StatusBadge(status: order.status),
            ],
          ),
          const SizedBox(height: 12),
          ...order.items
              .where((i) => i.status != 'VOIDED' && i.status != 'CANCELLED')
              .map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Text('${item.quantity}x ',
                            style: const TextStyle(
                                color: RosTheme.primary,
                                fontWeight: FontWeight.w600,
                                fontSize: 13)),
                        Expanded(
                          child: Text(
                            '${item.menuItemName ?? 'Item'}${item.variantName != null ? ' (${item.variantName})' : ''}',
                            style: const TextStyle(
                                color: RosTheme.textSecondary, fontSize: 13),
                          ),
                        ),
                        Text('₹${item.lineTotal.toStringAsFixed(0)}',
                            style: const TextStyle(
                                color: RosTheme.textPrimary, fontSize: 13)),
                      ],
                    ),
                  )),
          const Divider(color: RosTheme.bgBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total',
                  style: TextStyle(
                      color: RosTheme.textPrimary, fontWeight: FontWeight.w600)),
              Text('₹${order.total.toStringAsFixed(0)}',
                  style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  Color get _color => switch (status) {
    'DRAFT' => RosTheme.textMuted,
    'CONFIRMED' => RosTheme.info,
    'SENT_TO_KITCHEN' => RosTheme.warning,
    'PREPARING' => RosTheme.warning,
    'READY' => RosTheme.secondary,
    'SERVED' => RosTheme.secondary,
    'BILLED' => RosTheme.accent,
    'PAID' || 'COMPLETED' => RosTheme.statusAvailable,
    'CANCELLED' || 'VOIDED' => RosTheme.danger,
    _ => RosTheme.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(color: _color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}
