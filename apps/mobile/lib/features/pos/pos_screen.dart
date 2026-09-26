// =============================================================================
// POS Screen — Point of Sale matching Mobile Web layout & logic exactly
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

const Map<String, String> _categoryIcons = {
  'Starters & Kebabs': '🔥',
  'Main Course & Curries': '🍛',
  'Breads & Rice': '🫓',
  'Beverages & Mocktails': '🥤',
  'Desserts & Sweets': '🍰',
  'Quick Bites': '🍟',
  'Biryani & Rice': '🍚',
  'Chinese & Noodles': '🍜',
  'South Indian': '🥞',
  'Pizza & Burgers': '🍕',
};

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  String? _selectedCategoryId;
  String _searchQuery = '';
  String _foodTypeFilter = 'ALL'; // ALL | VEG | NON_VEG
  bool _sideRailCollapsed = false;
  String? _selectedTableId;
  String? _selectedTableName;

  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(posMenuProvider);
    final tablesAsync = ref.watch(tablesProvider);
    final cart = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: RosTheme.bg,
      body: SafeArea(
        child: Column(
          children: [
            // ── Top Header Controls (Order Type, Table, Search, Veg/Non-Veg) ──
            _buildTopControls(cart, tablesAsync.valueOrNull ?? []),

            // ── Main Content: Split Category Rail + Dish Grid ──
            Expanded(
              child: menuAsync.when(
                data: (categories) => _buildMenuSplitView(categories, cart),
                loading: () => const Center(
                  child: CircularProgressIndicator(color: RosTheme.primary),
                ),
                error: (err, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: RosTheme.danger, size: 40),
                      const SizedBox(height: 12),
                      Text('Failed to load menu: $err',
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
      ),

      // ── Floating Bottom Checkout Bar (Mobile Web style) ──
      bottomNavigationBar: cart.items.isNotEmpty
          ? _buildFloatingCheckoutBar(context, cart)
          : null,
    );
  }

  // ── Top Controls ─────────────────────────────────────────────────────────────

  Widget _buildTopControls(CartState cart, List<RestaurantTable> tables) {
    final activeTable = tables.firstWhere(
      (t) => t.id == (_selectedTableId ?? cart.tableId),
      orElse: () => RestaurantTable(
        id: '',
        name: _selectedTableName ?? 'Table',
        capacity: 4,
        shape: 'RECTANGLE',
        status: 'AVAILABLE',
        posX: 0,
        posY: 0,
      ),
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: const BoxDecoration(
        color: RosTheme.bgCard,
        border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
      ),
      child: Column(
        children: [
          // Row 1: Order type pills + Table selector
          Row(
            children: [
              // Order Type Pills
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  child: Row(
                    children: [
                      _buildOrderTypePill('DINE_IN', '🍽️ Dine In', cart.orderType),
                      _buildOrderTypePill('TAKEAWAY', '🛍️ Takeaway', cart.orderType),
                      _buildOrderTypePill('DELIVERY', '🛵 Delivery', cart.orderType),
                    ],
                  ),
                ),
              ),

              // Table Selector Pill (for Dine In)
              if (cart.orderType == 'DINE_IN') ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _showTablePickerModal(context, tables),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      gradient: activeTable.id.isNotEmpty
                          ? RosTheme.greenGradient
                          : null,
                      color: activeTable.id.isNotEmpty
                          ? null
                          : RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: activeTable.id.isNotEmpty
                            ? Colors.transparent
                            : RosTheme.bgBorder,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.table_restaurant_rounded,
                            size: 15, color: Colors.white),
                        const SizedBox(width: 5),
                        Text(
                          activeTable.id.isNotEmpty
                              ? activeTable.name
                              : 'Select Table',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 3),
                        const Icon(Icons.arrow_drop_down_rounded,
                            size: 16, color: Colors.white70),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 8),

          // Row 2: Search bar + Veg/Non-Veg filter buttons
          Row(
            children: [
              // Search Input
              Expanded(
                child: Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Row(
                    children: [
                      const Icon(Icons.search_rounded,
                          color: RosTheme.textMuted, size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: TextField(
                          style: const TextStyle(
                              color: RosTheme.textPrimary, fontSize: 12),
                          decoration: const InputDecoration(
                            hintText: 'Search dish (e.g. Chicken, Paneer)...',
                            hintStyle: TextStyle(
                                color: RosTheme.textMuted, fontSize: 12),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onChanged: (val) => setState(() => _searchQuery = val),
                        ),
                      ),
                      if (_searchQuery.isNotEmpty)
                        GestureDetector(
                          onTap: () => setState(() => _searchQuery = ''),
                          child: const Icon(Icons.close_rounded,
                              color: RosTheme.textMuted, size: 16),
                        ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // Veg / Non-Veg Quick Filter Pills
              _buildFoodTypePill('ALL', 'All'),
              const SizedBox(width: 4),
              _buildFoodTypePill('VEG', 'Veg', color: RosTheme.secondary),
              const SizedBox(width: 4),
              _buildFoodTypePill('NON_VEG', 'Non-Veg', color: RosTheme.danger),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderTypePill(String value, String label, String currentType) {
    final isSelected = currentType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          ref.read(cartProvider.notifier).setOrderType(value);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            gradient: isSelected ? RosTheme.primaryGradient : null,
            color: isSelected ? null : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : RosTheme.textMuted,
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFoodTypePill(String value, String label, {Color? color}) {
    final isSelected = _foodTypeFilter == value;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _foodTypeFilter = value);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? (color ?? RosTheme.primary).withValues(alpha: 0.18)
              : RosTheme.bgElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? (color ?? RosTheme.primary)
                : RosTheme.bgBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (color != null) ...[
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                color: isSelected
                    ? (color ?? Colors.white)
                    : RosTheme.textSecondary,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Menu Split View (Side Category Rail + Dish Grid) ─────────────────────────

  Widget _buildMenuSplitView(List<MenuCategory> categories, CartState cart) {
    final filteredCategories = _filterMenu(categories);

    return Row(
      children: [
        // ── Sticky Left Category Rail ──
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: _sideRailCollapsed ? 48 : 86,
          decoration: const BoxDecoration(
            color: RosTheme.bgCard,
            border: Border(right: BorderSide(color: RosTheme.bgBorder)),
          ),
          child: Column(
            children: [
              // Collapse Toggle Button
              InkWell(
                onTap: () =>
                    setState(() => _sideRailCollapsed = !_sideRailCollapsed),
                child: Container(
                  height: 32,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
                  ),
                  child: Icon(
                    _sideRailCollapsed
                        ? Icons.chevron_right_rounded
                        : Icons.chevron_left_rounded,
                    size: 18,
                    color: RosTheme.textMuted,
                  ),
                ),
              ),

              // Categories List
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    // All Button
                    _buildRailCategoryButton(
                      id: null,
                      name: 'All Dishes',
                      icon: '✨',
                      itemCount: categories.fold(0, (s, c) => s + c.items.length),
                      isSelected: _selectedCategoryId == null,
                    ),

                    // Individual Categories
                    ...categories.map((c) => _buildRailCategoryButton(
                          id: c.id,
                          name: c.name,
                          icon: _categoryIcons[c.name] ?? '🍽️',
                          itemCount: c.items.length,
                          isSelected: _selectedCategoryId == c.id,
                        )),
                  ],
                ),
              ),
            ],
          ),
        ),

        // ── Right Dish Grid ──
        Expanded(
          child: filteredCategories.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(10, 10, 10, 80),
                  itemCount: filteredCategories.length,
                  itemBuilder: (context, catIndex) {
                    final cat = filteredCategories[catIndex];
                    final explodedCards = _explodeItems(cat.items);

                    if (explodedCards.isEmpty) return const SizedBox();

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section Header
                        if (_selectedCategoryId == null) ...[
                          Padding(
                            padding: const EdgeInsets.only(
                                top: 6, bottom: 8, left: 2, right: 2),
                            child: Row(
                              children: [
                                Text(_categoryIcons[cat.name] ?? '🍽️',
                                    style: const TextStyle(fontSize: 14)),
                                const SizedBox(width: 6),
                                Text(
                                  cat.name.toUpperCase(),
                                  style: const TextStyle(
                                    color: RosTheme.textPrimary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: RosTheme.bgElevated,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '${explodedCards.length}',
                                    style: const TextStyle(
                                      color: RosTheme.textMuted,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        // Grid of Exploded Food Cards
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: explodedCards.length,
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 1.28,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                          ),
                          itemBuilder: (context, cardIndex) {
                            final card = explodedCards[cardIndex];
                            return _FoodCardItem(
                              card: card,
                              cart: cart,
                              onAdd: () => _onCardTapped(card),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                      ],
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildRailCategoryButton({
    required String? id,
    required String name,
    required String icon,
    required int itemCount,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _selectedCategoryId = id);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          gradient: isSelected ? RosTheme.primaryGradient : null,
          color: isSelected ? null : Colors.transparent,
          border: Border(
            bottom: BorderSide(
              color: isSelected
                  ? Colors.transparent
                  : RosTheme.bgBorder.withValues(alpha: 0.5),
            ),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(icon, style: const TextStyle(fontSize: 18)),
            if (!_sideRailCollapsed) ...[
              const SizedBox(height: 4),
              Text(
                name,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isSelected ? Colors.white : RosTheme.textPrimary,
                  fontSize: 9.5,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 3),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.22)
                      : RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$itemCount',
                  style: TextStyle(
                    color: isSelected ? Colors.white : RosTheme.textMuted,
                    fontSize: 8.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🍽️', style: TextStyle(fontSize: 36)),
          const SizedBox(height: 10),
          const Text(
            'No dishes found',
            style: TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            _searchQuery.isNotEmpty
                ? 'Try searching with a different keyword'
                : 'Select another category from the left',
            style:
                const TextStyle(color: RosTheme.textSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }

  // ── Exploding Variants Helper (Matching Web exploder logic) ──────────────────

  List<_ExplodedCard> _explodeItems(List<MenuItem> items) {
    final List<_ExplodedCard> results = [];

    for (final item in items) {
      if (!item.isAvailable) continue;

      // Filter by food type
      final isVeg = item.foodType == 'VEG' || item.foodType == 'VEGAN';
      if (_foodTypeFilter == 'VEG' && !isVeg) continue;
      if (_foodTypeFilter == 'NON_VEG' && isVeg) continue;

      // Filter by search query
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matches = item.name.toLowerCase().contains(q) ||
            (item.description?.toLowerCase().contains(q) ?? false);
        if (!matches) continue;
      }

      if (item.variants.length <= 1) {
        final v = item.variants.isNotEmpty ? item.variants.first : null;
        results.add(_ExplodedCard(
          menuItem: item,
          variant: v,
          displayName: item.name,
          variantName: (v != null && !_isGenericVariant(v.name)) ? v.name : null,
          price: v?.price ?? item.basePrice,
          foodType: item.foodType,
        ));
      } else {
        for (final v in item.variants) {
          results.add(_ExplodedCard(
            menuItem: item,
            variant: v,
            displayName: _isGenericVariant(v.name)
                ? item.name
                : '${item.name} (${v.name})',
            variantName: v.name,
            price: v.price,
            foodType: item.foodType,
          ));
        }
      }
    }

    return results;
  }

  bool _isGenericVariant(String? name) {
    if (name == null || name.isEmpty) return true;
    final l = name.toLowerCase().trim();
    return l == 'regular' ||
        l == 'standard' ||
        l == 'default' ||
        l == 'portion' ||
        l == 'single';
  }

  List<MenuCategory> _filterMenu(List<MenuCategory> categories) {
    if (_selectedCategoryId == null) {
      return categories;
    }
    return categories.where((c) => c.id == _selectedCategoryId).toList();
  }

  void _onCardTapped(_ExplodedCard card) {
    HapticFeedback.lightImpact();

    // If item has modifier groups, show modifier bottom sheet
    if (card.menuItem.modifierGroups.isNotEmpty) {
      _showModifierPickerSheet(context, card);
      return;
    }

    // Directly add to cart
    ref.read(cartProvider.notifier).addItem(CartItem(
      menuItemId: card.menuItem.id,
      menuItemName: card.displayName,
      variantId: card.variant?.id,
      variantName: card.variantName ?? 'Standard',
      unitPrice: card.price,
      quantity: 1,
    ));
  }

  // ── Floating Bottom Checkout Bar ─────────────────────────────────────────────

  Widget _buildFloatingCheckoutBar(BuildContext context, CartState cart) {
    final totalQty = cart.items.fold(0, (sum, i) => sum + i.quantity);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        border: const Border(top: BorderSide(color: RosTheme.bgBorder)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Left: Shopping bag icon + Total Count & Amount
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: RosTheme.primaryGradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: RosTheme.primary.withValues(alpha: 0.3),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                const Center(
                  child: Icon(Icons.shopping_bag_rounded,
                      color: Colors.white, size: 22),
                ),
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: RosTheme.secondary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$totalQty',
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 12),

          // Total Price info
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '₹${cart.total.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: RosTheme.secondary,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  '$totalQty items in order ticket',
                  style: const TextStyle(
                    color: RosTheme.textSecondary,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          // Action Button: View Order & Pay
          ElevatedButton.icon(
            onPressed: () => _showOrderTicketSheet(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.receipt_long_rounded, size: 16),
            label: const Text(
              'View Order & Pay',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }

  // ── Modals & Sheets (Table Picker, Order Ticket, Fast Pay) ────────────────────

  void _showTablePickerModal(
      BuildContext context, List<RestaurantTable> tables) {
    showModalBottomSheet(
      context: context,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Select Dining Table',
                    style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded,
                        color: RosTheme.textMuted),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: tables.map((t) {
                  final isSelected = t.id == _selectedTableId;
                  return GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() {
                        _selectedTableId = t.id;
                        _selectedTableName = t.name;
                      });
                      ref.read(cartProvider.notifier).setTable(t.id);
                      Navigator.pop(ctx);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        gradient: isSelected ? RosTheme.greenGradient : null,
                        color: isSelected ? null : RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? Colors.transparent
                              : RosTheme.bgBorder,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.table_restaurant_rounded,
                              size: 14, color: Colors.white70),
                          const SizedBox(width: 6),
                          Text(
                            t.name,
                            style: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : RosTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showOrderTicketSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => _OrderTicketDrawer(
        onFastPay: () {
          Navigator.pop(ctx);
          _showFastPayModal(context);
        },
      ),
    );
  }

  void _showFastPayModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => const _FastPaySheet(),
    );
  }

  void _showModifierPickerSheet(BuildContext context, _ExplodedCard card) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => _ModifierPickerSheet(card: card),
    );
  }
}

// ── Exploded Food Card Data Model ─────────────────────────────────────────────

class _ExplodedCard {
  final MenuItem menuItem;
  final MenuItemVariant? variant;
  final String displayName;
  final String? variantName;
  final double price;
  final String? foodType;

  _ExplodedCard({
    required this.menuItem,
    this.variant,
    required this.displayName,
    this.variantName,
    required this.price,
    this.foodType,
  });
}

// ── Interactive Food Card Item Widget ─────────────────────────────────────────

class _FoodCardItem extends StatelessWidget {
  final _ExplodedCard card;
  final CartState cart;
  final VoidCallback onAdd;

  const _FoodCardItem({
    required this.card,
    required this.cart,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final isVeg = card.foodType == 'VEG' || card.foodType == 'VEGAN';
    final inCartCount = cart.items
        .where((ci) =>
            ci.menuItemId == card.menuItem.id &&
            ci.variantId == (card.variant?.id ?? ''))
        .fold(0, (sum, i) => sum + i.quantity);

    final borderColor = inCartCount > 0
        ? RosTheme.primary
        : (isVeg
            ? RosTheme.secondary.withValues(alpha: 0.3)
            : RosTheme.danger.withValues(alpha: 0.3));

    return GestureDetector(
      onTap: onAdd,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: inCartCount > 0
              ? RosTheme.primary.withValues(alpha: 0.12)
              : RosTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: borderColor,
            width: inCartCount > 0 ? 1.8 : 1.0,
          ),
          boxShadow: inCartCount > 0
              ? [
                  BoxShadow(
                    color: RosTheme.primary.withValues(alpha: 0.2),
                    blurRadius: 8,
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Top Row: Veg indicator + Add button / In-cart count
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isVeg ? RosTheme.secondary : RosTheme.danger,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(3),
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
                if (inCartCount > 0)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      gradient: RosTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'x$inCartCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  )
                else
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: isVeg
                          ? RosTheme.secondary.withValues(alpha: 0.15)
                          : RosTheme.danger.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.add_rounded,
                      size: 15,
                      color: isVeg ? RosTheme.secondary : RosTheme.danger,
                    ),
                  ),
              ],
            ),

            // Middle: Food Name
            Text(
              card.displayName,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),

            // Bottom: Price & portion tag
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '₹${card.price.toStringAsFixed(0)}',
                  style: TextStyle(
                    color: isVeg ? RosTheme.secondary : RosTheme.danger,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (card.variantName != null)
                  Text(
                    card.variantName!,
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

// ── Sliding Order Ticket Drawer ───────────────────────────────────────────────

class _OrderTicketDrawer extends ConsumerWidget {
  final VoidCallback onFastPay;

  const _OrderTicketDrawer({required this.onFastPay});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final totalQty = cart.items.fold(0, (sum, i) => sum + i.quantity);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
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
                color: RosTheme.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order Ticket ($totalQty items)',
                    style: const TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    cart.orderType.replaceAll('_', ' '),
                    style: const TextStyle(
                      color: RosTheme.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: () {
                  HapticFeedback.selectionClick();
                  ref.read(cartProvider.notifier).clearCart();
                },
                icon: const Icon(Icons.delete_outline_rounded,
                    size: 15, color: RosTheme.danger),
                label: const Text(
                  'Clear All',
                  style: TextStyle(
                      color: RosTheme.danger,
                      fontSize: 11,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),

          const Divider(color: RosTheme.bgBorder, height: 20),

          // Items List
          Expanded(
            child: cart.items.isEmpty
                ? const Center(
                    child: Text(
                      'Your order ticket is empty',
                      style: TextStyle(color: RosTheme.textMuted, fontSize: 13),
                    ),
                  )
                : ListView.separated(
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) =>
                        const Divider(color: RosTheme.bgBorder, height: 12),
                    itemBuilder: (ctx, index) {
                      final item = cart.items[index];
                      return Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.menuItemName,
                                  style: const TextStyle(
                                    color: RosTheme.textPrimary,
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${item.lineTotal.toStringAsFixed(0)} (@ ₹${item.unitPrice.toStringAsFixed(0)})',
                                  style: const TextStyle(
                                    color: RosTheme.secondary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Quantity Stepper
                          Container(
                            decoration: BoxDecoration(
                              color: RosTheme.bgElevated,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: RosTheme.bgBorder),
                            ),
                            child: Row(
                              children: [
                                InkWell(
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    ref
                                        .read(cartProvider.notifier)
                                        .updateQuantity(index, item.quantity - 1);
                                  },
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: Icon(Icons.remove_rounded,
                                        size: 16, color: RosTheme.primary),
                                  ),
                                ),
                                Padding(
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 6),
                                  child: Text(
                                    '${item.quantity}',
                                    style: const TextStyle(
                                      color: RosTheme.textPrimary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                InkWell(
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    ref
                                        .read(cartProvider.notifier)
                                        .updateQuantity(index, item.quantity + 1);
                                  },
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: Icon(Icons.add_rounded,
                                        size: 16, color: RosTheme.primary),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          const Divider(color: RosTheme.bgBorder, height: 20),

          // Total Calculation
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
                '₹${cart.total.toStringAsFixed(0)}',
                style: const TextStyle(
                  color: RosTheme.secondary,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Two Giant Action Buttons: Send KOT & Fast Pay
          Row(
            children: [
              // Send KOT Button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _sendKOT(context, ref),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.secondary,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.soup_kitchen_rounded, size: 18),
                  label: const Text(
                    'Send KOT',
                    style:
                        TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                  ),
                ),
              ),

              const SizedBox(width: 10),

              // Fast Pay Button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onFastPay,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: const Icon(Icons.bolt_rounded, size: 18),
                  label: const Text(
                    'Fast Pay',
                    style:
                        TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _sendKOT(BuildContext context, WidgetRef ref) async {
    final cart = ref.read(cartProvider);
    if (cart.items.isEmpty) return;

    try {
      final api = ref.read(apiClientProvider);
      final payload = {
        'orderType': cart.orderType,
        'tableId': cart.tableId,
        'items': cart.items.map((i) => {
              'menuItemId': i.menuItemId,
              'variantId': i.variantId,
              'quantity': i.quantity,
              'price': i.unitPrice,
              'notes': i.notes,
            }).toList(),
      };

      await api.post('/orders', data: payload);
      ref.read(cartProvider.notifier).clearCart();
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ KOT dispatched to Kitchen successfully!'),
            backgroundColor: RosTheme.secondary,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send KOT: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    }
  }
}

// ── Fast Pay Bottom Sheet ─────────────────────────────────────────────────────

class _FastPaySheet extends ConsumerStatefulWidget {
  const _FastPaySheet();

  @override
  ConsumerState<_FastPaySheet> createState() => _FastPaySheetState();
}

class _FastPaySheetState extends ConsumerState<_FastPaySheet> {
  String _paymentMethod = 'CASH'; // CASH | UPI | CARD
  double _tenderedAmount = 0.0;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    final total = ref.read(cartProvider).total;
    _tenderedAmount = total;
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final total = cart.total;
    final change = (_tenderedAmount - total).clamp(0.0, double.infinity);

    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Fast Pay & Settlement',
                style: TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Total Display Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: RosTheme.bgElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Amount Payable',
                    style: TextStyle(
                        color: RosTheme.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600)),
                Text(
                  '₹${total.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: RosTheme.secondary,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Payment Method Selector
          Row(
            children: [
              _buildMethodPill('CASH', '💵 Cash'),
              const SizedBox(width: 8),
              _buildMethodPill('UPI', '📱 UPI / QR'),
              const SizedBox(width: 8),
              _buildMethodPill('CARD', '💳 Card'),
            ],
          ),

          if (_paymentMethod == 'CASH') ...[
            const SizedBox(height: 14),
            const Text(
              'Tendered Amount',
              style: TextStyle(
                  color: RosTheme.textSecondary,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [
                _buildTenderChip('Exact (₹${total.toStringAsFixed(0)})', total),
                _buildTenderChip('₹500', 500),
                _buildTenderChip('₹1000', 1000),
                _buildTenderChip('₹2000', 2000),
              ],
            ),
            const SizedBox(height: 10),
            if (change > 0)
              Text(
                'Change to return: ₹${change.toStringAsFixed(0)}',
                style: const TextStyle(
                  color: RosTheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
          ],

          const SizedBox(height: 20),

          // Settle and Complete Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isProcessing ? null : () => _settlePayment(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: RosTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2),
                    )
                  : const Text(
                      'Settle & Close Order',
                      style:
                          TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodPill(String method, String label) {
    final isSelected = _paymentMethod == method;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() => _paymentMethod = method);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            gradient: isSelected ? RosTheme.primaryGradient : null,
            color: isSelected ? null : RosTheme.bgElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? Colors.transparent : RosTheme.bgBorder,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : RosTheme.textPrimary,
              fontSize: 11.5,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTenderChip(String label, double amount) {
    final isSelected = _tenderedAmount == amount;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        HapticFeedback.selectionClick();
        setState(() => _tenderedAmount = amount);
      },
      selectedColor: RosTheme.primary,
      backgroundColor: RosTheme.bgElevated,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : RosTheme.textPrimary,
        fontSize: 11,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Future<void> _settlePayment(BuildContext context) async {
    final cart = ref.read(cartProvider);
    if (cart.items.isEmpty) return;

    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);

      // 1. Create order
      final orderRes = await api.post<Map<String, dynamic>>('/orders', data: {
        'orderType': cart.orderType,
        'tableId': cart.tableId,
        'items': cart.items.map((i) => {
              'menuItemId': i.menuItemId,
              'variantId': i.variantId,
              'quantity': i.quantity,
              'price': i.unitPrice,
            }).toList(),
      });

      final orderId = orderRes['id'] as String? ?? '';

      // 2. Settle payment
      if (orderId.isNotEmpty) {
        await api.post('/payments', data: {
          'orderId': orderId,
          'method': _paymentMethod,
          'amount': cart.total,
        });
      }

      ref.read(cartProvider.notifier).clearCart();
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Order Paid & Settled Successfully!'),
            backgroundColor: RosTheme.secondary,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settlement failed: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }
}

// ── Modifier Picker Modal Sheet ───────────────────────────────────────────────

class _ModifierPickerSheet extends ConsumerStatefulWidget {
  final _ExplodedCard card;

  const _ModifierPickerSheet({required this.card});

  @override
  ConsumerState<_ModifierPickerSheet> createState() =>
      _ModifierPickerSheetState();
}

class _ModifierPickerSheetState extends ConsumerState<_ModifierPickerSheet> {
  final Set<String> _selectedModifierIds = {};
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    final modGroups = widget.card.menuItem.modifierGroups;

    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  widget.card.displayName,
                  style: const TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Modifier Groups
          ...modGroups.map((grp) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    grp.modifierGroup.name,
                    style: const TextStyle(
                      color: RosTheme.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: grp.modifierGroup.modifiers.map((m) {
                      final isSelected = _selectedModifierIds.contains(m.id);
                      return ChoiceChip(
                        label: Text('${m.name} (+₹${m.price.toStringAsFixed(0)})'),
                        selected: isSelected,
                        onSelected: (val) {
                          HapticFeedback.selectionClick();
                          setState(() {
                            if (val) {
                              _selectedModifierIds.add(m.id);
                            } else {
                              _selectedModifierIds.remove(m.id);
                            }
                          });
                        },
                        selectedColor: RosTheme.primary,
                        backgroundColor: RosTheme.bgElevated,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : RosTheme.textPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                ],
              )),

          // Quantity controls
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Quantity',
                  style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700)),
              Container(
                decoration: BoxDecoration(
                  color: RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: RosTheme.bgBorder),
                ),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _quantity > 1
                          ? () => setState(() => _quantity--)
                          : null,
                      icon: const Icon(Icons.remove_rounded,
                          color: RosTheme.primary, size: 18),
                    ),
                    Text(
                      '$_quantity',
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _quantity++),
                      icon: const Icon(Icons.add_rounded,
                          color: RosTheme.primary, size: 18),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // Add to Cart button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                HapticFeedback.lightImpact();
                ref.read(cartProvider.notifier).addItem(CartItem(
                  menuItemId: widget.card.menuItem.id,
                  menuItemName: widget.card.displayName,
                  variantId: widget.card.variant?.id,
                  variantName: widget.card.variantName ?? 'Standard',
                  unitPrice: widget.card.price,
                  quantity: _quantity,
                ));
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: RosTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: Text(
                'Add to Ticket — ₹${(widget.card.price * _quantity).toStringAsFixed(0)}',
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
