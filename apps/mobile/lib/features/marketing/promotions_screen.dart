// =============================================================================
// Promotions & Marketing Screen — Coupons, Bill Thresholds, Item Combos & Presets
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
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

  void _openPrintCouponSheet(PromotionCampaign campaign) {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _PrintCouponSheet(campaign: campaign),
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
                                    if (campaign.generatedCodes.length > 1) ...[
                                      const SizedBox(width: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: RosTheme.primary.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          '+${campaign.generatedCodes.length - 1} codes',
                                          style: const TextStyle(color: RosTheme.primary, fontSize: 9, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
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

                  // Dynamic Cards info banner for coupons
                  if (campaign.type == 'LIMITED_TIME_COUPON' && (campaign.generatedCodes.length > 1 || campaign.cardCount != null)) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: RosTheme.bgBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.print_outlined, size: 13, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '📦 ${campaign.generatedCodes.isNotEmpty ? campaign.generatedCodes.length : (campaign.cardCount ?? 8)} unique dynamic codes saved to database (non-repeating on printable PDF cards)',
                              style: const TextStyle(color: RosTheme.textSecondary, fontSize: 10, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],

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

                  // Validity and Actions Footer
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
                      Row(
                        children: [
                          if (campaign.type == 'LIMITED_TIME_COUPON') ...[
                            TextButton.icon(
                              onPressed: () => _openPrintCouponSheet(campaign),
                              style: TextButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                foregroundColor: const Color(0xFFF59E0B),
                              ),
                              icon: const Icon(Icons.print_rounded, size: 12),
                              label: const Text('Print Cards', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                            ),
                            const SizedBox(width: 4),
                          ],
                          TextButton.icon(
                            onPressed: () => _triggerBroadcastSimulator(campaign.name),
                            style: TextButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              foregroundColor: RosTheme.primary,
                            ),
                            icon: const Icon(Icons.send_rounded, size: 12),
                            label: const Text('Broadcast', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                          ),
                        ],
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
  final _cardCountCtrl = TextEditingController(text: '8');
  String _discountType = 'PERCENTAGE'; // PERCENTAGE | FLAT
  final _discountValCtrl = TextEditingController(text: '20');
  final _minOrderCtrl = TextEditingController(text: '499');
  final _maxDiscountCtrl = TextEditingController(text: '200');

  late final TextEditingController _validFromCtrl;
  late final TextEditingController _validToCtrl;

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
  void initState() {
    super.initState();
    final now = DateTime.now();
    _validFromCtrl = TextEditingController(text: now.toIso8601String().split('T').first);
    _validToCtrl = TextEditingController(text: now.add(const Duration(days: 30)).toIso8601String().split('T').first);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _codeCtrl.dispose();
    _cardCountCtrl.dispose();
    _discountValCtrl.dispose();
    _minOrderCtrl.dispose();
    _maxDiscountCtrl.dispose();
    _validFromCtrl.dispose();
    _validToCtrl.dispose();
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

    final validFrom = _validFromCtrl.text.trim().isNotEmpty ? _validFromCtrl.text.trim() : DateTime.now().toIso8601String().split('T').first;
    final validTo = _validToCtrl.text.trim().isNotEmpty ? _validToCtrl.text.trim() : DateTime.now().add(const Duration(days: 30)).toIso8601String().split('T').first;

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
      payload['cardCount'] = int.tryParse(_cardCountCtrl.text.trim()) ?? 8;
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
    final menuCategories = ref.watch(posMenuProvider).valueOrNull ?? [];
    final allMenuItems = menuCategories.expand((c) => c.items).toList();

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
                      label: 'Coupon Code Base / Prefix *',
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

              // Number of Coupon Cards & Dynamic Codes
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Number of Coupon Cards / Codes to Create *',
                        style: TextStyle(color: RosTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                      Text(
                        '${_cardCountCtrl.text} cards',
                        style: const TextStyle(color: RosTheme.primary, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      SizedBox(
                        width: 70,
                        child: TextField(
                          controller: _cardCountCtrl,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            filled: true,
                            fillColor: RosTheme.bgElevated,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: RosTheme.bgBorder)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: RosTheme.bgBorder)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: ['8', '16', '24', '32', '48', '80'].map((val) {
                              final isSel = _cardCountCtrl.text == val;
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text('$val cards', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: isSel ? Colors.white : RosTheme.textSecondary)),
                                  selected: isSel,
                                  selectedColor: RosTheme.primary,
                                  backgroundColor: RosTheme.bgElevated,
                                  onSelected: (_) => setState(() => _cardCountCtrl.text = val),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Generates unique non-repeating dynamic coupon codes saved in the database for each printed card.',
                    style: TextStyle(color: RosTheme.textMuted, fontSize: 10),
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
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildTextField(
                      controller: _maxDiscountCtrl,
                      label: 'Max Cap (₹)',
                      hint: '200',
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
              if (_thresholdRewardType == 'COMPLIMENTARY_ITEM') ...[
                _buildTextField(
                  controller: _thresholdFreeItemCtrl,
                  label: 'Free Gift Item Name (From Menu Cards) *',
                  hint: 'e.g. Signature Chocolate Brownie / Cold Drink',
                ),
                if (allMenuItems.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: allMenuItems.take(10).map((item) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            label: Text('+ ${item.name}', style: const TextStyle(fontSize: 10, color: RosTheme.textPrimary)),
                            backgroundColor: RosTheme.bgElevated,
                            onPressed: () {
                              HapticFeedback.selectionClick();
                              setState(() => _thresholdFreeItemCtrl.text = item.name);
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ] else
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
                label: 'Free Complementary Reward Item (From Menu Cards) *',
                hint: 'e.g. Fresh Brewed Iced Tea',
              ),
              if (allMenuItems.isNotEmpty) ...[
                const SizedBox(height: 6),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: allMenuItems.take(10).map((item) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ActionChip(
                          label: Text('+ ${item.name}', style: const TextStyle(fontSize: 10, color: RosTheme.textPrimary)),
                          backgroundColor: RosTheme.bgElevated,
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            setState(() => _comboFreeItemCtrl.text = item.name);
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
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

            const SizedBox(height: 12),

            // Date Range: Valid From & Valid To
            Row(
              children: [
                Expanded(
                  child: _buildTextField(
                    controller: _validFromCtrl,
                    label: 'Valid From (YYYY-MM-DD) *',
                    hint: '2026-09-30',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildTextField(
                    controller: _validToCtrl,
                    label: 'Valid To / Expiry *',
                    hint: '2026-10-30',
                  ),
                ),
              ],
            ),

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

// ─────────────────────────────────────────────────────────────────────────────
// PRINTABLE COUPON CARDS SHEET (A4 Multi-Card PDF Layout)
// ─────────────────────────────────────────────────────────────────────────────

class _PrintCouponSheet extends ConsumerStatefulWidget {
  final PromotionCampaign campaign;

  const _PrintCouponSheet({required this.campaign});

  @override
  ConsumerState<_PrintCouponSheet> createState() => _PrintCouponSheetState();
}

class _PrintCouponSheetState extends ConsumerState<_PrintCouponSheet> {
  int _cardCount = 8;
  late final TextEditingController _countController;
  bool _generating = false;

  @override
  void initState() {
    super.initState();
    final defaultCount = widget.campaign.cardCount ??
        (widget.campaign.generatedCodes.isNotEmpty
            ? widget.campaign.generatedCodes.length
            : 8);
    _cardCount = defaultCount.clamp(1, 500);
    _countController = TextEditingController(text: '$_cardCount');
  }

  @override
  void dispose() {
    _countController.dispose();
    super.dispose();
  }

  void _setCount(int count) {
    HapticFeedback.selectionClick();
    setState(() {
      _cardCount = count.clamp(1, 500);
      _countController.text = '$_cardCount';
    });
  }

  Future<void> _handlePrintPdf() async {
    setState(() => _generating = true);
    HapticFeedback.mediumImpact();

    try {
      final api = ref.read(apiClientProvider);

      String restaurantName = 'Restaurant OS';
      String address = 'Main Branch, City Center';
      String phone = '+1 (555) 019-2834';

      try {
        final tenantData = await api.get<dynamic>('/tenants/current');
        if (tenantData is Map) {
          restaurantName = tenantData['name']?.toString() ?? restaurantName;
          if (tenantData['address'] != null && tenantData['address'].toString().isNotEmpty) {
            address = tenantData['address'].toString();
          } else if (tenantData['branches'] is List && (tenantData['branches'] as List).isNotEmpty) {
            address = tenantData['branches'][0]['address']?.toString() ?? address;
          }
          if (tenantData['phone'] != null && tenantData['phone'].toString().isNotEmpty) {
            phone = tenantData['phone'].toString();
          } else if (tenantData['branches'] is List && (tenantData['branches'] as List).isNotEmpty) {
            phone = tenantData['branches'][0]['phone']?.toString() ?? phone;
          }
        }
      } catch (_) {}

      final count = _cardCount.clamp(1, 500);
      final cardsPerPage = 8;
      final totalPages = (count / cardsPerPage).ceil();

      final discountText = widget.campaign.discountType == 'PERCENTAGE'
          ? '${widget.campaign.discountValue.toStringAsFixed(0)}% OFF'
          : '₹${widget.campaign.discountValue.toStringAsFixed(0)} FLAT OFF';

      final conditionText = [
        if (widget.campaign.minOrderValue > 0) 'Min Spend: ₹${widget.campaign.minOrderValue.toStringAsFixed(0)}' else 'No Min Spend',
        if (widget.campaign.maxDiscount != null && widget.campaign.maxDiscount! > 0)
          'Max Cap: ₹${widget.campaign.maxDiscount!.toStringAsFixed(0)}',
      ].join(' • ');

      final validFrom = widget.campaign.validFrom.split('T').first;
      final validTo = widget.campaign.validTo.split('T').first;

      final baseCode = widget.campaign.code.trim().toUpperCase();
      final existingCodes = widget.campaign.generatedCodes;
      final List<String> codesList = [];

      for (int i = 0; i < count; i++) {
        if (i < existingCodes.length && existingCodes[i].isNotEmpty) {
          codesList.add(existingCodes[i]);
        } else {
          final numSuffix = (i + 1).toString().padLeft(3, '0');
          codesList.add('$baseCode-$numSuffix');
        }
      }

      final doc = pw.Document();

      int cardsRemaining = count;
      int globalCardIdx = 0;
      for (int p = 0; p < totalPages; p++) {
        final cardsInThisPage = cardsRemaining > cardsPerPage ? cardsPerPage : cardsRemaining;
        cardsRemaining -= cardsInThisPage;

        final List<pw.Widget> rows = [];
        for (int r = 0; r < 4; r++) {
          final idx1 = r * 2;
          final idx2 = r * 2 + 1;

          final card1 = idx1 < cardsInThisPage
              ? _buildPdfCard(
                  restaurantName: restaurantName,
                  address: address,
                  phone: phone,
                  discountText: discountText,
                  conditionText: conditionText,
                  validFrom: validFrom,
                  validTo: validTo,
                  cardCode: codesList[globalCardIdx++],
                  cardIndex: globalCardIdx,
                )
              : pw.Container();

          final card2 = idx2 < cardsInThisPage
              ? _buildPdfCard(
                  restaurantName: restaurantName,
                  address: address,
                  phone: phone,
                  discountText: discountText,
                  conditionText: conditionText,
                  validFrom: validFrom,
                  validTo: validTo,
                  cardCode: codesList[globalCardIdx++],
                  cardIndex: globalCardIdx,
                )
              : pw.Container();

          rows.add(
            pw.Expanded(
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                children: [
                  pw.Expanded(child: card1),
                  pw.SizedBox(width: 8),
                  pw.Expanded(child: card2),
                ],
              ),
            ),
          );

          if (r < 3) {
            rows.add(pw.SizedBox(height: 8));
          }
        }

        doc.addPage(
          pw.Page(
            pageFormat: PdfPageFormat.a4,
            margin: const pw.EdgeInsets.all(16),
            build: (pw.Context ctx) {
              return pw.Column(children: rows);
            },
          ),
        );
      }

      if (mounted) {
        Navigator.pop(context);
      }

      await Printing.layoutPdf(
        name: 'Coupons_${widget.campaign.code}.pdf',
        onLayout: (PdfPageFormat format) async => doc.save(),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error generating PDF: $e'), backgroundColor: RosTheme.danger),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _generating = false);
      }
    }
  }

  pw.Widget _buildPdfCard({
    required String restaurantName,
    required String address,
    required String phone,
    required String discountText,
    required String conditionText,
    required String validFrom,
    required String validTo,
    required String cardCode,
    required int cardIndex,
  }) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.grey500, width: 0.8, style: pw.BorderStyle.dashed),
        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
        color: PdfColors.white,
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          // Header Row
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      restaurantName.toUpperCase(),
                      style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900),
                      maxLines: 1,
                    ),
                    pw.Text(
                      '$address • Tel: $phone',
                      style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey700),
                      maxLines: 1,
                    ),
                  ],
                ),
              ),
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                decoration: pw.BoxDecoration(
                  color: PdfColors.amber100,
                  borderRadius: pw.BorderRadius.circular(3),
                  border: pw.Border.all(color: PdfColors.amber400, width: 0.5),
                ),
                child: pw.Text(
                  'VOUCHER #$cardIndex',
                  style: pw.TextStyle(fontSize: 5.5, fontWeight: pw.FontWeight.bold, color: PdfColors.amber900),
                ),
              ),
            ],
          ),

          // Offer Highlight
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                discountText,
                style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: PdfColors.amber900),
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Text(
                    conditionText,
                    style: pw.TextStyle(fontSize: 6.5, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800),
                  ),
                  pw.Text(
                    'Valid on Dine-In & Takeaway',
                    style: const pw.TextStyle(fontSize: 5.5, color: PdfColors.grey600),
                  ),
                ],
              ),
            ],
          ),

          // Code Box
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: pw.BoxDecoration(
              color: PdfColors.amber50,
              border: pw.Border.all(color: PdfColors.amber700, width: 0.8, style: pw.BorderStyle.dashed),
              borderRadius: pw.BorderRadius.circular(4),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  '✂ CUT & PRESENT AT BILLING:',
                  style: pw.TextStyle(fontSize: 5.5, fontWeight: pw.FontWeight.bold, color: PdfColors.amber900),
                ),
                pw.Text(
                  cardCode,
                  style: pw.TextStyle(
                    fontSize: 10,
                    fontWeight: pw.FontWeight.bold,
                    letterSpacing: 1.0,
                    color: PdfColors.amber900,
                  ),
                ),
              ],
            ),
          ),

          // Footer
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'Valid: $validFrom to $validTo',
                style: pw.TextStyle(fontSize: 6, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800),
              ),
              pw.Text(
                '*Single use per bill. T&C Apply.',
                style: const pw.TextStyle(fontSize: 5, color: PdfColors.grey600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalPages = (_cardCount / 8).ceil();

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: RosTheme.bgBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Sheet Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.print_rounded, color: Color(0xFFF59E0B), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Printable Coupon Cards',
                        style: TextStyle(color: RosTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'A4 Multi-Card Layout (8 Cards / Sheet in 2x4 Grid)',
                        style: TextStyle(color: RosTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // Number of cards prompt
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'How many cards to create?',
                  style: TextStyle(color: RosTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                ),
                Text(
                  '$totalPages A4 Page${totalPages > 1 ? "s" : ""} ($_cardCount cards)',
                  style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.w800),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Number Input and Presets
            Row(
              children: [
                SizedBox(
                  width: 90,
                  child: TextField(
                    controller: _countController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: RosTheme.bgElevated,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: RosTheme.bgBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: RosTheme.bgBorder)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: RosTheme.primary)),
                    ),
                    onChanged: (val) {
                      final n = int.tryParse(val);
                      if (n != null) {
                        setState(() => _cardCount = n.clamp(1, 500));
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [8, 16, 24, 32, 48, 80].map((presetCount) {
                        final isSelected = _cardCount == presetCount;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: GestureDetector(
                            onTap: () => _setCount(presetCount),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFF59E0B).withValues(alpha: 0.2) : RosTheme.bgElevated,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFFF59E0B) : RosTheme.bgBorder,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Text(
                                '$presetCount (${presetCount ~/ 8}p)',
                                style: TextStyle(
                                  color: isSelected ? const Color(0xFFF59E0B) : RosTheme.textSecondary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // Live Card Preview
            const Text(
              'Card Preview & Layout:',
              style: TextStyle(color: RosTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade400, width: 1.5, style: BorderStyle.solid),
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
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade100,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('🍽️', style: TextStyle(fontSize: 12)),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'RESTAURANT OS',
                                style: TextStyle(color: Colors.black87, fontSize: 11, fontWeight: FontWeight.w900),
                              ),
                              Text(
                                'Main Branch, City Center • Tel: +1 555-0199',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 8),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'VOUCHER',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 8, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        widget.campaign.discountType == 'PERCENTAGE'
                            ? '${widget.campaign.discountValue.toStringAsFixed(0)}% OFF'
                            : '₹${widget.campaign.discountValue.toStringAsFixed(0)} FLAT OFF',
                        style: TextStyle(color: Colors.amber.shade800, fontSize: 16, fontWeight: FontWeight.w900),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            widget.campaign.minOrderValue > 0
                                ? 'Min Spend: ₹${widget.campaign.minOrderValue.toStringAsFixed(0)}'
                                : 'No Min Spend',
                            style: const TextStyle(color: Colors.black87, fontSize: 9, fontWeight: FontWeight.w700),
                          ),
                          if (widget.campaign.maxDiscount != null && widget.campaign.maxDiscount! > 0)
                            Text(
                              'Max Cap: ₹${widget.campaign.maxDiscount!.toStringAsFixed(0)}',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 8),
                            ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.amber.shade400, width: 1),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '✂ CUT & USE CODE:',
                          style: TextStyle(color: Colors.amber.shade900, fontSize: 8.5, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          widget.campaign.code,
                          style: TextStyle(
                            color: Colors.amber.shade900,
                            fontFamily: 'monospace',
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Valid: ${widget.campaign.validFrom.split("T").first} → ${widget.campaign.validTo.split("T").first}',
                        style: const TextStyle(color: Colors.black87, fontSize: 8.5, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '*Single use per bill. T&C Apply.',
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 7.5, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Layout description
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.content_cut_rounded, size: 14, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Standard card size (94mm × 62mm) with cutting borders. Fits 8 cards per A4 page with minimal paper waste.',
                      style: TextStyle(color: RosTheme.textMuted, fontSize: 10.5, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Action Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _generating ? null : _handlePrintPdf,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                icon: _generating
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                      )
                    : const Icon(Icons.picture_as_pdf_rounded, size: 20),
                label: Text(
                  _generating ? 'Generating PDF...' : 'Generate & Print A4 PDF ($_cardCount Cards)',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
