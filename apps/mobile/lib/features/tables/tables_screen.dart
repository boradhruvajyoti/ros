// =============================================================================
// Tables Screen — Tables & Orders Command Center
// Matching the Mobile Web Table Grid & Running Order Logic Exactly
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

// ── Merged Order Item for Running Orders ──────────────────────────────────────

class MergedOrderItem {
  final String key;
  final String menuItemId;
  final String? variantId;
  final String name;
  final String? variantName;
  final int totalQuantity;
  final double unitPrice;
  final double totalAmount;
  final List<String> notes;
  final List<String> modifiers;
  final List<String> itemIds;
  final String status;

  MergedOrderItem({
    required this.key,
    required this.menuItemId,
    this.variantId,
    required this.name,
    this.variantName,
    required this.totalQuantity,
    required this.unitPrice,
    required this.totalAmount,
    required this.notes,
    required this.modifiers,
    required this.itemIds,
    required this.status,
  });

  static List<MergedOrderItem> mergeItems(List<OrderItem> items) {
    final Map<String, MergedOrderItem> map = {};

    for (final item in items) {
      if (item.status == 'CANCELLED' || item.status == 'VOIDED') continue;

      final baseName = item.menuItemName ?? 'Dish Item';
      final vName = item.variantName ?? '';
      final key = '${item.menuItemId}_${item.variantId ?? ''}_${baseName}_$vName';

      final qty = item.quantity;
      final price = item.unitPrice;
      final lineTot = item.lineTotal > 0 ? item.lineTotal : (qty * price);

      final noteList = <String>[];
      if (item.notes != null && item.notes!.trim().isNotEmpty) {
        noteList.add(item.notes!.trim());
      }

      final modList = item.modifiers.map((m) => m.name).toList();

      if (map.containsKey(key)) {
        final existing = map[key]!;
        final updatedNotes = List<String>.from(existing.notes);
        for (final n in noteList) {
          if (!updatedNotes.contains(n)) updatedNotes.add(n);
        }
        final updatedMods = List<String>.from(existing.modifiers);
        for (final m in modList) {
          if (!updatedMods.contains(m)) updatedMods.add(m);
        }

        map[key] = MergedOrderItem(
          key: key,
          menuItemId: existing.menuItemId,
          variantId: existing.variantId,
          name: existing.name,
          variantName: existing.variantName,
          totalQuantity: existing.totalQuantity + qty,
          unitPrice: existing.unitPrice,
          totalAmount: existing.totalAmount + lineTot,
          notes: updatedNotes,
          modifiers: updatedMods,
          itemIds: [...existing.itemIds, item.id],
          status: existing.status,
        );
      } else {
        map[key] = MergedOrderItem(
          key: key,
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          name: baseName,
          variantName: vName.isNotEmpty ? vName : null,
          totalQuantity: qty,
          unitPrice: price,
          totalAmount: lineTot,
          notes: noteList,
          modifiers: modList,
          itemIds: [item.id],
          status: item.status,
        );
      }
    }

    return map.values.toList();
  }
}

// ── Tables Screen ────────────────────────────────────────────────────────────

class TablesScreen extends ConsumerStatefulWidget {
  const TablesScreen({super.key});

  @override
  ConsumerState<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends ConsumerState<TablesScreen>
    with AutomaticKeepAliveClientMixin {
  String? _selectedFloorId;
  String _filterStatus = 'ALL';
  io.Socket? _socket;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _setupSocket();
  }

  @override
  void dispose() {
    _socket?.disconnect();
    super.dispose();
  }

  void _setupSocket() {
    final socket = ref.read(socketProvider);
    if (socket == null) return;
    _socket = socket;

    socket.on('ros:event', (data) {
      if (!mounted) return;
      final type = data['type'] as String?;
      if ([
        'TABLE_STATUS_CHANGED',
        'ORDER_CREATED',
        'ORDER_STATUS_CHANGED',
        'KOT_CREATED',
        'KOT_STATUS_CHANGED',
        'KOT_ADDED',
      ].contains(type)) {
        ref.invalidate(tablesProvider);
        ref.invalidate(activeOrdersProvider);
      }
    });
  }

