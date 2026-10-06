// =============================================================================
// Menu Catalog Screen — Special Festive Menus, Active Mode, Food Codes & S/M/L Variants
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

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
            behavior: SnackBarBehavior.floating,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
        );
      }
    }
  }

  Future<void> _setActiveMode(String mode, {String? activeSpecialMenuId}) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/menu/active-mode', data: {
        'mode': mode,
        if (activeSpecialMenuId != null) 'activeSpecialMenuId': activeSpecialMenuId,
      });
      ref.invalidate(activeMenuModeProvider);
      ref.invalidate(posMenuProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Active menu mode updated to: ${mode.replaceAll('_', ' ')}'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update mode: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(posMenuProvider);
    final activeModeAsync = ref.watch(activeMenuModeProvider);
    final activeMode = activeModeAsync.valueOrNull?['mode']?.toString() ?? 'ALL';
    final specialMenus = ref.watch(specialMenusProvider).valueOrNull ?? [];

    return Scaffold(
      backgroundColor: RosTheme.bg,
      body: Column(
        children: [
          // ── Active Menu Mode Switcher & Quick Actions Bar ──────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: const BoxDecoration(
              color: RosTheme.bgElevated,
              border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
            ),
            child: Row(
              children: [
                const Icon(Icons.tune_rounded, size: 16, color: RosTheme.textMuted),
                const SizedBox(width: 8),
                const Text(
                  'Mode:',
                  style: TextStyle(color: RosTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w700),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildModePill('ALL', '🔥 All Live', activeMode),
                        const SizedBox(width: 6),
                        _buildModePill('MAIN_ONLY', '🌟 Main Only', activeMode),
                        const SizedBox(width: 6),
                        _buildModePill('SPECIAL_ONLY', '🎉 Festive Only', activeMode),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Festive Menus
                ElevatedButton.icon(
                  onPressed: () => _showFestiveMenusSheet(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.accent.withValues(alpha: 0.15),
                    foregroundColor: RosTheme.accent,
                    elevation: 0,
                    side: const BorderSide(color: RosTheme.accent, width: 1),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  ),
                  icon: const Icon(Icons.celebration_rounded, size: 15),
                  label: Text(
                    specialMenus.isNotEmpty ? 'Festive (${specialMenus.length})' : 'Festive Menus',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(width: 6),
                // Add New Dish button
                IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.add_circle_outline_rounded, color: RosTheme.secondary, size: 20),
                  tooltip: 'Add Dish',
                  onPressed: () => _showAddOrEditDishDialog(context),
                ),
              ],
            ),
          ),

          // ── Main Content ──────────────────────────────────────────────
          Expanded(
            child: menuAsync.when(
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
                        const SizedBox(height: 6),
                        const Text('Dishes added to this restaurant will appear here.',
                            style: TextStyle(color: RosTheme.textMuted, fontSize: 13)),
                        const SizedBox(height: 18),
                        ElevatedButton.icon(
                          onPressed: () => _showAddOrEditDishDialog(context),
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('Add First Dish'),
                          style: ElevatedButton.styleFrom(
                            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                          ),
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
                        padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
                        child: TextField(
                          onChanged: (v) => setState(() => _search = v.toLowerCase()),
                          style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'Search dishes by name or code (e.g. CB, 001, Biryani)...',
                            prefixIcon: const Icon(Icons.search_rounded, color: RosTheme.textMuted, size: 18),
                            contentPadding: const EdgeInsets.symmetric(vertical: 8),
                            border: const OutlineInputBorder(borderRadius: BorderRadius.zero),
                            enabledBorder: const OutlineInputBorder(
                              borderRadius: BorderRadius.zero,
                              borderSide: BorderSide(color: RosTheme.bgBorder),
                            ),
                            focusedBorder: const OutlineInputBorder(
                              borderRadius: BorderRadius.zero,
                              borderSide: BorderSide(color: RosTheme.primary),
                            ),
                            suffixIcon: _search.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear_rounded, color: RosTheme.textMuted, size: 16),
                                    onPressed: () => setState(() => _search = ''),
                                  )
                                : null,
                          ),
                        ),
                      ),

                      // Food Type Filter Chips
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        child: Row(
                          children: [
                            _buildFoodTypeChip('ALL', 'All'),
                            const SizedBox(width: 6),
                            _buildFoodTypeChip('VEG', 'Veg 🟢'),
                            const SizedBox(width: 6),
                            _buildFoodTypeChip('NON_VEG', 'Non-Veg 🔴'),
                            const SizedBox(width: 6),
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
                              if (_search.isNotEmpty) {
                                final q = _search.toLowerCase();
                                final matchesName = item.name.toLowerCase().contains(q);
                                final matchesLetter = item.letterCode.toLowerCase().contains(q);
                                final matchesNum = item.itemNumber?.contains(q) ?? false;
                                if (!matchesName && !matchesLetter && !matchesNum) return false;
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
                              onRefresh: () async {
                                ref.invalidate(posMenuProvider);
                                ref.invalidate(specialMenusProvider);
                              },
                              child: ListView.builder(
                                padding: const EdgeInsets.all(14),
                                itemCount: filtered.length,
                                itemBuilder: (ctx, i) => _buildDishCard(filtered[i], specialMenus),
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
                      onPressed: () {
                        ref.invalidate(posMenuProvider);
                        ref.invalidate(specialMenusProvider);
                      },
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModePill(String mode, String label, String currentMode) {
    final isSelected = currentMode == mode;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        _setActiveMode(mode);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? RosTheme.primary.withValues(alpha: 0.2) : RosTheme.bgCard,
          borderRadius: BorderRadius.zero,
          border: Border.all(
            color: isSelected ? RosTheme.primary : RosTheme.bgBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? RosTheme.primary : RosTheme.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
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
          color: isSelected ? RosTheme.primary.withValues(alpha: 0.15) : RosTheme.bgElevated,
          borderRadius: BorderRadius.zero,
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

  Widget _buildDishCard(MenuItem item, List<SpecialMenu> specialMenus) {
    final isVeg = item.foodType == 'VEG' || item.foodType == 'VEGAN';
    final price = item.basePrice;
    final matchingSpecialMenus = specialMenus.where((sm) => sm.items.any((si) => si.itemId == item.id)).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.zero,
        border: Border.all(
          color: item.isAvailable ? RosTheme.bgBorder : RosTheme.danger.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
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
                  borderRadius: BorderRadius.zero,
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
              const SizedBox(width: 10),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.name,
                            style: TextStyle(
                              color: item.isAvailable ? RosTheme.textPrimary : RosTheme.textMuted,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              decoration: item.isAvailable ? null : TextDecoration.lineThrough,
                            ),
                          ),
                        ),
                        // Auto-applied Food Code Badge (e.g. CB • #001)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: RosTheme.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.zero,
                            border: Border.all(color: RosTheme.primary.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            item.itemCode ?? '${item.letterCode} • #${item.itemNumber ?? '001'}',
                            style: const TextStyle(
                              color: RosTheme.primary,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
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
                              borderRadius: BorderRadius.zero,
                              border: Border.all(color: RosTheme.bgBorder),
                            ),
                            child: Text(
                              '${v.name}: ₹${v.price.toStringAsFixed(0)}',
                              style: const TextStyle(color: RosTheme.secondary, fontSize: 10.5, fontWeight: FontWeight.w700),
                            ),
                          );
                        }).toList(),
                      )
                    else
                      Text(
                        '₹${price.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: RosTheme.secondary,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // In stock / 86 switch & edit button
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_note_rounded, size: 20, color: RosTheme.textMuted),
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Edit Dish & Pricing',
                    onPressed: () => _showAddOrEditDishDialog(context, existingItem: item),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: item.isAvailable
                          ? RosTheme.secondary.withValues(alpha: 0.12)
                          : RosTheme.danger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.zero,
                    ),
                    child: Text(
                      item.isAvailable ? 'In Stock' : '86\'d',
                      style: TextStyle(
                        color: item.isAvailable ? RosTheme.secondary : RosTheme.danger,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Transform.scale(
                    scale: 0.75,
                    child: Switch(
                      value: item.isAvailable,
                      activeThumbColor: RosTheme.secondary,
                      onChanged: (_) => _toggleAvailability(item),
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Festive badges and + Add to Festive Menu Button Row
          const SizedBox(height: 8),
          const Divider(height: 1, color: RosTheme.bgBorder),
          const SizedBox(height: 6),
          Row(
            children: [
              // + Festive Action Button
              InkWell(
                onTap: () => _showAddToFestiveBottomSheet(context, item),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: matchingSpecialMenus.isNotEmpty
                        ? RosTheme.accent.withValues(alpha: 0.15)
                        : RosTheme.bgElevated,
                    borderRadius: BorderRadius.zero,
                    border: Border.all(
                      color: matchingSpecialMenus.isNotEmpty ? RosTheme.accent : RosTheme.bgBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.celebration_rounded,
                        size: 13,
                        color: matchingSpecialMenus.isNotEmpty ? RosTheme.accent : RosTheme.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        matchingSpecialMenus.isNotEmpty
                            ? 'Festive Config (${matchingSpecialMenus.length})'
                            : '+ Festive Menu',
                        style: TextStyle(
                          color: matchingSpecialMenus.isNotEmpty ? RosTheme.accent : RosTheme.textSecondary,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Show Badges for active festive menus
              if (matchingSpecialMenus.isNotEmpty)
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: matchingSpecialMenus.map((sm) {
                        final config = sm.items.firstWhere((si) => si.itemId == item.id);
                        String priceBadge = '';
                        if (config.customPrice != null) {
                          priceBadge = '₹${config.customPrice!.toStringAsFixed(0)}';
                        } else if (config.variants.isNotEmpty) {
                          priceBadge = '₹${config.variants.first.price.toStringAsFixed(0)}+';
                        } else {
                          priceBadge = 'Live';
                        }
                        return GestureDetector(
                          onTap: () => _showAddToFestiveBottomSheet(context, item),
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: RosTheme.accent.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.zero,
                              border: Border.all(color: RosTheme.accent.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '🎉 ${sm.name}: $priceBadge',
                                  style: const TextStyle(color: RosTheme.accent, fontSize: 10, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Flyout Bottom Sheet: Add Dish to Festive Menu ───────────────────────────

  void _showAddToFestiveBottomSheet(BuildContext context, MenuItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => Consumer(
        builder: (context, ref, _) {
          final specialMenus = ref.watch(specialMenusProvider).valueOrNull ?? [];

          return StatefulBuilder(
            builder: (context, setSheetState) {
              if (specialMenus.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.celebration_rounded, size: 48, color: RosTheme.accent),
                      const SizedBox(height: 12),
                      const Text(
                        'No Festive Menus Created Yet',
                        style: TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Create a festive / special occasion menu first (e.g. Diwali Feast, Eid Special) to add this dish with custom festive pricing.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: RosTheme.textMuted, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _showCreateSpecialMenuDialog(context);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: RosTheme.accent,
                          foregroundColor: Colors.black,
                          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        ),
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Create Festive Menu Now', style: TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                );
              }

              return _AddToFestiveSheetContent(
                item: item,
                specialMenus: specialMenus,
                onClose: () => Navigator.pop(ctx),
              );
            },
          );
        },
      ),
    );
  }

  // ── Festive & Occasion Menus Sheet ──────────────────────────────────────────

  void _showFestiveMenusSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => Consumer(
        builder: (context, ref, _) {
          final specialMenusAsync = ref.watch(specialMenusProvider);
          return Container(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: RosTheme.textMuted.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.zero,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Festive & Special Menus',
                          style: TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _showCreateSpecialMenuDialog(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: RosTheme.accent,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text('Create Menu', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: RosTheme.bgBorder),
                const SizedBox(height: 8),

                Expanded(
                  child: specialMenusAsync.when(
                    data: (menus) {
                      if (menus.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.festival_rounded, size: 48, color: RosTheme.textMuted),
                              const SizedBox(height: 10),
                              const Text('No festive menus created yet', style: TextStyle(color: RosTheme.textSecondary)),
                              const SizedBox(height: 6),
                              const Text('Create special menus for Diwali, Eid, Christmas, or Puja specials.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                            ],
                          ),
                        );
                      }

                      return ListView.separated(
                        itemCount: menus.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, idx) {
                          final menu = menus[idx];
                          return _SpecialMenuCard(
                            menu: menu,
                            onEdit: () {
                              Navigator.pop(ctx);
                              _showCreateSpecialMenuDialog(context, editMenu: menu);
                            },
                            onToggleActive: () async {
                              try {
                                final api = ref.read(apiClientProvider);
                                await api.patch('/menu/special-menus/${menu.id}', data: {
                                  'isActive': !menu.isActive,
                                });
                                ref.invalidate(specialMenusProvider);
                                ref.invalidate(posMenuProvider);
                              } catch (_) {}
                            },
                            onDelete: () async {
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (c) => AlertDialog(
                                  backgroundColor: RosTheme.bgCard,
                                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                  title: const Text('Delete Special Menu?'),
                                  content: Text('Are you sure you want to delete ${menu.name}?'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                                    ElevatedButton(
                                      onPressed: () => Navigator.pop(c, true),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: RosTheme.danger,
                                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                      ),
                                      child: const Text('Delete'),
                                    ),
                                  ],
                                ),
                              );
                              if (confirm == true) {
                                try {
                                  final api = ref.read(apiClientProvider);
                                  await api.delete('/menu/special-menus/${menu.id}');
                                  ref.invalidate(specialMenusProvider);
                                  ref.invalidate(posMenuProvider);
                                } catch (_) {}
                              }
                            },
                          );
                        },
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator(color: RosTheme.accent)),
                    error: (e, _) => Center(child: Text('Failed to load: $e', style: const TextStyle(color: RosTheme.danger))),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Create or Edit Special Menu Modal with Full Dish Importer ───────────────

  void _showCreateSpecialMenuDialog(BuildContext context, {SpecialMenu? editMenu}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => _CreateOrEditSpecialMenuSheet(
        editMenu: editMenu,
        onClose: () => Navigator.pop(ctx),
      ),
    );
  }

  // ── Add or Edit Dish Dialog (Single vs Half/Full vs S/M/L vs Custom) ────────

  void _showAddOrEditDishDialog(BuildContext context, {MenuItem? existingItem}) {
    final isEditing = existingItem != null;
    final nameCtrl = TextEditingController(text: existingItem?.name ?? '');
    final descCtrl = TextEditingController(text: existingItem?.description ?? '');
    String selectedFoodType = existingItem?.foodType ?? 'VEG';
    String selectedSpice = existingItem?.spiceLevel ?? 'MEDIUM';
    String? selectedCategoryId = existingItem?.categoryId;

    // Portion modes: SINGLE | HALF_FULL | S_M_L | CUSTOM
    String portionMode = 'SINGLE';
    if (isEditing && existingItem.variants.length > 1) {
      final names = existingItem.variants.map((v) => v.name.toLowerCase()).toList();
      if (names.contains('small') && names.contains('medium') && names.contains('large')) {
        portionMode = 'S_M_L';
      } else if (names.contains('half') && names.contains('full')) {
        portionMode = 'HALF_FULL';
      } else {
        portionMode = 'CUSTOM';
      }
    }

    // Pricing controllers
    final singlePriceCtrl = TextEditingController(
      text: existingItem?.basePrice.toStringAsFixed(0) ?? '250',
    );
    final halfPriceCtrl = TextEditingController(
      text: existingItem?.variants.firstWhere((v) => v.name.toLowerCase() == 'half', orElse: () => const MenuItemVariant(id: '', name: '', price: 150, cost: 0, isActive: true, sortOrder: 0)).price.toStringAsFixed(0) ?? '150',
    );
    final fullPriceCtrl = TextEditingController(
      text: existingItem?.variants.firstWhere((v) => v.name.toLowerCase() == 'full', orElse: () => const MenuItemVariant(id: '', name: '', price: 280, cost: 0, isActive: true, sortOrder: 0)).price.toStringAsFixed(0) ?? '280',
    );
    final smallPriceCtrl = TextEditingController(
      text: existingItem?.variants.firstWhere((v) => v.name.toLowerCase() == 'small', orElse: () => const MenuItemVariant(id: '', name: '', price: 120, cost: 0, isActive: true, sortOrder: 0)).price.toStringAsFixed(0) ?? '120',
    );
    final mediumPriceCtrl = TextEditingController(
      text: existingItem?.variants.firstWhere((v) => v.name.toLowerCase() == 'medium', orElse: () => const MenuItemVariant(id: '', name: '', price: 220, cost: 0, isActive: true, sortOrder: 0)).price.toStringAsFixed(0) ?? '220',
    );
    final largePriceCtrl = TextEditingController(
      text: existingItem?.variants.firstWhere((v) => v.name.toLowerCase() == 'large', orElse: () => const MenuItemVariant(id: '', name: '', price: 320, cost: 0, isActive: true, sortOrder: 0)).price.toStringAsFixed(0) ?? '320',
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final categories = ref.watch(menuCategoriesProvider).valueOrNull ?? [];
          if (selectedCategoryId == null && categories.isNotEmpty) {
            selectedCategoryId = categories.first.id;
          }

          final previewLetterCode = generateFoodLetterCode(nameCtrl.text);

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              left: 18,
              right: 18,
              top: 14,
            ),
            child: SingleChildScrollView(
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
                        borderRadius: BorderRadius.zero,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isEditing ? 'Edit Dish & Portions' : 'Add New Food Item',
                        style: const TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      // Live Letter Code preview pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: RosTheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.zero,
                          border: Border.all(color: RosTheme.primary.withValues(alpha: 0.35)),
                        ),
                        child: Text(
                          'Code: $previewLetterCode',
                          style: const TextStyle(color: RosTheme.primary, fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Dish Name
                  TextField(
                    controller: nameCtrl,
                    onChanged: (_) => setModalState(() {}),
                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14),
                    decoration: const InputDecoration(
                      labelText: 'Dish Name (e.g. Chicken Hakka Noodles)',
                      hintText: 'Enter food name',
                      border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Category & Food Type row
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedCategoryId,
                          dropdownColor: RosTheme.bgElevated,
                          decoration: const InputDecoration(
                            labelText: 'Category',
                            border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                          ),
                          items: categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name, style: const TextStyle(fontSize: 12)))).toList(),
                          onChanged: (val) => setModalState(() => selectedCategoryId = val),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedFoodType,
                          dropdownColor: RosTheme.bgElevated,
                          decoration: const InputDecoration(
                            labelText: 'Type',
                            border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'VEG', child: Text('🟢 Veg', style: TextStyle(fontSize: 12))),
                            DropdownMenuItem(value: 'NON_VEG', child: Text('🔴 Non-Veg', style: TextStyle(fontSize: 12))),
                            DropdownMenuItem(value: 'EGG', child: Text('🟡 Egg', style: TextStyle(fontSize: 12))),
                            DropdownMenuItem(value: 'VEGAN', child: Text('🌱 Vegan', style: TextStyle(fontSize: 12))),
                          ],
                          onChanged: (val) => setModalState(() => selectedFoodType = val ?? 'VEG'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Portion & Variant Selection Mode (Single, Half/Full, Small/Med/Large)
                  const Text(
                    'Portion & Variant Pricing Model:',
                    style: TextStyle(color: RosTheme.textSecondary, fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildPortionPill('SINGLE', 'Single Portion', portionMode, () => setModalState(() => portionMode = 'SINGLE')),
                        const SizedBox(width: 6),
                        _buildPortionPill('HALF_FULL', 'Half / Full', portionMode, () => setModalState(() => portionMode = 'HALF_FULL')),
                        const SizedBox(width: 6),
                        _buildPortionPill('S_M_L', 'Small / Med / Large', portionMode, () => setModalState(() => portionMode = 'S_M_L')),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Dynamic Price Inputs based on Portion Mode
                  if (portionMode == 'SINGLE') ...[
                    TextField(
                      controller: singlePriceCtrl,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: 'Standard Portion Price (₹)',
                        prefixText: '₹ ',
                        border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                      ),
                    ),
                  ] else if (portionMode == 'HALF_FULL') ...[
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: halfPriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Half Price (₹)',
                              prefixText: '₹ ',
                              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: fullPriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Full Price (₹)',
                              prefixText: '₹ ',
                              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else if (portionMode == 'S_M_L') ...[
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: smallPriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Small (₹)',
                              prefixText: '₹ ',
                              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: TextField(
                            controller: mediumPriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Medium (₹)',
                              prefixText: '₹ ',
                              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: TextField(
                            controller: largePriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Large (₹)',
                              prefixText: '₹ ',
                              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 12),
                  TextField(
                    controller: descCtrl,
                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12),
                    decoration: const InputDecoration(
                      labelText: 'Dish Description (Optional)',
                      hintText: 'Fresh aromatic ingredients...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 18),

                  // Save Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        final name = nameCtrl.text.trim();
                        if (name.isEmpty) return;

                        // Build variants array
                        List<Map<String, dynamic>> variantsData = [];
                        if (portionMode == 'SINGLE') {
                          variantsData = [
                            {'name': 'Regular', 'price': double.tryParse(singlePriceCtrl.text) ?? 200, 'isActive': true, 'sortOrder': 1},
                          ];
                        } else if (portionMode == 'HALF_FULL') {
                          variantsData = [
                            {'name': 'Half', 'price': double.tryParse(halfPriceCtrl.text) ?? 150, 'isActive': true, 'sortOrder': 1},
                            {'name': 'Full', 'price': double.tryParse(fullPriceCtrl.text) ?? 280, 'isActive': true, 'sortOrder': 2},
                          ];
                        } else if (portionMode == 'S_M_L') {
                          variantsData = [
                            {'name': 'Small', 'price': double.tryParse(smallPriceCtrl.text) ?? 120, 'isActive': true, 'sortOrder': 1},
                            {'name': 'Medium', 'price': double.tryParse(mediumPriceCtrl.text) ?? 220, 'isActive': true, 'sortOrder': 2},
                            {'name': 'Large', 'price': double.tryParse(largePriceCtrl.text) ?? 320, 'isActive': true, 'sortOrder': 3},
                          ];
                        }

                        try {
                          final api = ref.read(apiClientProvider);
                          final payload = {
                            'name': name,
                            'categoryId': selectedCategoryId,
                            'foodType': selectedFoodType,
                            'spiceLevel': selectedSpice,
                            'description': descCtrl.text.trim(),
                            'variants': variantsData,
                            'isAvailable': true,
                            'isActive': true,
                          };

                          if (isEditing) {
                            await api.patch('/menu/items/${existingItem.id}', data: payload);
                          } else {
                            await api.post('/menu/items', data: payload);
                          }

                          ref.invalidate(posMenuProvider);
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          if (ctx.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Save error: $e'),
                                backgroundColor: RosTheme.danger,
                                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: RosTheme.primary,
                        foregroundColor: Colors.white,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                      ),
                      child: Text(
                        isEditing ? 'Save Changes' : 'Create Food Item',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPortionPill(String mode, String label, String currentMode, VoidCallback onTap) {
    final isSelected = currentMode == mode;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? RosTheme.secondary.withValues(alpha: 0.15) : RosTheme.bgElevated,
          borderRadius: BorderRadius.zero,
          border: Border.all(
            color: isSelected ? RosTheme.secondary : RosTheme.bgBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? RosTheme.secondary : RosTheme.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Bottom Sheet Content: Add / Modify Single Dish in a Festive Menu
// =============================================================================

class _AddToFestiveSheetContent extends ConsumerStatefulWidget {
  final MenuItem item;
  final List<SpecialMenu> specialMenus;
  final VoidCallback onClose;

  const _AddToFestiveSheetContent({
    required this.item,
    required this.specialMenus,
    required this.onClose,
  });

  @override
  ConsumerState<_AddToFestiveSheetContent> createState() => _AddToFestiveSheetContentState();
}

class _AddToFestiveSheetContentState extends ConsumerState<_AddToFestiveSheetContent> {
  late String _selectedSpecialMenuId;
  late TextEditingController _customPriceCtrl;
  final Map<String, TextEditingController> _variantCtrls = {};
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    // Default to first active menu or first menu
    final activeMenu = widget.specialMenus.firstWhere(
      (m) => m.isActive,
      orElse: () => widget.specialMenus.first,
    );
    _selectedSpecialMenuId = activeMenu.id;
    _initPrices();
  }

  void _initPrices() {
    final currentMenu = widget.specialMenus.firstWhere((m) => m.id == _selectedSpecialMenuId);
    final existingConfig = currentMenu.items.where((i) => i.itemId == widget.item.id).firstOrNull;

    final initialBase = existingConfig?.customPrice ?? widget.item.basePrice;
    _customPriceCtrl = TextEditingController(text: initialBase.toStringAsFixed(0));

    for (final v in widget.item.variants) {
      final existingVar = existingConfig?.variants.where((ev) => ev.variantId == v.id || ev.name.toLowerCase() == v.name.toLowerCase()).firstOrNull;
      final p = existingVar?.price ?? v.price;
      _variantCtrls[v.id.isNotEmpty ? v.id : v.name] = TextEditingController(text: p.toStringAsFixed(0));
    }
  }

  void _applyPercentageMultiplier(double multiplier) {
    setState(() {
      final newBase = (widget.item.basePrice * multiplier).roundToDouble();
      _customPriceCtrl.text = newBase.toStringAsFixed(0);

      for (final v in widget.item.variants) {
        final key = v.id.isNotEmpty ? v.id : v.name;
        final newVarPrice = (v.price * multiplier).roundToDouble();
        _variantCtrls[key]?.text = newVarPrice.toStringAsFixed(0);
      }
    });
  }

  @override
  void dispose() {
    _customPriceCtrl.dispose();
    for (final ctrl in _variantCtrls.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentMenu = widget.specialMenus.firstWhere(
      (m) => m.id == _selectedSpecialMenuId,
      orElse: () => widget.specialMenus.first,
    );
    final isAlreadyAdded = currentMenu.items.any((i) => i.itemId == widget.item.id);

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      padding: EdgeInsets.only(
        left: 18,
        right: 18,
        top: 14,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
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
                  borderRadius: BorderRadius.zero,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Add "${widget.item.name}" to Festive Menu',
                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Item Code: ${widget.item.itemCode ?? widget.item.letterCode} • Standard Base: ₹${widget.item.basePrice.toStringAsFixed(0)}',
              style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
            ),
            const SizedBox(height: 14),

            // Select Target Festive Menu
            const Text(
              'Select Target Festive Menu:',
              style: TextStyle(color: RosTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: widget.specialMenus.map((sm) {
                  final isSelected = sm.id == _selectedSpecialMenuId;
                  final smHasItem = sm.items.any((i) => i.itemId == widget.item.id);

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedSpecialMenuId = sm.id;
                        _initPrices();
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? RosTheme.accent.withValues(alpha: 0.18) : RosTheme.bgElevated,
                        borderRadius: BorderRadius.zero,
                        border: Border.all(
                          color: isSelected ? RosTheme.accent : RosTheme.bgBorder,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Text(
                            sm.name,
                            style: TextStyle(
                              color: isSelected ? RosTheme.accent : RosTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            ),
                          ),
                          if (smHasItem) ...[
                            const SizedBox(width: 4),
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(color: RosTheme.secondary, shape: BoxShape.circle),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),

            // Quick Pricing Multipliers
            const Text(
              'Quick Festive Pricing Adjustments:',
              style: TextStyle(color: RosTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _buildQuickMultiplierChip('Same Price', 1.0),
                _buildQuickMultiplierChip('10% OFF', 0.9),
                _buildQuickMultiplierChip('20% OFF', 0.8),
                _buildQuickMultiplierChip('+10% Premium', 1.1),
                _buildQuickMultiplierChip('+20% Festive', 1.2),
              ],
            ),
            const SizedBox(height: 14),

            // Pricing Form: Single base price OR Variant prices
            if (widget.item.variants.length <= 1) ...[
              TextField(
                controller: _customPriceCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14),
                decoration: const InputDecoration(
                  labelText: 'Custom Festive Price (₹)',
                  prefixText: '₹ ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: BorderSide(color: RosTheme.bgBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.zero,
                    borderSide: BorderSide(color: RosTheme.accent),
                  ),
                ),
              ),
            ] else ...[
              const Text(
                'Custom Festive Variant Pricing:',
                style: TextStyle(color: RosTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              ...widget.item.variants.map((v) {
                final key = v.id.isNotEmpty ? v.id : v.name;
                final ctrl = _variantCtrls[key] ?? TextEditingController(text: v.price.toStringAsFixed(0));
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: Text(
                          '${v.name} (Base: ₹${v.price.toStringAsFixed(0)}):',
                          style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: ctrl,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                          decoration: const InputDecoration(
                            labelText: 'Festive (₹)',
                            prefixText: '₹ ',
                            contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.zero,
                              borderSide: BorderSide(color: RosTheme.bgBorder),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.zero,
                              borderSide: BorderSide(color: RosTheme.accent),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],

            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                if (isAlreadyAdded) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isSaving
                          ? null
                          : () async {
                              setState(() => _isSaving = true);
                              try {
                                final api = ref.read(apiClientProvider);
                                await api.delete('/menu/special-menus/$_selectedSpecialMenuId/items/${widget.item.id}');
                                ref.invalidate(specialMenusProvider);
                                ref.invalidate(posMenuProvider);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Removed ${widget.item.name} from ${currentMenu.name}'),
                                      backgroundColor: RosTheme.warning,
                                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                    ),
                                  );
                                  widget.onClose();
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Error: $e'),
                                      backgroundColor: RosTheme.danger,
                                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                    ),
                                  );
                                }
                              } finally {
                                if (mounted) setState(() => _isSaving = false);
                              }
                            },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: RosTheme.danger,
                        side: const BorderSide(color: RosTheme.danger),
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: const Icon(Icons.remove_circle_outline_rounded, size: 16),
                      label: const Text('Remove', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _isSaving
                        ? null
                        : () async {
                            setState(() => _isSaving = true);
                            try {
                              final api = ref.read(apiClientProvider);

                              // Build variants list
                              List<Map<String, dynamic>> variantsPayload = [];
                              if (widget.item.variants.length > 1) {
                                for (final v in widget.item.variants) {
                                  final key = v.id.isNotEmpty ? v.id : v.name;
                                  final p = double.tryParse(_variantCtrls[key]?.text ?? '') ?? v.price;
                                  variantsPayload.add({
                                    if (v.id.isNotEmpty) 'variantId': v.id,
                                    'name': v.name,
                                    'price': p,
                                  });
                                }
                              }

                              final customPrice = double.tryParse(_customPriceCtrl.text) ?? widget.item.basePrice;

                              await api.post('/menu/special-menus/$_selectedSpecialMenuId/items', data: {
                                'itemId': widget.item.id,
                                'customPrice': customPrice,
                                if (variantsPayload.isNotEmpty) 'variants': variantsPayload,
                                'isActive': true,
                              });

                              ref.invalidate(specialMenusProvider);
                              ref.invalidate(posMenuProvider);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Saved "${widget.item.name}" into ${currentMenu.name}!'),
                                    backgroundColor: RosTheme.secondary,
                                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                  ),
                                );
                                widget.onClose();
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Error: $e'),
                                    backgroundColor: RosTheme.danger,
                                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                  ),
                                );
                              }
                            } finally {
                              if (mounted) setState(() => _isSaving = false);
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.accent,
                      foregroundColor: Colors.black,
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    icon: _isSaving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                        : const Icon(Icons.check_rounded, size: 18),
                    label: Text(
                      isAlreadyAdded ? 'Update Festive Price' : 'Add to Festive Menu',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
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

  Widget _buildQuickMultiplierChip(String label, double multiplier) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
      backgroundColor: RosTheme.bgElevated,
      side: const BorderSide(color: RosTheme.bgBorder),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      onPressed: () => _applyPercentageMultiplier(multiplier),
    );
  }
}

// =============================================================================
// Special Menu Card in Festive Menus Sheet
// =============================================================================

class _SpecialMenuCard extends StatefulWidget {
  final SpecialMenu menu;
  final VoidCallback onEdit;
  final VoidCallback onToggleActive;
  final VoidCallback onDelete;

  const _SpecialMenuCard({
    required this.menu,
    required this.onEdit,
    required this.onToggleActive,
    required this.onDelete,
  });

  @override
  State<_SpecialMenuCard> createState() => _SpecialMenuCardState();
}

class _SpecialMenuCardState extends State<_SpecialMenuCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final menu = widget.menu;

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgElevated,
        borderRadius: BorderRadius.zero,
        border: Border.all(
          color: menu.isActive ? RosTheme.accent.withValues(alpha: 0.4) : RosTheme.bgBorder,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: RosTheme.accent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: const Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              menu.name,
                              style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w800),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: menu.isActive ? RosTheme.secondary.withValues(alpha: 0.15) : RosTheme.textMuted.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.zero,
                            ),
                            child: Text(
                              menu.isActive ? 'ACTIVE' : 'INACTIVE',
                              style: TextStyle(
                                color: menu.isActive ? RosTheme.secondary : RosTheme.textMuted,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Occasion: ${menu.occasion} • ${menu.items.length} dishes included',
                        style: const TextStyle(color: RosTheme.accent, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                      if (menu.description.isNotEmpty)
                        Text(
                          menu.description,
                          style: const TextStyle(color: RosTheme.textMuted, fontSize: 10.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: RosTheme.bgBorder),
          // Actions bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: () => setState(() => _expanded = !_expanded),
                      icon: Icon(_expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded, size: 16, color: RosTheme.textSecondary),
                      label: Text(
                        _expanded ? 'Hide Dishes' : 'View Dishes (${menu.items.length})',
                        style: const TextStyle(color: RosTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: widget.onEdit,
                      icon: const Icon(Icons.edit_note_rounded, size: 16, color: RosTheme.primary),
                      label: const Text('Edit / Import', style: TextStyle(color: RosTheme.primary, fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        menu.isActive ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                        color: menu.isActive ? RosTheme.secondary : RosTheme.textMuted,
                        size: 24,
                      ),
                      tooltip: 'Toggle Active',
                      onPressed: widget.onToggleActive,
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded, color: RosTheme.danger, size: 18),
                      tooltip: 'Delete Menu',
                      onPressed: widget.onDelete,
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Expanded dish lineup viewer
          if (_expanded)
            Consumer(
              builder: (context, ref, _) {
                final allMenuCats = ref.watch(posMenuProvider).valueOrNull ?? [];
                final allDishesMap = <String, MenuItem>{};
                for (final cat in allMenuCats) {
                  for (final item in cat.items) {
                    allDishesMap[item.id] = item;
                  }
                }

                if (menu.items.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    color: RosTheme.bgCard,
                    child: const Text(
                      'No dishes added to this festive menu yet. Click "Edit / Import" to import all main menu dishes.',
                      style: TextStyle(color: RosTheme.textMuted, fontSize: 11.5),
                      textAlign: TextAlign.center,
                    ),
                  );
                }

                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  color: RosTheme.bgCard,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Festive Dish Lineup & Pricing:',
                        style: TextStyle(color: RosTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      ...menu.items.map((itemConfig) {
                        final dish = allDishesMap[itemConfig.itemId];
                        final dishName = dish?.name ?? 'Dish ID: ${itemConfig.itemId}';
                        final basePrice = dish?.basePrice ?? 0;
                        final customPrice = itemConfig.customPrice;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          decoration: BoxDecoration(
                            color: RosTheme.bgElevated,
                            borderRadius: BorderRadius.zero,
                            border: Border.all(color: RosTheme.bgBorder),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      dishName,
                                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w700),
                                    ),
                                    if (itemConfig.variants.isNotEmpty)
                                      Wrap(
                                        spacing: 4,
                                        children: itemConfig.variants.map((v) {
                                          return Text(
                                            '${v.name}: ₹${v.price.toStringAsFixed(0)}',
                                            style: const TextStyle(color: RosTheme.accent, fontSize: 10, fontWeight: FontWeight.w700),
                                          );
                                        }).toList(),
                                      )
                                    else
                                      Text(
                                        'Standard Base: ₹${basePrice.toStringAsFixed(0)} → Festive: ₹${(customPrice ?? basePrice).toStringAsFixed(0)}',
                                        style: const TextStyle(color: RosTheme.accent, fontSize: 10.5, fontWeight: FontWeight.w600),
                                      ),
                                  ],
                                ),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                icon: const Icon(Icons.remove_circle_outline_rounded, color: RosTheme.danger, size: 16),
                                tooltip: 'Remove from menu',
                                onPressed: () async {
                                  try {
                                    final api = ref.read(apiClientProvider);
                                    await api.delete('/menu/special-menus/${menu.id}/items/${itemConfig.itemId}');
                                    ref.invalidate(specialMenusProvider);
                                    ref.invalidate(posMenuProvider);
                                  } catch (_) {}
                                },
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// Bottom Sheet: Create or Edit Special Menu with "Import All Dishes" Functionality
// =============================================================================

class _CreateOrEditSpecialMenuSheet extends ConsumerStatefulWidget {
  final SpecialMenu? editMenu;
  final VoidCallback onClose;

  const _CreateOrEditSpecialMenuSheet({
    this.editMenu,
    required this.onClose,
  });

  @override
  ConsumerState<_CreateOrEditSpecialMenuSheet> createState() => _CreateOrEditSpecialMenuSheetState();
}

class _CreateOrEditSpecialMenuSheetState extends ConsumerState<_CreateOrEditSpecialMenuSheet> {
  late TextEditingController _nameCtrl;
  late TextEditingController _occasionCtrl;
  late TextEditingController _descCtrl;
  String _dishFilter = '';

  // Configured items: Map of itemId -> item configuration
  final Map<String, _LocalFestiveItemConfig> _selectedItems = {};
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final m = widget.editMenu;
    _nameCtrl = TextEditingController(text: m?.name ?? '');
    _occasionCtrl = TextEditingController(text: m?.occasion ?? 'Diwali Special');
    _descCtrl = TextEditingController(text: m?.description ?? '');

    if (m != null) {
      for (final i in m.items) {
        _selectedItems[i.itemId] = _LocalFestiveItemConfig(
          itemId: i.itemId,
          customPrice: i.customPrice,
          variants: i.variants.map((v) => SpecialMenuVariantConfig(variantId: v.variantId, name: v.name, price: v.price)).toList(),
          included: true,
        );
      }
    }
  }

  void _importAllMainMenuDishes(List<MenuCategory> categories, double multiplier) {
    setState(() {
      for (final cat in categories) {
        for (final item in cat.items) {
          final customPrice = (item.basePrice * multiplier).roundToDouble();
          final variants = item.variants.map((v) {
            final p = (v.price * multiplier).roundToDouble();
            return SpecialMenuVariantConfig(variantId: v.id, name: v.name, price: p);
          }).toList();

          _selectedItems[item.id] = _LocalFestiveItemConfig(
            itemId: item.id,
            customPrice: customPrice,
            variants: variants,
            included: true,
          );
        }
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Imported ${_selectedItems.length} dishes with ${multiplier == 1.0 ? 'Standard' : '${((multiplier - 1.0) * 100).toStringAsFixed(0)}% adjusted'} pricing!'),
        backgroundColor: RosTheme.secondary,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _occasionCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.editMenu != null;
    final allCats = ref.watch(posMenuProvider).valueOrNull ?? [];
    final allDishes = allCats.expand((c) => c.items).toList();

    final filteredDishes = allDishes.where((d) {
      if (_dishFilter.isEmpty) return true;
      final q = _dishFilter.toLowerCase();
      return d.name.toLowerCase().contains(q) || d.letterCode.toLowerCase().contains(q);
    }).toList();

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 14,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: RosTheme.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.zero,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    isEditing ? 'Edit Festive Menu' : 'Create Special Occasion Menu',
                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: widget.onClose,
              ),
            ],
          ),
          const Divider(color: RosTheme.bgBorder),

          Expanded(
            child: ListView(
              children: [
                // Name & Occasion Fields
                TextField(
                  controller: _nameCtrl,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Menu Name (e.g. Diwali Grand Celebration, Eid Feast)',
                    hintText: 'Enter festive menu name',
                    border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _occasionCtrl,
                        style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                        decoration: const InputDecoration(
                          labelText: 'Occasion',
                          hintText: 'Diwali, Eid, Christmas, etc.',
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _descCtrl,
                        style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                        decoration: const InputDecoration(
                          labelText: 'Description (Optional)',
                          hintText: 'Festival lineup',
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // ── Import All Dishes Quick Action Banner ───────────────────
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: RosTheme.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.zero,
                    border: Border.all(color: RosTheme.accent.withValues(alpha: 0.35)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.bolt_rounded, color: RosTheme.accent, size: 18),
                          SizedBox(width: 6),
                          Text(
                            'One-Click Main Menu Dish Importer',
                            style: TextStyle(color: RosTheme.accent, fontSize: 12.5, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Import all dishes with their variants from the main menu and apply optional festive price adjustments across all items:',
                        style: TextStyle(color: RosTheme.textSecondary, fontSize: 11),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _importAllMainMenuDishes(allCats, 1.0),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: RosTheme.accent,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                            icon: const Icon(Icons.download_rounded, size: 14),
                            label: const Text('Import All (Standard Price)', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800)),
                          ),
                          OutlinedButton(
                            onPressed: () => _importAllMainMenuDishes(allCats, 0.9),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: RosTheme.accent),
                              foregroundColor: RosTheme.accent,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                            child: const Text('Import with -10% OFF', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                          ),
                          OutlinedButton(
                            onPressed: () => _importAllMainMenuDishes(allCats, 0.8),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: RosTheme.accent),
                              foregroundColor: RosTheme.accent,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                            child: const Text('Import with -20% OFF', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                          ),
                          OutlinedButton(
                            onPressed: () => _importAllMainMenuDishes(allCats, 1.1),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: RosTheme.accent),
                              foregroundColor: RosTheme.accent,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                            child: const Text('Import with +10% Surcharge', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Dish Selection & Custom Pricing Section Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Included Dishes (${_selectedItems.values.where((i) => i.included).length} selected):',
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w800),
                    ),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () {
                            setState(() {
                              for (final d in allDishes) {
                                _selectedItems[d.id] = _LocalFestiveItemConfig(
                                  itemId: d.id,
                                  customPrice: d.basePrice,
                                  variants: d.variants.map((v) => SpecialMenuVariantConfig(variantId: v.id, name: v.name, price: v.price)).toList(),
                                  included: true,
                                );
                              }
                            });
                          },
                          child: const Text('Select All', style: TextStyle(fontSize: 11)),
                        ),
                        TextButton(
                          onPressed: () => setState(() => _selectedItems.clear()),
                          child: const Text('Deselect All', style: TextStyle(fontSize: 11, color: RosTheme.danger)),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Search Filter for Dish Selection
                TextField(
                  onChanged: (v) => setState(() => _dishFilter = v),
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12),
                  decoration: const InputDecoration(
                    hintText: 'Filter dishes to customize festive prices...',
                    prefixIcon: Icon(Icons.search_rounded, size: 16, color: RosTheme.textMuted),
                    contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                  ),
                ),
                const SizedBox(height: 10),

                // Dish List with Toggle and Custom Pricing Inputs
                ...filteredDishes.map((dish) {
                  final config = _selectedItems[dish.id];
                  final isIncluded = config?.included ?? false;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isIncluded ? RosTheme.accent.withValues(alpha: 0.08) : RosTheme.bgElevated,
                      borderRadius: BorderRadius.zero,
                      border: Border.all(
                        color: isIncluded ? RosTheme.accent.withValues(alpha: 0.4) : RosTheme.bgBorder,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Checkbox(
                              value: isIncluded,
                              activeColor: RosTheme.accent,
                              checkColor: Colors.black,
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    _selectedItems[dish.id] = _LocalFestiveItemConfig(
                                      itemId: dish.id,
                                      customPrice: dish.basePrice,
                                      variants: dish.variants.map((v) => SpecialMenuVariantConfig(variantId: v.id, name: v.name, price: v.price)).toList(),
                                      included: true,
                                    );
                                  } else {
                                    _selectedItems.remove(dish.id);
                                  }
                                });
                              },
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    dish.name,
                                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                                  ),
                                  Text(
                                    'Standard Price: ₹${dish.basePrice.toStringAsFixed(0)}',
                                    style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        // If included, display live festive price inputs
                        if (isIncluded) ...[
                          const SizedBox(height: 6),
                          const Divider(height: 1, color: RosTheme.bgBorder),
                          const SizedBox(height: 6),
                          if (dish.variants.length > 1) ...[
                            const Text(
                              'Festive Variant Pricing:',
                              style: TextStyle(color: RosTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: dish.variants.map((v) {
                                final existingVar = config?.variants.where((ev) => ev.variantId == v.id || ev.name.toLowerCase() == v.name.toLowerCase()).firstOrNull;
                                final currentPrice = existingVar?.price ?? v.price;

                                return SizedBox(
                                  width: 130,
                                  child: TextFormField(
                                    initialValue: currentPrice.toStringAsFixed(0),
                                    keyboardType: TextInputType.number,
                                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12),
                                    decoration: InputDecoration(
                                      labelText: '${v.name} (₹)',
                                      prefixText: '₹ ',
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                      border: const OutlineInputBorder(borderRadius: BorderRadius.zero),
                                    ),
                                    onChanged: (newVal) {
                                      final p = double.tryParse(newVal) ?? v.price;
                                      final updatedVariants = List<SpecialMenuVariantConfig>.from(config?.variants ?? []);
                                      final idx = updatedVariants.indexWhere((ev) => ev.variantId == v.id || ev.name.toLowerCase() == v.name.toLowerCase());
                                      if (idx >= 0) {
                                        updatedVariants[idx] = SpecialMenuVariantConfig(variantId: v.id, name: v.name, price: p);
                                      } else {
                                        updatedVariants.add(SpecialMenuVariantConfig(variantId: v.id, name: v.name, price: p));
                                      }
                                      _selectedItems[dish.id] = _LocalFestiveItemConfig(
                                        itemId: dish.id,
                                        customPrice: config?.customPrice,
                                        variants: updatedVariants,
                                        included: true,
                                      );
                                    },
                                  ),
                                );
                              }).toList(),
                            ),
                          ] else ...[
                            Row(
                              children: [
                                const Text(
                                  'Festive Price:',
                                  style: TextStyle(color: RosTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  width: 120,
                                  child: TextFormField(
                                    initialValue: (config?.customPrice ?? dish.basePrice).toStringAsFixed(0),
                                    keyboardType: TextInputType.number,
                                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 12),
                                    decoration: const InputDecoration(
                                      labelText: 'Festive (₹)',
                                      prefixText: '₹ ',
                                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                                    ),
                                    onChanged: (newVal) {
                                      final p = double.tryParse(newVal) ?? dish.basePrice;
                                      _selectedItems[dish.id] = _LocalFestiveItemConfig(
                                        itemId: dish.id,
                                        customPrice: p,
                                        variants: config?.variants ?? [],
                                        included: true,
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 12),
          // Save Festive Menu Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSaving
                  ? null
                  : () async {
                      final name = _nameCtrl.text.trim();
                      if (name.isEmpty) return;

                      setState(() => _isSaving = true);
                      try {
                        final api = ref.read(apiClientProvider);

                        // Build items list payload
                        final itemsPayload = _selectedItems.values.where((i) => i.included).map((i) {
                          return {
                            'itemId': i.itemId,
                            if (i.customPrice != null) 'customPrice': i.customPrice,
                            'isActive': true,
                            if (i.variants.isNotEmpty)
                              'variants': i.variants.map((v) => {
                                if (v.variantId != null) 'variantId': v.variantId,
                                'name': v.name,
                                'price': v.price,
                              }).toList(),
                          };
                        }).toList();

                        final menuData = {
                          'name': name,
                          'occasion': _occasionCtrl.text.trim(),
                          'description': _descCtrl.text.trim(),
                          'isActive': true,
                          'items': itemsPayload,
                        };

                        if (isEditing) {
                          await api.patch('/menu/special-menus/${widget.editMenu!.id}', data: menuData);
                        } else {
                          await api.post('/menu/special-menus', data: menuData);
                        }

                        ref.invalidate(specialMenusProvider);
                        ref.invalidate(posMenuProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Festive menu "$name" saved with ${itemsPayload.length} dishes!'),
                              backgroundColor: RosTheme.secondary,
                              behavior: SnackBarBehavior.floating,
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                          );
                          widget.onClose();
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Save error: $e'),
                              backgroundColor: RosTheme.danger,
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                          );
                        }
                      } finally {
                        if (mounted) setState(() => _isSaving = false);
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: RosTheme.accent,
                foregroundColor: Colors.black,
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              ),
              child: _isSaving
                  ? const CircularProgressIndicator(color: Colors.black)
                  : Text(
                      isEditing ? 'Save Festive Menu Changes' : 'Create Festive Menu',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LocalFestiveItemConfig {
  final String itemId;
  final double? customPrice;
  final List<SpecialMenuVariantConfig> variants;
  final bool included;

  _LocalFestiveItemConfig({
    required this.itemId,
    this.customPrice,
    this.variants = const [],
    this.included = true,
  });
}
