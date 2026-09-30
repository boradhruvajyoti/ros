// =============================================================================
// Promotions & Marketing Screen — Coupons, Bill Thresholds, Item Combos & Presets
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

class PromotionsScreen extends ConsumerStatefulWidget {
  const PromotionsScreen({super.key});

  @override
  ConsumerState<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends ConsumerState<PromotionsScreen> {
  String _activeTab = 'ALL'; // ALL | LIMITED_TIME_COUPON | BILL_THRESHOLD | ITEM_COMBO_COMPLIMENTARY | CUSTOM_DISCOUNT
  String? _broadcastNotification;

  Future<void> _toggleStatus(PromotionCampaign campaign) async {
    HapticFeedback.lightImpact();
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/marketing/promotions/${campaign.id}/status', data: {});
      ref.invalidate(promotionsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              campaign.status == 'ACTIVE'
                  ? '"${campaign.name}" paused'
                  : '🎉 "${campaign.name}" is now live!',
            ),
            backgroundColor: campaign.status == 'ACTIVE' ? RosTheme.warning : RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating status: $e'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  Future<void> _deleteCampaign(PromotionCampaign campaign) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        title: const Text('Delete Promotion?', style: TextStyle(color: RosTheme.textPrimary, fontWeight: FontWeight.bold)),
        content: Text(
          'Are you sure you want to remove "${campaign.name}" (${campaign.code})? This action cannot be undone.',
          style: const TextStyle(color: RosTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: RosTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: RosTheme.danger, foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      HapticFeedback.mediumImpact();
      try {
        final api = ref.read(apiClientProvider);
        await api.delete('/marketing/promotions/${campaign.id}');
        ref.invalidate(promotionsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Promotion removed successfully'),
              backgroundColor: RosTheme.secondary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Delete error: $e'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
          );
        }
      }
    }
  }

  void _triggerBroadcastSimulator(String campaignName) {
    HapticFeedback.selectionClick();
    setState(() {
      _broadcastNotification = '📱 Dispatched WhatsApp & SMS promo notification to diners for "$campaignName"!';
    });
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        setState(() {
          _broadcastNotification = null;
        });
      }
    });
  }

  void _openCreatePromoSheet() {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _CreatePromoSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final promosAsync = ref.watch(promotionsProvider);

    return Scaffold(
      backgroundColor: RosTheme.bg,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreatePromoSheet,
        backgroundColor: RosTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text('Create Promo', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: CustomScrollView(
        slivers: [
          // ── App Header Bar ──
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              decoration: const BoxDecoration(
                color: RosTheme.bgCard,
                border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              gradient: RosTheme.primaryGradient,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 12),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Promotions & Offers',
                                style: TextStyle(
                                  color: RosTheme.textPrimary,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                'Coupons, Spend Rewards & Combos',
                                style: TextStyle(
                                  color: RosTheme.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          ref.invalidate(promotionsProvider);
                        },
                        icon: const Icon(Icons.refresh_rounded, color: RosTheme.textSecondary),
                        tooltip: 'Refresh Promotions',
                      ),
                    ],
                  ),

                  if (_broadcastNotification != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: RosTheme.secondary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: RosTheme.secondary.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.mark_chat_read_rounded, color: RosTheme.secondary, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _broadcastNotification!,
                              style: const TextStyle(
                                color: RosTheme.secondary,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // ── Stats Summary Bar ──
          SliverToBoxAdapter(
            child: promosAsync.when(
              data: (list) {
                final activeCount = list.where((c) => c.status == 'ACTIVE').length;
                final totalRedemptions = list.fold<int>(0, (sum, c) => sum + c.redemptions);
                final totalSavings = list.fold<double>(0.0, (sum, c) => sum + c.totalSavings);

                return Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  child: Row(
                    children: [
                      _buildMetricItem('Active Live', '$activeCount', Icons.bolt_rounded, RosTheme.secondary),
                      Container(width: 1, height: 32, color: RosTheme.bgBorder),
                      _buildMetricItem('Redemptions', '$totalRedemptions', Icons.group_rounded, RosTheme.primary),
                      Container(width: 1, height: 32, color: RosTheme.bgBorder),
                      _buildMetricItem('Diner Savings', '₹${totalSavings.toStringAsFixed(0)}', Icons.savings_rounded, const Color(0xFF10B981)),
                    ],
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),

          // ── Promo Type Filter Tabs ──
          SliverToBoxAdapter(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _buildFilterTab('ALL', 'All Offers', Icons.all_inclusive_rounded),
                  const SizedBox(width: 8),
                  _buildFilterTab('LIMITED_TIME_COUPON', 'Coupons', Icons.local_offer_rounded),
                  const SizedBox(width: 8),
                  _buildFilterTab('BILL_THRESHOLD', 'Spend Rewards', Icons.card_giftcard_rounded),
                  const SizedBox(width: 8),
                  _buildFilterTab('ITEM_COMBO_COMPLIMENTARY', 'Item Combos', Icons.fastfood_rounded),
                  const SizedBox(width: 8),
                  _buildFilterTab('CUSTOM_DISCOUNT', 'Billing Presets', Icons.tune_rounded),
                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 14)),

          // ── Campaign Cards List ──
          promosAsync.when(
            data: (allPromos) {
              final list = _activeTab == 'ALL'
                  ? allPromos
                  : allPromos.where((p) => p.type == _activeTab).toList();

              if (list.isEmpty) {
                return SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: RosTheme.bgElevated,
                            shape: BoxShape.circle,
                            border: Border.all(color: RosTheme.bgBorder),
                          ),
                          child: const Icon(Icons.campaign_outlined, size: 48, color: RosTheme.textMuted),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No Promotions in this section',
                          style: TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Tap "+ Create Promo" below to boost table sales & repeat visits.',
                          style: TextStyle(color: RosTheme.textMuted, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = list[index];
                      return _buildPromoCard(item);
                    },
                    childCount: list.length,
                  ),
                ),
              );
            },
            loading: () => const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: RosTheme.primary)),
            ),
            error: (err, _) => SliverFillRemaining(
              child: Center(
                child: Text('Error loading promotions: $err', style: const TextStyle(color: RosTheme.danger)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 14),
              const SizedBox(width: 4),
              Text(
                value,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w900),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: RosTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterTab(String key, String label, IconData icon) {
    final isSelected = _activeTab == key;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _activeTab = key);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? RosTheme.primary.withValues(alpha: 0.2) : RosTheme.bgElevated,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? RosTheme.primary : RosTheme.bgBorder,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? RosTheme.primary : RosTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : RosTheme.textSecondary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromoCard(PromotionCampaign campaign) {
    final isActive = campaign.status == 'ACTIVE';

    IconData typeIcon;
    Color typeColor;
    String typeBadge;

    switch (campaign.type) {
      case 'LIMITED_TIME_COUPON':
        typeIcon = Icons.local_offer_rounded;
        typeColor = const Color(0xFFF59E0B);
        typeBadge = 'Coupon Code';
        break;
      case 'BILL_THRESHOLD':
        typeIcon = Icons.card_giftcard_rounded;
        typeColor = const Color(0xFF10B981);
        typeBadge = 'Spend Reward';
        break;
      case 'ITEM_COMBO_COMPLIMENTARY':
        typeIcon = Icons.fastfood_rounded;
        typeColor = const Color(0xFF6366F1);
        typeBadge = 'Item Combo';
        break;
      case 'CUSTOM_DISCOUNT':
        typeIcon = Icons.tune_rounded;
        typeColor = const Color(0xFFEC4899);
        typeBadge = 'Billing Presets';
        break;
      default:
        typeIcon = Icons.campaign_rounded;
        typeColor = RosTheme.primary;
        typeBadge = 'Promotion';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isActive ? RosTheme.bgBorder : RosTheme.bgBorder.withValues(alpha: 0.5),
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Ribbon
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              color: RosTheme.bgElevated,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: typeColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: typeColor.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(typeIcon, size: 12, color: typeColor),
                        const SizedBox(width: 4),
                        Text(
                          typeBadge,
                          style: TextStyle(color: typeColor, fontSize: 10, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (campaign.autoApply)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: RosTheme.secondary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        '⚡ Auto-Applies',
                        style: TextStyle(color: RosTheme.secondary, fontSize: 9.5, fontWeight: FontWeight.w700),
                      ),
                    ),
                  const Spacer(),
                  // Active / Paused switch
                  Transform.scale(
                    scale: 0.75,
                    child: Switch(
                      value: isActive,
                      activeThumbColor: RosTheme.secondary,
                      onChanged: (_) => _toggleStatus(campaign),
                    ),
                  ),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: const Icon(Icons.delete_outline_rounded, size: 18, color: RosTheme.textMuted),
                    onPressed: () => _deleteCampaign(campaign),
                  ),
                ],
              ),
            ),

            // Main Details Body
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              campaign.name,
                              style: const TextStyle(
                                color: RosTheme.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            // Code pill with copy
                            GestureDetector(
                              onTap: () {
                                Clipboard.setData(ClipboardData(text: campaign.code));
                                HapticFeedback.selectionClick();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Copied code "${campaign.code}" to clipboard!'),
                                    duration: const Duration(seconds: 1),
                                    backgroundColor: RosTheme.secondary,
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: RosTheme.bgElevated,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: RosTheme.bgBorder),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      campaign.code,
                                      style: const TextStyle(
                                        color: RosTheme.textPrimary,
                                        fontFamily: 'monospace',
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.copy_rounded, size: 11, color: RosTheme.textMuted),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Benefit Callout
                      _buildBenefitCallout(campaign),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Campaign Details specifics
                  if (campaign.type == 'ITEM_COMBO_COMPLIMENTARY' && campaign.triggerItems.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shopping_bag_outlined, size: 14, color: RosTheme.textSecondary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Requires: ${campaign.triggerItems.map((t) => "${t.quantity}x ${t.name}").join(" + ")}',
                              style: const TextStyle(color: RosTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],

                  if (campaign.type == 'CUSTOM_DISCOUNT' && campaign.customPresets != null) ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Quick Cashier Presets: ${campaign.customPresets!.percentages.map((p) => "$p%").join(", ")} | ${campaign.customPresets!.flatAmounts.map((f) => "₹$f").join(", ")}',
                            style: const TextStyle(color: RosTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Reasons: ${campaign.customPresets!.reasons.join(" • ")}',
                            style: const TextStyle(color: RosTheme.textMuted, fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],

                  // Validity and Broadcast Footer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 12, color: RosTheme.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            'Valid: ${campaign.validFrom.split("T").first} → ${campaign.validTo.split("T").first}',
                            style: const TextStyle(color: RosTheme.textMuted, fontSize: 10.5, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: () => _triggerBroadcastSimulator(campaign.name),
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          foregroundColor: RosTheme.primary,
                        ),
                        icon: const Icon(Icons.send_rounded, size: 12),
                        label: const Text('Broadcast Blast', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBenefitCallout(PromotionCampaign campaign) {
    if (campaign.type == 'LIMITED_TIME_COUPON') {
      final isPct = campaign.discountType == 'PERCENTAGE';
      final val = isPct ? '${campaign.discountValue.toInt()}% OFF' : '₹${campaign.discountValue.toInt()} OFF';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(val, style: const TextStyle(color: RosTheme.secondary, fontSize: 15, fontWeight: FontWeight.w900)),
          if (campaign.minOrderValue > 0)
            Text('Min ₹${campaign.minOrderValue.toInt()}', style: const TextStyle(color: RosTheme.textMuted, fontSize: 10)),
        ],
      );
    } else if (campaign.type == 'BILL_THRESHOLD') {
      if (campaign.rewardType == 'COMPLIMENTARY_ITEM') {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text('🎁 Free Gift', style: TextStyle(color: RosTheme.secondary, fontSize: 13, fontWeight: FontWeight.w900)),
            Text(campaign.complementaryItemName ?? 'Item', style: const TextStyle(color: RosTheme.textPrimary, fontSize: 11, fontWeight: FontWeight.bold)),
            Text('on order > ₹${campaign.minOrderValue.toInt()}', style: const TextStyle(color: RosTheme.textMuted, fontSize: 10)),
          ],
        );
      } else {
        final isPct = campaign.discountType == 'PERCENTAGE';
        final val = isPct ? '${campaign.discountValue.toInt()}% OFF' : '₹${campaign.discountValue.toInt()} OFF';
        return Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(val, style: const TextStyle(color: RosTheme.secondary, fontSize: 14, fontWeight: FontWeight.w900)),
            Text('on order > ₹${campaign.minOrderValue.toInt()}', style: const TextStyle(color: RosTheme.textMuted, fontSize: 10)),
          ],
        );
      }
    } else if (campaign.type == 'ITEM_COMBO_COMPLIMENTARY') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const Text('🎁 Combo Gift', style: TextStyle(color: Color(0xFF6366F1), fontSize: 13, fontWeight: FontWeight.w900)),
          Text('Free ${campaign.complementaryItemName ?? "Item"}', style: const TextStyle(color: RosTheme.textPrimary, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      );
    } else {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text('POS Presets', style: TextStyle(color: Color(0xFFEC4899), fontSize: 13, fontWeight: FontWeight.w900)),
          Text('Quick Discounts', style: TextStyle(color: RosTheme.textMuted, fontSize: 10)),
        ],
      );
    }
  }
}