  void _triggerTableSelection() {
    HapticFeedback.selectionClick();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _TableSelectionSheet(),
    );
  }

  void _handleTableClick(
    RestaurantTable table,
    Order? activeOrder,
  ) {
    HapticFeedback.selectionClick();

    if (table.status == 'OCCUPIED') {
      if (activeOrder != null) {
        _showActiveOrderSheet(table, activeOrder);
      } else {
        ref.read(cartProvider.notifier).setTable(table.id);
        ref.read(cartProvider.notifier).setOrderType('DINE_IN');
        context.go('/pos');
      }
    } else if (table.status == 'AVAILABLE') {
      ref.read(cartProvider.notifier).setTable(table.id);
      ref.read(cartProvider.notifier).setOrderType('DINE_IN');
      context.go('/pos');
    } else {
      _showTableStatusManageSheet(table);
    }
  }

  void _showActiveOrderSheet(RestaurantTable table, Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _ActiveOrderDetailsSheet(
        table: table,
        order: order,
        onRefresh: () {
          ref.invalidate(tablesProvider);
          ref.invalidate(activeOrdersProvider);
        },
      ),
    );
  }

  void _showTableStatusManageSheet(RestaurantTable table) {
    showModalBottomSheet(
      context: context,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _TableStatusManageSheet(
        table: table,
        onStatusChanged: () {
          ref.invalidate(tablesProvider);
          ref.invalidate(activeOrdersProvider);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final tablesAsync = ref.watch(tablesProvider);
    final floorsAsync = ref.watch(floorsProvider);
    final activeOrdersAsync = ref.watch(activeOrdersProvider);

    final tables = tablesAsync.valueOrNull ?? [];
    final activeOrders = activeOrdersAsync.valueOrNull ?? [];

    // Map active orders by tableId
    final Map<String, Order> activeOrderByTableId = {};
    for (final ord in activeOrders) {
      if (ord.tableId != null && ord.tableId!.isNotEmpty) {
        activeOrderByTableId[ord.tableId!] = ord;
      }
    }

    final availableCount = tables.where((t) => t.status == 'AVAILABLE').length;
    final occupiedCount = tables.where((t) => t.status == 'OCCUPIED').length;
    final reservedCount = tables.where((t) => t.status == 'RESERVED').length;
    final cleaningCount = tables.where((t) => t.status == 'CLEANING').length;
    final blockedCount = tables.where((t) => t.status == 'BLOCKED').length;

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: RosTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.grid_view_rounded,
                  color: RosTheme.primary, size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tables & Orders',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: RosTheme.textPrimary,
                  ),
                ),
                Text(
                  '${tables.length} Tables · $occupiedCount Dining · $availableCount Free',
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: RosTheme.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: () {
              ref.invalidate(tablesProvider);
              ref.invalidate(floorsProvider);
              ref.invalidate(activeOrdersProvider);
            },
          ),
          IconButton(
            icon: const Icon(Icons.menu_rounded, size: 20),
            onPressed: () => Scaffold.of(context).openEndDrawer(),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Floor Filter Tabs
          floorsAsync.when(
            data: (floors) => _buildFloorTabs(floors),
            loading: () => const SizedBox(height: 48),
            error: (_, __) => const SizedBox.shrink(),
          ),

          // Status Filter Chips
          _buildStatusFilter(
            totalCount: tables.length,
            availableCount: availableCount,
            occupiedCount: occupiedCount,
            reservedCount: reservedCount,
            cleaningCount: cleaningCount,
            blockedCount: blockedCount,
          ),

          // Tables Grid
          Expanded(
            child: tablesAsync.when(
              data: (_) => _buildTablesGrid(tables, activeOrderByTableId),
              loading: () => const Center(
                child: CircularProgressIndicator(color: RosTheme.primary),
              ),
              error: (err, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wifi_off_rounded,
                        color: RosTheme.textMuted, size: 48),
                    const SizedBox(height: 14),
                    const Text('Failed to load tables',
                        style: TextStyle(color: RosTheme.textSecondary)),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        ref.invalidate(tablesProvider);
                        ref.invalidate(activeOrdersProvider);
                      },
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _triggerTableSelection,
        icon: const Icon(Icons.add_shopping_cart_rounded),
        label: const Text('New Order'),
      ),
    );
  }

  // ── Floor Filter Tabs ───────────────────────────────────────────────────────

  Widget _buildFloorTabs(List<Floor> floors) {
    if (floors.isEmpty) return const SizedBox.shrink();
    return Container(
      height: 40,
      margin: const EdgeInsets.only(top: 4, bottom: 2),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        children: [
          _buildFloorChip(
            label: 'All Floors',
            selected: _selectedFloorId == null,
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _selectedFloorId = null);
            },
          ),
          ...floors.map((f) => _buildFloorChip(
                label: f.name,
                selected: _selectedFloorId == f.id,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedFloorId = f.id);
                },
              )),
        ],
      ),
    );
  }

  Widget _buildFloorChip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: selected ? RosTheme.primary : RosTheme.bgElevated,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? RosTheme.primary : RosTheme.bgBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : RosTheme.textSecondary,
              fontSize: 12,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  // ── Status Filter Chips ─────────────────────────────────────────────────────

  Widget _buildStatusFilter({
    required int totalCount,
    required int availableCount,
    required int occupiedCount,
    required int reservedCount,
    required int cleaningCount,
    required int blockedCount,
  }) {
    final list = [
      {'key': 'ALL', 'label': 'All', 'count': totalCount, 'color': RosTheme.primary},
      {'key': 'AVAILABLE', 'label': 'Available', 'count': availableCount, 'color': RosTheme.statusAvailable},
      {'key': 'OCCUPIED', 'label': 'Dining', 'count': occupiedCount, 'color': RosTheme.statusOccupied},
      {'key': 'RESERVED', 'label': 'Reserved', 'count': reservedCount, 'color': RosTheme.statusReserved},
      {'key': 'CLEANING', 'label': 'Cleaning', 'count': cleaningCount, 'color': RosTheme.statusCleaning},
      {'key': 'BLOCKED', 'label': 'Blocked', 'count': blockedCount, 'color': RosTheme.textMuted},
    ];

    return Container(
      height: 38,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        children: list.map((item) {
          final key = item['key'] as String;
          final label = item['label'] as String;
          final count = item['count'] as int;
          final color = item['color'] as Color;
          final selected = _filterStatus == key;

          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _filterStatus = key);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: selected
                      ? color.withValues(alpha: 0.18)
                      : RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: selected ? color : RosTheme.bgBorder,
                    width: selected ? 1.4 : 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        color: selected ? color : RosTheme.textSecondary,
                        fontSize: 11.5,
                        fontWeight:
                            selected ? FontWeight.w800 : FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: selected
                            ? color.withValues(alpha: 0.25)
                            : RosTheme.bgCard,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          color: selected ? color : RosTheme.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
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
    );
  }

  // ── Tables Grid ─────────────────────────────────────────────────────────────

  Widget _buildTablesGrid(
    List<RestaurantTable> tables,
    Map<String, Order> activeOrderByTableId,
  ) {
    var filtered = tables.where((t) {
      if (_selectedFloorId != null && t.floorId != _selectedFloorId) return false;
      if (_filterStatus != 'ALL' && t.status != _filterStatus) return false;
      return true;
    }).toList();

    if (filtered.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.grid_view_rounded,
                color: RosTheme.textMuted, size: 48),
            SizedBox(height: 12),
            Text('No tables found in this filter',
                style: TextStyle(color: RosTheme.textSecondary, fontSize: 13)),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 80),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.05,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: filtered.length,
      itemBuilder: (context, i) {
        final table = filtered[i];
        final activeOrder = activeOrderByTableId[table.id];

        return _WebMatchingTableCard(
          table: table,
          activeOrder: activeOrder,
          onTap: () => _handleTableClick(table, activeOrder),
        );
      },
    );
  }
}

