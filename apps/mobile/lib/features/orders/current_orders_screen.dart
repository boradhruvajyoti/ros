// =============================================================================
// Current Orders Screen — Live Active Orders (Dine-In, Takeaway, Delivery)
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../tables/tables_screen.dart';

class CurrentOrdersScreen extends ConsumerStatefulWidget {
  const CurrentOrdersScreen({super.key});

  @override
  ConsumerState<CurrentOrdersScreen> createState() => _CurrentOrdersScreenState();
}

class _CurrentOrdersScreenState extends ConsumerState<CurrentOrdersScreen> {
  String _selectedTab = 'ALL'; // ALL | DINE_IN | TAKEAWAY | DELIVERY
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeOrdersAsync = ref.watch(activeOrdersProvider);
    final allOrders = activeOrdersAsync.valueOrNull ?? [];

    // Filter by Tab and Search
    final filteredOrders = allOrders.where((order) {
      if (_selectedTab == 'DINE_IN' && order.type != 'DINE_IN') return false;
      if (_selectedTab == 'TAKEAWAY' &&
          !['TAKEAWAY', 'PICKUP', 'DRIVE_THRU'].contains(order.type)) {
        return false;
      }
      if (_selectedTab == 'DELIVERY' &&
          !['DELIVERY', 'ONLINE', 'ROOM_SERVICE', 'AGGREGATOR_ZOMATO', 'AGGREGATOR_SWIGGY']
              .contains(order.type)) {
        return false;
      }

      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase().trim();
        final numMatch = order.orderNumber.toLowerCase().contains(q);
        final tableMatch = order.table?.name.toLowerCase().contains(q) ?? false;
        final itemMatch = order.items.any((it) =>
            (it.menuItemName ?? '').toLowerCase().contains(q) ||
            (it.variantName ?? '').toLowerCase().contains(q));
        return numMatch || tableMatch || itemMatch;
      }

      return true;
    }).toList();

    // Stats calculations
    int dineInCount = 0;
    int takeawayCount = 0;
    int deliveryCount = 0;
    double totalRevenue = 0.0;

    for (final ord in allOrders) {
      totalRevenue += ord.total;
      if (ord.type == 'DINE_IN') {
        dineInCount++;
      } else if (['TAKEAWAY', 'PICKUP', 'DRIVE_THRU'].contains(ord.type)) {
        takeawayCount++;
      } else {
        deliveryCount++;
      }
    }

    return Scaffold(
      backgroundColor: RosTheme.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: RosTheme.primary,
          backgroundColor: RosTheme.bgCard,
          onRefresh: () async {
            HapticFeedback.mediumImpact();
            ref.invalidate(activeOrdersProvider);
            ref.invalidate(tablesProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // Top Header & Action Row
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              gradient: RosTheme.primaryGradient,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.receipt_long_rounded,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Current Orders',
                                style: TextStyle(
                                  color: RosTheme.textPrimary,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                '${allOrders.length} active tickets · Live sync',
                                style: const TextStyle(
                                  color: RosTheme.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded,
                                color: RosTheme.textMuted, size: 20),
                            tooltip: 'Refresh Active Orders',
                            onPressed: () {
                              HapticFeedback.selectionClick();
                              ref.invalidate(activeOrdersProvider);
                              ref.invalidate(tablesProvider);
                            },
                          ),
                          ElevatedButton.icon(
                            onPressed: () => context.go('/tables'),
                            icon: const Icon(Icons.grid_view_rounded, size: 16),
                            label: const Text('Tables',
                                style: TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.w800)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: RosTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // KPI Stats Horizontal Strip
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 76,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      _buildKpiCard(
                        'ALL ACTIVE',
                        '${allOrders.length}',
                        'tickets',
                        RosTheme.primary,
                        Icons.local_fire_department_rounded,
                        _selectedTab == 'ALL',
                        () => setState(() => _selectedTab = 'ALL'),
                      ),
                      const SizedBox(width: 8),
                      _buildKpiCard(
                        'DINE-IN',
                        '$dineInCount',
                        'tables',
                        RosTheme.statusOccupied,
                        Icons.table_restaurant_rounded,
                        _selectedTab == 'DINE_IN',
                        () => setState(() => _selectedTab = 'DINE_IN'),
                      ),
                      const SizedBox(width: 8),
                      _buildKpiCard(
                        'TAKEAWAY',
                        '$takeawayCount',
                        'parcels',
                        RosTheme.warning,
                        Icons.takeout_dining_rounded,
                        _selectedTab == 'TAKEAWAY',
                        () => setState(() => _selectedTab = 'TAKEAWAY'),
                      ),
                      const SizedBox(width: 8),
                      _buildKpiCard(
                        'DELIVERY',
                        '$deliveryCount',
                        'riders',
                        RosTheme.secondary,
                        Icons.delivery_dining_rounded,
                        _selectedTab == 'DELIVERY',
                        () => setState(() => _selectedTab = 'DELIVERY'),
                      ),
                      const SizedBox(width: 8),
                      _buildKpiCard(
                        'TOTAL VALUE',
                        '₹${totalRevenue.toStringAsFixed(0)}',
                        'unsettled',
                        const Color(0xFF10B981),
                        Icons.account_balance_wallet_rounded,
                        false,
                        null,
                      ),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 12)),

              // Search Bar & Filter Strip
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    height: 42,
                    decoration: BoxDecoration(
                      color: RosTheme.bgCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: RosTheme.bgBorder),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded,
                            size: 18, color: RosTheme.textMuted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: const TextStyle(
                                color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(
                              hintText: 'Search #ORD, table, dish name...',
                              hintStyle: TextStyle(
                                  color: RosTheme.textMuted, fontSize: 12),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            onChanged: (val) =>
                                setState(() => _searchQuery = val),
                          ),
                        ),
                        if (_searchQuery.isNotEmpty)
                          GestureDetector(
                            onTap: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            child: const Icon(Icons.cancel_rounded,
                                size: 16, color: RosTheme.textMuted),
                          ),
                      ],
                    ),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 14)),

              // Content Body
              activeOrdersAsync.when(
                loading: () => const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: RosTheme.primary),
                  ),
                ),
                error: (e, st) => SliverFillRemaining(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              size: 40, color: RosTheme.danger),
                          const SizedBox(height: 12),
                          Text('Failed to load current orders: $e',
                              style: const TextStyle(
                                  color: RosTheme.textMuted, fontSize: 12),
                              textAlign: TextAlign.center),
                          const SizedBox(height: 14),
                          ElevatedButton(
                            onPressed: () => ref.refresh(activeOrdersProvider),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: RosTheme.primary,
                            ),
                            child: const Text('Try Again'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                data: (_) {
                  if (filteredOrders.isEmpty) {
                    return SliverFillRemaining(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: RosTheme.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.receipt_long_rounded,
                                  size: 40,
                                  color: RosTheme.primary,
                                ),
                              ),
                              const SizedBox(height: 14),
                              const Text(
                                'No Active Orders',
                                style: TextStyle(
                                  color: RosTheme.textPrimary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _searchQuery.isNotEmpty
                                    ? 'No orders match "$_searchQuery"'
                                    : _selectedTab != 'ALL'
                                        ? 'No active orders under ${_selectedTab.replaceAll('_', ' ')}'
                                        : 'All orders have been settled & cleared. Create a new order via POS.',
                                style: const TextStyle(
                                    color: RosTheme.textMuted, fontSize: 12),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                onPressed: () => context.go('/tables'),
                                icon: const Icon(Icons.grid_view_rounded,
                                    size: 16),
                                label: const Text('Take Order via Tables'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: RosTheme.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final order = filteredOrders[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _CurrentOrderCard(
                              order: order,
                              onRefresh: () {
                                ref.invalidate(activeOrdersProvider);
                                ref.invalidate(tablesProvider);
                              },
                            ),
                          );
                        },
                        childCount: filteredOrders.length,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKpiCard(
    String title,
    String value,
    String subtitle,
    Color color,
    IconData icon,
    bool isSelected,
    VoidCallback? onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 110,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.18)
              : RosTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? color : RosTheme.bgBorder,
            width: isSelected ? 1.5 : 1.0,
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
                  title,
                  style: TextStyle(
                    color: color,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                  ),
                ),
                Icon(icon, size: 14, color: color),
              ],
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: color,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Single Order Card ────────────────────────────────────────────────────────
class _CurrentOrderCard extends ConsumerStatefulWidget {
  final Order order;
  final VoidCallback onRefresh;

  const _CurrentOrderCard({
    required this.order,
    required this.onRefresh,
  });

  @override
  ConsumerState<_CurrentOrderCard> createState() => _CurrentOrderCardState();
}

class _CurrentOrderCardState extends ConsumerState<_CurrentOrderCard> {
  bool _isProcessing = false;

  int get _elapsedMinutes =>
      DateTime.now().difference(widget.order.createdAt).inMinutes;

  Color get _typeColor => switch (widget.order.type) {
        'DINE_IN' => RosTheme.statusOccupied,
        'TAKEAWAY' || 'PICKUP' || 'DRIVE_THRU' => RosTheme.warning,
        'DELIVERY' || 'ONLINE' => RosTheme.secondary,
        _ => RosTheme.primary,
      };

  String get _typeLabel {
    if (widget.order.type == 'DINE_IN') {
      return widget.order.table != null
          ? '🍽️ ${widget.order.table!.name}'
          : '🍽️ Dine-In';
    }
    if (['TAKEAWAY', 'PICKUP', 'DRIVE_THRU'].contains(widget.order.type)) {
      return '📦 Takeaway';
    }
    return '🛵 Delivery';
  }

  Future<void> _settlePayment(String method) async {
    final activeKots = widget.order.kots.where((k) => k.status != 'CANCELLED').toList();
    final totalKots = activeKots.length;
    final servedKots = activeKots.where((k) => k.status == 'SERVED').length;
    if (totalKots > 0 && servedKots < totalKots) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('⚠️ Cannot settle bill: $servedKots/$totalKots KOTs served. All KOTs must be marked as SERVED in kitchen first.'),
            backgroundColor: RosTheme.warning,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);

      final itemsSum = widget.order.items.fold<double>(
        0.0,
        (sum, it) {
          if (it.status == 'CANCELLED' || it.status == 'VOIDED') return sum;
          return sum + (it.lineTotal > 0 ? it.lineTotal : (it.quantity * it.unitPrice));
        },
      );
      final sub = itemsSum > 0 ? itemsSum : widget.order.subtotal;
      final tax = widget.order.taxAmount;
      final disc = widget.order.discountAmount;
      final calcTotal = (sub + tax - disc).clamp(0.0, double.infinity);
      final settleAmount = (widget.order.total > 0 && widget.order.total >= (sub - disc))
          ? widget.order.total
          : calcTotal;

      // Post Payment (backend handles payment, order status PAID, and table release)
      await api.post('/payments', data: {
        'orderId': widget.order.id,
        'method': method,
        'amount': settleAmount,
      });

      widget.onRefresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✓ Order #${widget.order.orderNumber} Settled & Cleared!'),
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

  void _showSettlementModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Settle #${widget.order.orderNumber}',
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      '$_typeLabel · ₹${widget.order.total.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: RosTheme.secondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Choose Payment Method:',
              style: TextStyle(
                color: RosTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _settlePayment('CASH');
                    },
                    icon: const Icon(Icons.payments_rounded, size: 16),
                    label: const Text('💵 Cash',
                        style: TextStyle(
                            fontSize: 12.5, fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.secondary,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _settlePayment('UPI');
                    },
                    icon: const Icon(Icons.qr_code_rounded, size: 16),
                    label: const Text('📱 UPI / QR',
                        style: TextStyle(
                            fontSize: 12.5, fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _settlePayment('CARD');
                    },
                    icon: const Icon(Icons.credit_card_rounded, size: 16),
                    label: const Text('💳 Card',
                        style: TextStyle(
                            fontSize: 12.5, fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.bgElevated,
                      foregroundColor: RosTheme.textPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: RosTheme.bgBorder),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mergedItems = MergedOrderItem.mergeItems(widget.order.items);
    final activeKots =
        widget.order.kots.where((k) => k.status != 'CANCELLED').toList();
    final totalKots = activeKots.length;
    final servedKots = activeKots.where((k) => k.status == 'SERVED').length;

    final calculatedSubtotal =
        mergedItems.fold<double>(0.0, (s, i) => s + i.totalAmount);
    final displaySubtotal =
        calculatedSubtotal > 0 ? calculatedSubtotal : widget.order.subtotal;
    final taxAmount = widget.order.taxAmount;
    final discountAmount = widget.order.discountAmount;
    final displayTotal = (widget.order.total > 0 &&
            widget.order.total >= (displaySubtotal - discountAmount))
        ? widget.order.total
        : (displaySubtotal + taxAmount - discountAmount)
            .clamp(0.0, double.infinity);

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: _typeColor.withValues(alpha: 0.35),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top Header Strip ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: RosTheme.bgElevated.withValues(alpha: 0.7),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(17)),
              border: const Border(bottom: BorderSide(color: RosTheme.bgBorder)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        '#${widget.order.orderNumber}',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Bold Table Pill or Type Badge
                      if (widget.order.table != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color:
                                RosTheme.statusOccupied.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: RosTheme.statusOccupied
                                  .withValues(alpha: 0.6),
                              width: 1.3,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.table_restaurant_rounded,
                                size: 12,
                                color: RosTheme.statusOccupied,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'TABLE: ${widget.order.table!.name}',
                                style: const TextStyle(
                                  color: RosTheme.statusOccupied,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _typeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: _typeColor.withValues(alpha: 0.5),
                                width: 1),
                          ),
                          child: Text(
                            _typeLabel,
                            style: TextStyle(
                              color: _typeColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: _elapsedMinutes > 30
                        ? RosTheme.danger.withValues(alpha: 0.15)
                        : _elapsedMinutes > 15
                            ? RosTheme.warning.withValues(alpha: 0.15)
                            : RosTheme.bgCard,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _elapsedMinutes > 30
                          ? RosTheme.danger.withValues(alpha: 0.5)
                          : _elapsedMinutes > 15
                              ? RosTheme.warning.withValues(alpha: 0.5)
                              : RosTheme.bgBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.access_time_rounded,
                        size: 11,
                        color: _elapsedMinutes > 30
                            ? RosTheme.danger
                            : _elapsedMinutes > 15
                                ? RosTheme.warning
                                : RosTheme.textMuted,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '${_elapsedMinutes}m ago',
                        style: TextStyle(
                          color: _elapsedMinutes > 30
                              ? RosTheme.danger
                              : _elapsedMinutes > 15
                                  ? RosTheme.warning
                                  : RosTheme.textMuted,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Prominent Running Table Order Banner ──
          if (widget.order.table != null)
            Container(
              margin: const EdgeInsets.fromLTRB(14, 8, 14, 0),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5.5),
              decoration: BoxDecoration(
                color: RosTheme.statusOccupied.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: RosTheme.statusOccupied.withValues(alpha: 0.35),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: RosTheme.statusOccupied,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'RUNNING TABLE ORDER · TABLE ${widget.order.table!.name}',
                        style: const TextStyle(
                          color: RosTheme.statusOccupied,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                  if (widget.order.table?.capacity != null)
                    Text(
                      '${widget.order.table!.capacity} Seats',
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),

          // ── Status & KOT Progress Strip ──
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: RosTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    widget.order.status.replaceAll('_', ' '),
                    style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (totalKots > 0)
                  Text(
                    '🍳 $servedKots/$totalKots KOTs Served',
                    style: const TextStyle(
                      color: RosTheme.textMuted,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),

          // ── Items List ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Column(
              children: mergedItems.map((it) {
                final fullTitle = it.variantName != null &&
                        it.variantName!.isNotEmpty &&
                        !it.variantName!.toLowerCase().contains('regular')
                    ? '${it.name} (${it.variantName})'
                    : it.name;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2.5),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Text(
                              '${it.totalQuantity}x',
                              style: const TextStyle(
                                color: RosTheme.primary,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                fullTitle,
                                style: const TextStyle(
                                  color: RosTheme.textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '₹${it.totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          const Divider(color: RosTheme.bgBorder, height: 1),

          // ── Bottom Total & Action Buttons ──
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TOTAL PAYABLE',
                      style: TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                    Text(
                      '₹${displayTotal.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: RosTheme.secondary,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Add items in POS
                    OutlinedButton.icon(
                      onPressed: () {
                        HapticFeedback.selectionClick();
                        if (widget.order.type == 'DINE_IN' &&
                            widget.order.tableId != null) {
                          ref
                              .read(cartProvider.notifier)
                              .setTable(widget.order.tableId);
                          ref
                              .read(cartProvider.notifier)
                              .setOrderType('DINE_IN');
                        } else {
                          ref
                              .read(cartProvider.notifier)
                              .setOrderType(widget.order.type);
                        }
                        context.go('/pos');
                      },
                      icon: const Icon(Icons.add_shopping_cart_rounded,
                          size: 14),
                      label: const Text('+ Items',
                          style: TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: RosTheme.textPrimary,
                        side: const BorderSide(color: RosTheme.bgBorder),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    // Settle & Mark Paid (Only when all KOTs of the table are completely served)
                    () {
                      final activeKots = widget.order.kots.where((k) => k.status != 'CANCELLED').toList();
                      final totalKots = activeKots.length;
                      final servedKots = activeKots.where((k) => k.status == 'SERVED').length;
                      final bool allKotsServed = totalKots > 0 && servedKots == totalKots;
                      final bool canSettle = !['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].contains(widget.order.status) &&
                          (totalKots == 0 ? ['SERVED', 'BILLED', 'PARTIALLY_PAID'].contains(widget.order.status) : allKotsServed);

                      if (canSettle) {
                        return Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: ElevatedButton.icon(
                            onPressed: _isProcessing ? null : _showSettlementModal,
                            icon: const Icon(Icons.credit_card_rounded, size: 14),
                            label: const Text('Settle',
                                style: TextStyle(
                                    fontSize: 11, fontWeight: FontWeight.w800)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: RosTheme.secondary,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        );
                      }

                      if (totalKots > 0 && !allKotsServed) {
                        return Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 6),
                            decoration: BoxDecoration(
                              color: RosTheme.warning.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: RosTheme.warning.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.local_fire_department_rounded,
                                    size: 13, color: RosTheme.warning),
                                const SizedBox(width: 4),
                                Text(
                                  'In Kitchen ($servedKots/$totalKots Served)',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    color: RosTheme.warning,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      return const SizedBox.shrink();
                    }(),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
