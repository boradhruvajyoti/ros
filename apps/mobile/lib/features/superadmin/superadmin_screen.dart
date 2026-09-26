// =============================================================================
// Platform Super Admin Control Plane — Multi-Tenant Cloud Architecture
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/models.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';

class SuperAdminScreen extends ConsumerStatefulWidget {
  const SuperAdminScreen({super.key});

  @override
  ConsumerState<SuperAdminScreen> createState() => _SuperAdminScreenState();
}

class _SuperAdminScreenState extends ConsumerState<SuperAdminScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _statusFilter = 'ALL';
  bool _isActionLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _purgeCache() async {
    setState(() => _isActionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/super-admin/cache/purge');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Global Redis cache purged successfully'),
            backgroundColor: RosTheme.success,
          ),
        );
      }
      ref.invalidate(superAdminOverviewProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to purge cache: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  Future<void> _toggleTenantStatus(TenantSummary tenant) async {
    final nextStatus = tenant.status == 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        title: Text(nextStatus == 'SUSPENDED' ? 'Suspend Tenant?' : 'Activate Tenant?'),
        content: Text(
          'Are you sure you want to change status of "${tenant.name}" to $nextStatus?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: nextStatus == 'SUSPENDED' ? RosTheme.danger : RosTheme.success,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(nextStatus == 'SUSPENDED' ? 'Suspend' : 'Activate'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isActionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(
        '/super-admin/tenants/${tenant.id}/status',
        data: {'status': nextStatus},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${tenant.name} status updated to $nextStatus'),
            backgroundColor: RosTheme.success,
          ),
        );
      }
      ref.invalidate(superAdminOverviewProvider);
      ref.invalidate(superAdminTenantsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final overviewAsync = ref.watch(superAdminOverviewProvider);
    final user = ref.watch(authProvider).user;
    final currencyFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        backgroundColor: RosTheme.bgCard,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.hub_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Platform Super Admin',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                Text(
                  user?.email ?? 'superadmin@ros.com',
                  style: const TextStyle(fontSize: 11, color: RosTheme.textMuted),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh Metrics',
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: () {
              ref.invalidate(superAdminOverviewProvider);
              ref.invalidate(superAdminTenantsProvider);
              ref.invalidate(saasPlansProvider);
            },
          ),
          IconButton(
            tooltip: 'Purge Redis Cache',
            icon: const Icon(Icons.cleaning_services_rounded, size: 20),
            onPressed: _isActionLoading ? null : _purgeCache,
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: RosTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: RosTheme.textMuted,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(icon: Icon(Icons.dashboard_outlined, size: 18), text: 'Overview'),
            Tab(icon: Icon(Icons.business_outlined, size: 18), text: 'Tenants'),
            Tab(icon: Icon(Icons.credit_card_outlined, size: 18), text: 'SaaS Plans'),
            Tab(icon: Icon(Icons.dns_outlined, size: 18), text: 'System'),
          ],
        ),
      ),
      body: overviewAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: RosTheme.primary),
        ),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: RosTheme.danger, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Failed to load platform data: $err',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: RosTheme.textSecondary),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(superAdminOverviewProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (overview) => TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(overview, currencyFmt),
            _buildTenantsTab(overview),
            _buildPlansTab(currencyFmt),
            _buildSystemTab(overview),
          ],
        ),
      ),
    );
  }

  // ── Tab 1: Overview ─────────────────────────────────────────────────────────

  Widget _buildOverviewTab(SuperAdminOverview overview, NumberFormat currencyFmt) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Platform Banner
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF4338CA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.cloud_done_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ROS Cloud Control Plane',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Multi-Tenant SaaS Operations · Global Architecture',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: RosTheme.success.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: RosTheme.success.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: RosTheme.success,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'ONLINE',
                        style: TextStyle(
                          color: RosTheme.success,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // KPI Grid
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.35,
            children: [
              _buildKpiCard(
                title: 'Total Tenants',
                value: overview.totalTenants.toString(),
                subtitle: '${overview.activeTenants} active restaurants',
                icon: Icons.business_rounded,
                color: const Color(0xFF6366F1),
              ),
              _buildKpiCard(
                title: 'Platform MRR',
                value: currencyFmt.format(overview.monthlyRecurringRevenue),
                subtitle: 'Monthly Recurring Revenue',
                icon: Icons.account_balance_wallet_rounded,
                color: const Color(0xFF10B981),
              ),
              _buildKpiCard(
                title: 'Orders Processed',
                value: NumberFormat.compact().format(overview.totalOrdersProcessed),
                subtitle: 'Lifetime restaurant orders',
                icon: Icons.receipt_long_rounded,
                color: const Color(0xFFF59E0B),
              ),
              _buildKpiCard(
                title: 'DB Latency',
                value: '${overview.databaseLatencyMs} ms',
                subtitle: 'System Uptime: ${overview.systemUptime}',
                icon: Icons.speed_rounded,
                color: const Color(0xFF06B6D4),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Tenants Preview
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Onboarded Restaurants',
                style: TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              TextButton(
                onPressed: () => _tabController.animateTo(1),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 8),

          ...overview.tenants.take(3).map((tenant) => _buildTenantCard(tenant)),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: RosTheme.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 16),
              ),
            ],
          ),
          Text(
            value,
            style: const TextStyle(
              color: RosTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            subtitle,
            style: const TextStyle(
              color: RosTheme.textMuted,
              fontSize: 10,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ── Tab 2: Tenants ──────────────────────────────────────────────────────────

  Widget _buildTenantsTab(SuperAdminOverview overview) {
    final filtered = overview.tenants.where((t) {
      final matchesSearch = _searchQuery.isEmpty ||
          t.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          t.slug.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesStatus = _statusFilter == 'ALL' || t.status == _statusFilter;
      return matchesSearch && matchesStatus;
    }).toList();

    return Column(
      children: [
        // Search and Filter Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: RosTheme.bgCard,
            border: Border(bottom: BorderSide(color: RosTheme.bgBorder)),
          ),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search restaurants or slug...',
                  prefixIcon: const Icon(Icons.search, size: 18, color: RosTheme.textMuted),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 16),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: RosTheme.bgInput,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['ALL', 'ACTIVE', 'SUSPENDED', 'TRIAL'].map((status) {
                    final isSelected = _statusFilter == status;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(status),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _statusFilter = status),
                        selectedColor: RosTheme.primary.withOpacity(0.2),
                        backgroundColor: RosTheme.bgCardElevated,
                        labelStyle: TextStyle(
                          color: isSelected ? RosTheme.primary : RosTheme.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),

        // Tenants List
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'No restaurants found matching filter',
                    style: TextStyle(color: RosTheme.textMuted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) => _buildTenantCard(filtered[i]),
                ),
        ),
      ],
    );
  }

  Widget _buildTenantCard(TenantSummary tenant) {
    final isActive = tenant.status == 'ACTIVE';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? RosTheme.bgBorder : RosTheme.danger.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF6366F1),
                      isActive ? const Color(0xFF8B5CF6) : Colors.grey,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.restaurant, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tenant.name,
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '/${tenant.slug}',
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isActive
                      ? RosTheme.success.withOpacity(0.15)
                      : RosTheme.danger.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  tenant.status,
                  style: TextStyle(
                    color: isActive ? RosTheme.success : RosTheme.danger,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(color: RosTheme.bgBorder, height: 1),
          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildTenantStat(Icons.storefront_outlined, '${tenant.branchesCount} Outlets'),
              _buildTenantStat(Icons.group_outlined, '${tenant.usersCount} Staff'),
              _buildTenantStat(Icons.receipt_outlined, '${tenant.ordersCount} Orders'),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: RosTheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tenant.plan.toUpperCase(),
                  style: const TextStyle(
                    color: RosTheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: isActive ? RosTheme.danger : RosTheme.success,
                  side: BorderSide(
                    color: isActive
                        ? RosTheme.danger.withOpacity(0.5)
                        : RosTheme.success.withOpacity(0.5),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  visualDensity: VisualDensity.compact,
                ),
                icon: Icon(
                  isActive ? Icons.block_rounded : Icons.check_circle_outline_rounded,
                  size: 14,
                ),
                label: Text(
                  isActive ? 'Suspend' : 'Activate',
                  style: const TextStyle(fontSize: 12),
                ),
                onPressed: () => _toggleTenantStatus(tenant),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTenantStat(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: RosTheme.textMuted),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(
            color: RosTheme.textSecondary,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // ── Tab 3: SaaS Plans ───────────────────────────────────────────────────────

  Widget _buildPlansTab(NumberFormat currencyFmt) {
    final plansAsync = ref.watch(saasPlansProvider);

    return plansAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Error loading plans: $err')),
      data: (plans) => ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: plans.length,
        itemBuilder: (ctx, i) {
          final plan = plans[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: plan.isPopular
                    ? RosTheme.primary
                    : RosTheme.bgBorder,
                width: plan.isPopular ? 1.5 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      plan.name,
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (plan.badge != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: RosTheme.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          plan.badge!,
                          style: const TextStyle(
                            color: RosTheme.primary,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      currencyFmt.format(plan.price),
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      ' / ${plan.interval}',
                      style: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  plan.description,
                  style: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
                ),
                const SizedBox(height: 14),
                const Divider(color: RosTheme.bgBorder),
                const SizedBox(height: 10),

                // Features
                ...plan.features.map(
                  (f) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Icon(Icons.check_circle_rounded, color: RosTheme.success, size: 15),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            f,
                            style: const TextStyle(color: RosTheme.textSecondary, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Tab 4: System & Infra ───────────────────────────────────────────────────

  Widget _buildSystemTab(SuperAdminOverview overview) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Infrastructure Health',
                  style: TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 16),
                _buildSystemRow('Reverse Proxy', 'Caddy 2.x + Cloudflare Edge', Icons.security),
                _buildSystemRow('API Gateway Engine', 'Node.js Express Cluster', Icons.memory),
                _buildSystemRow('Database Engine', 'PostgreSQL 16 (Prisma ORM)', Icons.storage),
                _buildSystemRow('Cache Driver', 'Redis Distributed Cache', Icons.bolt),
                _buildSystemRow('Realtime Transport', 'Socket.IO WebSocket Engine', Icons.wifi_tethering),
                _buildSystemRow('Process Uptime', overview.systemUptime, Icons.timer_outlined),
                _buildSystemRow('DB Latency', '${overview.databaseLatencyMs} ms (Healthy)', Icons.speed),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Maintenance Actions
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Maintenance Actions',
                  style: TextStyle(
                    color: RosTheme.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: RosTheme.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.cleaning_services_rounded, color: RosTheme.primary, size: 20),
                  ),
                  title: const Text(
                    'Purge Global Redis Cache',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  subtitle: const Text(
                    'Clears distributed query and permission cache',
                    style: TextStyle(fontSize: 11, color: RosTheme.textMuted),
                  ),
                  trailing: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: RosTheme.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                    onPressed: _isActionLoading ? null : _purgeCache,
                    child: const Text('Purge'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSystemRow(String title, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 16, color: RosTheme.textMuted),
          const SizedBox(width: 10),
          Text(
            title,
            style: const TextStyle(color: RosTheme.textMuted, fontSize: 13),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: RosTheme.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
