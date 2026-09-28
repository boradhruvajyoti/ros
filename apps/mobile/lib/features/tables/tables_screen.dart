// =============================================================================
// Tables Screen — Tables & Orders Command Center
// Matching the Mobile Web Table Grid & Running Order Logic Exactly
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

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
      final price = item.unitPrice > 0 ? item.unitPrice : (qty > 0 ? item.lineTotal / qty : 0.0);
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

        final totalQty = existing.totalQuantity + qty;
        final totalAmount = existing.totalAmount + lineTot;
        final effectiveUnitPrice = existing.unitPrice > 0
            ? existing.unitPrice
            : (price > 0 ? price : (totalQty > 0 ? totalAmount / totalQty : 0.0));

        map[key] = MergedOrderItem(
          key: key,
          menuItemId: existing.menuItemId,
          variantId: existing.variantId,
          name: existing.name,
          variantName: existing.variantName,
          totalQuantity: totalQty,
          unitPrice: effectiveUnitPrice,
          totalAmount: totalAmount,
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
    _showTableInfoSheet(table, activeOrder);
  }

  void _showTableInfoSheet(RestaurantTable table, Order? activeOrder) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _TableInfoBottomSheet(
        table: table,
        activeOrder: activeOrder,
        onRefresh: () {
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
    final isOccupied = table.status == 'OCCUPIED' || activeOrder != null;
    final isAvailable = table.status == 'AVAILABLE' && activeOrder == null;

    // Elapsed minutes
    int elapsedMinutes = 0;
    if (activeOrder != null) {
      elapsedMinutes =
          DateTime.now().difference(activeOrder!.createdAt).inMinutes;
    }

    // Calculate accurate card total
    final activeItemsSum = activeOrder?.items.fold<double>(
          0.0,
          (sum, it) {
            if (it.status == 'CANCELLED' || it.status == 'VOIDED') return sum;
            final line = it.lineTotal > 0 ? it.lineTotal : (it.quantity * it.unitPrice);
            return sum + line;
          },
        ) ?? 0.0;
    final cardSubtotal = (activeOrder?.subtotal != null && activeOrder!.subtotal > 0)
        ? activeOrder!.subtotal
        : activeItemsSum;
    final cardTax = activeOrder?.taxAmount ?? 0.0;
    final cardDiscount = activeOrder?.discountAmount ?? 0.0;
    final cardTotal = (activeOrder?.total != null && activeOrder!.total > 0)
        ? activeOrder!.total
        : (cardSubtotal + cardTax - cardDiscount).clamp(0.0, double.infinity);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isOccupied
              ? RosTheme.danger.withValues(alpha: 0.08)
              : RosTheme.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isOccupied ? RosTheme.danger : _statusColor.withValues(alpha: 0.4),
            width: isOccupied ? 2.2 : 1.2,
          ),
          boxShadow: isOccupied
              ? [
                  BoxShadow(
                    color: RosTheme.danger.withValues(alpha: 0.25),
                    blurRadius: 12,
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
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: (isOccupied ? RosTheme.danger : _statusColor).withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: (isOccupied ? RosTheme.danger : _statusColor).withValues(alpha: 0.5),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: isOccupied ? RosTheme.danger : _statusColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4.5),
                      Text(
                        isOccupied ? 'ACTIVE DINING' : _statusLabel,
                        style: TextStyle(
                          color: isOccupied ? RosTheme.danger : _statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.3,
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
                    '₹${cardTotal.toStringAsFixed(0)}',
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

// ── Unified Table Info & Active Order Bottom Sheet (Matching Web Version) ────

class _TableInfoBottomSheet extends ConsumerStatefulWidget {
  final RestaurantTable table;
  final Order? activeOrder;
  final VoidCallback onRefresh;

  const _TableInfoBottomSheet({
    required this.table,
    this.activeOrder,
    required this.onRefresh,
  });

  @override
  ConsumerState<_TableInfoBottomSheet> createState() =>
      _TableInfoBottomSheetState();
}

class _TableInfoBottomSheetState extends ConsumerState<_TableInfoBottomSheet> {
  bool _isProcessing = false;
  late RestaurantTable _currentTable;
  Order? _currentOrder;

  @override
  void initState() {
    super.initState();
    _currentTable = widget.table;
    _currentOrder = widget.activeOrder;
    _fetchFreshOrderDetails();
  }

  Future<void> _fetchFreshOrderDetails() async {
    final orderId = _currentOrder?.id ?? _currentTable.activeOrder?.id;
    if (orderId == null || orderId.isEmpty) return;
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/orders/$orderId');
      if (res.data != null && mounted) {
        final orderData = res.data is Map && res.data['data'] != null ? res.data['data'] : res.data;
        if (orderData is Map<String, dynamic>) {
          setState(() {
            _currentOrder = Order.fromJson(orderData);
          });
        }
      }
    } catch (_) {}
  }

  Color get _statusColor => switch (_currentTable.status) {
        'AVAILABLE' => RosTheme.statusAvailable,
        'OCCUPIED' => RosTheme.statusOccupied,
        'RESERVED' => RosTheme.statusReserved,
        'CLEANING' => RosTheme.statusCleaning,
        'BLOCKED' => const Color(0xFF71717A),
        _ => RosTheme.textMuted,
      };

  String get _statusLabel => switch (_currentTable.status) {
        'AVAILABLE' => 'Available',
        'OCCUPIED' => 'Dining / Occupied',
        'RESERVED' => 'Reserved',
        'CLEANING' => 'Needs Cleaning',
        'BLOCKED' => 'Blocked',
        _ => _currentTable.status,
      };

  Future<void> _updateTableStatus(String newStatus) async {
    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/tables/${_currentTable.id}', data: {'status': newStatus});

      setState(() {
        _currentTable = RestaurantTable(
          id: _currentTable.id,
          name: _currentTable.name,
          capacity: _currentTable.capacity,
          shape: _currentTable.shape,
          status: newStatus,
          floorId: _currentTable.floorId,
          sectionId: _currentTable.sectionId,
          posX: _currentTable.posX,
          posY: _currentTable.posY,
          activeOrder: _currentTable.activeOrder,
        );
      });

      widget.onRefresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✓ Table ${_currentTable.name} status set to $newStatus'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _settlePayment(String method) async {
    if (_currentOrder == null) return;
    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);

      final itemsSum = _currentOrder!.items.fold<double>(
        0.0,
        (sum, it) {
          if (it.status == 'CANCELLED' || it.status == 'VOIDED') return sum;
          return sum + (it.lineTotal > 0 ? it.lineTotal : (it.quantity * it.unitPrice));
        },
      );
      final sub = itemsSum > 0 ? itemsSum : _currentOrder!.subtotal;
      final tax = _currentOrder!.taxAmount;
      final disc = _currentOrder!.discountAmount;
      final calcTotal = (sub + tax - disc).clamp(0.0, double.infinity);
      final settleAmount = (_currentOrder!.total > 0 && _currentOrder!.total >= (sub - disc))
          ? _currentOrder!.total
          : calcTotal;

      // Post Payment (backend handles payment, order status PAID, and table release)
      await api.post('/payments', data: {
        'orderId': _currentOrder!.id,
        'method': method,
        'amount': settleAmount,
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

  Future<void> _cancelItem(String itemId, String dishName) async {
    final reasonController =
        TextEditingController(text: 'Guest requested cancellation');
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(
          'Cancel "$dishName"?',
          style: const TextStyle(
            color: RosTheme.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        content: TextField(
          controller: reasonController,
          style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
          decoration: InputDecoration(
            labelText: 'Reason for cancellation',
            labelStyle: const TextStyle(color: RosTheme.textMuted),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Dish',
                style: TextStyle(color: RosTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Cancel Dish'),
          ),
        ],
      ),
    );

    if (shouldCancel == true && _currentOrder != null) {
      try {
        final api = ref.read(apiClientProvider);
        await api.post('/orders/${_currentOrder!.id}/items/$itemId/cancel',
            data: {'reason': reasonController.text.trim()});
        widget.onRefresh();
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✓ "$dishName" cancelled from bill & KDS'),
              backgroundColor: RosTheme.secondary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to cancel dish: $e'),
              backgroundColor: RosTheme.danger,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  Future<void> _cancelEntireOrder() async {
    if (_currentOrder == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(
          'Cancel Order #${_currentOrder!.orderNumber}?',
          style: const TextStyle(
            color: RosTheme.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        content: const Text(
          'This will void the entire running order and release the dining table.',
          style: TextStyle(color: RosTheme.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Go Back',
                style: TextStyle(color: RosTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirm Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isProcessing = true);
      try {
        final api = ref.read(apiClientProvider);
        await api.patch('/orders/${_currentOrder!.id}/status',
            data: {'status': 'CANCELLED'});
        await api.patch('/tables/${_currentTable.id}',
            data: {'status': 'AVAILABLE'});
        widget.onRefresh();
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✓ Order cancelled & table marked available'),
              backgroundColor: RosTheme.secondary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to cancel order: $e'),
              backgroundColor: RosTheme.danger,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } finally {
        if (mounted) setState(() => _isProcessing = false);
      }
    }
  }

  void _showQrDialog() {
    final qrUrl = 'https://ros.app/order/${_currentTable.id}';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Table ${_currentTable.name} QR',
              style: const TextStyle(
                color: RosTheme.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
              onPressed: () => Navigator.pop(ctx),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: QrImageView(
                data: qrUrl,
                version: QrVersions.auto,
                size: 190,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Scan to order from Table ${_currentTable.name}',
              style: const TextStyle(
                color: RosTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openPaymentMethodDialog() {
    if (_currentOrder == null) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
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
                    const Text(
                      'Settle Bill & Mark Paid',
                      style: TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Table ${_currentTable.name} · Total ₹${_currentOrder!.total.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: RosTheme.secondary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded,
                      color: RosTheme.textMuted),
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
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    final isOccupied = _currentTable.status == 'OCCUPIED' && _currentOrder != null;

    // Check KOT progress & can pay rules exactly matching web
    final activeKots =
        (_currentOrder?.kots ?? []).where((k) => k.status != 'CANCELLED').toList();
    final totalKots = activeKots.length;
    final servedKots = activeKots.where((k) => k.status == 'SERVED').length;
    final allKotsServed = totalKots > 0 && servedKots == totalKots;
    final orderStatus = _currentOrder?.status ?? 'DRAFT';
    final canPay = ['SERVED', 'BILLED', 'PARTIALLY_PAID'].contains(orderStatus) ||
        (totalKots > 0 && allKotsServed);

    final mergedItems = _currentOrder != null
        ? MergedOrderItem.mergeItems(_currentOrder!.items)
        : <MergedOrderItem>[];
    final elapsedMinutes = _currentOrder != null
        ? DateTime.now().difference(_currentOrder!.createdAt).inMinutes
        : 0;

    final calculatedSubtotal = mergedItems.fold<double>(
      0.0,
      (sum, item) => sum + item.totalAmount,
    );
    final orderSubtotal = _currentOrder?.subtotal ?? 0.0;
    final displaySubtotal = calculatedSubtotal > 0 ? calculatedSubtotal : orderSubtotal;
    final taxAmount = _currentOrder?.taxAmount ?? 0.0;
    final discountAmount = _currentOrder?.discountAmount ?? 0.0;
    final orderTotal = _currentOrder?.total ?? 0.0;
    final displayTotal = (orderTotal > 0 && orderTotal >= (displaySubtotal - discountAmount))
        ? orderTotal
        : (displaySubtotal + taxAmount - discountAmount).clamp(0.0, double.infinity);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      padding: EdgeInsets.fromLTRB(18, 14, 18, viewInsets.bottom + 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Drag Handle ──
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

          // ── Header: Table Badge, Floor, Capacity & Quick Actions ──
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: _statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _statusColor.withValues(alpha: 0.5),
                        width: 1.2,
                      ),
                    ),
                    child: Text(
                      _currentTable.name,
                      style: TextStyle(
                        color: _statusColor,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _currentOrder != null
                            ? '#${_currentOrder!.orderNumber}'
                            : 'Table Details',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        '${_currentTable.capacity} Seats · $_statusLabel',
                        style: TextStyle(
                          color: _statusColor,
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
                    icon: const Icon(Icons.qr_code_2_rounded,
                        color: RosTheme.textSecondary, size: 22),
                    tooltip: 'Table QR',
                    onPressed: _showQrDialog,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded,
                        color: RosTheme.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),

          // ── Status Switcher Strip ──
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildStatusChip('AVAILABLE', '🟢 Free', RosTheme.statusAvailable),
                const SizedBox(width: 6),
                _buildStatusChip('OCCUPIED', '🔴 Dining', RosTheme.statusOccupied),
                const SizedBox(width: 6),
                _buildStatusChip('RESERVED', '🔵 Reserved', RosTheme.statusReserved),
                const SizedBox(width: 6),
                _buildStatusChip('CLEANING', '🟡 Cleaning', RosTheme.statusCleaning),
                const SizedBox(width: 6),
                _buildStatusChip('BLOCKED', '⚪ Blocked', const Color(0xFF71717A)),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // ── Conditional Body: Running Order Details vs Table Operations ──
          if (isOccupied) ...[
            // Status & KDS progress banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        '#${_currentOrder!.orderNumber}',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: RosTheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _currentOrder!.status.replaceAll('_', ' '),
                          style: const TextStyle(
                            color: RosTheme.primary,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    totalKots > 0
                        ? '🍳 $servedKots/$totalKots KOTs Served · ${elapsedMinutes}m'
                        : '⏱️ Ordered ${elapsedMinutes}m ago',
                    style: const TextStyle(
                      color: RosTheme.textMuted,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Merged Billable Items List Box
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
            const SizedBox(height: 4),

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
                            horizontal: 12, vertical: 6),
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
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Quantity Badge
                                Container(
                                  width: 24,
                                  height: 24,
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
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Title, Modifiers & Notes
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        fullTitle,
                                        style: const TextStyle(
                                          color: RosTheme.textPrimary,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      if (item.modifiers.isNotEmpty)
                                        Text(
                                          '+ ${item.modifiers.join(', ')}',
                                          style: const TextStyle(
                                            color: Color(0xFF818CF8),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      if (item.notes.isNotEmpty)
                                        Text(
                                          'Note: ${item.notes.join(', ')}',
                                          style: const TextStyle(
                                            color: RosTheme.danger,
                                            fontSize: 10,
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),

                                // Line Total & Rate
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '₹${item.totalAmount.toStringAsFixed(0)}',
                                      style: const TextStyle(
                                        color: RosTheme.textPrimary,
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w800,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                    Text(
                                      '${item.totalQuantity} × ₹${item.unitPrice.toStringAsFixed(0)}',
                                      style: const TextStyle(
                                        color: RosTheme.textMuted,
                                        fontSize: 9.5,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ],
                                ),

                                // Partial Cancel Item
                                if (item.itemIds.isNotEmpty) ...[
                                  const SizedBox(width: 6),
                                  InkWell(
                                    onTap: () => _cancelItem(
                                        item.itemIds.first, item.name),
                                    child: const Padding(
                                      padding: EdgeInsets.all(3),
                                      child: Icon(Icons.cancel_outlined,
                                          size: 15, color: RosTheme.danger),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ),

            const SizedBox(height: 10),

            // Financial Summary
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal',
                          style: TextStyle(
                              color: RosTheme.textMuted, fontSize: 11)),
                      Text(
                        '₹${displaySubtotal.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  if (taxAmount > 0) ...[
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Taxes & GST',
                            style: TextStyle(
                                color: RosTheme.textMuted, fontSize: 11)),
                        Text(
                          '+₹${taxAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: RosTheme.textPrimary,
                            fontSize: 11.5,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (discountAmount > 0) ...[
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Discount',
                            style: TextStyle(
                                color: RosTheme.secondary, fontSize: 11)),
                        Text(
                          '-₹${discountAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: RosTheme.secondary,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ],
                  const Divider(color: RosTheme.bgBorder, height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Payable',
                        style: TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
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
                ],
              ),
            ),

            const SizedBox(height: 10),

            // ── Primary Actions (Open in POS, Settle & Mark Paid, Cancel Order) ──
            if (!canPay && totalKots > 0)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '⚠️ Kitchen in progress: $servedKots/$totalKots KOTs Served. All KOTs must be marked as SERVED before billing.',
                  style: const TextStyle(
                      color: RosTheme.warning,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
              ),

            Row(
              children: [
                // Open in POS
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.mediumImpact();
                      ref.read(cartProvider.notifier).setTable(_currentTable.id);
                      ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                      Navigator.pop(context);
                      context.go('/pos');
                    },
                    icon: const Icon(Icons.add_shopping_cart_rounded, size: 15),
                    label: const Text('Add Items (POS)',
                        style: TextStyle(
                            fontSize: 11.5, fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      side: const BorderSide(color: RosTheme.primary),
                      foregroundColor: RosTheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Settle & Mark Paid
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing || !canPay
                        ? null
                        : _openPaymentMethodDialog,
                    icon: _isProcessing
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_circle_rounded, size: 15),
                    label: Text(
                      _isProcessing
                          ? 'Settling...'
                          : (canPay ? 'Settle & Paid' : 'Locked (In Kitchen)'),
                      style: const TextStyle(
                          fontSize: 11.5, fontWeight: FontWeight.w800),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: canPay
                          ? RosTheme.secondary
                          : RosTheme.bgElevated,
                      foregroundColor: canPay ? Colors.black : RosTheme.textMuted,
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Cancel Entire Order Button
            SizedBox(
              width: double.infinity,
              height: 38,
              child: TextButton.icon(
                onPressed: _isProcessing ? null : _cancelEntireOrder,
                icon: const Icon(Icons.cancel_outlined,
                    size: 14, color: RosTheme.danger),
                label: const Text(
                  'Cancel Entire Order',
                  style: TextStyle(
                      color: RosTheme.danger,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ] else ...[
            // ── Non-Occupied / Available / Clean / Reserved Options ──
            const SizedBox(height: 8),

            if (_currentTable.status == 'AVAILABLE') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    ref.read(cartProvider.notifier).setTable(_currentTable.id);
                    ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                    Navigator.pop(context);
                    context.go('/pos');
                  },
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                  label: const Text(
                    'Take New Order (Dine-In)',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.secondary,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _updateTableStatus('RESERVED'),
                      icon: const Icon(Icons.bookmark_outline_rounded, size: 15),
                      label: const Text('Reserve Table',
                          style: TextStyle(
                              fontSize: 11.5, fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        foregroundColor: RosTheme.statusReserved,
                        side: const BorderSide(color: RosTheme.statusReserved),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _updateTableStatus('CLEANING'),
                      icon: const Icon(Icons.cleaning_services_rounded, size: 15),
                      label: const Text('Needs Cleaning',
                          style: TextStyle(
                              fontSize: 11.5, fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        foregroundColor: RosTheme.statusCleaning,
                        side: const BorderSide(color: RosTheme.statusCleaning),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (_currentTable.status == 'RESERVED') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    _updateTableStatus('OCCUPIED');
                    ref.read(cartProvider.notifier).setTable(_currentTable.id);
                    ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                    Navigator.pop(context);
                    context.go('/pos');
                  },
                  icon: const Icon(Icons.event_seat_rounded, size: 18),
                  label: const Text(
                    'Seat Guests & Take Order',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.statusReserved,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
                  label: const Text('Release Reservation (Make Free)',
                      style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: RosTheme.statusAvailable,
                    side: const BorderSide(color: RosTheme.statusAvailable),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ] else if (_currentTable.status == 'CLEANING') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.check_circle_rounded, size: 18),
                  label: const Text(
                    'Mark Clean & Ready (Available)',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.statusAvailable,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    ref.read(cartProvider.notifier).setTable(_currentTable.id);
                    ref.read(cartProvider.notifier).setOrderType('DINE_IN');
                    Navigator.pop(context);
                    context.go('/pos');
                  },
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 16),
                  label: const Text('Take Order Directly',
                      style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: RosTheme.primary,
                    side: const BorderSide(color: RosTheme.primary),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ] else if (_currentTable.status == 'BLOCKED') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => _updateTableStatus('AVAILABLE'),
                  icon: const Icon(Icons.lock_open_rounded, size: 18),
                  label: const Text(
                    'Unblock Table (Make Available)',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.statusAvailable,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 10),

            // Standee QR Code Button
            SizedBox(
              width: double.infinity,
              height: 42,
              child: OutlinedButton.icon(
                onPressed: _showQrDialog,
                icon: const Icon(Icons.qr_code_rounded, size: 16),
                label: const Text('View Table QR Standee',
                    style:
                        TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: RosTheme.textSecondary,
                  side: const BorderSide(color: RosTheme.bgBorder),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusChip(String statusKey, String label, Color color) {
    final isCurrent = _currentTable.status == statusKey;
    return GestureDetector(
      onTap: () {
        if (!isCurrent) {
          HapticFeedback.selectionClick();
          _updateTableStatus(statusKey);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isCurrent ? color.withValues(alpha: 0.22) : RosTheme.bgElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isCurrent ? color : RosTheme.bgBorder,
            width: isCurrent ? 1.4 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isCurrent ? color : RosTheme.textMuted,
            fontSize: 11,
            fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
          ),
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
