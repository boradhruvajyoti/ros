// =============================================================================
// Table Detail Screen — Active order management for a table with Merged Items
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import 'tables_screen.dart';

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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);

      // Get table detail
      final tableData = await api.get<Map<String, dynamic>>(
        '/tables/${widget.tableId}',
      );
      final table = RestaurantTable.fromJson(
          tableData['table'] as Map<String, dynamic>? ?? tableData);

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
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: _loadTable, child: const Text('Retry')),
            ],
          ),
        ),
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
      backgroundColor: RosTheme.bg,
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
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: RosTheme.bgCard,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: statusColor.withValues(alpha: 0.5),
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.table_restaurant_rounded,
                      color: statusColor,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          table.name,
                          style: const TextStyle(
                            color: RosTheme.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text('${table.capacity} seats capacity',
                            style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            table.status.replaceAll('_', ' '),
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Active Order Card (with deduplicated items)
            if (_activeOrder != null) ...[
              const Text('Active Running Order',
                  style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              _DetailActiveOrderCard(
                order: _activeOrder!,
                table: table,
                onRefresh: _loadTable,
              ),
              const SizedBox(height: 18),
            ],

            // Action buttons
            const Text('Table Operations',
                style: TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),

            if (table.status == 'AVAILABLE') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _newOrder,
                  icon: const Icon(Icons.add_shopping_cart_rounded),
                  label: const Text('Take New Order (Dine-In)',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: () => _updateTableStatus('BLOCKED'),
                  icon: const Icon(Icons.block_rounded),
                  label: const Text('Mark as Blocked'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: RosTheme.textMuted,
                    side: const BorderSide(color: RosTheme.bgBorder),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],

            if (table.status == 'OCCUPIED' && _activeOrder == null) ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _newOrder,
                  icon: const Icon(Icons.receipt_rounded),
                  label: const Text('Open POS for this Table'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],

            if (table.status == 'CLEANING') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.check_circle_rounded),
                  label: const Text('Mark Clean & Available'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.statusAvailable,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],

            if (table.status == 'BLOCKED') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.lock_open_rounded),
                  label: const Text('Unblock Table'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.statusAvailable,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Detail Screen Active Order Card (Merged Items) ────────────────────────────

class _DetailActiveOrderCard extends ConsumerStatefulWidget {
  final Order order;
  final RestaurantTable table;
  final VoidCallback onRefresh;

  const _DetailActiveOrderCard({
    required this.order,
    required this.table,
    required this.onRefresh,
  });

  @override
  ConsumerState<_DetailActiveOrderCard> createState() =>
      _DetailActiveOrderCardState();
}

class _DetailActiveOrderCardState extends ConsumerState<_DetailActiveOrderCard> {
  bool _isProcessing = false;

  Future<void> _settlePayment(String method) async {
    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);

      await api.post('/payments', data: {
        'orderId': widget.order.id,
        'method': method,
        'amount': widget.order.total,
      });

      await api.patch('/orders/${widget.order.id}/status', data: {
        'status': 'PAID',
      });

      await api.patch('/tables/${widget.table.id}', data: {
        'status': 'AVAILABLE',
      });

      widget.onRefresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Order Settled & Table Marked Available!'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settlement failed: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mergedItems = MergedOrderItem.mergeItems(widget.order.items);
    final elapsedMinutes =
        DateTime.now().difference(widget.order.createdAt).inMinutes;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: RosTheme.statusOccupied.withValues(alpha: 0.5),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '#${widget.order.orderNumber}',
                style: const TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'monospace',
                ),
              ),
              _DetailStatusBadge(status: widget.order.status),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '⏱️ Ordered $elapsedMinutes mins ago',
            style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
          ),
          const SizedBox(height: 14),

          // Consolidated Item List
          Container(
            decoration: BoxDecoration(
              color: RosTheme.bgElevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: mergedItems.length,
              separatorBuilder: (_, __) =>
                  const Divider(color: RosTheme.bgBorder, height: 1),
              itemBuilder: (ctx, i) {
                final item = mergedItems[i];
                final fullTitle = item.variantName != null &&
                        item.variantName!.isNotEmpty &&
                        !item.variantName!.toLowerCase().contains('regular')
                    ? '${item.name} (${item.variantName})'
                    : item.name;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: RosTheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${item.totalQuantity}x',
                          style: const TextStyle(
                            color: RosTheme.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullTitle,
                              style: const TextStyle(
                                color: RosTheme.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (item.modifiers.isNotEmpty)
                              Text(
                                '+ ${item.modifiers.join(', ')}',
                                style: const TextStyle(
                                  color: Color(0xFF818CF8),
                                  fontSize: 10.5,
                                ),
                              ),
                          ],
                        ),
                      ),
                      Text(
                        '₹${item.totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 12),

          // Total line
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total Payable',
                style: TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                '₹${widget.order.total.toStringAsFixed(0)}',
                style: const TextStyle(
                  color: RosTheme.secondary,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Actions inside active card
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    ref.read(cartProvider.notifier).setTable(widget.table.id);
                    ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                    context.go('/pos');
                  },
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 16),
                  label: const Text('Add Items'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: RosTheme.primary),
                    foregroundColor: RosTheme.primary,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed:
                      _isProcessing ? null : () => _settlePayment('CASH'),
                  icon: _isProcessing
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_rounded, size: 16),
                  label: const Text('Fast Settle'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.secondary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailStatusBadge extends StatelessWidget {
  final String status;
  const _DetailStatusBadge({required this.status});

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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: _color,
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