// ── Web-Matching High Contrast Table Card ─────────────────────────────────────

class _WebMatchingTableCard extends StatelessWidget {
  final RestaurantTable table;
  final Order? activeOrder;
  final VoidCallback onTap;

  const _WebMatchingTableCard({
    required this.table,
    this.activeOrder,
    required this.onTap,
  });

  Color get _statusColor => switch (table.status) {
        'AVAILABLE' => RosTheme.statusAvailable,
        'OCCUPIED' => RosTheme.statusOccupied,
        'RESERVED' => RosTheme.statusReserved,
        'CLEANING' => RosTheme.statusCleaning,
        'BLOCKED' => const Color(0xFF71717A),
        _ => RosTheme.textMuted,
      };

  String get _statusLabel => switch (table.status) {
        'AVAILABLE' => 'Available',
        'OCCUPIED' => 'Dining',
        'RESERVED' => 'Reserved',
        'CLEANING' => 'Cleaning',
        'BLOCKED' => 'Blocked',
        _ => table.status,
      };

  @override
  Widget build(BuildContext context) {
    final isOccupied = table.status == 'OCCUPIED';
    final isAvailable = table.status == 'AVAILABLE';

    // Elapsed minutes
    int elapsedMinutes = 0;
    if (activeOrder != null) {
      elapsedMinutes =
          DateTime.now().difference(activeOrder!.createdAt).inMinutes;
    }

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: RosTheme.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: _statusColor.withValues(alpha: isOccupied ? 0.8 : 0.4),
            width: isOccupied ? 1.8 : 1.2,
          ),
          boxShadow: isOccupied
              ? [
                  BoxShadow(
                    color: _statusColor.withValues(alpha: 0.15),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header: Status badge & Seat capacity
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: _statusColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _statusLabel,
                        style: TextStyle(
                          color: _statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${table.capacity} seats',
                  style: const TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),

            const Spacer(),

            // Table Name
            Text(
              table.name,
              style: const TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
              overflow: TextOverflow.ellipsis,
            ),

            const SizedBox(height: 4),

            // Bottom dynamic section based on status
            if (isOccupied) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '₹${(activeOrder?.total ?? 0).toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: RosTheme.secondary,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  if (elapsedMinutes > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '⏱️ ${elapsedMinutes}m',
                        style: const TextStyle(
                          color: RosTheme.textMuted,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              const Text(
                'Running Order · Tap to View',
                style: TextStyle(
                  color: RosTheme.textMuted,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ] else if (isAvailable) ...[
              const Row(
                children: [
                  Icon(Icons.add_circle_outline_rounded,
                      size: 13, color: RosTheme.secondary),
                  SizedBox(width: 4),
                  Text(
                    'Tap to Take Order',
                    style: TextStyle(
                      color: RosTheme.secondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ] else ...[
              Text(
                'Tap to Manage Status',
                style: TextStyle(
                  color: _statusColor,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Active Order Details Bottom Sheet (Deduplicated Merged Items) ─────────────

class _ActiveOrderDetailsSheet extends ConsumerStatefulWidget {
  final RestaurantTable table;
  final Order order;
  final VoidCallback onRefresh;

  const _ActiveOrderDetailsSheet({
    required this.table,
    required this.order,
    required this.onRefresh,
  });

  @override
  ConsumerState<_ActiveOrderDetailsSheet> createState() =>
      _ActiveOrderDetailsSheetState();
}

class _ActiveOrderDetailsSheetState
    extends ConsumerState<_ActiveOrderDetailsSheet> {
  bool _isProcessing = false;

  Future<void> _settlePayment(String method) async {
    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);

      // Settle Payment
      await api.post('/payments', data: {
        'orderId': widget.order.id,
        'method': method,
        'amount': widget.order.total,
      });

      // Update Order Status to PAID
      await api.patch('/orders/${widget.order.id}/status', data: {
        'status': 'PAID',
      });

      // Update Table Status to AVAILABLE
      await api.patch('/tables/${widget.table.id}', data: {
        'status': 'AVAILABLE',
      });

      widget.onRefresh();
      if (mounted) {
        Navigator.pop(context);
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
    final viewInsets = MediaQuery.of(context).viewInsets;
    final mergedItems = MergedOrderItem.mergeItems(widget.order.items);
    final elapsedMinutes =
        DateTime.now().difference(widget.order.createdAt).inMinutes;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.fromLTRB(18, 14, 18, viewInsets.bottom + 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
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
          const SizedBox(height: 12),

          // ── Header: Table & Order Number ──
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: RosTheme.statusOccupied.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: RosTheme.statusOccupied.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Text(
                      widget.table.name,
                      style: const TextStyle(
                        color: RosTheme.statusOccupied,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '#${widget.order.orderNumber}',
                    style: const TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),

          // Order status tag & elapsed time
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: RosTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  widget.order.status.replaceAll('_', ' '),
                  style: const TextStyle(
                    color: RosTheme.primary,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '⏱️ Ordered $elapsedMinutes mins ago',
                style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // ── Merged Billable Items List Header ──
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'DISH DESCRIPTION (CONSOLIDATED)',
                style: TextStyle(
                  color: RosTheme.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                'QTY × RATE = AMOUNT',
                style: TextStyle(
                  color: RosTheme.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // ── Scrollable Merged Items Box ──
          Flexible(
            child: Container(
              decoration: BoxDecoration(
                color: RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: mergedItems.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(20),
                      child: Center(
                        child: Text(
                          'No active billable items in order',
                          style: TextStyle(
                              color: RosTheme.textMuted, fontSize: 12),
                        ),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      itemCount: mergedItems.length,
                      separatorBuilder: (_, __) =>
                          const Divider(color: RosTheme.bgBorder, height: 1),
                      itemBuilder: (ctx, i) {
                        final item = mergedItems[i];
                        final fullTitle = item.variantName != null &&
                                item.variantName!.isNotEmpty &&
                                !item.variantName!
                                    .toLowerCase()
                                    .contains('regular')
                            ? '${item.name} (${item.variantName})'
                            : item.name;

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Quantity Badge
                              Container(
                                width: 26,
                                height: 26,
                                decoration: BoxDecoration(
                                  color: RosTheme.primary
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Center(
                                  child: Text(
                                    '${item.totalQuantity}x',
                                    style: const TextStyle(
                                      color: RosTheme.primary,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),

                              // Title & Notes
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
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    if (item.notes.isNotEmpty)
                                      Text(
                                        'Note: ${item.notes.join(', ')}',
                                        style: const TextStyle(
                                          color: RosTheme.danger,
                                          fontSize: 10.5,
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                  ],
                                ),
                              ),

                              // Rates calculation
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '₹${item.totalAmount.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      color: RosTheme.textPrimary,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  Text(
                                    '${item.totalQuantity} × ₹${item.unitPrice.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      color: RosTheme.textMuted,
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ),

          const SizedBox(height: 12),

          // ── Financial Summary ──
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: RosTheme.bgElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Subtotal',
                        style: TextStyle(
                            color: RosTheme.textMuted, fontSize: 11.5)),
                    Text(
                      '₹${(widget.order.subtotal > 0 ? widget.order.subtotal : widget.order.total).toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                if (widget.order.taxAmount > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Taxes & GST',
                          style: TextStyle(
                              color: RosTheme.textMuted, fontSize: 11.5)),
                      Text(
                        '+₹${widget.order.taxAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 12,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ],
                if (widget.order.discountAmount > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Discount',
                          style: TextStyle(
                              color: RosTheme.secondary, fontSize: 11.5)),
                      Text(
                        '-₹${widget.order.discountAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: RosTheme.secondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ],
                const Divider(color: RosTheme.bgBorder, height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Total Payable',
                      style: TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 13.5,
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
              ],
            ),
          ),

          const SizedBox(height: 14),

          // ── Action Buttons ──
          Row(
            children: [
              // Add More Items (Running Round)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    ref.read(cartProvider.notifier).setTable(widget.table.id);
                    ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                    Navigator.pop(context);
                    context.go('/pos');
                  },
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 16),
                  label: const Text('Add Items',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: RosTheme.primary),
                    foregroundColor: RosTheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Settle & Mark Paid
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isProcessing
                      ? null
                      : () => _settlePayment('CASH'),
                  icon: _isProcessing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_rounded, size: 16),
                  label: Text(
                    _isProcessing ? 'Settling...' : 'Settle & Paid',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w800),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.secondary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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

// ── Table Status Manage Bottom Sheet (for Cleaning / Reserved / Blocked) ──────

class _TableStatusManageSheet extends StatefulWidget {
  final RestaurantTable table;
  final VoidCallback onStatusChanged;

  const _TableStatusManageSheet({
    required this.table,
    required this.onStatusChanged,
  });

  @override
  State<_TableStatusManageSheet> createState() =>
      _TableStatusManageSheetState();
}

class _TableStatusManageSheetState extends State<_TableStatusManageSheet> {
  bool _loading = false;

  Future<void> _updateStatus(BuildContext context, WidgetRef ref, String status) async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/tables/${widget.table.id}', data: {'status': status});
      widget.onStatusChanged();
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Table ${widget.table.name} status updated to $status'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) => Padding(
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
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.table.name,
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      'Current status: ${widget.table.status}',
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: _loading
                    ? null
                    : () => _updateStatus(context, ref, 'AVAILABLE'),
                icon: const Icon(Icons.check_circle_rounded),
                label: const Text('Mark as Available & Clean'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.statusAvailable,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton.icon(
                onPressed: _loading
                    ? null
                    : () => _updateStatus(context, ref, 'CLEANING'),
                icon: const Icon(Icons.cleaning_services_rounded),
                label: const Text('Mark as Needs Cleaning'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: RosTheme.statusCleaning,
                  side: const BorderSide(color: RosTheme.statusCleaning),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton.icon(
                onPressed: _loading
                    ? null
                    : () => _updateStatus(
                        context,
                        ref,
                        widget.table.status == 'BLOCKED'
                            ? 'AVAILABLE'
                            : 'BLOCKED'),
                icon: Icon(widget.table.status == 'BLOCKED'
                    ? Icons.lock_open_rounded
                    : Icons.block_rounded),
                label: Text(widget.table.status == 'BLOCKED'
                    ? 'Unblock Table'
                    : 'Block Table'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: RosTheme.textMuted,
                  side: const BorderSide(color: RosTheme.bgBorder),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Table Selection Sheet for New Order ──────────────────────────────────────

class _TableSelectionSheet extends ConsumerStatefulWidget {
  const _TableSelectionSheet();

  @override
  ConsumerState<_TableSelectionSheet> createState() =>
      _TableSelectionSheetState();
}

class _TableSelectionSheetState extends ConsumerState<_TableSelectionSheet> {
  String? _selectedFloorId;
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final tablesAsync = ref.watch(tablesProvider);
    final floorsAsync = ref.watch(floorsProvider);
    final viewInsets = MediaQuery.of(context).viewInsets;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, viewInsets.bottom + 20),
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
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Select Table for Order',
                    style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Choose a dining table or start direct takeaway',
                    style: TextStyle(
                      color: RosTheme.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Option: Direct Takeaway
          GestureDetector(
            onTap: () {
              HapticFeedback.mediumImpact();
              ref.read(cartProvider.notifier).setTable(null);
              ref.read(cartProvider.notifier).setOrderType('TAKEAWAY');
              Navigator.pop(context);
              context.go('/pos');
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: RosTheme.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: RosTheme.primary.withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Row(
                children: [
                  Icon(Icons.takeout_dining_rounded,
                      color: Colors.white, size: 22),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Direct Takeaway / Delivery',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 1),
                        Text(
                          'Quick counter order without dining table',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_rounded,
                      color: Colors.white, size: 18),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Search Field
          TextField(
            onChanged: (v) =>
                setState(() => _searchQuery = v.trim().toLowerCase()),
            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Search tables (e.g. T-1, Rooftop, VIP)...',
              hintStyle:
                  const TextStyle(color: RosTheme.textMuted, fontSize: 12),
              filled: true,
              fillColor: RosTheme.bgElevated,
              prefixIcon: const Icon(Icons.search_rounded,
                  color: RosTheme.textMuted, size: 18),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.bgBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.bgBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.primary),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Floor filter
          floorsAsync.when(
            data: (floors) {
              if (floors.isEmpty) return const SizedBox.shrink();
              return Container(
                height: 38,
                margin: const EdgeInsets.only(bottom: 10),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildFloorFilterPill(
                        'All Floors',
                        _selectedFloorId == null,
                        () => setState(() => _selectedFloorId = null)),
                    ...floors.map((f) => _buildFloorFilterPill(
                          f.name,
                          _selectedFloorId == f.id,
                          () => setState(() => _selectedFloorId = f.id),
                        )),
                  ],
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),

          // Tables Grid
          Expanded(
            child: tablesAsync.when(
              data: (tables) {
                var filtered = tables.where((t) {
                  if (_selectedFloorId != null &&
                      t.floorId != _selectedFloorId) {
                    return false;
                  }
                  if (_searchQuery.isNotEmpty &&
                      !t.name.toLowerCase().contains(_searchQuery)) {
                    return false;
                  }
                  return true;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No matching tables found',
                        style: TextStyle(
                            color: RosTheme.textMuted, fontSize: 13),
                      ),
                    ),
                  );
                }

                return GridView.builder(
                  padding: const EdgeInsets.only(top: 4, bottom: 12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 1.6,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (context, i) {
                    final table = filtered[i];
                    final isAvailable = table.status == 'AVAILABLE';
                    final isOccupied = table.status == 'OCCUPIED';

                    Color statusColor = RosTheme.statusAvailable;
                    if (isOccupied) statusColor = RosTheme.statusOccupied;
                    if (table.status == 'RESERVED') {
                      statusColor = RosTheme.statusReserved;
                    }
                    if (table.status == 'CLEANING') {
                      statusColor = RosTheme.statusCleaning;
                    }

                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        ref.read(cartProvider.notifier).setTable(table.id);
                        ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                        Navigator.pop(context);
                        context.go('/pos');
                      },
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: RosTheme.bgElevated,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isAvailable
                                ? RosTheme.statusAvailable
                                    .withValues(alpha: 0.4)
                                : isOccupied
                                    ? RosTheme.statusOccupied
                                        .withValues(alpha: 0.4)
                                    : RosTheme.bgBorder,
                            width: (isAvailable || isOccupied) ? 1.2 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    table.name,
                                    style: const TextStyle(
                                      color: RosTheme.textPrimary,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    table.status.replaceAll('_', ' '),
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.people_outline_rounded,
                                        size: 13, color: RosTheme.textMuted),
                                    const SizedBox(width: 3),
                                    Text(
                                      '${table.capacity} seats',
                                      style: const TextStyle(
                                        color: RosTheme.textMuted,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                                const Icon(Icons.arrow_forward_ios_rounded,
                                    size: 11, color: RosTheme.primary),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: RosTheme.primary),
              ),
              error: (err, _) => Center(
                child: Text('Error loading tables: $err',
                    style: const TextStyle(
                        color: RosTheme.danger, fontSize: 12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloorFilterPill(
      String label, bool selected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? RosTheme.primary : RosTheme.bgElevated,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? RosTheme.primary : RosTheme.bgBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : RosTheme.textSecondary,
              fontSize: 11.5,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
