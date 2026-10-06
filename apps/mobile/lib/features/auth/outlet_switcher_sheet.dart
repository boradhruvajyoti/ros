// =============================================================================
// Outlet Switcher & Multi-Branch Management Sheet
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';

class OutletSwitcherSheet extends ConsumerStatefulWidget {
  const OutletSwitcherSheet({super.key});

  static Future<void> show(BuildContext context) {
    HapticFeedback.mediumImpact();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (_) => const OutletSwitcherSheet(),
    );
  }

  @override
  ConsumerState<OutletSwitcherSheet> createState() => _OutletSwitcherSheetState();
}

class _OutletSwitcherSheetState extends ConsumerState<OutletSwitcherSheet> {
  String? _switchingBranchId;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final branchesAsync = ref.watch(branchesProvider);
    final isTenantAdmin = user?.isTenantAdmin ?? false;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: RosTheme.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.zero,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: RosTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.zero,
                ),
                child: const Icon(
                  Icons.storefront_rounded,
                  color: RosTheme.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Select Operating Outlet',
                      style: TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      user?.tenantName ?? 'Multi-Location Restaurant System',
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Outlets list
          branchesAsync.when(
            data: (branches) {
              final activeList = branches.isNotEmpty
                  ? branches
                  : (user?.availableBranches ?? []);

              if (activeList.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.zero,
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(
                          Icons.store_outlined,
                          size: 36,
                          color: RosTheme.textMuted,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'No additional outlets found',
                          style: TextStyle(
                            color: RosTheme.textPrimary.withValues(alpha: 0.8),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'All operations are currently running on your primary flagship branch.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: RosTheme.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.45,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: activeList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) {
                    final b = activeList[i];
                    final isCurrent = b.id == user?.branchId;
                    final isSwitchingThis = _switchingBranchId == b.id;

                    return InkWell(
                      borderRadius: BorderRadius.zero,
                      onTap: (isCurrent || _switchingBranchId != null)
                          ? null
                          : () => _handleSwitchBranch(b),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isCurrent
                              ? RosTheme.primary.withValues(alpha: 0.08)
                              : RosTheme.bgElevated,
                          borderRadius: BorderRadius.zero,
                          border: Border.all(
                            color: isCurrent
                                ? RosTheme.primary.withValues(alpha: 0.4)
                                : RosTheme.bgBorder,
                            width: isCurrent ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isCurrent
                                    ? RosTheme.primary
                                    : RosTheme.bgCard,
                                shape: BoxShape.circle,
                              ),
                              child: isSwitchingThis
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Icon(
                                      isCurrent
                                          ? Icons.check_rounded
                                          : Icons.store_rounded,
                                      color: isCurrent
                                          ? Colors.white
                                          : RosTheme.textSecondary,
                                      size: 18,
                                    ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          b.name,
                                          style: TextStyle(
                                            color: isCurrent
                                                ? RosTheme.primary
                                                : RosTheme.textPrimary,
                                            fontSize: 15,
                                            fontWeight: FontWeight.w700,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (isCurrent)
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 7,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: RosTheme.secondary
                                                .withValues(alpha: 0.15),
                                            borderRadius:
                                                BorderRadius.zero,
                                            border: Border.all(
                                              color: RosTheme.secondary
                                                  .withValues(alpha: 0.3),
                                            ),
                                          ),
                                          child: const Text(
                                            'ACTIVE',
                                            style: TextStyle(
                                              color: RosTheme.secondary,
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  if (b.address != null &&
                                      b.address!.trim().isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.location_on_outlined,
                                          size: 12,
                                          color: RosTheme.textMuted,
                                        ),
                                        const SizedBox(width: 3),
                                        Expanded(
                                          child: Text(
                                            b.address!,
                                            style: const TextStyle(
                                              color: RosTheme.textMuted,
                                              fontSize: 11,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  if (b.tablesCount > 0 ||
                                      b.kitchenStationsCount > 0) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      '${b.tablesCount} Tables • ${b.kitchenStationsCount} Kitchen Stations',
                                      style: TextStyle(
                                        color: RosTheme.textMuted
                                            .withValues(alpha: 0.8),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            if (!isCurrent)
                              const Icon(
                                Icons.arrow_forward_ios_rounded,
                                size: 14,
                                color: RosTheme.textMuted,
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(color: RosTheme.primary),
              ),
            ),
            error: (err, _) => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: RosTheme.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.zero,
              ),
              child: Text(
                'Could not load outlets: $err',
                style: const TextStyle(color: RosTheme.danger, fontSize: 12),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Admin Add Outlet Action
          if (isTenantAdmin)
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton.icon(
                onPressed: () => _showAddOutletDialog(context),
                icon: const Icon(Icons.add_business_rounded, size: 18),
                label: const Text(
                  'Provision New Outlet Location',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: RosTheme.primary,
                  side: BorderSide(
                    color: RosTheme.primary.withValues(alpha: 0.4),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _handleSwitchBranch(Branch branch) async {
    setState(() => _switchingBranchId = branch.id);
    HapticFeedback.selectionClick();

    final success = await ref
        .read(authProvider.notifier)
        .switchBranch(branch.id);

    if (mounted) {
      setState(() => _switchingBranchId = null);
      Navigator.pop(context);

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Operating outlet switched to ${branch.name}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            content: const Text(
              'Failed to switch operating outlet context.',
              style: TextStyle(color: Colors.white),
            ),
          ),
        );
      }
    }
  }

  void _showAddOutletDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final gstinCtrl = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          backgroundColor: RosTheme.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          title: const Row(
            children: [
              Icon(Icons.add_business_rounded, color: RosTheme.primary, size: 22),
              SizedBox(width: 8),
              Text(
                'Add Restaurant Outlet',
                style: TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Provision a new physical location, franchise branch, or sister cafe under this restaurant tenant.',
                  style: TextStyle(color: RosTheme.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: nameCtrl,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Outlet Name *',
                    hintText: 'e.g. Indiranagar Flagship or Airport Express',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: addressCtrl,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Location / Address',
                    hintText: 'e.g. 100 Feet Rd, Indiranagar, Bengaluru',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    hintText: '+91 98765 43210',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: gstinCtrl,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'GSTIN / Tax ID',
                    hintText: '29AAAAA0000A1Z5',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: RosTheme.textMuted)),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final name = nameCtrl.text.trim();
                      if (name.isEmpty) return;
                      setDlgState(() => isSubmitting = true);
                      try {
                        final api = ref.read(apiClientProvider);
                        await api.post('/branches', data: {
                          'name': name,
                          'address': addressCtrl.text.trim().isNotEmpty
                              ? addressCtrl.text.trim()
                              : null,
                          'phone': phoneCtrl.text.trim().isNotEmpty
                              ? phoneCtrl.text.trim()
                              : null,
                          'gstin': gstinCtrl.text.trim().isNotEmpty
                              ? gstinCtrl.text.trim()
                              : null,
                          'timezone': 'Asia/Kolkata',
                          'currency': 'INR',
                        });
                        ref.invalidate(branchesProvider);
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: RosTheme.secondary,
                              content: Text('Outlet "$name" provisioned successfully.'),
                            ),
                          );
                        }
                      } catch (err) {
                        setDlgState(() => isSubmitting = false);
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: RosTheme.danger,
                              content: Text('Failed to create outlet: $err'),
                            ),
                          );
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: RosTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              ),
              child: isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Provision Outlet', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}
