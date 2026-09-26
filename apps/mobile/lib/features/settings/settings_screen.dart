// =============================================================================
// Settings Screen
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../auth/telegram_connection_sheet.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String _version = '';
  Map<String, dynamic>? _tenantSettings;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final info = await PackageInfo.fromPlatform();
    setState(() => _version = info.version);
    try {
      final api = ref.read(apiClientProvider);
      final data = await api.get<Map<String, dynamic>>('/settings');
      setState(() { _tenantSettings = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: RosTheme.primaryGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: Colors.white.withOpacity(0.2),
                child: Text(
                  (user?.name ?? 'U').substring(0, 1).toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user?.name ?? '', style: const TextStyle(
                      color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                  Text(user?.email ?? '', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  Text(user?.roles.firstOrNull ?? 'Staff',
                      style: const TextStyle(color: Colors.white60, fontSize: 11)),
                ],
              )),
            ]),
          ),

          const SizedBox(height: 20),
          _SectionHeader('Restaurant'),
          _SettingsTile(Icons.store_rounded, 'Restaurant Info', 'Name, address & GST details', onTap: () {}),
          _SettingsTile(Icons.receipt_rounded, 'Tax Configuration', 'CGST, SGST rates', onTap: () {}),
          _SettingsTile(Icons.qr_code_rounded, 'QR Codes', 'Table QR code management', onTap: () {}),

          const SizedBox(height: 8),
          _SectionHeader('Operations'),
          _SettingsTile(Icons.kitchen_rounded, 'Kitchen Stations', 'Manage kitchen sections', onTap: () {}),
          _SettingsTile(Icons.table_bar_rounded, 'Floor Plans', 'Table layout settings', onTap: () {}),
          _SettingsTile(Icons.print_rounded, 'Printers', 'Receipt & KOT printers', onTap: () {}),

          const SizedBox(height: 8),
          _SectionHeader('Account'),
          _SettingsTile(Icons.lock_rounded, 'Change Password', null, onTap: () => _showChangePassword()),
          _SettingsTile(Icons.notifications_rounded, 'Telegram Alerts & Notifications', 'Connect bot for live KOT & bills', onTap: () => TelegramConnectionSheet.show(context)),
          _SettingsTile(Icons.logout_rounded, 'Sign Out', null, color: RosTheme.danger, onTap: () => _logout()),

          const SizedBox(height: 20),
          Center(
            child: Text('ROS v$_version · Restaurant Operating System',
                style: const TextStyle(color: RosTheme.textMuted, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  void _showChangePassword() {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Change Password', style: TextStyle(color: RosTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(
            controller: oldCtrl,
            obscureText: true,
            style: const TextStyle(color: RosTheme.textPrimary),
            decoration: const InputDecoration(labelText: 'Current Password'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: newCtrl,
            obscureText: true,
            style: const TextStyle(color: RosTheme.textPrimary),
            decoration: const InputDecoration(labelText: 'New Password'),
          ),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, height: 48, child: ElevatedButton(
            onPressed: () async {
              try {
                final api = ref.read(apiClientProvider);
                await api.post('/auth/change-password', data: {
                  'currentPassword': oldCtrl.text,
                  'newPassword': newCtrl.text,
                });
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Password changed. Please log in again.'),
                        backgroundColor: RosTheme.secondary),
                  );
                  await ref.read(authProvider.notifier).logout();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: RosTheme.danger),
                  );
                }
              }
            },
            child: const Text('Update Password'),
          )),
        ]),
      ),
    );
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: RosTheme.danger),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await ref.read(authProvider.notifier).logout();
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 4, 4, 8),
    child: Text(title, style: const TextStyle(
        color: RosTheme.textMuted, fontSize: 11,
        fontWeight: FontWeight.w600, letterSpacing: 0.8)),
  );
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Color? color;

  const _SettingsTile(this.icon, this.title, this.subtitle, {this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? RosTheme.textPrimary;
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: RosTheme.bgBorder),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: (color ?? RosTheme.primary).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color ?? RosTheme.primary, size: 18),
        ),
        title: Text(title, style: TextStyle(color: c, fontSize: 14, fontWeight: FontWeight.w500)),
        subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(color: RosTheme.textMuted, fontSize: 12)) : null,
        trailing: const Icon(Icons.chevron_right_rounded, color: RosTheme.textMuted, size: 18),
        onTap: onTap,
        dense: true,
      ),
    );
  }
}
