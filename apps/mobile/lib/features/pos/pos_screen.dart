// =============================================================================
// POS Screen — Point of Sale with cart, menu, payment
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(posMenuProvider);
    final cart = ref.watch(cartProvider);
    final isWide = MediaQuery.of(context).size.width > 700;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Point of Sale'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Menu',
            onPressed: () => ref.invalidate(posMenuProvider),
          ),
          // Order type badge
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: RosTheme.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: cart.orderType,
                isDense: true,
                style: const TextStyle(
                    color: RosTheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                dropdownColor: RosTheme.bgCard,
                items: const [
                  DropdownMenuItem(value: 'DINE_IN', child: Text('DINE IN')),
                  DropdownMenuItem(value: 'TAKEAWAY', child: Text('TAKEAWAY')),
                  DropdownMenuItem(value: 'DELIVERY', child: Text('DELIVERY')),
                ],
                onChanged: (v) {
                  if (v != null) ref.read(cartProvider.notifier).setOrderType(v);
                },
              ),
            ),
          ),
          if (cart.items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TextButton.icon(
                onPressed: () => _showCartSheet(context),
                icon: const Icon(Icons.shopping_cart_rounded,
                    size: 18, color: RosTheme.primary),
                label: Text(
                  '${cart.items.length} • ₹${cart.total.toStringAsFixed(0)}',
                  style: const TextStyle(
                      color: RosTheme.primary, fontWeight: FontWeight.w700),
                ),
              ),
            ),
        ],
      ),
      body: menuAsync.when(
        data: (categories) => isWide
            ? _buildWideLayout(categories, cart)
            : _buildNarrowLayout(categories, cart),
        loading: () => const Center(
            child: CircularProgressIndicator(color: RosTheme.primary)),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, color: RosTheme.danger, size: 40),
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
    );
  }

  Widget _buildWideLayout(List<MenuCategory> categories, CartState cart) {
    return Row(
      children: [
        Expanded(flex: 3, child: _MenuPanel(categories: categories)),
        Container(width: 1, color: RosTheme.bgBorder),
        Expanded(flex: 2, child: _CartPanel(cart: cart, onPlaceOrder: _placeOrder)),
      ],
    );
  }

  Widget _buildNarrowLayout(List<MenuCategory> categories, CartState cart) {
    return _MenuPanel(
      categories: categories,
      onCartTap: cart.items.isNotEmpty ? () => _showCartSheet(context) : null,
    );
  }

  void _showCartSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        builder: (_, sc) => Consumer(
          builder: (ctx, ref, _) {
            final cart = ref.watch(cartProvider);
            return _CartPanel(
              cart: cart,
              scrollController: sc,
              onPlaceOrder: _placeOrder,
            );
          },
        ),
      ),
    );
  }

  Future<void> _placeOrder(String paymentMethod, double paidAmount) async {
    final cart = ref.read(cartProvider);
    if (cart.items.isEmpty) return;

    try {
      final api = ref.read(apiClientProvider);
      final now = DateTime.now();
      final clientId = '${now.millisecondsSinceEpoch}-mob';

      // Create order
      final orderRes = await api.post<Map<String, dynamic>>('/orders', data: {
        'type': cart.orderType,
        'tableId': cart.tableId,
        'customerId': cart.customerId,
        'notes': cart.notes,
        'clientId': clientId,
        'items': cart.items.map((item) => {
          'menuItemId': item.menuItemId,
          'variantId': item.variantId,
          'quantity': item.quantity,
          'unitPrice': item.unitPrice,
          'notes': item.notes,
          'modifierIds': item.selectedModifiers.map((m) => m.id).toList(),
        }).toList(),
        'status': 'SENT_TO_KITCHEN',
      });

      final orderId = orderRes['id'] as String;

      // Apply discount if any
      if (cart.discountAmount > 0 && cart.discountType != null) {
        await api.post('/orders/$orderId/discount', data: {
          'type': cart.discountType,
          'value': cart.discountValue,
        });
      }

      // Add payment
      if (paidAmount > 0) {
        await api.post('/orders/$orderId/payments', data: {
          'method': paymentMethod,
          'amount': paidAmount,
        });
      }

      ref.read(cartProvider.notifier).clearCart();
      ref.invalidate(tablesProvider);
      ref.invalidate(activeOrdersProvider);

      if (mounted) {
        Navigator.pop(context); // Close bottom sheet if open
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white),
                const SizedBox(width: 8),
                Text('Order #${orderRes['orderNumber']} placed!'),
              ],
            ),
            backgroundColor: RosTheme.secondary,
          ),
        );
        context.go('/tables');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    }
  }
}

