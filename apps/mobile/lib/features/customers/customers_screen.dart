// =============================================================================
// Customers Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/providers.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  List<Customer> _customers = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{
        'limit': '50',
        if (_search.isNotEmpty) 'search': _search,
      };
      final data = await api.get<Map<String, dynamic>>('/customers', queryParameters: params);
      final list = data['customers'] as List<dynamic>? ?? data['data'] as List<dynamic>? ?? [];
      setState(() {
        _customers = list.map((e) => Customer.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers & CRM'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              onChanged: (v) {
                setState(() => _search = v);
                if (v.length >= 3 || v.isEmpty) _load();
              },
              style: const TextStyle(color: RosTheme.textPrimary),
              decoration: const InputDecoration(
                hintText: 'Search by name or phone...',
                prefixIcon: Icon(Icons.search_rounded, color: RosTheme.textMuted, size: 20),
              ),
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: RosTheme.primary))
                : _customers.isEmpty
                    ? const Center(
                        child: Text('No customers found', style: TextStyle(color: RosTheme.textSecondary)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _customers.length,
                        itemBuilder: (ctx, i) {
                          final c = _customers[i];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: RosTheme.bgCard,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: RosTheme.bgBorder),
                            ),
                            child: Row(children: [
                              CircleAvatar(
                                radius: 22,
                                backgroundColor: RosTheme.primary.withOpacity(0.1),
                                child: Text(c.name.substring(0, 1).toUpperCase(),
                                    style: const TextStyle(color: RosTheme.primary, fontWeight: FontWeight.w700)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.name, style: const TextStyle(
                                      color: RosTheme.textPrimary, fontWeight: FontWeight.w600)),
                                  Text(c.phone, style: const TextStyle(
                                      color: RosTheme.textMuted, fontSize: 12)),
                                  Row(children: [
                                    const Icon(Icons.star_rounded, color: RosTheme.accent, size: 12),
                                    const SizedBox(width: 2),
                                    Text('${c.loyaltyPoints} pts · ${c.visitCount} visits',
                                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 11)),
                                  ]),
                                ],
                              )),
                              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                Text('₹${NumberFormat('#,##,###').format(c.totalSpent.toInt())}',
                                    style: const TextStyle(color: RosTheme.primary,
                                        fontWeight: FontWeight.w700, fontSize: 14)),
                                const Text('spent', style: TextStyle(color: RosTheme.textMuted, fontSize: 10)),
                              ]),
                            ]),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