// ── Create Promotion Modal Sheet ──────────────────────────────────────────────

class _CreatePromoSheet extends ConsumerStatefulWidget {
  const _CreatePromoSheet();

  @override
  ConsumerState<_CreatePromoSheet> createState() => _CreatePromoSheetState();
}

class _CreatePromoSheetState extends ConsumerState<_CreatePromoSheet> {
  String _promoType = 'LIMITED_TIME_COUPON'; // LIMITED_TIME_COUPON | BILL_THRESHOLD | ITEM_COMBO_COMPLIMENTARY | CUSTOM_DISCOUNT
  final _nameCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  String _discountType = 'PERCENTAGE'; // PERCENTAGE | FLAT
  final _discountValCtrl = TextEditingController(text: '20');
  final _minOrderCtrl = TextEditingController(text: '499');
  final _maxDiscountCtrl = TextEditingController(text: '200');

  // Bill Threshold
  String _thresholdRewardType = 'COMPLIMENTARY_ITEM'; // DISCOUNT | COMPLIMENTARY_ITEM
  final _thresholdFreeItemCtrl = TextEditingController(text: 'Signature Chocolate Brownie');

  // Combo
  final _comboTrigger1Ctrl = TextEditingController(text: 'Burger');
  final _comboTrigger2Ctrl = TextEditingController(text: 'Pizza');
  final _comboFreeItemCtrl = TextEditingController(text: 'Fresh Brewed Coffee');

