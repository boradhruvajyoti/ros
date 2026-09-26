// =============================================================================
// Staff Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

class StaffScreen extends ConsumerWidget {
  const StaffScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff & HR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(staffProvider),
          ),
        ],
      ),
      body: staffAsync.when(
        data: (members) {
          if (members.isEmpty) {
            return const Center(
              child: Text('No staff members found',
                  style: TextStyle(color: RosTheme.textSecondary)),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: members.length,
            itemBuilder: (ctx, i) {
              final m = members[i];
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
                    backgroundColor: RosTheme.primary.withOpacity(0.15),
                    child: Text(
                      m.name.substring(0, 1).toUpperCase(),
                      style: const TextStyle(
                          color: RosTheme.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 16),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.name, style: const TextStyle(
                          color: RosTheme.textPrimary, fontWeight: FontWeight.w600)),
                      Text(m.email, style: const TextStyle(
                          color: RosTheme.textMuted, fontSize: 12)),
                      if (m.roles.isNotEmpty)
                        Text(m.roles.join(', '), style: const TextStyle(
                            color: RosTheme.primary, fontSize: 11, fontWeight: FontWeight.w500)),
                    ],
                  )),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: m.isActive
                            ? RosTheme.secondary.withOpacity(0.1)
                            : RosTheme.danger.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        m.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                            color: m.isActive ? RosTheme.secondary : RosTheme.danger,
                            fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                    ),
                    if (m.lastLoginAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        DateFormat('d MMM').format(m.lastLoginAt!),
                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 10),
                      ),
                    ],
                  ]),
                ]),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: RosTheme.primary)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: RosTheme.textSecondary))),
      ),
    );
  }
}
