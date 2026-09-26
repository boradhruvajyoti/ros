// =============================================================================
// Tables Screen — Floor plan view with real-time status & Table Selection for New Order
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

class TablesScreen extends ConsumerStatefulWidget {
  const TablesScreen({super.key});

  @override
  ConsumerState<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends ConsumerState<TablesScreen>
    with AutomaticKeepAliveClientMixin {
  String? _selectedFloorId;
  String _filterStatus = 'ALL';

  @override
  bool get wantKeepAlive => true;

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

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final tablesAsync = ref.watch(tablesProvider);
    final floorsAsync = ref.watch(floorsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tables'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              ref.invalidate(tablesProvider);
              ref.invalidate(floorsProvider);
            },
          ),
          IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => Scaffold.of(context).openEndDrawer(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Floor filter tabs
          floorsAsync.when(
            data: (floors) => _buildFloorTabs(floors),
            loading: () => const SizedBox(height: 56),
            error: (_, __) => const SizedBox(height: 8),
          ),

          // Status filter chips
          _buildStatusFilter(),

          // Tables grid
          Expanded(
            child: tablesAsync.when(
              data: (tables) => _buildTablesGrid(tables),
              loading: () => const Center(
                child: CircularProgressIndicator(color: RosTheme.primary),
              ),
              error: (err, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wifi_off_rounded,
                        color: RosTheme.textMuted, size: 48),
                    const SizedBox(height: 16),
                    const Text('Failed to load tables',
                        style: TextStyle(color: RosTheme.textSecondary)),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => ref.invalidate(tablesProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _triggerTableSelection,
        icon: const Icon(Icons.add_shopping_cart_rounded),
        label: const Text('New Order'),
      ),
    );
  }

  Widget _buildFloorTabs(List<Floor> floors) {
    if (floors.isEmpty) return const SizedBox(height: 8);
    return Container(
      height: 48,
      margin: const EdgeInsets.only(top: 8),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _FloorChip(
            label: 'All Floors',
            selected: _selectedFloorId == null,
            onTap: () => setState(() => _selectedFloorId = null),
          ),
          ...floors.map((f) => _FloorChip(
            label: f.name,
            selected: _selectedFloorId == f.id,
            onTap: () => setState(() => _selectedFloorId = f.id),
          )),
        ],
      ),
    );
  }

  Widget _buildStatusFilter() {
    const statuses = ['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];
    return Container(
      height: 44,
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: statuses.map((s) {
          final selected = _filterStatus == s;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(s == 'ALL' ? 'All' : s.replaceAll('_', ' ')),
              selected: selected,
              onSelected: (_) => setState(() => _filterStatus = s),
              selectedColor: RosTheme.primary.withValues(alpha: 0.15),
              checkmarkColor: RosTheme.primary,
              labelStyle: TextStyle(
                color: selected ? RosTheme.primary : RosTheme.textSecondary,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
              side: BorderSide(
                color: selected
                    ? RosTheme.primary.withValues(alpha: 0.5)
                    : RosTheme.bgBorder,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTablesGrid(List<RestaurantTable> tables) {
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
            Text('No tables found',
                style: TextStyle(color: RosTheme.textSecondary)),
          ],
        ),
      );
    }

    // Summary bar
    final available = tables.where((t) => t.status == 'AVAILABLE').length;
    final occupied = tables.where((t) => t.status == 'OCCUPIED').length;

    return Column(
      children: [
        _SummaryBar(available: available, occupied: occupied, total: tables.length),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 180,
              mainAxisExtent: 160,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: filtered.length,
            itemBuilder: (context, i) => _TableCard(
              table: filtered[i],
              onTap: () => context.push('/tables/${filtered[i].id}'),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Floor Filter Chip ─────────────────────────────────────────────────────────

class _FloorChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FloorChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
              fontSize: 13,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}

// ── Top Summary Bar ───────────────────────────────────────────────────────────

class _SummaryBar extends StatelessWidget {
  final int available;
  final int occupied;
  final int total;
  const _SummaryBar({required this.available, required this.occupied, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _StatChip(label: 'Total', value: '$total', color: RosTheme.textSecondary),
          _StatChip(label: 'Available', value: '$available', color: RosTheme.statusAvailable),
          _StatChip(label: 'Occupied', value: '$occupied', color: RosTheme.statusOccupied),
          _StatChip(label: 'Reserved', value: '${total - available - occupied}', color: RosTheme.statusReserved),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(
          color: color,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        )),
        Text(label, style: const TextStyle(
          color: RosTheme.textMuted,
          fontSize: 11,
        )),
      ],
    );
  }
}

// ── Table Card ───────────────────────────────────────────────────────────────

class _TableCard extends StatelessWidget {
  final RestaurantTable table;
  final VoidCallback onTap;
  const _TableCard({required this.table, required this.onTap});

  Color get _color => switch (table.status) {
    'AVAILABLE' => RosTheme.statusAvailable,
    'OCCUPIED' => RosTheme.statusOccupied,
    'RESERVED' => RosTheme.statusReserved,
    'CLEANING' => RosTheme.statusCleaning,
    _ => RosTheme.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: RosTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: table.status == 'OCCUPIED'
                ? _color.withValues(alpha: 0.5)
                : RosTheme.bgBorder,
            width: table.status == 'OCCUPIED' ? 1.5 : 1,
          ),
          boxShadow: table.status == 'OCCUPIED'
              ? [BoxShadow(color: _color.withValues(alpha: 0.1), blurRadius: 12)]
              : null,
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    table.status == 'OCCUPIED'
                        ? Icons.people_rounded
                        : Icons.table_restaurant_rounded,
                    color: _color,
                    size: 18,
                  ),
                ),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _color,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              table.name,
              style: const TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${table.capacity} seats',
              style: const TextStyle(
                color: RosTheme.textMuted,
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: _color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                table.status.replaceAll('_', ' '),
                style: TextStyle(
                  color: _color,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (table.status == 'OCCUPIED' && table.activeOrder != null) ...[
              const SizedBox(height: 4),
              Text(
                '₹${table.activeOrder!.total.toStringAsFixed(0)}',
                style: const TextStyle(
                  color: RosTheme.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Interactive Table Selection Sheet for New Order ──────────────────────────

class _TableSelectionSheet extends ConsumerStatefulWidget {
  const _TableSelectionSheet();

  @override
  ConsumerState<_TableSelectionSheet> createState() => _TableSelectionSheetState();
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
          // Drag handle
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

          // Header
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
                    'Choose a table or start a quick takeaway',
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

          // ── Option A: Direct Takeaway / Delivery (No Table Assigned) ──
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
                  Icon(Icons.takeout_dining_rounded, color: Colors.white, size: 22),
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
                  Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Search Field
          TextField(
            onChanged: (v) => setState(() => _searchQuery = v.trim().toLowerCase()),
            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Search tables (e.g. T-1, Rooftop, VIP)...',
              hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
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

          // Floor filter tabs
          floorsAsync.when(
            data: (floors) {
              if (floors.isEmpty) return const SizedBox.shrink();
              return Container(
                height: 38,
                margin: const EdgeInsets.only(bottom: 10),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildFloorFilterPill('All Floors', _selectedFloorId == null,
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

          // ── Tables List Grid ──
          Expanded(
            child: tablesAsync.when(
              data: (tables) {
                var filtered = tables.where((t) {
                  if (_selectedFloorId != null && t.floorId != _selectedFloorId) {
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
                        style: TextStyle(color: RosTheme.textMuted, fontSize: 13),
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
                                ? RosTheme.statusAvailable.withValues(alpha: 0.4)
                                : isOccupied
                                    ? RosTheme.statusOccupied.withValues(alpha: 0.4)
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
                    style: const TextStyle(color: RosTheme.danger, fontSize: 12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloorFilterPill(String label, bool selected, VoidCallback onTap) {
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