// ── Menu Panel ────────────────────────────────────────────────────────────────

class _MenuPanel extends ConsumerStatefulWidget {
  final List<MenuCategory> categories;
  final VoidCallback? onCartTap;
  const _MenuPanel({required this.categories, this.onCartTap});

  @override
  ConsumerState<_MenuPanel> createState() => _MenuPanelState();
}

class _MenuPanelState extends ConsumerState<_MenuPanel> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final categories = widget.categories;

    if (categories.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.restaurant_menu_rounded, size: 48, color: RosTheme.textMuted),
            const SizedBox(height: 12),
            const Text(
              'No menu items found',
              style: TextStyle(color: RosTheme.textSecondary, fontSize: 16),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => ref.invalidate(posMenuProvider),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh Catalog'),
            ),
          ],
        ),
      );
    }

    return DefaultTabController(
      key: ValueKey('tab_${categories.length}_${categories.map((c) => c.id).join()}'),
      length: categories.length,
      child: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search menu...',
                prefixIcon: const Icon(Icons.search_rounded,
                    color: RosTheme.textMuted, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                suffixIcon: _search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded,
                            color: RosTheme.textMuted, size: 18),
                        onPressed: () => setState(() => _search = ''),
                      )
                    : null,
              ),
            ),
          ),

          // Category tabs
          TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: categories.map((c) => Tab(text: c.name)).toList(),
          ),

          // Items grid
          Expanded(
            child: TabBarView(
              children: categories.map((cat) {
                final items = cat.items.where((item) {
                  if (_search.isEmpty) return true;
                  return item.name.toLowerCase().contains(_search);
                }).toList();

                if (items.isEmpty) {
                  return Center(
                    child: Text(
                      _search.isNotEmpty ? 'No items match "$_search"' : 'No items in this category',
                      style: const TextStyle(color: RosTheme.textMuted),
                    ),
                  );
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 180,
                    mainAxisExtent: 160,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: items.length,
                  itemBuilder: (ctx, i) => _MenuItemCard(item: items[i]),
                );
              }).toList(),
            ),
          ),

          // Cart summary bar (mobile)
          if (cart.items.isNotEmpty && widget.onCartTap != null)
            GestureDetector(
              onTap: widget.onCartTap,
              child: Container(
                margin: const EdgeInsets.all(12),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  gradient: RosTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: RosTheme.primary.withOpacity(0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shopping_cart_rounded, color: Colors.white),
                    const SizedBox(width: 12),
                    Text(
                      '${cart.items.length} item${cart.items.length > 1 ? 's' : ''}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '₹${cart.total.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_upward_rounded,
                        color: Colors.white, size: 18),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MenuItemCard extends ConsumerWidget {
  final MenuItem item;
  const _MenuItemCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isVeg = item.foodType == 'VEG' || item.foodType == 'VEGAN';
    final price = item.basePrice;

    return GestureDetector(
      onTap: () => _addToCart(context, ref),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: item.isAvailable ? 1.0 : 0.5,
        child: Container(
          decoration: BoxDecoration(
            color: RosTheme.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: item.isAvailable ? RosTheme.bgBorder : RosTheme.danger.withOpacity(0.4),
            ),
          ),
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Food type indicator & 86'd badge
              Row(
                children: [
                  Container(
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
                  const Spacer(),
                  if (!item.isAvailable)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: RosTheme.danger.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        '86\'d',
                        style: TextStyle(
                          color: RosTheme.danger,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.name,
                style: TextStyle(
                  color: item.isAvailable ? RosTheme.textPrimary : RosTheme.textMuted,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  decoration: item.isAvailable ? null : TextDecoration.lineThrough,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '₹${price.toStringAsFixed(0)}',
                    style: TextStyle(
                      color: item.isAvailable ? RosTheme.primary : RosTheme.textMuted,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: item.isAvailable ? RosTheme.primary : RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      item.isAvailable ? Icons.add_rounded : Icons.block_rounded,
                      color: item.isAvailable ? Colors.white : RosTheme.textMuted,
                      size: 16,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _addToCart(BuildContext context, WidgetRef ref) {
    if (!item.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${item.name} is currently out of stock (86\'d)'),
          backgroundColor: RosTheme.danger,
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }
    if (item.variants.isEmpty) return;

    if (item.variants.length == 1 && item.modifierGroups.isEmpty) {
      // Directly add
      ref.read(cartProvider.notifier).addItem(CartItem(
        menuItemId: item.id,
        menuItemName: item.name,
        variantId: item.variants.first.id,
        variantName: item.variants.first.name,
        unitPrice: item.variants.first.price,
        quantity: 1,
      ));
      return;
    }

    // Show variant/modifier picker
    showModalBottomSheet(
      context: context,
      builder: (ctx) => _ItemPickerSheet(item: item),
    );
  }
}

class _ItemPickerSheet extends ConsumerStatefulWidget {
  final MenuItem item;
  const _ItemPickerSheet({required this.item});

  @override
  ConsumerState<_ItemPickerSheet> createState() => _ItemPickerSheetState();
}

class _ItemPickerSheetState extends ConsumerState<_ItemPickerSheet> {
  MenuItemVariant? _selectedVariant;
  final Set<String> _selectedModifierIds = {};
  int _qty = 1;
  String? _notes;

  @override
  void initState() {
    super.initState();
    if (widget.item.variants.isNotEmpty) {
      _selectedVariant = widget.item.variants.first;
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  widget.item.name,
                  style: const TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w600),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Variants
          if (widget.item.variants.length > 1) ...[
            const Text('Size / Variant',
                style: TextStyle(color: RosTheme.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: widget.item.variants.map((v) {
                final selected = _selectedVariant?.id == v.id;
                return GestureDetector(
                  onTap: () => setState(() => _selectedVariant = v),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: selected ? RosTheme.primary.withOpacity(0.15) : RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: selected ? RosTheme.primary : RosTheme.bgBorder,
                      ),
                    ),
                    child: Text(
                      '${v.name} · ₹${v.price.toStringAsFixed(0)}',
                      style: TextStyle(
                        color: selected ? RosTheme.primary : RosTheme.textSecondary,
                        fontSize: 13,
                        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],

          // Quantity
          Row(
            children: [
              const Text('Quantity',
                  style: TextStyle(color: RosTheme.textSecondary, fontSize: 13)),
              const Spacer(),
              IconButton(
                onPressed: _qty > 1 ? () => setState(() => _qty--) : null,
                icon: const Icon(Icons.remove_circle_outline_rounded,
                    color: RosTheme.primary),
              ),
              Text('$_qty',
                  style: const TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
              IconButton(
                onPressed: () => setState(() => _qty++),
                icon: const Icon(Icons.add_circle_outline_rounded,
                    color: RosTheme.primary),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Add button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _selectedVariant == null ? null : _addToCart,
              child: Text(
                'Add to Cart — ₹${((_selectedVariant?.price ?? 0) * _qty).toStringAsFixed(0)}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  void _addToCart() {
    if (_selectedVariant == null) return;
    ref.read(cartProvider.notifier).addItem(CartItem(
      menuItemId: widget.item.id,
      menuItemName: widget.item.name,
      variantId: _selectedVariant!.id,
      variantName: _selectedVariant!.name,
      unitPrice: _selectedVariant!.price,
      quantity: _qty,
      notes: _notes,
    ));
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${widget.item.name} added to cart'),
        duration: const Duration(seconds: 1),
      ),
    );
  }
}

// ── Cart Panel ────────────────────────────────────────────────────────────────

class _CartPanel extends ConsumerStatefulWidget {
  final CartState cart;
  final Future<void> Function(String paymentMethod, double amount) onPlaceOrder;
  final ScrollController? scrollController;

  const _CartPanel({
    required this.cart,
    required this.onPlaceOrder,
    this.scrollController,
  });

  @override
  ConsumerState<_CartPanel> createState() => _CartPanelState();
}

class _CartPanelState extends ConsumerState<_CartPanel> {
  String _paymentMethod = 'CASH';
  bool _placing = false;

  Future<void> _place() async {
    setState(() => _placing = true);
    await widget.onPlaceOrder(_paymentMethod, widget.cart.total);
    setState(() => _placing = false);
  }

  @override
  Widget build(BuildContext context) {
    final cart = widget.cart;

    if (cart.items.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_cart_outlined,
                color: RosTheme.textMuted, size: 48),
            SizedBox(height: 12),
            Text('Cart is empty',
                style: TextStyle(color: RosTheme.textMuted)),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Handle bar
        if (widget.scrollController != null)
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: RosTheme.bgBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Cart',
                  style: TextStyle(
                      color: RosTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
              TextButton(
                onPressed: () => ref.read(cartProvider.notifier).clearCart(),
                child: const Text('Clear', style: TextStyle(color: RosTheme.danger)),
              ),
            ],
          ),
        ),

        // Cart items
        Expanded(
          child: ListView.builder(
            controller: widget.scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: cart.items.length,
            itemBuilder: (ctx, i) => _CartItemTile(
              item: cart.items[i],
              index: i,
            ),
          ),
        ),

        // Totals & Payment
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: RosTheme.bgBorder)),
          ),
          child: Column(
            children: [
              // Subtotal
              _TotalRow(label: 'Subtotal',
                  value: '₹${cart.subtotal.toStringAsFixed(2)}'),
              if (cart.discountAmount > 0)
                _TotalRow(
                    label: 'Discount',
                    value: '-₹${cart.discountAmount.toStringAsFixed(2)}',
                    color: RosTheme.secondary),
              const Divider(color: RosTheme.bgBorder, height: 16),
              _TotalRow(
                  label: 'Total',
                  value: '₹${cart.total.toStringAsFixed(2)}',
                  isBold: true,
                  color: RosTheme.primary),

              const SizedBox(height: 12),

              // Payment method
              Row(
                children: [
                  const Text('Pay by:',
                      style: TextStyle(color: RosTheme.textMuted, fontSize: 13)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ['CASH', 'UPI', 'CARD'].map((m) {
                          final selected = _paymentMethod == m;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: GestureDetector(
                              onTap: () => setState(() => _paymentMethod = m),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: selected
                                      ? RosTheme.primary.withOpacity(0.15)
                                      : RosTheme.bgElevated,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: selected
                                        ? RosTheme.primary
                                        : RosTheme.bgBorder,
                                  ),
                                ),
                                child: Text(m,
                                    style: TextStyle(
                                      color: selected
                                          ? RosTheme.primary
                                          : RosTheme.textSecondary,
                                      fontSize: 12,
                                      fontWeight: selected
                                          ? FontWeight.w600
                                          : FontWeight.w400,
                                    )),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Place order button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _placing ? null : _place,
                  child: _placing
                      ? const CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2)
                      : const Text('Place Order',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CartItemTile extends ConsumerWidget {
  final CartItem item;
  final int index;
  const _CartItemTile({required this.item, required this.index});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: RosTheme.bgElevated,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.menuItemName,
                    style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500)),
                Text(item.variantName,
                    style: const TextStyle(
                        color: RosTheme.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                padding: EdgeInsets.zero,
                icon: const Icon(Icons.remove_rounded,
                    color: RosTheme.textSecondary, size: 16),
                onPressed: () => ref.read(cartProvider.notifier)
                    .updateQuantity(index, item.quantity - 1),
              ),
              Text('${item.quantity}',
                  style: const TextStyle(
                      color: RosTheme.textPrimary, fontWeight: FontWeight.w600)),
              IconButton(
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                padding: EdgeInsets.zero,
                icon: const Icon(Icons.add_rounded,
                    color: RosTheme.textSecondary, size: 16),
                onPressed: () => ref.read(cartProvider.notifier)
                    .updateQuantity(index, item.quantity + 1),
              ),
            ],
          ),
          SizedBox(
            width: 60,
            child: Text(
              '₹${item.lineTotal.toStringAsFixed(0)}',
              textAlign: TextAlign.right,
              style: const TextStyle(
                  color: RosTheme.primary, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;
  final Color? color;

  const _TotalRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                color: isBold ? RosTheme.textPrimary : RosTheme.textSecondary,
                fontWeight: isBold ? FontWeight.w600 : FontWeight.w400,
                fontSize: isBold ? 15 : 13,
              )),
          Text(value,
              style: TextStyle(
                color: color ?? (isBold ? RosTheme.textPrimary : RosTheme.textSecondary),
                fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
                fontSize: isBold ? 16 : 13,
              )),
        ],
      ),
    );
  }
}
