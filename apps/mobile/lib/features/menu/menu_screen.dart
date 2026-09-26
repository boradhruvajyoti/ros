// =============================================================================
// Menu Catalog Screen
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
  List<MenuCategory> _categories = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final categoriesData = await api.get<dynamic>('/menu/categories');
      final itemsData = await api.get<dynamic>('/menu/items');
      final catList = categoriesData is List ? categoriesData : [];
      final itemList = itemsData is List ? itemsData : [];
      final allItems = itemList
          .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
          .toList();

      final result = <MenuCategory>[];

      // All items tab
      if (allItems.isNotEmpty) {
        result.add(
          MenuCategory(
            id: 'all',
            name: 'All Items',
            sortOrder: -1,
            isActive: true,
            items: allItems,
          ),
        );
      }

      for (final c in catList) {
        final catJson = Map<String, dynamic>.from(c as Map<String, dynamic>);
        final catId = catJson['id']?.toString() ?? '';
        final catItems = allItems.where((i) => i.categoryId == catId).toList();
        result.add(
          MenuCategory(
            id: catId,
            name: catJson['name']?.toString() ?? '',
            imageUrl: catJson['imageUrl']?.toString(),
            sortOrder: (catJson['sortOrder'] as num?)?.toInt() ?? 0,
            isActive: catJson['isActive'] as bool? ?? true,
            items: catItems,
          ),
        );
      }

      setState(() {
        _categories = result;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleAvailability(MenuItem item) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/menu/items/${item.id}/availability', data: {
        'isAvailable': !item.isAvailable,
      });
      _load();
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
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Menu Catalog')),
        body: const Center(child: CircularProgressIndicator(color: RosTheme.primary)),
      );
    }

    if (_categories.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Menu Catalog'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
          ],
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.menu_book_rounded, size: 48, color: RosTheme.textMuted),
              const SizedBox(height: 12),
              const Text('No menu items found', style: TextStyle(color: RosTheme.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reload Menu'),
              ),
            ],
          ),
        ),
      );
    }

    return DefaultTabController(
      key: ValueKey('menu_tab_${_categories.length}_${_categories.map((c) => c.id).join()}'),
      length: _categories.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Menu Catalog'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
          ],
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: _categories.map((c) => Tab(text: c.name)).toList(),
          ),
        ),
        body: TabBarView(
          children: _categories.map((cat) => _buildCategoryItems(cat)).toList(),
        ),
      ),
    );
  }

  Widget _buildCategoryItems(MenuCategory cat) {
    if (cat.items.isEmpty) {
      return const Center(child: Text('No items', style: TextStyle(color: RosTheme.textMuted)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: cat.items.length,
      itemBuilder: (ctx, i) {
        final item = cat.items[i];
        final isVeg = item.foodType == 'VEG' || item.foodType == 'VEGAN';
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: RosTheme.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: RosTheme.bgBorder),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            leading: Container(
              width: 14, height: 14,
              decoration: BoxDecoration(
                border: Border.all(color: isVeg ? RosTheme.secondary : RosTheme.danger, width: 1.5),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Center(
                child: Container(
                  width: 6, height: 6,
                  decoration: BoxDecoration(
                    color: isVeg ? RosTheme.secondary : RosTheme.danger,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
            title: Text(item.name, style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
            subtitle: item.variants.isNotEmpty
                ? Text(
                    item.variants.map((v) => '${v.name}: ₹${v.price.toStringAsFixed(0)}').join(' | '),
                    style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                  )
                : null,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!item.isAvailable)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: RosTheme.danger.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('86\'d', style: TextStyle(color: RosTheme.danger, fontSize: 9, fontWeight: FontWeight.w600)),
                  ),
                const SizedBox(width: 4),
                Switch(
                  value: item.isAvailable,
                  onChanged: (_) => _toggleAvailability(item),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
