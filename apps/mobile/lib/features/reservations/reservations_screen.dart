// =============================================================================
// Reservations Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';

class ReservationsScreen extends ConsumerStatefulWidget {
  const ReservationsScreen({super.key});

  @override
  ConsumerState<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends ConsumerState<ReservationsScreen> {
  DateTime _selectedDate = DateTime.now();
  List<Reservation> _reservations = [];
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
      final data = await api.get<Map<String, dynamic>>('/reservations', queryParameters: {
        'date': _selectedDate.toIso8601String().split('T')[0],
      });
      final list = data['reservations'] as List<dynamic>? ?? data['data'] as List<dynamic>? ?? [];
      setState(() {
        _reservations = list.map((e) => Reservation.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(String id, String status) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/reservations/$id', data: {'status': status});
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger),
        );
      }
    }
  }

  Color _statusColor(String status) {
    return switch (status) {
      'PENDING' => RosTheme.warning,
      'CONFIRMED' => RosTheme.info,
      'ARRIVED' || 'SEATED' => RosTheme.secondary,
      'COMPLETED' => RosTheme.statusAvailable,
      'CANCELLED' || 'NO_SHOW' => RosTheme.danger,
      _ => RosTheme.textMuted,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reservations'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          // Date picker row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded, color: RosTheme.textSecondary),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.subtract(const Duration(days: 1)));
                    _load();
                  },
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime.now().subtract(const Duration(days: 365)),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (d != null) { setState(() => _selectedDate = d); _load(); }
                    },
                    child: Center(
                      child: Text(
                        DateFormat('EEEE, d MMM yyyy').format(_selectedDate),
                        style: const TextStyle(color: RosTheme.textPrimary, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded, color: RosTheme.textSecondary),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.add(const Duration(days: 1)));
                    _load();
                  },
                ),
              ],
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: RosTheme.primary))
                : _reservations.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.event_seat_rounded, color: RosTheme.textMuted, size: 48),
                            const SizedBox(height: 12),
                            Text('No reservations for ${DateFormat('d MMM').format(_selectedDate)}',
                                style: const TextStyle(color: RosTheme.textSecondary)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _reservations.length,
                        itemBuilder: (ctx, i) {
                          final r = _reservations[i];
                          final color = _statusColor(r.status);
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            decoration: BoxDecoration(
                              color: RosTheme.bgCard,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: color.withOpacity(0.3)),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(children: [
                                    Expanded(
                                      child: Text(r.customerName, style: const TextStyle(
                                          color: RosTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: color.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(r.status, style: TextStyle(
                                          color: color, fontSize: 10, fontWeight: FontWeight.w700)),
                                    ),
                                  ]),
                                  const SizedBox(height: 6),
                                  Row(children: [
                                    const Icon(Icons.people_rounded, size: 14, color: RosTheme.textMuted),
                                    const SizedBox(width: 4),
                                    Text('${r.partySize} guests', style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                                    const SizedBox(width: 12),
                                    const Icon(Icons.access_time_rounded, size: 14, color: RosTheme.textMuted),
                                    const SizedBox(width: 4),
                                    Text(r.timeSlot, style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                                    if (r.occasion != null) ...[
                                      const SizedBox(width: 12),
                                      const Icon(Icons.celebration_rounded, size: 14, color: RosTheme.textMuted),
                                      const SizedBox(width: 4),
                                      Text(r.occasion!, style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)),
                                    ],
                                  ]),
                                  const SizedBox(height: 8),
                                  // Action buttons
                                  if (r.status == 'PENDING')
                                    Row(children: [
                                      Expanded(child: OutlinedButton(
                                        onPressed: () => _updateStatus(r.id, 'CANCELLED'),
                                        style: OutlinedButton.styleFrom(
                                            side: const BorderSide(color: RosTheme.danger),
                                            foregroundColor: RosTheme.danger,
                                            padding: const EdgeInsets.symmetric(vertical: 6)),
                                        child: const Text('Decline', style: TextStyle(fontSize: 12)),
                                      )),
                                      const SizedBox(width: 8),
                                      Expanded(child: ElevatedButton(
                                        onPressed: () => _updateStatus(r.id, 'CONFIRMED'),
                                        style: ElevatedButton.styleFrom(
                                            backgroundColor: RosTheme.secondary,
                                            padding: const EdgeInsets.symmetric(vertical: 6)),
                                        child: const Text('Confirm', style: TextStyle(fontSize: 12)),
                                      )),
                                    ]),
                                  if (r.status == 'CONFIRMED')
                                    SizedBox(width: double.infinity, child: ElevatedButton(
                                      onPressed: () => _updateStatus(r.id, 'ARRIVED'),
                                      child: const Text('Mark Arrived', style: TextStyle(fontSize: 12)),
                                    )),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
