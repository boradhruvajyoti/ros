// =============================================================================
// Order Detail Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  Order? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final data = await api.get<Map<String, dynamic>>('/orders/${widget.orderId}');
      setState(() {
        _order = Order.fromJson(data['order'] as Map<String, dynamic>? ?? data);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _addPayment(String method, double amount) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/orders/${widget.orderId}/payments', data: {
        'method': method,
        'amount': amount,
      });
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger),
        );
      }
    }
  }

  void _showPaymentSheet() {
    final order = _order;
    if (order == null) return;

    final balance = order.balanceDue;
    String method = 'CASH';

    showModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setM) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Add Payment',
                  style: TextStyle(color: RosTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              Text('Balance Due: ₹${balance.toStringAsFixed(2)}',
                  style: const TextStyle(color: RosTheme.textMuted)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'].map((m) {
                  return GestureDetector(
                    onTap: () => setM(() => method = m),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: method == m ? RosTheme.primary.withOpacity(0.15) : RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: method == m ? RosTheme.primary : RosTheme.bgBorder),
                      ),
                      child: Text(m, style: TextStyle(
                        color: method == m ? RosTheme.primary : RosTheme.textSecondary,
                        fontWeight: method == m ? FontWeight.w600 : FontWeight.w400,
                      )),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _addPayment(method, balance);
                  },
                  child: Text('Pay ₹${balance.toStringAsFixed(0)} via $method'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: RosTheme.primary)));
    }
    if (_order == null) {
      return Scaffold(appBar: AppBar(title: const Text('Order')), body: const Center(child: Text('Order not found')));
    }

    final order = _order!;
    final statusColor = switch (order.status) {
      'PAID' || 'COMPLETED' => RosTheme.statusAvailable,
      'CANCELLED' || 'VOIDED' => RosTheme.danger,
      'PREPARING' || 'SENT_TO_KITCHEN' => RosTheme.warning,
      'BILLED' || 'PARTIALLY_PAID' => RosTheme.accent,
      _ => RosTheme.info,
    };

    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${order.orderNumber}'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: statusColor.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Order #${order.orderNumber}', style: const TextStyle(
                        color: RosTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                    Text(order.type.replaceAll('_', ' '),
                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(DateFormat('d MMM yyyy, h:mm a').format(order.createdAt),
                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                  ]),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(order.status.replaceAll('_', ' '),
                        style: TextStyle(color: statusColor, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Items
            const Text('Items', style: TextStyle(
                color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: RosTheme.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: Column(
                children: order.items.map((item) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
                  ),
                  child: Row(
                    children: [
                      Text('${item.quantity}x ', style: const TextStyle(
                          color: RosTheme.primary, fontWeight: FontWeight.w700)),
                      Expanded(child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.menuItemName ?? 'Item', style: const TextStyle(
                              color: RosTheme.textPrimary, fontSize: 13)),
                          if (item.variantName != null)
                            Text(item.variantName!, style: const TextStyle(
                                color: RosTheme.textMuted, fontSize: 11)),
                          if (item.status == 'CANCELLED' || item.status == 'VOIDED')
                            Text(item.status, style: const TextStyle(
                                color: RosTheme.danger, fontSize: 10)),
                        ],
                      )),
                      Text('₹${item.lineTotal.toStringAsFixed(0)}',
                          style: const TextStyle(color: RosTheme.textPrimary, fontWeight: FontWeight.w500)),
                    ],
                  ),
                )).toList(),
              ),
            ),

            const SizedBox(height: 16),

            // Totals
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: RosTheme.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: Column(children: [
                _Row('Subtotal', '₹${order.subtotal.toStringAsFixed(2)}'),
                if (order.discountAmount > 0)
                  _Row('Discount', '-₹${order.discountAmount.toStringAsFixed(2)}', color: RosTheme.secondary),
                if (order.taxAmount > 0)
                  _Row('Tax', '₹${order.taxAmount.toStringAsFixed(2)}'),
                const Divider(color: RosTheme.bgBorder),
                _Row('Total', '₹${order.total.toStringAsFixed(2)}', bold: true, color: RosTheme.primary),
                if (order.paidAmount > 0)
                  _Row('Paid', '₹${order.paidAmount.toStringAsFixed(2)}', color: RosTheme.secondary),
                if (order.balanceDue > 0.01)
                  _Row('Balance Due', '₹${order.balanceDue.toStringAsFixed(2)}', color: RosTheme.danger, bold: true),
              ]),
            ),

            // Add payment button if balance due
            if (order.balanceDue > 0.01 &&
                !['CANCELLED', 'VOIDED', 'PAID', 'COMPLETED'].contains(order.status)) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _showPaymentSheet,
                  icon: const Icon(Icons.payment_rounded),
                  label: Text('Collect Payment — ₹${order.balanceDue.toStringAsFixed(0)}'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  final bool bold;
  const _Row(this.label, this.value, {this.color, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(
              color: bold ? RosTheme.textPrimary : RosTheme.textSecondary,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w400)),
          Text(value, style: TextStyle(
              color: color ?? (bold ? RosTheme.textPrimary : RosTheme.textSecondary),
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500)),
        ],
      ),
    );
  }
}
