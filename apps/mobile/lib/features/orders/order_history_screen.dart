// =============================================================================
// Order History Screen — With Date Filters, Guest (Pax) Metrics & Group Accordion
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

enum DatePreset {
  today,
  yesterday,
  last7Days,
  last30Days,
  last90Days,
  last365Days,
  custom,
}

enum GroupByMode {
  date,
  week,
  month,
  year,
  flat,
}

class _OrderGroup {
  final String id;
  final String title;
  final List<Order> orders;
  final int totalOrders;
  final int totalGuests;
  final double totalRevenue;

  const _OrderGroup({
    required this.id,
    required this.title,
    required this.orders,
    required this.totalOrders,
    required this.totalGuests,
    required this.totalRevenue,
  });
}

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  List<Order> _orders = [];
  bool _loading = true;
  String? _statusFilter;
  String? _typeFilter;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  DatePreset _datePreset = DatePreset.today;
  DateTimeRange? _customRange;
  GroupByMode _groupBy = GroupByMode.date;
  final Set<String> _expandedGroupIds = {};

  final _statusOptions = [
    'ALL',
    'PAID',
    'COMPLETED',
    'SERVED',
    'BILLED',
    'SENT_TO_KITCHEN',
    'PREPARING',
    'READY',
    'DRAFT',
    'CONFIRMED',
    'CANCELLED'
  ];

  final _typeOptions = [
    'ALL',
    'DINE_IN',
    'TAKEAWAY',
    'DELIVERY',
    'ONLINE',
  ];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  DateTimeRange _computeActiveDateRange() {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayEnd = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);

    switch (_datePreset) {
      case DatePreset.today:
        return DateTimeRange(start: todayStart, end: todayEnd);
      case DatePreset.yesterday:
        final yestStart = todayStart.subtract(const Duration(days: 1));
        final yestEnd = DateTime(yestStart.year, yestStart.month, yestStart.day, 23, 59, 59, 999);
        return DateTimeRange(start: yestStart, end: yestEnd);
      case DatePreset.last7Days:
        return DateTimeRange(start: todayStart.subtract(const Duration(days: 7)), end: todayEnd);
      case DatePreset.last30Days:
        return DateTimeRange(start: todayStart.subtract(const Duration(days: 30)), end: todayEnd);
      case DatePreset.last90Days:
        return DateTimeRange(start: todayStart.subtract(const Duration(days: 90)), end: todayEnd);
      case DatePreset.last365Days:
        return DateTimeRange(start: todayStart.subtract(const Duration(days: 365)), end: todayEnd);
      case DatePreset.custom:
        return _customRange ?? DateTimeRange(start: todayStart, end: todayEnd);
    }
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final range = _computeActiveDateRange();

      final params = <String, dynamic>{
        'limit': '500',
        'from': range.start.toUtc().toIso8601String(),
        'to': range.end.toUtc().toIso8601String(),
        if (_statusFilter != null && _statusFilter != 'ALL') 'status': _statusFilter!,
        if (_typeFilter != null && _typeFilter != 'ALL') 'type': _typeFilter!,
      };

      final data = await api.get<dynamic>('/orders', queryParameters: params);
      List<dynamic> rawList = [];
      if (data is Map<String, dynamic>) {
        rawList = data['orders'] as List<dynamic>? ?? data['data'] as List<dynamic>? ?? [];
      } else if (data is List<dynamic>) {
        rawList = data;
      }

      final list = rawList
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList();

      setState(() {
        _orders = list;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Order> get _filteredOrders {
    if (_searchQuery.trim().isEmpty) return _orders;
    final q = _searchQuery.toLowerCase().trim();
    return _orders.where((o) {
      final numStr = o.orderNumber.toLowerCase();
      final tableName = (o.table?.name ?? '').toLowerCase();
      final notes = (o.notes ?? '').toLowerCase();
      final itemsStr = o.items.map((i) => i.name.toLowerCase()).join(' ');
      return numStr.contains(q) ||
          tableName.contains(q) ||
          notes.contains(q) ||
          itemsStr.contains(q);
    }).toList();
  }

  int get _totalGuests {
    return _filteredOrders.fold(0, (acc, o) => acc + o.effectiveGuestCount);
  }

  double get _grossRevenue {
    return _filteredOrders
        .where((o) => o.status == 'PAID' || o.status == 'COMPLETED')
        .fold(0.0, (acc, o) => acc + o.total);
  }

  int get _settledCount {
    return _filteredOrders.where((o) => o.status == 'PAID' || o.status == 'COMPLETED').length;
  }

  List<_OrderGroup> get _groupedOrders {
    final filtered = _filteredOrders;
    if (_groupBy == GroupByMode.flat) {
      return [
        _OrderGroup(
          id: 'all',
          title: 'All Orders (${filtered.length})',
          orders: filtered,
          totalOrders: filtered.length,
          totalGuests: _totalGuests,
          totalRevenue: _grossRevenue,
        ),
      ];
    }

    final Map<String, List<Order>> map = {};
    final Map<String, String> titles = {};

    for (final o in filtered) {
      final d = o.createdAt;
      String key = '';
      String title = '';

      switch (_groupBy) {
        case GroupByMode.date:
          key = DateFormat('yyyy-MM-dd').format(d);
          final now = DateTime.now();
          final isToday = d.year == now.year && d.month == now.month && d.day == now.day;
          title = isToday
              ? 'Today · ${DateFormat('EEEE, d MMM yyyy').format(d)}'
              : DateFormat('EEEE, d MMM yyyy').format(d);
          break;
        case GroupByMode.week:
          // Approximate ISO week by day of year / 7
          final dayOfYear = int.parse(DateFormat('D').format(d));
          final weekNum = ((dayOfYear - d.weekday + 10) / 7).floor();
          key = '${d.year}-W$weekNum';
          title = 'Week $weekNum (${d.year})';
          break;
        case GroupByMode.month:
          key = DateFormat('yyyy-MM').format(d);
          title = DateFormat('MMMM yyyy').format(d);
          break;
        case GroupByMode.year:
          key = DateFormat('yyyy').format(d);
          title = 'Year ${d.year}';
          break;
        case GroupByMode.flat:
          break;
      }

      map.putIfAbsent(key, () => []).add(o);
      titles[key] = title;
    }

    return map.entries.map((e) {
      final groupOrders = e.value;
      final guests = groupOrders.fold(0, (acc, o) => acc + o.effectiveGuestCount);
      final rev = groupOrders
          .where((o) => o.status == 'PAID' || o.status == 'COMPLETED')
          .fold(0.0, (acc, o) => acc + o.total);

      return _OrderGroup(
        id: e.key,
        title: titles[e.key] ?? e.key,
        orders: groupOrders,
        totalOrders: groupOrders.length,
        totalGuests: guests,
        totalRevenue: rev,
      );
    }).toList();
  }

  Future<void> _pickCustomRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 1),
      initialDateRange: _customRange ??
          DateTimeRange(
            start: now.subtract(const Duration(days: 7)),
            end: now,
          ),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: RosTheme.primary,
              onPrimary: Colors.black,
              surface: RosTheme.bgCard,
              onSurface: RosTheme.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _datePreset = DatePreset.custom;
        _customRange = DateTimeRange(
          start: DateTime(picked.start.year, picked.start.month, picked.start.day),
          end: DateTime(picked.end.year, picked.end.month, picked.end.day, 23, 59, 59, 999),
        );
      });
      _loadOrders();
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredOrders;
    final groups = _groupedOrders;

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: const Text('Order History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => _loadOrders(),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── 1. Date Range Presets Selector ─────────────────────────────────
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              children: [
                _buildDateChip('Today', DatePreset.today),
                _buildDateChip('Yesterday', DatePreset.yesterday),
                _buildDateChip('Last 7 Days', DatePreset.last7Days),
                _buildDateChip('Last 30 Days', DatePreset.last30Days),
                _buildDateChip('Last 90 Days', DatePreset.last90Days),
                _buildDateChip('Last 365 Days', DatePreset.last365Days),
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ActionChip(
                    avatar: const Icon(Icons.calendar_month_rounded, size: 14, color: RosTheme.primary),
                    label: Text(
                      _datePreset == DatePreset.custom && _customRange != null
                          ? '${DateFormat('d MMM').format(_customRange!.start)} - ${DateFormat('d MMM').format(_customRange!.end)}'
                          : 'Custom Calendar',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _datePreset == DatePreset.custom ? RosTheme.primary : RosTheme.textSecondary,
                      ),
                    ),
                    backgroundColor: _datePreset == DatePreset.custom
                        ? RosTheme.primary.withValues(alpha: 0.15)
                        : RosTheme.bgElevated,
                    side: BorderSide(
                      color: _datePreset == DatePreset.custom ? RosTheme.primary : RosTheme.bgBorder,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    onPressed: _pickCustomRange,
                  ),
                ),
              ],
            ),
          ),

          // ── 2. Top KPI Summary Strip (Orders, Total Guests Pax, Gross Revenue) ──
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 6),
            child: Row(
              children: [
                // Total Orders
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    decoration: BoxDecoration(
                      color: RosTheme.bgCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: RosTheme.bgBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ORDERS',
                          style: TextStyle(color: RosTheme.textMuted, fontSize: 9, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${filtered.length}',
                          style: const TextStyle(
                            color: RosTheme.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 6),

                // Total Guests Pax
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    decoration: BoxDecoration(
                      color: RosTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: RosTheme.primary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.people_alt_rounded, size: 10, color: RosTheme.primary),
                            SizedBox(width: 3),
                            Text(
                              'GUESTS (PAX)',
                              style: TextStyle(color: RosTheme.primary, fontSize: 9, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$_totalGuests',
                          style: const TextStyle(
                            color: RosTheme.primary,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 6),

                // Gross Paid Revenue
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    decoration: BoxDecoration(
                      color: RosTheme.bgCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: RosTheme.bgBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PAID REVENUE',
                          style: TextStyle(color: RosTheme.secondary, fontSize: 9, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '₹${_grossRevenue.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: RosTheme.secondary,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '$_settledCount settled',
                          style: const TextStyle(color: RosTheme.textMuted, fontSize: 8.5, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── 3. Grouping Subfilter (Date / Week / Month / Year / Flat) + Controls ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: RosTheme.bgBorder, width: 0.8)),
            ),
            child: Row(
              children: [
                const Icon(Icons.layers_outlined, size: 14, color: RosTheme.textMuted),
                const SizedBox(width: 6),
                const Text(
                  'Group By:',
                  style: TextStyle(color: RosTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildGroupSubfilterButton('Date', GroupByMode.date),
                        _buildGroupSubfilterButton('Week', GroupByMode.week),
                        _buildGroupSubfilterButton('Month', GroupByMode.month),
                        _buildGroupSubfilterButton('Year', GroupByMode.year),
                        _buildGroupSubfilterButton('Flat', GroupByMode.flat),
                      ],
                    ),
                  ),
                ),
                if (_groupBy != GroupByMode.flat) ...[
                  TextButton(
                    onPressed: () {
                      setState(() {
                        if (_expandedGroupIds.length == groups.length) {
                          _expandedGroupIds.clear();
                        } else {
                          _expandedGroupIds.addAll(groups.map((g) => g.id));
                        }
                      });
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      _expandedGroupIds.length == groups.length ? 'Collapse All' : 'Expand All',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: RosTheme.primary),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // ── 4. Search & Status Filter Strip ────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 6),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 36,
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(fontSize: 12, color: RosTheme.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Search order #, table, guest...',
                        hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                        prefixIcon: const Icon(Icons.search, size: 16, color: RosTheme.textMuted),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 14),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: RosTheme.bgElevated,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: RosTheme.bgBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: RosTheme.bgBorder),
                        ),
                      ),
                      onChanged: (v) => setState(() => _searchQuery = v),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── 5. Status Filter Pills ─────────────────────────────────────────
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              children: [
                // Order Type Filter dropdown or pill
                PopupMenuButton<String>(
                  initialValue: _typeFilter ?? 'ALL',
                  onSelected: (t) {
                    setState(() => _typeFilter = t == 'ALL' ? null : t);
                    _loadOrders();
                  },
                  color: RosTheme.bgCard,
                  child: Container(
                    margin: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _typeFilter != null ? RosTheme.primary.withValues(alpha: 0.15) : RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: _typeFilter != null ? RosTheme.primary : RosTheme.bgBorder,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.filter_list_rounded,
                          size: 13,
                          color: _typeFilter != null ? RosTheme.primary : RosTheme.textMuted,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _typeFilter == null ? 'All Types' : _typeFilter!.replaceAll('_', ' '),
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: _typeFilter != null ? RosTheme.primary : RosTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  itemBuilder: (ctx) => _typeOptions.map((t) => PopupMenuItem(
                    value: t,
                    child: Text(t.replaceAll('_', ' '), style: const TextStyle(fontSize: 12)),
                  )).toList(),
                ),
                ..._statusOptions.map((s) {
                  final selected = (_statusFilter ?? 'ALL') == s;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
                    child: FilterChip(
                      label: Text(s.replaceAll('_', ' '), style: const TextStyle(fontSize: 10.5)),
                      selected: selected,
                      onSelected: (_) {
                        setState(() => _statusFilter = s == 'ALL' ? null : s);
                        _loadOrders();
                      },
                      selectedColor: RosTheme.primary.withValues(alpha: 0.15),
                      labelStyle: TextStyle(
                        color: selected ? RosTheme.primary : RosTheme.textSecondary,
                        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                    ),
                  );
                }),
              ],
            ),
          ),

          const Divider(height: 1, color: RosTheme.bgBorder),

          // ── 6. Grouped Collapsible Accordion Order History List ───────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: RosTheme.primary))
                : filtered.isEmpty
                    ? const Center(
                        child: Text(
                          'No orders found for selected timeframe',
                          style: TextStyle(color: RosTheme.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(14, 10, 14, 30),
                        itemCount: groups.length,
                        itemBuilder: (ctx, gIdx) {
                          final group = groups[gIdx];
                          final isExpanded = _groupBy == GroupByMode.flat || _expandedGroupIds.contains(group.id);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            decoration: BoxDecoration(
                              color: RosTheme.bgCard,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: RosTheme.bgBorder),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Group Header Accordion Tile
                                InkWell(
                                  onTap: _groupBy == GroupByMode.flat
                                      ? null
                                      : () {
                                          setState(() {
                                            if (_expandedGroupIds.contains(group.id)) {
                                              _expandedGroupIds.remove(group.id);
                                            } else {
                                              _expandedGroupIds.add(group.id);
                                            }
                                          });
                                        },
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: RosTheme.bgElevated.withValues(alpha: 0.5),
                                      borderRadius: isExpanded && group.orders.isNotEmpty
                                          ? const BorderRadius.vertical(top: Radius.circular(12))
                                          : BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                group.title,
                                                style: const TextStyle(
                                                  color: RosTheme.textPrimary,
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w800,
                                                ),
                                              ),
                                              const SizedBox(height: 3),
                                              Row(
                                                children: [
                                                  Text(
                                                    '${group.totalOrders} ${group.totalOrders == 1 ? 'order' : 'orders'}',
                                                    style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                                                  ),
                                                  const Text(' · ', style: TextStyle(color: RosTheme.textMuted)),
                                                  const Icon(Icons.people_alt_rounded, size: 11, color: RosTheme.primary),
                                                  const SizedBox(width: 2),
                                                  Text(
                                                    '${group.totalGuests} Guests',
                                                    style: const TextStyle(
                                                      color: RosTheme.primary,
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w700,
                                                    ),
                                                  ),
                                                  const Text(' · ', style: TextStyle(color: RosTheme.textMuted)),
                                                  Text(
                                                    '₹${group.totalRevenue.toStringAsFixed(0)} paid',
                                                    style: const TextStyle(
                                                      color: RosTheme.secondary,
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w700,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (_groupBy != GroupByMode.flat)
                                          Icon(
                                            isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                            color: RosTheme.textSecondary,
                                            size: 22,
                                          ),
                                      ],
                                    ),
                                  ),
                                ),

                                // Expanded Orders List
                                if (isExpanded) ...[
                                  const Divider(height: 1, color: RosTheme.bgBorder),
                                  ListView.separated(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    padding: const EdgeInsets.all(10),
                                    itemCount: group.orders.length,
                                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                                    itemBuilder: (ctx, oIdx) {
                                      final order = group.orders[oIdx];
                                      return _OrderTile(
                                        order: order,
                                        onTap: () => context.push('/order-history/${order.id}'),
                                      );
                                    },
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateChip(String label, DatePreset preset) {
    final selected = _datePreset == preset;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label, style: const TextStyle(fontSize: 11)),
        selected: selected,
        onSelected: (_) {
          setState(() => _datePreset = preset);
          _loadOrders();
        },
        selectedColor: RosTheme.primary.withValues(alpha: 0.15),
        labelStyle: TextStyle(
          color: selected ? RosTheme.primary : RosTheme.textSecondary,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: BorderSide(
          color: selected ? RosTheme.primary : RosTheme.bgBorder,
        ),
      ),
    );
  }

  Widget _buildGroupSubfilterButton(String label, GroupByMode mode) {
    final selected = _groupBy == mode;
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: InkWell(
        onTap: () {
          setState(() {
            _groupBy = mode;
            _expandedGroupIds.clear();
          });
        },
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: selected ? RosTheme.primary.withValues(alpha: 0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: selected ? RosTheme.primary : Colors.transparent,
              width: 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              color: selected ? RosTheme.primary : RosTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final Order order;
  final VoidCallback onTap;
  const _OrderTile({required this.order, required this.onTap});

  Color get _statusColor => switch (order.status) {
    'DRAFT' => RosTheme.textMuted,
    'CONFIRMED' || 'SENT_TO_KITCHEN' => RosTheme.info,
    'PREPARING' => RosTheme.warning,
    'READY' || 'SERVED' => RosTheme.secondary,
    'BILLED' || 'PARTIALLY_PAID' => RosTheme.accent,
    'PAID' || 'COMPLETED' => RosTheme.statusAvailable,
    'CANCELLED' || 'VOIDED' => RosTheme.danger,
    _ => RosTheme.textMuted,
  };

  Widget _buildOrderTypeBadge() {
    final type = order.type.toUpperCase();
    final (Color bg, Color fg, IconData icon, String label) = switch (type) {
      'DINE_IN' => (
        const Color(0xFFE11D48).withValues(alpha: 0.15),
        const Color(0xFFF43F5E),
        Icons.restaurant_rounded,
        'Dine-In'
      ),
      'TAKEAWAY' || 'PICKUP' => (
        const Color(0xFFF59E0B).withValues(alpha: 0.15),
        const Color(0xFFF59E0B),
        Icons.takeout_dining_rounded,
        'Takeaway'
      ),
      'DELIVERY' => (
        const Color(0xFF3B82F6).withValues(alpha: 0.15),
        const Color(0xFF60A5FA),
        Icons.delivery_dining_rounded,
        'Delivery'
      ),
      'ONLINE' || 'QR_ORDER' => (
        const Color(0xFF8B5CF6).withValues(alpha: 0.15),
        const Color(0xFFA78BFA),
        Icons.qr_code_rounded,
        'Online QR'
      ),
      _ => (
        RosTheme.bgElevated,
        RosTheme.textSecondary,
        Icons.receipt_long_rounded,
        type.replaceAll('_', ' ')
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: fg.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: fg),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(color: fg, fontSize: 9.5, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final guests = order.effectiveGuestCount;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: RosTheme.bgElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: RosTheme.bgBorder.withValues(alpha: 0.8)),
        ),
        child: Row(
          children: [
            // Order type badge icon avatar
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: RosTheme.bgCard,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: RosTheme.bgBorder),
              ),
              child: Icon(
                order.type == 'DINE_IN'
                    ? Icons.table_restaurant_rounded
                    : order.type == 'DELIVERY'
                        ? Icons.delivery_dining_rounded
                        : Icons.takeout_dining_rounded,
                color: RosTheme.textSecondary,
                size: 19,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Row 1: Order Number + Order Type Tag + Guest Count Tag + Status Badge
                  Row(
                    children: [
                      Text(
                        '#${order.orderNumber}',
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 6),
                      _buildOrderTypeBadge(),
                      const SizedBox(width: 4),
                      // Guest Count Tag
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: RosTheme.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: RosTheme.primary.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.people_alt_rounded, size: 9.5, color: RosTheme.primary),
                            const SizedBox(width: 2.5),
                            Text(
                              '${guests}p',
                              style: const TextStyle(
                                color: RosTheme.primary,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          order.status.replaceAll('_', ' '),
                          style: TextStyle(
                            color: _statusColor,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Row 2: Table name + Date/Time
                  Row(
                    children: [
                      if (order.table != null) ...[
                        Text(
                          'Table: ${order.table!.name}',
                          style: const TextStyle(
                            color: RosTheme.textSecondary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Text(' · ', style: TextStyle(color: RosTheme.textMuted)),
                      ],
                      Text(
                        DateFormat('d MMM, h:mm a').format(order.createdAt),
                        style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Right side: Price & Payment method
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '₹${order.total.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: RosTheme.primary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${order.items.length} items',
                  style: const TextStyle(color: RosTheme.textMuted, fontSize: 10.5),
                ),
                const SizedBox(height: 3),
                // Payment Method Tag
                if (order.payments.isNotEmpty)
                  Wrap(
                    spacing: 3,
                    children: order.payments
                        .map((p) => p.method)
                        .toSet()
                        .map((method) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: RosTheme.secondary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          method.toUpperCase(),
                          style: const TextStyle(
                            color: RosTheme.secondary,
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      );
                    }).toList(),
                  )
                else if (order.status == 'PAID' || order.status == 'COMPLETED')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: const Text(
                      'PAID',
                      style: TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  )
                else if (order.balanceDue > 0.01)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: RosTheme.danger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      'DUE ₹${order.balanceDue.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: RosTheme.danger,
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
