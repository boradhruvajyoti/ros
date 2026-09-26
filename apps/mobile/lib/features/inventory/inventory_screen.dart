// =============================================================================
// Inventory Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

class InventoryScreen extends ConsumerWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventoryAsync = ref.watch(inventoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock & Inventory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(inventoryProvider),
          ),
        ],
      ),
      body: inventoryAsync.when(
        data: (items) {
          final lowStock = items.where((i) => i.isLowStock).toList();
          return Column(
            children: [
              if (lowStock.isNotEmpty)
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: RosTheme.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RosTheme.warning.withOpacity(0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.warning_amber_rounded, color: RosTheme.warning),
                    const SizedBox(width: 8),
                    Text('${lowStock.length} items are low on stock!',
                        style: const TextStyle(color: RosTheme.warning, fontWeight: FontWeight.w500)),
                  ]),
                ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: items.length,
                  itemBuilder: (ctx, i) {
                    final item = items[i];
                    final isLow = item.isLowStock;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: RosTheme.bgCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isLow ? RosTheme.warning.withOpacity(0.4) : RosTheme.bgBorder,
                        ),
                      ),
                      child: Row(children: [
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.name, style: const TextStyle(
                                color: RosTheme.textPrimary, fontWeight: FontWeight.w500)),
                            Text('${item.unit} · Min: ${item.minStock}',
                                style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                          ],
                        )),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text('${item.currentStock} ${item.unit}',
                              style: TextStyle(
                                  color: isLow ? RosTheme.warning : RosTheme.textPrimary,
                                  fontWeight: FontWeight.w700)),
                          if (isLow)
                            const Text('LOW STOCK', style: TextStyle(
                                color: RosTheme.warning, fontSize: 9, fontWeight: FontWeight.w700)),
                        ]),
                      ]),
                    );
                  },
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: RosTheme.primary)),
        error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: RosTheme.textSecondary))),
      ),
    );
  }
}
