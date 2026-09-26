// =============================================================================
// Tables Screen — Floor plan view with real-time status
// =============================================================================

import 'package:flutter/material.dart';
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
                    Text('Failed to load tables',
                        style: const TextStyle(color: RosTheme.textSecondary)),
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
        onPressed: () => context.go('/pos'),
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
              selectedColor: RosTheme.primary.withOpacity(0.15),
              checkmarkColor: RosTheme.primary,
              labelStyle: TextStyle(
                color: selected ? RosTheme.primary : RosTheme.textSecondary,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
              side: BorderSide(
                color: selected ? RosTheme.primary.withOpacity(0.5) : RosTheme.bgBorder,
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
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.grid_view_rounded,
                color: RosTheme.textMuted, size: 48),
            const SizedBox(height: 12),
            const Text('No tables found',
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
                ? _color.withOpacity(0.5)
                : RosTheme.bgBorder,
            width: table.status == 'OCCUPIED' ? 1.5 : 1,
          ),
          boxShadow: table.status == 'OCCUPIED'
              ? [BoxShadow(color: _color.withOpacity(0.1), blurRadius: 12)]
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
                    color: _color.withOpacity(0.1),
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
                color: _color.withOpacity(0.1),
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