  // Custom Presets
  final _customPercentsCtrl = TextEditingController(text: '5, 10, 15, 20');
  final _customFlatsCtrl = TextEditingController(text: '50, 100, 150, 200');
  final _customReasonsCtrl = TextEditingController(text: 'Owner Courtesy, VIP Guest, Customer Delight, Staff Family');

  bool _isSaving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _codeCtrl.dispose();
    _discountValCtrl.dispose();
    _minOrderCtrl.dispose();
    _maxDiscountCtrl.dispose();
    _thresholdFreeItemCtrl.dispose();
    _comboTrigger1Ctrl.dispose();
    _comboTrigger2Ctrl.dispose();
    _comboFreeItemCtrl.dispose();
    _customPercentsCtrl.dispose();
    _customFlatsCtrl.dispose();
    _customReasonsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a campaign name'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
      );
      return;
    }

    final now = DateTime.now();
    final validFrom = now.toIso8601String().split('T').first;
    final validTo = now.add(const Duration(days: 30)).toIso8601String().split('T').first;

    final payload = <String, dynamic>{
      'name': name,
      'type': _promoType,
      'validFrom': validFrom,
      'validTo': validTo,
      'highlightOnQrMenu': true,
    };

    if (_promoType == 'LIMITED_TIME_COUPON') {
      final code = _codeCtrl.text.trim().toUpperCase();
      if (code.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a coupon code'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
        );
        return;
      }
      payload['code'] = code;
      payload['discountType'] = _discountType;
      payload['discountValue'] = double.tryParse(_discountValCtrl.text.trim()) ?? 0.0;
      payload['minOrderValue'] = double.tryParse(_minOrderCtrl.text.trim()) ?? 0.0;
      if (_maxDiscountCtrl.text.trim().isNotEmpty) {
        payload['maxDiscount'] = double.tryParse(_maxDiscountCtrl.text.trim());
      }
      payload['autoApply'] = false;
    } else if (_promoType == 'BILL_THRESHOLD') {
      final code = _codeCtrl.text.trim().isNotEmpty ? _codeCtrl.text.trim().toUpperCase() : 'AUTO-SPEND${_minOrderCtrl.text.trim()}';
      payload['code'] = code;
      payload['minOrderValue'] = double.tryParse(_minOrderCtrl.text.trim()) ?? 1000.0;
      payload['rewardType'] = _thresholdRewardType;
      payload['autoApply'] = true;
      if (_thresholdRewardType == 'DISCOUNT') {
        payload['discountType'] = _discountType;
        payload['discountValue'] = double.tryParse(_discountValCtrl.text.trim()) ?? 0.0;
      } else {
        payload['complementaryItemName'] = _thresholdFreeItemCtrl.text.trim().isNotEmpty
            ? _thresholdFreeItemCtrl.text.trim()
            : 'Signature Dessert';
        payload['complementaryItemQuantity'] = 1;
      }
    } else if (_promoType == 'ITEM_COMBO_COMPLIMENTARY') {
      final code = _codeCtrl.text.trim().isNotEmpty
          ? _codeCtrl.text.trim().toUpperCase()
          : 'COMBO-FREE-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
      payload['code'] = code;
      payload['rewardType'] = 'COMPLIMENTARY_ITEM';
      payload['complementaryItemName'] = _comboFreeItemCtrl.text.trim().isNotEmpty
          ? _comboFreeItemCtrl.text.trim()
          : 'Free Drink';
      payload['complementaryItemQuantity'] = 1;

      final triggers = <Map<String, dynamic>>[];
      if (_comboTrigger1Ctrl.text.trim().isNotEmpty) {
        triggers.add({
          'menuItemId': 'item-${_comboTrigger1Ctrl.text.trim().toLowerCase().replaceAll(' ', '-')}',
          'name': _comboTrigger1Ctrl.text.trim(),
          'quantity': 1,
        });
      }
      if (_comboTrigger2Ctrl.text.trim().isNotEmpty) {
        triggers.add({
          'menuItemId': 'item-${_comboTrigger2Ctrl.text.trim().toLowerCase().replaceAll(' ', '-')}',
          'name': _comboTrigger2Ctrl.text.trim(),
          'quantity': 1,
        });
      }
      payload['triggerItems'] = triggers;
      payload['autoApply'] = true;
    } else if (_promoType == 'CUSTOM_DISCOUNT') {
      payload['code'] = 'CUSTOM-BILLING-PRESETS';
      final pcts = _customPercentsCtrl.text
          .split(',')
          .map((s) => double.tryParse(s.trim()))
          .whereType<double>()
          .toList();
      final flats = _customFlatsCtrl.text
          .split(',')
          .map((s) => double.tryParse(s.trim()))
          .whereType<double>()
          .toList();
      final reasons = _customReasonsCtrl.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();

      payload['customPresets'] = {
        'percentages': pcts.isNotEmpty ? pcts : [5, 10, 15, 20],
        'flatAmounts': flats.isNotEmpty ? flats : [50, 100, 150, 200],
        'reasons': reasons.isNotEmpty ? reasons : ['Owner Courtesy', 'VIP Guest'],
      };
      payload['autoApply'] = false;
      payload['highlightOnQrMenu'] = false;
    }

    setState(() => _isSaving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/marketing/promotions', data: payload);
      ref.invalidate(promotionsProvider);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🎉 Promotion "$name" launched successfully!'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create promotion: $e'), backgroundColor: RosTheme.danger, behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle Bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: RosTheme.bgBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Modal Title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.add_circle_outline_rounded, color: RosTheme.primary, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Launch New Offer',
                      style: TextStyle(color: RosTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: RosTheme.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Select Promotion Archetype
            const Text(
              'PROMOTION TYPE',
              style: TextStyle(color: RosTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildTypeChoice('LIMITED_TIME_COUPON', 'Coupon Code', Icons.local_offer_rounded),
                  const SizedBox(width: 8),
                  _buildTypeChoice('BILL_THRESHOLD', 'Spend Reward', Icons.card_giftcard_rounded),
                  const SizedBox(width: 8),
                  _buildTypeChoice('ITEM_COMBO_COMPLIMENTARY', 'Combo Freebie', Icons.fastfood_rounded),
                  const SizedBox(width: 8),
                  _buildTypeChoice('CUSTOM_DISCOUNT', 'Cashier Presets', Icons.tune_rounded),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Common: Campaign Name
            _buildTextField(
              controller: _nameCtrl,
              label: 'Campaign Title *',
              hint: _promoType == 'LIMITED_TIME_COUPON'
                  ? 'e.g. Diwali Fest 20% Off'
                  : _promoType == 'BILL_THRESHOLD'
                      ? 'e.g. Spend ₹999 Get Free Brownie'
                      : _promoType == 'ITEM_COMBO_COMPLIMENTARY'
                          ? 'e.g. Burger + Pizza = Free Coffee'
                          : 'e.g. Cashier Discount Presets',
            ),
            const SizedBox(height: 12),

            // Specific fields based on type
            if (_promoType == 'LIMITED_TIME_COUPON') ...[
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _codeCtrl,
                      label: 'Coupon Code *',
                      hint: 'FESTIVE20',
                      textCapitalization: TextCapitalization.characters,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Discount Unit', style: TextStyle(color: RosTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        Container(
                          height: 48,
                          decoration: BoxDecoration(
                            color: RosTheme.bgElevated,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: RosTheme.bgBorder),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _discountType = 'PERCENTAGE'),
                                  child: Container(
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: _discountType == 'PERCENTAGE' ? RosTheme.primary : Colors.transparent,
                                      borderRadius: BorderRadius.circular(11),
                                    ),
                                    child: Text(
                                      '% Percent',
                                      style: TextStyle(
                                        color: _discountType == 'PERCENTAGE' ? Colors.white : RosTheme.textSecondary,
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _discountType = 'FLAT'),
                                  child: Container(
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: _discountType == 'FLAT' ? RosTheme.primary : Colors.transparent,
                                      borderRadius: BorderRadius.circular(11),
                                    ),
                                    child: Text(
                                      '₹ Flat',
                                      style: TextStyle(
                                        color: _discountType == 'FLAT' ? Colors.white : RosTheme.textSecondary,
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _discountValCtrl,
                      label: _discountType == 'PERCENTAGE' ? 'Discount % *' : 'Flat ₹ Discount *',
                      hint: '20',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildTextField(
                      controller: _minOrderCtrl,
                      label: 'Min Order (₹)',
                      hint: '499',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
            ] else if (_promoType == 'BILL_THRESHOLD') ...[
              _buildTextField(
                controller: _minOrderCtrl,
                label: 'Min Order Spend Threshold (₹) *',
                hint: '999',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _thresholdRewardType = 'COMPLIMENTARY_ITEM'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _thresholdRewardType == 'COMPLIMENTARY_ITEM' ? RosTheme.secondary.withValues(alpha: 0.2) : RosTheme.bgElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _thresholdRewardType == 'COMPLIMENTARY_ITEM' ? RosTheme.secondary : RosTheme.bgBorder,
                          ),
                        ),
                        child: const Text('🎁 Free Complementary Item', style: TextStyle(color: RosTheme.textPrimary, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _thresholdRewardType = 'DISCOUNT'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _thresholdRewardType == 'DISCOUNT' ? RosTheme.primary.withValues(alpha: 0.2) : RosTheme.bgElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _thresholdRewardType == 'DISCOUNT' ? RosTheme.primary : RosTheme.bgBorder,
                          ),
                        ),
                        child: const Text('% Discount on Bill', style: TextStyle(color: RosTheme.textPrimary, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_thresholdRewardType == 'COMPLIMENTARY_ITEM')
                _buildTextField(
                  controller: _thresholdFreeItemCtrl,
                  label: 'Free Gift Item Name *',
                  hint: 'e.g. Signature Chocolate Brownie / Cold Drink',
                )
              else
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _discountValCtrl,
                        label: 'Discount Value *',
                        hint: '15',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
            ] else if (_promoType == 'ITEM_COMBO_COMPLIMENTARY') ...[
              _buildTextField(
                controller: _comboTrigger1Ctrl,
                label: 'Required Dish / Item 1 *',
                hint: 'e.g. Double Cheeseburger',
              ),
              const SizedBox(height: 10),
              _buildTextField(
                controller: _comboTrigger2Ctrl,
                label: 'Required Dish / Item 2 (Optional)',
                hint: 'e.g. Medium Pepperoni Pizza',
              ),
              const SizedBox(height: 10),
              _buildTextField(
                controller: _comboFreeItemCtrl,
                label: 'Free Complementary Reward Item *',
                hint: 'e.g. Fresh Brewed Iced Tea',
              ),
            ] else if (_promoType == 'CUSTOM_DISCOUNT') ...[
              _buildTextField(
                controller: _customPercentsCtrl,
                label: 'Quick % Discount Buttons',
                hint: '5, 10, 15, 20',
              ),
              const SizedBox(height: 10),
              _buildTextField(
                controller: _customFlatsCtrl,
                label: 'Quick Flat ₹ Discount Buttons',
                hint: '50, 100, 150, 200',
              ),
              const SizedBox(height: 10),
              _buildTextField(
                controller: _customReasonsCtrl,
                label: 'Reason Tags (comma separated)',
                hint: 'Owner Courtesy, VIP Guest, Delay, Staff',
              ),
            ],

            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Launch Promotion Campaign', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeChoice(String key, String label, IconData icon) {
    final isSelected = _promoType == key;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _promoType = key);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? RosTheme.primary.withValues(alpha: 0.2) : RosTheme.bgElevated,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? RosTheme.primary : RosTheme.bgBorder, width: isSelected ? 1.5 : 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? RosTheme.primary : RosTheme.textSecondary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : RosTheme.textSecondary,
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: RosTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
            filled: true,
            fillColor: RosTheme.bgElevated,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: RosTheme.bgBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: RosTheme.bgBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: RosTheme.primary)),
          ),
        ),
      ],
    );
  }
}
