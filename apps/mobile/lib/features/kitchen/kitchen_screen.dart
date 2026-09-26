// =============================================================================
// Kitchen Display Screen — Real-time KOT management
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import 'package:intl/intl.dart';

class KitchenScreen extends ConsumerStatefulWidget {
  const KitchenScreen({super.key});

  @override
  ConsumerState<KitchenScreen> createState() => _KitchenScreenState();
}

class _KitchenScreenState extends ConsumerState<KitchenScreen> {
  List<OrderKot> _kots = [];
  List<KitchenStation> _stations = [];
  String? _selectedStationId;
  bool _loading = true;
  io.Socket? _socket;

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupSocket();
  }

  @override
  void dispose() {
    _socket?.disconnect();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);

      // Load stations
      try {
        final stationsData = await api.get<List<dynamic>>('/kitchen/stations');
        _stations = stationsData
            .map((e) => KitchenStation.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {}

      // Load KOTs
      final Map<String, dynamic> queryParams = {
        'status': 'NEW,ACCEPTED,PREPARING',
        if (_selectedStationId != null) 'stationId': _selectedStationId!,
      };

      try {
        final kotsData = await api.get<List<dynamic>>(
          '/kitchen/kots',
          queryParameters: queryParams,
        );
        _kots = kotsData
            .map((e) => OrderKot.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {
        // Try alternative endpoint
        final kotsData = await api.get<Map<String, dynamic>>('/kitchen/kots');
        final list = kotsData['kots'] as List<dynamic>? ?? [];
        _kots = list
            .map((e) => OrderKot.fromJson(e as Map<String, dynamic>))
            .toList();
      }

      setState(() => _loading = false);
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _setupSocket() {
    final socket = ref.read(socketProvider);
    if (socket == null) return;
    _socket = socket;

    socket.on('ros:event', (data) {
      final type = data['type'] as String?;
      if (type == 'KOT_CREATED' || type == 'KOT_STATUS_CHANGED') {
        _loadData();
      }
    });
  }

  Future<void> _updateKotStatus(String kotId, String status) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/kitchen/kots/$kotId/status', data: {'status': status});
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger),
        );
      }
    }
  }

  String _nextStatus(String current) {
    return switch (current) {
      'NEW' => 'ACCEPTED',
      'ACCEPTED' => 'PREPARING',
      'PREPARING' => 'READY',
      'READY' => 'SERVED',
      _ => current,
    };
  }

  String _nextStatusLabel(String current) {
    return switch (current) {
      'NEW' => 'Accept',
      'ACCEPTED' => 'Start Preparing',
      'PREPARING' => 'Mark Ready',
      'READY' => 'Mark Served',
      _ => 'Done',
    };
  }

  Color _statusColor(String status) {
    return switch (status) {
      'NEW' => RosTheme.info,
      'ACCEPTED' => RosTheme.primary,
      'PREPARING' => RosTheme.warning,
      'READY' => RosTheme.secondary,
      'SERVED' => RosTheme.textMuted,
      _ => RosTheme.textMuted,
    };
  }

  @override
  Widget build(BuildContext context) {
    final pendingKots = _kots.where((k) => k.status != 'SERVED').toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kitchen Display'),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _loadData,
            ),
          ),
          if (_stations.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String?>(
                  value: _selectedStationId,
                  dropdownColor: RosTheme.bgCard,
                  style: const TextStyle(color: RosTheme.textSecondary, fontSize: 13),
                  hint: const Text('All Stations',
                      style: TextStyle(color: RosTheme.textMuted, fontSize: 13)),
                  items: [
                    const DropdownMenuItem(
                        value: null, child: Text('All Stations')),
                    ..._stations.map((s) => DropdownMenuItem(
                          value: s.id,
                          child: Text(s.name),
                        )),
                  ],
                  onChanged: (v) {
                    setState(() => _selectedStationId = v);
                    _loadData();
                  },
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Summary
          Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _KotStat('New', _kots.where((k) => k.status == 'NEW').length, RosTheme.info),
                _KotStat('Preparing', _kots.where((k) => k.status == 'PREPARING' || k.status == 'ACCEPTED').length, RosTheme.warning),
                _KotStat('Ready', _kots.where((k) => k.status == 'READY').length, RosTheme.secondary),
              ],
            ),
          ),

          // KOTs grid
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: RosTheme.primary))
                : pendingKots.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle_outline_rounded,
                                color: RosTheme.secondary, size: 64),
                            SizedBox(height: 16),
                            Text('All clear! No pending KOTs',
                                style: TextStyle(
                                    color: RosTheme.textSecondary, fontSize: 16)),
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate:
                            SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent:
                              MediaQuery.of(context).size.width > 600
                                  ? 320
                                  : double.infinity,
                          mainAxisExtent: 280,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: pendingKots.length,
                        itemBuilder: (ctx, i) => _KotCard(
                          kot: pendingKots[i],
                          statusColor: _statusColor(pendingKots[i].status),
                          nextLabel: _nextStatusLabel(pendingKots[i].status),
                          onAction: pendingKots[i].status != 'SERVED'
                              ? () => _updateKotStatus(
                                    pendingKots[i].id,
                                    _nextStatus(pendingKots[i].status),
                                  )
                              : null,
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _KotStat extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _KotStat(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count', style: TextStyle(
          color: color, fontSize: 20, fontWeight: FontWeight.w700)),
        Text(label, style: const TextStyle(color: RosTheme.textMuted, fontSize: 11)),
      ],
    );
  }
}

class _KotCard extends StatelessWidget {
  final OrderKot kot;
  final Color statusColor;
  final String nextLabel;
  final VoidCallback? onAction;

  const _KotCard({
    required this.kot,
    required this.statusColor,
    required this.nextLabel,
    this.onAction,
  });

  String _elapsed(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    return '${diff.inHours}h ${diff.inMinutes % 60}m ago';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withOpacity(0.4), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: Row(
              children: [
                Text('KOT #${kot.kotNumber}',
                    style: TextStyle(
                        color: statusColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w700)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    kot.status.replaceAll('_', ' '),
                    style: TextStyle(
                        color: statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // Items
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: kot.items.length,
              itemBuilder: (ctx, i) {
                final item = kot.items[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Center(
                          child: Text(
                            '${item.quantity}',
                            style: TextStyle(
                                color: statusColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.menuItemName ?? 'Item',
                              style: const TextStyle(
                                  color: RosTheme.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500),
                            ),
                            if (item.variantName != null)
                              Text(
                                item.variantName!,
                                style: const TextStyle(
                                    color: RosTheme.textMuted, fontSize: 11),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Action button
          if (onAction != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: SizedBox(
                height: 40,
                child: ElevatedButton(
                  onPressed: onAction,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: statusColor,
                    padding: EdgeInsets.zero,
                  ),
                  child: Text(nextLabel,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
