// =============================================================================
// Kitchen Display System (KDS) Screen — Simplified 2-Step Cook & Waiter Workflow
// Matches Web KDS UI Layout & Logic Exactly
// =============================================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

class KitchenScreen extends ConsumerStatefulWidget {
  const KitchenScreen({super.key});

  @override
  ConsumerState<KitchenScreen> createState() => _KitchenScreenState();
}

class _KitchenScreenState extends ConsumerState<KitchenScreen> {
  List<OrderKot> _kots = [];
  List<KitchenStation> _stations = [];
  String? _selectedStationId;

  // Active Role: 'COOK' | 'WAITER'
  String _activeRole = 'COOK';
  bool _roleInitialized = false;

  // Sub-tabs
  String _cookTab = 'NEW'; // 'NEW' (In Kitchen) | 'READY' (Complete & Ready)
  String _waiterTab = 'READY'; // 'READY' (Ready to Serve) | 'SERVED' (Served)

  bool _loading = true;
  bool _soundEnabled = true;
  Timer? _refreshTimer;
  io.Socket? _socket;

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupSocket();
    _refreshTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) _loadData(silent: true);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_roleInitialized) {
      final userRole = ref.read(authProvider).user?.role.toUpperCase() ?? '';
      if (userRole == 'WAITER' || userRole == 'CAPTAIN') {
        _activeRole = 'WAITER';
      } else {
        _activeRole = 'COOK';
      }
      _roleInitialized = true;
    }
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
                style: const TextStyle(fontWeight: FontWeight.bold),
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

  // ── Item-Level Status Update ────────────────────────────────────────────────
  Future<void> _updateKotItemStatus(String kotId, String itemId, String nextStatus) async {
    if (_soundEnabled) {
      HapticFeedback.mediumImpact();
    }
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/kitchen/kots/$kotId/items/$itemId/status', data: {'status': nextStatus});
      _loadData(silent: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Item update failed: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  // ── Whole KOT Status Update ─────────────────────────────────────────────────
  Future<void> _updateKotStatus(String kotId, String nextStatus) async {
    if (_soundEnabled) {
      HapticFeedback.heavyImpact();
    }
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/kitchen/kots/$kotId/status', data: {'status': nextStatus});
      _loadData(silent: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ticket update failed: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  // ── Cancel Item Dialog ──────────────────────────────────────────────────────
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
                hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
                filled: true,
                fillColor: RosTheme.bgElevated,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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

  // ── Cancel KOT Ticket Dialog ────────────────────────────────────────────────
  void _showCancelKotDialog(String kotId, String kotNumber) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever_rounded, color: RosTheme.danger, size: 22),
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
                hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
                filled: true,
                fillColor: RosTheme.bgElevated,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
    // 1. Cook View Lists
    final cookNewKots = _kots
        .where((k) =>
            k.status != 'CANCELLED' &&
            k.status != 'SERVED' &&
            k.items.any((i) => ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].contains(i.status)))
        .toList();

    final cookReadyKots = _kots
        .where((k) =>
            k.status != 'CANCELLED' &&
            k.items.any((i) => i.status == 'READY'))
        .toList();

    // 2. Waiter View Lists
    final waiterReadyKots = cookReadyKots;
    final waiterServedKots = _kots
        .where((k) => k.items.any((i) => i.status == 'SERVED'))
        .toList();

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: (_activeRole == 'COOK' ? RosTheme.warning : RosTheme.secondary)
                    .withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                _activeRole == 'COOK' ? Icons.soup_kitchen_rounded : Icons.room_service_rounded,
                color: _activeRole == 'COOK' ? RosTheme.warning : RosTheme.secondary,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Kitchen Display',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: RosTheme.textPrimary,
                  ),
                ),
                Text(
                  _activeRole == 'COOK'
                      ? '${cookNewKots.length} in kitchen • ${cookReadyKots.length} ready'
                      : '${waiterReadyKots.length} ready to serve',
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
                Icon(Icons.wifi_rounded, color: RosTheme.secondary, size: 12),
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
              _soundEnabled ? Icons.notifications_active_rounded : Icons.notifications_off_rounded,
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
          // ── 1. Role Mode Switcher Toggle (Cook vs Waiter) ───────────────────
          Container(
            margin: const EdgeInsets.fromLTRB(14, 8, 14, 6),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: RosTheme.bgElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() => _activeRole = 'COOK');
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _activeRole == 'COOK' ? RosTheme.warning : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: _activeRole == 'COOK'
                            ? [
                                BoxShadow(
                                  color: RosTheme.warning.withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.soup_kitchen_rounded,
                            size: 16,
                            color: _activeRole == 'COOK' ? Colors.black : RosTheme.textMuted,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '👨‍🍳 Cook / Kitchen',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: _activeRole == 'COOK' ? Colors.black : RosTheme.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() => _activeRole = 'WAITER');
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _activeRole == 'WAITER' ? RosTheme.secondary : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: _activeRole == 'WAITER'
                            ? [
                                BoxShadow(
                                  color: RosTheme.secondary.withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.room_service_rounded,
                            size: 16,
                            color: _activeRole == 'WAITER' ? Colors.white : RosTheme.textMuted,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '🍽️ Waiter / Runner',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: _activeRole == 'WAITER' ? Colors.white : RosTheme.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── 2. Station Filter Chips ─────────────────────────────────────────
          if (_stations.isNotEmpty) _buildStationFilterBar(),

          // ── 3. 2-Section Tabs Bar ───────────────────────────────────────────
          _buildTwoSectionTabBar(
            cookNewCount: cookNewKots.length,
            cookReadyCount: cookReadyKots.length,
            waiterReadyCount: waiterReadyKots.length,
            waiterServedCount: waiterServedKots.length,
          ),

          // ── 4. Main KOTs Cards List ─────────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: RosTheme.primary),
                  )
                : _activeRole == 'COOK'
                    ? (_cookTab == 'NEW'
                        ? _buildKotsList(
                            kots: cookNewKots,
                            emptyMessage: 'No new orders cooking right now.',
                            isCookNewView: true,
                          )
                        : _buildKotsList(
                            kots: cookReadyKots,
                            emptyMessage: 'Pass counter is clear.',
                            isCookReadyView: true,
                          ))
                    : (_waiterTab == 'READY'
                        ? _buildKotsList(
                            kots: waiterReadyKots,
                            emptyMessage: 'Nothing ready at pass counter.',
                            isWaiterReadyView: true,
                          )
                        : _buildKotsList(
                            kots: waiterServedKots,
                            emptyMessage: 'No served orders history.',
                            isWaiterServedView: true,
                          )),
          ),
        ],
      ),
    );
  }

  // ── Station Filters Bar ─────────────────────────────────────────────────────
  Widget _buildStationFilterBar() {
    return Container(
      height: 36,
      margin: const EdgeInsets.only(top: 2, bottom: 4),
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
            if (s.displayColor.isNotEmpty) {
              try {
                final hex = s.displayColor.replaceAll('#', '');
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
              width: 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: selected ? Colors.white : RosTheme.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  // ── 2-Section Tabs Bar ──────────────────────────────────────────────────────
  Widget _buildTwoSectionTabBar({
    required int cookNewCount,
    required int cookReadyCount,
    required int waiterReadyCount,
    required int waiterServedCount,
  }) {
    if (_activeRole == 'COOK') {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Row(
          children: [
            Expanded(
              child: _buildSectionTabButton(
                label: '🔥 New Orders (Cooking)',
                count: cookNewCount,
                isSelected: _cookTab == 'NEW',
                activeColor: RosTheme.warning,
                activeTextColor: Colors.black,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _cookTab = 'NEW');
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildSectionTabButton(
                label: '🛎️ Ready to Serve',
                count: cookReadyCount,
                isSelected: _cookTab == 'READY',
                activeColor: RosTheme.secondary,
                activeTextColor: Colors.white,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _cookTab = 'READY');
                },
              ),
            ),
          ],
        ),
      );
    } else {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Row(
          children: [
            Expanded(
              child: _buildSectionTabButton(
                label: '🛎️ Ready to Serve',
                count: waiterReadyCount,
                isSelected: _waiterTab == 'READY',
                activeColor: RosTheme.secondary,
                activeTextColor: Colors.white,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _waiterTab = 'READY');
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildSectionTabButton(
                label: '✅ Served',
                count: waiterServedCount,
                isSelected: _waiterTab == 'SERVED',
                activeColor: RosTheme.primary,
                activeTextColor: Colors.white,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _waiterTab = 'SERVED');
                },
              ),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildSectionTabButton({
    required String label,
    required int count,
    required bool isSelected,
    required Color activeColor,
    required Color activeTextColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : RosTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? activeColor : RosTheme.bgBorder,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: isSelected ? activeTextColor : RosTheme.textPrimary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? activeTextColor.withValues(alpha: 0.2)
                    : RosTheme.bgElevated,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: isSelected ? activeTextColor : RosTheme.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── KOTs List Renderer ──────────────────────────────────────────────────────
  Widget _buildKotsList({
    required List<OrderKot> kots,
    required String emptyMessage,
    bool isCookNewView = false,
    bool isCookReadyView = false,
    bool isWaiterReadyView = false,
    bool isWaiterServedView = false,
  }) {
    if (kots.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isCookNewView
                    ? Icons.soup_kitchen_outlined
                    : (isWaiterReadyView ? Icons.room_service_outlined : Icons.check_circle_outline_rounded),
                size: 56,
                color: RosTheme.textMuted.withValues(alpha: 0.4),
              ),
              const SizedBox(height: 12),
              Text(
                emptyMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: RosTheme.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadData(),
      color: RosTheme.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 28),
        itemCount: kots.length,
        separatorBuilder: (_, __) => const SizedBox(height: 14),
        itemBuilder: (ctx, i) {
          final kot = kots[i];
          if (isCookNewView) {
            return _CookNewKotCard(
              kot: kot,
              onCompleteItem: (itemId) => _updateKotItemStatus(kot.id, itemId, 'READY'),
              onCompleteAll: () => _updateKotStatus(kot.id, 'READY'),
              onRequestCancelItem: (itemId, itemName) =>
                  _showCancelItemDialog(kot.id, itemId, itemName),
              onRequestCancelKot: () =>
                  _showCancelKotDialog(kot.id, kot.kotNumber),
            );
          } else if (isCookReadyView) {
            return _CookReadyKotCard(
              kot: kot,
              onUndoItem: (itemId) => _updateKotItemStatus(kot.id, itemId, 'PREPARING'),
            );
          } else if (isWaiterReadyView) {
            return _WaiterReadyKotCard(
              kot: kot,
              onServeItem: (itemId) => _updateKotItemStatus(kot.id, itemId, 'SERVED'),
              onServeAll: () => _updateKotStatus(kot.id, 'SERVED'),
            );
          } else {
            return _WaiterServedKotCard(kot: kot);
          }
        },
      ),
    );
  }
}

// ── 1. COOK NEW ORDERS CARD (Item-Level Complete & Cancel) ───────────────────
class _CookNewKotCard extends StatelessWidget {
  final OrderKot kot;
  final Function(String itemId) onCompleteItem;
  final VoidCallback onCompleteAll;
  final Function(String itemId, String itemName) onRequestCancelItem;
  final VoidCallback onRequestCancelKot;

  const _CookNewKotCard({
    required this.kot,
    required this.onCompleteItem,
    required this.onCompleteAll,
    required this.onRequestCancelItem,
    required this.onRequestCancelKot,
  });

  @override
  Widget build(BuildContext context) {
    final isOverdue = kot.ageMinutes > 15;
    final isWarning = kot.ageMinutes > 10;
    final tableName = kot.tableName;
    final isTakeaway = tableName == null || kot.orderType == 'TAKEAWAY' || kot.orderType == 'DELIVERY';

    final pendingItems = kot.items.where((i) =>
        ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].contains(i.status)).toList();

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: RosTheme.warning.withValues(alpha: 0.5),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Header Bar with Bold Table Tag ────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            color: RosTheme.warning.withValues(alpha: 0.12),
            child: Row(
              children: [
                Text(
                  '#${kot.kotNumber}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                    color: RosTheme.textPrimary,
                  ),
                ),
                const SizedBox(width: 8),

                // Table Tag Chip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: isTakeaway ? RosTheme.primary : RosTheme.secondary,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: (isTakeaway ? RosTheme.primary : RosTheme.secondary)
                            .withValues(alpha: 0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: Text(
                    isTakeaway ? '📦 TAKEAWAY' : 'TABLE: $tableName',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),

                const Spacer(),

                // Elapsed timer
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: isOverdue
                        ? RosTheme.danger
                        : (isWarning ? RosTheme.warning : RosTheme.bgElevated),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.access_time_rounded,
                        size: 13,
                        color: (isOverdue || isWarning) ? Colors.black : RosTheme.textSecondary,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '${kot.ageMinutes}m',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: (isOverdue || isWarning) ? Colors.black : RosTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),

                // Cancel KOT
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: RosTheme.textMuted, size: 20),
                  tooltip: 'Cancel KOT Ticket',
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: onRequestCancelKot,
                ),
              ],
            ),
          ),

          // ── Items List with Item-Level Complete & Cancel ──────────────────
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: kot.items.map((item) {
                final isCancelled = item.status == 'CANCELLED';
                final isReady = item.status == 'READY' || item.status == 'SERVED';
                final isMulti = item.quantity > 1;
                final itemName = item.menuItemName ?? 'Dish';
                final variant = item.variantName;
                final fullTitle = variant != null && !variant.toLowerCase().contains('regular')
                    ? '$itemName ($variant)'
                    : itemName;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isCancelled
                        ? RosTheme.bgElevated.withValues(alpha: 0.3)
                        : (isReady
                            ? RosTheme.secondary.withValues(alpha: 0.1)
                            : RosTheme.bgElevated),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isReady
                          ? RosTheme.secondary.withValues(alpha: 0.3)
                          : RosTheme.bgBorder,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Quantity Box
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: isCancelled
                              ? RosTheme.bgBorder
                              : (isReady
                                  ? RosTheme.secondary
                                  : (isMulti ? RosTheme.warning : RosTheme.primary)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${item.quantity}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: isMulti && !isReady ? Colors.black : Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Title & Notes
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullTitle,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: isCancelled ? RosTheme.textMuted : RosTheme.textPrimary,
                                decoration: isCancelled ? TextDecoration.lineThrough : null,
                              ),
                            ),
                            if (item.modifiers.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  '+ ${item.modifiers.join(', ')}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: RosTheme.accent,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            if (item.notes != null && item.notes!.isNotEmpty && !isCancelled)
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: RosTheme.danger.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: RosTheme.danger.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Text(
                                  '⚠️ ${item.notes}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: RosTheme.danger,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Actions
                      if (!isCancelled) ...[
                        if (isReady)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: RosTheme.secondary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle_rounded, size: 13, color: RosTheme.secondary),
                                SizedBox(width: 3),
                                Text(
                                  'Ready',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: RosTheme.secondary,
                                  ),
                                ),
                              ],
                            ),
                          )
                        else ...[
                          // Complete Item Button
                          ElevatedButton.icon(
                            onPressed: () => onCompleteItem(item.id),
                            icon: const Icon(Icons.check_rounded, size: 14),
                            label: const Text(
                              'Complete',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: RosTheme.secondary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                          const SizedBox(width: 4),
                          // Cancel Item Icon
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 18, color: RosTheme.textMuted),
                            tooltip: 'Cancel item',
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () => onRequestCancelItem(item.id, fullTitle),
                          ),
                        ],
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          // ── KOT Note ──────────────────────────────────────────────────────
          if (kot.orderNotes != null && kot.orderNotes!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: RosTheme.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: RosTheme.warning.withValues(alpha: 0.3)),
                ),
                child: Text(
                  '📝 Order Note: ${kot.orderNotes}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: RosTheme.warning,
                  ),
                ),
              ),
            ),

          // ── Giant "COMPLETE ALL ITEMS" Button ─────────────────────────────
          if (pendingItems.isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: ElevatedButton.icon(
                onPressed: onCompleteAll,
                icon: const Icon(Icons.done_all_rounded, size: 20),
                label: Text(
                  'COMPLETE ALL ITEMS (${pendingItems.length})',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.secondary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 4,
                  shadowColor: RosTheme.secondary.withValues(alpha: 0.4),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── 2. COOK READY TO SERVE CARD (Pass Counter Overview) ──────────────────────
class _CookReadyKotCard extends StatelessWidget {
  final OrderKot kot;
  final Function(String itemId) onUndoItem;

  const _CookReadyKotCard({
    required this.kot,
    required this.onUndoItem,
  });

  @override
  Widget build(BuildContext context) {
    final tableName = kot.tableName;
    final isTakeaway = tableName == null || kot.orderType == 'TAKEAWAY' || kot.orderType == 'DELIVERY';
    final readyItems = kot.items.where((i) => i.status == 'READY').toList();

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: RosTheme.secondary.withValues(alpha: 0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            color: RosTheme.secondary.withValues(alpha: 0.12),
            child: Row(
              children: [
                Text(
                  '#${kot.kotNumber}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                    color: RosTheme.textPrimary,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: isTakeaway ? RosTheme.primary : RosTheme.secondary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isTakeaway ? '📦 TAKEAWAY' : 'TABLE: $tableName',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const Spacer(),
                const Text(
                  'At Pass Counter',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: RosTheme.secondary,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: readyItems.map((item) {
                final itemName = item.menuItemName ?? 'Dish';
                final variant = item.variantName;
                final fullTitle = variant != null && !variant.toLowerCase().contains('regular')
                    ? '$itemName ($variant)'
                    : itemName;

                return Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: RosTheme.secondary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: RosTheme.secondary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: RosTheme.secondary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${item.quantity}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          fullTitle,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: RosTheme.textPrimary,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.undo_rounded, size: 18, color: RosTheme.textMuted),
                        tooltip: 'Undo back to cooking',
                        onPressed: () => onUndoItem(item.id),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

// ── 3. WAITER READY TO SERVE CARD (Item-Level Serve & KOT Serve All) ─────────
class _WaiterReadyKotCard extends StatelessWidget {
  final OrderKot kot;
  final Function(String itemId) onServeItem;
  final VoidCallback onServeAll;

  const _WaiterReadyKotCard({
    required this.kot,
    required this.onServeItem,
    required this.onServeAll,
  });

  @override
  Widget build(BuildContext context) {
    final tableName = kot.tableName;
    final isTakeaway = tableName == null || kot.orderType == 'TAKEAWAY' || kot.orderType == 'DELIVERY';
    final readyItems = kot.items.where((i) => i.status == 'READY').toList();

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: RosTheme.secondary, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: RosTheme.secondary.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Header with Bold Table Tag ────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [RosTheme.secondary, Color(0xFF0D9488)],
              ),
            ),
            child: Row(
              children: [
                Text(
                  '#${kot.kotNumber}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),

                // Table Tag Chip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: Text(
                    isTakeaway ? '📦 TAKEAWAY' : 'TABLE: $tableName',
                    style: TextStyle(
                      color: isTakeaway ? RosTheme.primary : Colors.black,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),

                const Spacer(),

                // Elapsed timer
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.access_time_rounded, size: 12, color: Colors.white),
                      const SizedBox(width: 3),
                      Text(
                        '${kot.ageMinutes}m',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Ready Dishes List with 1-Tap "Serve" ──────────────────────────
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: readyItems.map((item) {
                final isMulti = item.quantity > 1;
                final itemName = item.menuItemName ?? 'Dish';
                final variant = item.variantName;
                final fullTitle = variant != null && !variant.toLowerCase().contains('regular')
                    ? '$itemName ($variant)'
                    : itemName;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: RosTheme.secondary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: RosTheme.secondary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Quantity Box
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: isMulti ? RosTheme.warning : RosTheme.secondary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${item.quantity}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: isMulti ? Colors.black : Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Title & Notes
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullTitle,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: RosTheme.textPrimary,
                              ),
                            ),
                            if (item.modifiers.isNotEmpty)
                              Text(
                                '+ ${item.modifiers.join(', ')}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: RosTheme.accent,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            if (item.notes != null && item.notes!.isNotEmpty)
                              Text(
                                '⚠️ ${item.notes}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: RosTheme.danger,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Item-Level "Serve" Button
                      ElevatedButton.icon(
                        onPressed: () => onServeItem(item.id),
                        icon: const Icon(Icons.room_service_rounded, size: 14),
                        label: const Text(
                          'Serve',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: RosTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 2,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          // ── Whole KOT "Serve All" Button ──────────────────────────────────
          if (readyItems.isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: ElevatedButton.icon(
                onPressed: onServeAll,
                icon: const Icon(Icons.room_service_rounded, size: 20),
                label: Text(
                  'MARK ENTIRE KOT SERVED (${readyItems.length})',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.secondary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 4,
                  shadowColor: RosTheme.secondary.withValues(alpha: 0.4),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── 4. WAITER SERVED HISTORY CARD ───────────────────────────────────────────
class _WaiterServedKotCard extends StatelessWidget {
  final OrderKot kot;

  const _WaiterServedKotCard({required this.kot});

  @override
  Widget build(BuildContext context) {
    final tableName = kot.tableName;
    final isTakeaway = tableName == null || kot.orderType == 'TAKEAWAY' || kot.orderType == 'DELIVERY';
    final servedItems = kot.items.where((i) => i.status == 'SERVED').toList();

    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: RosTheme.bgElevated,
            child: Row(
              children: [
                Text(
                  '#${kot.kotNumber}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                    color: RosTheme.textMuted,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  child: Text(
                    isTakeaway ? 'TAKEAWAY' : 'TABLE: $tableName',
                    style: const TextStyle(
                      color: RosTheme.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const Spacer(),
                const Text(
                  '✅ Served',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: RosTheme.primary,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              children: servedItems.map((item) {
                final itemName = item.menuItemName ?? 'Dish';
                final variant = item.variantName;
                final fullTitle = variant != null && !variant.toLowerCase().contains('regular')
                    ? '$itemName ($variant)'
                    : itemName;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: RosTheme.bgElevated,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${item.quantity}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: RosTheme.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          fullTitle,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: RosTheme.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
