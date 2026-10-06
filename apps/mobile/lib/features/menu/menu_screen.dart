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
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
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
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update mode: $e'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(posMenuProvider);
    final activeModeAsync = ref.watch(activeMenuModeProvider);
    final activeMode = activeModeAsync.valueOrNull?['mode']?.toString() ?? 'ALL';

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
                IconButton(
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 20),
                  tooltip: 'Festive Menus',
                  onPressed: () => _showFestiveMenusSheet(context),
                ),
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
                              onRefresh: () async => ref.invalidate(posMenuProvider),
                              child: ListView.builder(
                                padding: const EdgeInsets.all(14),
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

  Widget _buildDishCard(MenuItem item) {
    final isVeg = item.foodType == 'VEG' || item.foodType == 'VEGAN';
    final price = item.basePrice;

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
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
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
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
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
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, idx) {
                          final menu = menus[idx];
                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: RosTheme.bgElevated,
                              borderRadius: BorderRadius.zero,
                              border: Border.all(
                                color: menu.isActive ? RosTheme.accent.withValues(alpha: 0.4) : RosTheme.bgBorder,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: RosTheme.accent.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.zero,
                                  ),
                                  child: const Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 18),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        menu.name,
                                        style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w700),
                                      ),
                                      Text(
                                        'Occasion: ${menu.occasion}',
                                        style: const TextStyle(color: RosTheme.accent, fontSize: 11, fontWeight: FontWeight.w600),
                                      ),
                                      if (menu.startDate != null || menu.endDate != null)
                                        Text(
                                          '${menu.startDate ?? 'Now'} to ${menu.endDate ?? 'Ongoing'}',
                                          style: const TextStyle(color: RosTheme.textMuted, fontSize: 10),
                                        ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline_rounded, color: RosTheme.danger, size: 18),
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        backgroundColor: RosTheme.bgCard,
                                        title: const Text('Delete Special Menu?'),
                                        content: Text('Are you sure you want to delete ${menu.name}?'),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                                          ElevatedButton(
                                            onPressed: () => Navigator.pop(c, true),
                                            style: ElevatedButton.styleFrom(backgroundColor: RosTheme.danger),
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
                                ),
                              ],
                            ),
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

  void _showCreateSpecialMenuDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final occasionCtrl = TextEditingController(text: 'Festival Special');
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        title: const Row(
          children: [
            Icon(Icons.celebration_rounded, color: RosTheme.accent, size: 20),
            SizedBox(width: 8),
            Text('Create Festive Menu', style: TextStyle(color: RosTheme.textPrimary, fontSize: 16)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Menu Name (e.g. Diwali Grand Feast)',
                  hintText: 'Enter festive menu name',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: occasionCtrl,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Occasion / Festival',
                  hintText: 'Diwali, Eid, Christmas, Puja, etc.',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Description (Optional)',
                  hintText: 'Special menu curated for the festival',
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              if (name.isEmpty) return;
              try {
                final api = ref.read(apiClientProvider);
                await api.post('/menu/special-menus', data: {
                  'name': name,
                  'occasion': occasionCtrl.text.trim(),
                  'description': descCtrl.text.trim(),
                  'isActive': true,
                });
                ref.invalidate(specialMenusProvider);
                ref.invalidate(posMenuProvider);
                if (ctx.mounted) Navigator.pop(ctx);
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger));
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: RosTheme.accent, foregroundColor: Colors.black),
            child: const Text('Create'),
          ),
        ],
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
                          decoration: const InputDecoration(labelText: 'Category'),
                          items: categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name, style: const TextStyle(fontSize: 12)))).toList(),
                          onChanged: (val) => setModalState(() => selectedCategoryId = val),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedFoodType,
                          dropdownColor: RosTheme.bgElevated,
                          decoration: const InputDecoration(labelText: 'Type'),
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
                            decoration: const InputDecoration(labelText: 'Half Price (₹)', prefixText: '₹ '),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: fullPriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(labelText: 'Full Price (₹)', prefixText: '₹ '),
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
                            decoration: const InputDecoration(labelText: 'Small (₹)', prefixText: '₹ '),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: TextField(
                            controller: mediumPriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(labelText: 'Medium (₹)', prefixText: '₹ '),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: TextField(
                            controller: largePriceCtrl,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                            decoration: const InputDecoration(labelText: 'Large (₹)', prefixText: '₹ '),
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
                              SnackBar(content: Text('Save error: $e'), backgroundColor: RosTheme.danger),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: RosTheme.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
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
