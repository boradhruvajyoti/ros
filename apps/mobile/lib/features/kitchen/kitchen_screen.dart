// =============================================================================
// Kitchen Display System (KDS) Screen — Point-of-Work Kitchen Pipeline
// Matching the Mobile Web KDS UI Layout & Logic Exactly
// =============================================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

const Map<String, String> _kNextStatusFlow = {
  'NEW': 'ACCEPTED',
  'ACCEPTED': 'PREPARING',
  'PREPARING': 'READY',
  'READY': 'SERVED',
};

class KitchenScreen extends ConsumerStatefulWidget {
  const KitchenScreen({super.key});

  @override
  ConsumerState<KitchenScreen> createState() => _KitchenScreenState();
}

class _KitchenScreenState extends ConsumerState<KitchenScreen> {
  List<OrderKot> _kots = [];
  List<KitchenStation> _stations = [];
  String? _selectedStationId;
  String _activeTab = 'ALL'; // ALL | NEW | ACCEPTED | PREPARING | READY
  bool _loading = true;
  bool _soundEnabled = true;
  Timer? _refreshTimer;
  io.Socket? _socket;

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupSocket();
    // Auto-refresh every 5s fallback (same as Web)
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) _loadData(silent: true);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _socket?.disconnect();
    super.dispose();
  }

  void _setupSocket() {
    final socket = ref.read(socketProvider);
    if (socket == null) return;
    _socket = socket;

    socket.on('ros:event', (data) {
      if (!mounted) return;
      final type = data['type'] as String?;
      final payload = data['payload'] as Map<String, dynamic>?;

      if ([
        'KOT_CREATED',
        'ORDER_CREATED',
        'KOT_ADDED',
        'KOT_STATUS_CHANGED',
        'KOT_ITEM_STATUS_CHANGED',
        'ORDER_STATUS_CHANGED',
        'ORDER_CANCELLED',
        'TABLE_STATUS_CHANGED',
      ].contains(type)) {
        if (['KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED'].contains(type) &&
            _soundEnabled) {
          HapticFeedback.heavyImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '🔔 New Order in Kitchen! #${payload?['kotNumber'] ?? ''}',
              ),
              backgroundColor: RosTheme.primary,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 2),
            ),
          );
        } else if (type == 'KOT_STATUS_CHANGED' && _soundEnabled) {
          HapticFeedback.mediumImpact();
        }
        _loadData(silent: true);
      }
    });
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);

      // 1. Fetch stations
      try {
        final stationsData = await api.get<List<dynamic>>('/kitchen/stations');
        _stations = stationsData
            .map((e) => KitchenStation.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {}

      // 2. Fetch KOTs
      final Map<String, dynamic> queryParams = {
        if (_selectedStationId != null) 'stationId': _selectedStationId!,
      };

      final kotsData = await api.get<List<dynamic>>(
        '/kitchen/kots',
        queryParameters: queryParams,
      );

      final parsed = kotsData
          .map((e) => OrderKot.fromJson(e as Map<String, dynamic>))
          .toList();

      if (mounted) {
        setState(() {
          _kots = parsed;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateKotStatus(String kotId, String nextStatus) async {
    if (_soundEnabled) {
      HapticFeedback.mediumImpact();
    }
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/kitchen/kots/$kotId/status', data: {'status': nextStatus});
      _loadData(silent: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Update failed: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showCancelItemDialog(String kotId, String itemId, String itemName) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.block_rounded, color: RosTheme.danger, size: 22),
            SizedBox(width: 8),
            Text(
              'Cancel Item on KOT',
              style: TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to cancel $itemName? This will remove the item from the kitchen and recalculate the customer\'s bill.',
              style: const TextStyle(
                color: RosTheme.textSecondary,
                fontSize: 13,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Reason (optional)',
              style: TextStyle(
                color: RosTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: reasonController,
              style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'e.g. Out of stock / Customer changed mind',
                hintStyle:
                    const TextStyle(color: RosTheme.textMuted, fontSize: 12),
                filled: true,
                fillColor: RosTheme.bgElevated,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: RosTheme.bgBorder),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Back'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final api = ref.read(apiClientProvider);
                await api.patch(
                  '/kitchen/kots/$kotId/items/$itemId/cancel',
                  data: {
                    if (reasonController.text.trim().isNotEmpty)
                      'reason': reasonController.text.trim(),
                  },
                );
                _loadData(silent: true);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Item Cancelled and removed from KOT'),
                      backgroundColor: RosTheme.secondary,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Cancel failed: $e'),
                      backgroundColor: RosTheme.danger,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirm Cancel Item'),
          ),
        ],
      ),
    );
  }

  void _showCancelKotDialog(String kotId, String kotNumber) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever_rounded,
                color: RosTheme.danger, size: 22),
            SizedBox(width: 8),
            Text(
              'Cancel Entire Ticket',
              style: TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to cancel Ticket #$kotNumber? All active items in this ticket will be cancelled and removed from the active order.',
              style: const TextStyle(
                color: RosTheme.textSecondary,
                fontSize: 13,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Reason (optional)',
              style: TextStyle(
                color: RosTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: reasonController,
              style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'e.g. Table cancelled entire round',
                hintStyle:
                    const TextStyle(color: RosTheme.textMuted, fontSize: 12),
                filled: true,
                fillColor: RosTheme.bgElevated,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: RosTheme.bgBorder),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Back'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final api = ref.read(apiClientProvider);
                await api.patch(
                  '/kitchen/kots/$kotId/cancel',
                  data: {
                    if (reasonController.text.trim().isNotEmpty)
                      'reason': reasonController.text.trim(),
                  },
                );
                _loadData(silent: true);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('KOT Ticket Cancelled'),
                      backgroundColor: RosTheme.secondary,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Cancel failed: $e'),
                      backgroundColor: RosTheme.danger,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirm Cancel Ticket'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeKots =
        _kots.where((k) => k.status != 'SERVED' && k.status != 'CANCELLED').toList();

    final newKots = activeKots.where((k) => k.status == 'NEW').toList();
    final acceptedKots =
        activeKots.where((k) => k.status == 'ACCEPTED').toList();
    final preparingKots =
        activeKots.where((k) => k.status == 'PREPARING').toList();
    final readyKots = activeKots.where((k) => k.status == 'READY').toList();

    List<OrderKot> displayedKots = activeKots;
    if (_activeTab == 'NEW') displayedKots = newKots;
    if (_activeTab == 'ACCEPTED') displayedKots = acceptedKots;
    if (_activeTab == 'PREPARING') displayedKots = preparingKots;
    if (_activeTab == 'READY') displayedKots = readyKots;

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: RosTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.restaurant_rounded,
                  color: RosTheme.primary, size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Text(
                      'Kitchen Display',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: RosTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
                Text(
                  '${activeKots.length} active ticket${activeKots.length == 1 ? '' : 's'}',
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: RosTheme.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Live status indicator badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: RosTheme.secondary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: RosTheme.secondary.withValues(alpha: 0.4),
              ),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_rounded,
                    color: RosTheme.secondary, size: 12),
                SizedBox(width: 4),
                Text(
                  'LIVE',
                  style: TextStyle(
                    color: RosTheme.secondary,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),

          // Sound Bell Toggle
          IconButton(
            icon: Icon(
              _soundEnabled
                  ? Icons.notifications_active_rounded
                  : Icons.notifications_off_rounded,
              color: _soundEnabled ? RosTheme.secondary : RosTheme.textMuted,
              size: 20,
            ),
            tooltip: _soundEnabled ? 'Bell On' : 'Bell Muted',
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() => _soundEnabled = !_soundEnabled);
            },
          ),

          // Manual refresh
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: () => _loadData(),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // ── Station Filter Tabs Bar ─────────────────────────────────────────
          _buildStationFilterBar(),

          // ── 4 Pipeline Stage Tabs with Live Count Badges (Web Match) ───────
          _buildPipelineTabBar(
            totalCount: activeKots.length,
            newCount: newKots.length,
            acceptedCount: acceptedKots.length,
            preparingCount: preparingKots.length,
            readyCount: readyKots.length,
          ),

          // ── Main Content: Tickets Grid / List ──────────────────────────────
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: RosTheme.primary),
                  )
                : displayedKots.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: () => _loadData(),
                        color: RosTheme.primary,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(14, 12, 14, 24),
                          itemCount: displayedKots.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 14),
                          itemBuilder: (ctx, i) {
                            final kot = displayedKots[i];
                            return _KitchenKotCard(
                              kot: kot,
                              onUpdateStatus: (next) =>
                                  _updateKotStatus(kot.id, next),
                              onRequestCancelKot: () =>
                                  _showCancelKotDialog(kot.id, kot.kotNumber),
                              onRequestCancelItem: (itemId, itemName) =>
                                  _showCancelItemDialog(
                                      kot.id, itemId, itemName),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  // ── Station Filters ─────────────────────────────────────────────────────────

  Widget _buildStationFilterBar() {
    if (_stations.isEmpty) return const SizedBox.shrink();
    return Container(
      height: 40,
      margin: const EdgeInsets.only(top: 4, bottom: 4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        children: [
          _buildStationPill(
            label: 'All Stations',
            selected: _selectedStationId == null,
            color: RosTheme.primary,
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _selectedStationId = null);
              _loadData();
            },
          ),
          ..._stations.map((s) {
            Color sColor = RosTheme.primary;
            if (s.displayColor != null && s.displayColor!.isNotEmpty) {
              try {
                final hex = s.displayColor!.replaceAll('#', '');
                sColor = Color(int.parse('FF$hex', radix: 16));
              } catch (_) {}
            }
            return _buildStationPill(
              label: s.name,
              selected: _selectedStationId == s.id,
              color: sColor,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selectedStationId = s.id);
                _loadData();
              },
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStationPill({
    required String label,
    required bool selected,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? color : RosTheme.bgElevated,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? color : RosTheme.bgBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : RosTheme.textSecondary,
              fontSize: 11.5,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  // ── 4 Pipeline Stage Tabs ──────────────────────────────────────────────────

  Widget _buildPipelineTabBar({
    required int totalCount,
    required int newCount,
    required int acceptedCount,
    required int preparingCount,
    required int readyCount,
  }) {
    return Container(
      height: 44,
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: RosTheme.bgElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _buildStageTab(
            key: 'ALL',
            label: 'All Active',
            emoji: '📋',
            count: totalCount,
            activeColor: RosTheme.primary,
          ),
          _buildStageTab(
            key: 'NEW',
            label: 'New',
            emoji: '🔵',
            count: newCount,
            activeColor: const Color(0xFF3B82F6),
          ),
          _buildStageTab(
            key: 'ACCEPTED',
            label: 'Accepted',
            emoji: '🟡',
            count: acceptedCount,
            activeColor: const Color(0xFFF59E0B),
          ),
          _buildStageTab(
            key: 'PREPARING',
            label: 'Cooking',
            emoji: '🔥',
            count: preparingCount,
            activeColor: const Color(0xFFEA580C),
          ),
          _buildStageTab(
            key: 'READY',
            label: 'Ready',
            emoji: '✅',
            count: readyCount,
            activeColor: const Color(0xFF10B981),
          ),
        ],
      ),
    );
  }

  Widget _buildStageTab({
    required String key,
    required String label,
    required String emoji,
    required int count,
    required Color activeColor,
  }) {
    final isSelected = _activeTab == key;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _activeTab = key);
      },
      child: Container(
        margin: const EdgeInsets.only(right: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : RosTheme.textSecondary,
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.25)
                    : RosTheme.bgCard,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.3)
                      : RosTheme.bgBorder,
                ),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  color: isSelected ? Colors.white : RosTheme.textPrimary,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: RosTheme.secondary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: RosTheme.secondary,
                size: 56,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'All Clear in Kitchen!',
              style: TextStyle(
                color: RosTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'No active tickets waiting in this stage. New orders will appear automatically.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: RosTheme.textMuted,
                fontSize: 12.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Kitchen KOT Card (Mobile Web Exact Match) ────────────────────────────────

class _KitchenKotCard extends StatelessWidget {
  final OrderKot kot;
  final void Function(String nextStatus) onUpdateStatus;
  final VoidCallback onRequestCancelKot;
  final void Function(String itemId, String itemName) onRequestCancelItem;

  const _KitchenKotCard({
    required this.kot,
    required this.onUpdateStatus,
    required this.onRequestCancelKot,
    required this.onRequestCancelItem,
  });

  Color get _statusBorderColor => switch (kot.status) {
        'NEW' => const Color(0xFF3B82F6),
        'ACCEPTED' => const Color(0xFFF59E0B),
        'PREPARING' => const Color(0xFFEA580C),
        'READY' => const Color(0xFF10B981),
        _ => RosTheme.bgBorder,
      };

  Color get _statusHeaderBg => switch (kot.status) {
        'NEW' => const Color(0xFF3B82F6).withValues(alpha: 0.18),
        'ACCEPTED' => const Color(0xFFF59E0B).withValues(alpha: 0.18),
        'PREPARING' => const Color(0xFFEA580C).withValues(alpha: 0.18),
        'READY' => const Color(0xFF10B981).withValues(alpha: 0.18),
        _ => RosTheme.bgElevated,
      };

  @override
  Widget build(BuildContext context) {
    final isOverdue = kot.ageMinutes > 15;
    final isWarning = kot.ageMinutes > 10;
    final nextStatus = _kNextStatusFlow[kot.status];
    final canCancel =
        ['NEW', 'ACCEPTED', 'PREPARING'].contains(kot.status);

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _statusBorderColor.withValues(alpha: 0.6),
          width: 1.8,
        ),
        boxShadow: [
          BoxShadow(
            color: _statusBorderColor.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── 1. Ticket Header ───────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: _statusHeaderBg,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(18)),
              border: Border(
                bottom: BorderSide(
                  color: _statusBorderColor.withValues(alpha: 0.3),
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // KOT Number & Table/Type Badge
                Row(
                  children: [
                    Text(
                      '#${kot.kotNumber}',
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: kot.orderType == 'DINE_IN'
                            ? const Color(0xFF059669)
                            : const Color(0xFF4F46E5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        kot.tableName != null && kot.tableName!.isNotEmpty
                            ? 'Table ${kot.tableName}'
                            : kot.orderType.replaceAll('_', ' '),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),

                // Timer Pill & Trash Cancel Button
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isOverdue
                            ? RosTheme.danger
                            : isWarning
                                ? const Color(0xFFF59E0B)
                                    .withValues(alpha: 0.3)
                                : RosTheme.bgElevated,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.access_time_rounded,
                            size: 13,
                            color: isOverdue
                                ? Colors.white
                                : isWarning
                                    ? const Color(0xFFF59E0B)
                                    : RosTheme.textPrimary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${kot.ageMinutes}m',
                            style: TextStyle(
                              color: isOverdue
                                  ? Colors.white
                                  : isWarning
                                      ? const Color(0xFFF59E0B)
                                      : RosTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (canCancel) ...[
                      const SizedBox(width: 4),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded,
                            color: RosTheme.textMuted, size: 20),
                        tooltip: 'Cancel Entire Ticket',
                        onPressed: onRequestCancelKot,
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          // ── 2. Dishes List (High Contrast 18-20px Text) ───────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...kot.items.map((item) {
                  final isCancelled = item.status == 'CANCELLED';
                  final qty = item.quantity;
                  final isMultiQty = qty > 1;

                  final fullItemTitle = item.variantName != null &&
                          item.variantName!.isNotEmpty &&
                          !item.variantName!.toLowerCase().contains('regular')
                      ? '${item.menuItemName ?? 'Dish'} (${item.variantName})'
                      : (item.menuItemName ?? 'Dish');

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Large Quantity Box (Amber if > 1)
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: isCancelled
                                ? RosTheme.bgElevated
                                : isMultiQty
                                    ? const Color(0xFFFBBF24)
                                    : RosTheme.primary,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              if (isMultiQty && !isCancelled)
                                BoxShadow(
                                  color: const Color(0xFFFBBF24)
                                      .withValues(alpha: 0.3),
                                  blurRadius: 6,
                                ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              '$qty',
                              style: TextStyle(
                                color: isCancelled
                                    ? RosTheme.textMuted
                                    : isMultiQty
                                        ? const Color(0xFF78350F)
                                        : Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Dish Name, Modifiers, Notes
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      fullItemTitle,
                                      style: TextStyle(
                                        color: isCancelled
                                            ? RosTheme.textMuted
                                            : RosTheme.textPrimary,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                        decoration: isCancelled
                                            ? TextDecoration.lineThrough
                                            : null,
                                      ),
                                    ),
                                  ),
                                  if (canCancel && !isCancelled)
                                    GestureDetector(
                                      onTap: () => onRequestCancelItem(
                                          item.id, fullItemTitle),
                                      child: const Padding(
                                        padding: EdgeInsets.only(left: 4),
                                        child: Icon(
                                          Icons.cancel_outlined,
                                          size: 18,
                                          color: RosTheme.textMuted,
                                        ),
                                      ),
                                    ),
                                ],
                              ),

                              if (item.modifiers.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  '+ ${item.modifiers.join(', ')}',
                                  style: const TextStyle(
                                    color: Color(0xFF818CF8),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],

                              if (isCancelled)
                                Container(
                                  margin: const EdgeInsets.only(top: 4),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: RosTheme.danger
                                        .withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'CANCELLED',
                                    style: TextStyle(
                                      color: RosTheme.danger,
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),

                              if (item.notes != null &&
                                  item.notes!.isNotEmpty &&
                                  !isCancelled)
                                Container(
                                  margin: const EdgeInsets.only(top: 6),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: RosTheme.danger
                                        .withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: RosTheme.danger
                                          .withValues(alpha: 0.25),
                                    ),
                                  ),
                                  child: Text(
                                    '⚠️ Note: ${item.notes}',
                                    style: const TextStyle(
                                      color: RosTheme.danger,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),

                if (kot.orderNotes != null &&
                    kot.orderNotes!.isNotEmpty) ...[
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color:
                          const Color(0xFFF59E0B).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color:
                            const Color(0xFFF59E0B).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.notes_rounded,
                            size: 15, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Order Note: ${kot.orderNotes}',
                            style: const TextStyle(
                              color: Color(0xFFF59E0B),
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

          // ── 3. Giant 1-Tap Bump Action Button (Web Match) ──────────────────
          if (nextStatus != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () => onUpdateStatus(nextStatus),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: switch (nextStatus) {
                      'ACCEPTED' => const Color(0xFF2563EB),
                      'PREPARING' => const Color(0xFFD97706),
                      'READY' => const Color(0xFF059669),
                      'SERVED' => const Color(0xFF7C3AED),
                      _ => RosTheme.primary,
                    },
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shadowColor: switch (nextStatus) {
                      'ACCEPTED' =>
                        const Color(0xFF2563EB).withValues(alpha: 0.4),
                      'PREPARING' =>
                        const Color(0xFFD97706).withValues(alpha: 0.4),
                      'READY' =>
                        const Color(0xFF059669).withValues(alpha: 0.4),
                      _ => RosTheme.primary.withValues(alpha: 0.4),
                    },
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        switch (nextStatus) {
                          'ACCEPTED' => Icons.check_rounded,
                          'PREPARING' => Icons.local_fire_department_rounded,
                          'READY' => Icons.check_circle_rounded,
                          'SERVED' => Icons.restaurant_rounded,
                          _ => Icons.arrow_forward_rounded,
                        },
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        switch (nextStatus) {
                          'ACCEPTED' => 'ACCEPT TICKET',
                          'PREPARING' => 'START COOKING 🔥',
                          'READY' => 'FOOD IS READY! ✅',
                          'SERVED' => 'MARK SERVED',
                          _ => 'ADVANCE',
                        },
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
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
}
