// =============================================================================
// Menu Catalog Screen — Real-time synced with Riverpod & Backend
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  String _search = '';
  String _selectedFoodType = 'ALL'; // ALL | VEG | NON_VEG | VEGAN

  Future<void> _toggleAvailability(MenuItem item) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/menu/items/${item.id}/availability', data: {
        'isAvailable': !item.isAvailable,
      });
      ref.invalidate(posMenuProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              item.isAvailable
                  ? '${item.name} marked unavailable (86\'d)'
                  : '${item.name} is now available',
            ),
            duration: const Duration(seconds: 2),
            backgroundColor: item.isAvailable ? RosTheme.warning : RosTheme.secondary,
          ),
        );
      }
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
    final menuAsync = ref.watch(posMenuProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Menu Catalog'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Menu',
            onPressed: () => ref.invalidate(posMenuProvider),
          ),
        ],
      ),
      body: menuAsync.when(
        data: (categories) {
          if (categories.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.menu_book_rounded, size: 52, color: RosTheme.textMuted),
                  const SizedBox(height: 12),
                  const Text('No menu items found in database',
                      style: TextStyle(color: RosTheme.textSecondary, fontSize: 16)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => ref.invalidate(posMenuProvider),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Reload Catalog'),
                  ),
                ],
              ),
            );
          }

          return DefaultTabController(
            key: ValueKey('menu_cat_${categories.length}_${categories.map((c) => c.id).join()}'),
            length: categories.length,
            child: Column(
              children: [
                // Search bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v.toLowerCase()),
                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Search dishes, drinks, desserts...',
                      prefixIcon: const Icon(Icons.search_rounded, color: RosTheme.textMuted, size: 20),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, color: RosTheme.textMuted, size: 18),
                              onPressed: () => setState(() => _search = ''),
                            )
                          : null,
                    ),
                  ),
                ),

                // Food Type Filter Chips
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    children: [
                      _buildFoodTypeChip('ALL', 'All'),
                      const SizedBox(width: 8),
                      _buildFoodTypeChip('VEG', 'Veg 🟢'),
                      const SizedBox(width: 8),
                      _buildFoodTypeChip('NON_VEG', 'Non-Veg 🔴'),
                      const SizedBox(width: 8),
                      _buildFoodTypeChip('VEGAN', 'Vegan 🌱'),
                    ],
                  ),
                ),

                // Category Tabs
                TabBar(
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  tabs: categories.map((c) {
                    final count = c.items.length;
                    return Tab(text: count > 0 ? '${c.name} ($count)' : c.name);
                  }).toList(),
                ),

                // Tab Views with items
                Expanded(
                  child: TabBarView(
                    children: categories.map((cat) {
                      final filtered = cat.items.where((item) {
                        if (_search.isNotEmpty && !item.name.toLowerCase().contains(_search)) {
                          return false;
                        }
                        if (_selectedFoodType != 'ALL') {
                          if (_selectedFoodType == 'VEG' && item.foodType != 'VEG') return false;
                          if (_selectedFoodType == 'NON_VEG' && item.foodType != 'NON_VEG') return false;
                          if (_selectedFoodType == 'VEGAN' && item.foodType != 'VEGAN') return false;
                        }
                        return true;
                      }).toList();

                      if (filtered.isEmpty) {
                        return Center(
                          child: Text(
                            _search.isNotEmpty || _selectedFoodType != 'ALL'
                                ? 'No dishes match current filters'
                                : 'No items in this category',
                            style: const TextStyle(color: RosTheme.textMuted),
                          ),
                        );
                      }

                      return RefreshIndicator(
                        onRefresh: () async => ref.invalidate(posMenuProvider),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          itemBuilder: (ctx, i) => _buildDishCard(filtered[i]),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: RosTheme.primary),
        ),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 48, color: RosTheme.textMuted),
              const SizedBox(height: 12),
              Text('Error syncing menu: $err',
                  style: const TextStyle(color: RosTheme.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(posMenuProvider),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFoodTypeChip(String type, String label) {
    final isSelected = _selectedFoodType == type;
    return GestureDetector(
      onTap: () => setState(() => _selectedFoodType = type),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? RosTheme.primary.withOpacity(0.15) : RosTheme.bgElevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? RosTheme.primary : RosTheme.bgBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? RosTheme.primary : RosTheme.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildDishCard(MenuItem item) {
    final isVeg = item.foodType == 'VEG' || item.foodType == 'VEGAN';
    final price = item.basePrice;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: item.isAvailable ? RosTheme.bgBorder : RosTheme.danger.withOpacity(0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Food type icon
          Container(
            margin: const EdgeInsets.only(top: 2),
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              border: Border.all(
                color: isVeg ? RosTheme.secondary : RosTheme.danger,
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(2),
            ),
            child: Center(
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: isVeg ? RosTheme.secondary : RosTheme.danger,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: TextStyle(
                    color: item.isAvailable ? RosTheme.textPrimary : RosTheme.textMuted,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    decoration: item.isAvailable ? null : TextDecoration.lineThrough,
                  ),
                ),
                if (item.description != null && item.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.description!,
                    style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 6),
                if (item.variants.length > 1)
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: item.variants.map((v) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: RosTheme.bgElevated,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: RosTheme.bgBorder),
                        ),
                        child: Text(
                          '${v.name}: ₹${v.price.toStringAsFixed(0)}',
                          style: const TextStyle(color: RosTheme.primary, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      );
                    }).toList(),
                  )
                else
                  Text(
                    '₹${price.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: RosTheme.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // In stock / 86 switch
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: item.isAvailable
                      ? RosTheme.secondary.withOpacity(0.12)
                      : RosTheme.danger.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  item.isAvailable ? 'In Stock' : '86\'d',
                  style: TextStyle(
                    color: item.isAvailable ? RosTheme.secondary : RosTheme.danger,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Transform.scale(
                scale: 0.8,
                child: Switch(
                  value: item.isAvailable,
                  activeColor: RosTheme.secondary,
                  onChanged: (_) => _toggleAvailability(item),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
