import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';

class TelegramConnectionSheet extends ConsumerStatefulWidget {
  const TelegramConnectionSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const TelegramConnectionSheet(),
    );
  }

  @override
  ConsumerState<TelegramConnectionSheet> createState() =>
      _TelegramConnectionSheetState();
}

class _TelegramConnectionSheetState
    extends ConsumerState<TelegramConnectionSheet> {
  bool _isLoading = true;
  bool _isProcessing = false;
  bool _isEditing = false;
  String? _errorMessage;

  // Telegram status from backend
  bool _isConnected = false;
  String? _chatId;
  String? _username;
  String _botUsername = '';
  bool _botConfigured = false;

  // Form state
  String _connectMode = 'username'; // 'username' | 'phone'
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  String? _otpDeepLink;
  bool _isOtpStep = false;

  @override
  void initState() {
    super.initState();
    _fetchTelegramStatus();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _fetchTelegramStatus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get<Map<String, dynamic>>('/auth/me/telegram');

      final user = ref.read(authProvider).user;
      if (user?.phone != null && user!.phone!.isNotEmpty) {
        _phoneController.text = user.phone!;
      }

      setState(() {
        _isConnected = res['isConnected'] == true;
        _chatId = res['chatId']?.toString();
        _username = res['username']?.toString();
        _botUsername = res['botUsername']?.toString() ?? '';
        _botConfigured = res['botConfigured'] == true;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Could not load Telegram status: $e';
      });
    }
  }

  Future<void> _requestOtp() async {
    final username = _usernameController.text.trim();
    final phone = _phoneController.text.trim();

    if (_connectMode == 'username' && username.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your Telegram @username'),
          backgroundColor: RosTheme.danger,
        ),
      );
      return;
    }

    if (_connectMode == 'phone' && phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your Telegram registered phone number'),
          backgroundColor: RosTheme.danger,
        ),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      final payload = <String, dynamic>{};

      if (_connectMode == 'username') {
        payload['username'] = username.replaceAll('@', '');
      } else {
        payload['phone'] = phone;
      }

      final res = await api.post<Map<String, dynamic>>(
        '/auth/me/telegram/request-otp',
        data: payload,
      );

      setState(() {
        _isProcessing = false;
        _isOtpStep = true;
        _otpDeepLink = res['deepLink'] as String?;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              res['message']?.toString() ??
                  'OTP sent! Check your Telegram account.',
            ),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on DioException catch (e) {
      String msg = 'Failed to send OTP';
      final resData = e.response?.data;
      if (resData is Map) {
        if (resData['error'] is Map && resData['error']['message'] != null) {
          msg = resData['error']['message'].toString();
        } else if (resData['message'] != null) {
          msg = resData['message'].toString();
        }
      }
      setState(() {
        _isProcessing = false;
        _errorMessage = msg;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter the full 6-digit OTP code'),
          backgroundColor: RosTheme.danger,
        ),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post<Map<String, dynamic>>(
        '/auth/me/telegram/verify-otp',
        data: {'otp': otp},
      );

      ref.invalidate(telegramStatusProvider);
      await _fetchTelegramStatus();

      setState(() {
        _isProcessing = false;
        _isEditing = false;
        _isOtpStep = false;
        _otpController.clear();
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              res['message']?.toString() ??
                  '✓ Telegram Connected Successfully! 🚀',
            ),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on DioException catch (e) {
      String msg = 'Invalid or expired OTP code';
      final resData = e.response?.data;
      if (resData is Map) {
        if (resData['error'] is Map && resData['error']['message'] != null) {
          msg = resData['error']['message'].toString();
        } else if (resData['message'] != null) {
          msg = resData['message'].toString();
        }
      }
      setState(() {
        _isProcessing = false;
        _errorMessage = msg;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _disconnectTelegram() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: RosTheme.bgCard,
        title: const Text(
          'Disconnect Telegram?',
          style: TextStyle(color: RosTheme.textPrimary, fontWeight: FontWeight.w700),
        ),
        content: const Text(
          'You will no longer receive live kitchen tickets, order alerts, or sales reports on Telegram.',
          style: TextStyle(color: RosTheme.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/auth/me/telegram');
      ref.invalidate(telegramStatusProvider);
      await _fetchTelegramStatus();
      setState(() {
        _isProcessing = false;
        _isEditing = false;
        _isOtpStep = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Telegram account disconnected'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() => _isProcessing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Disconnect failed: $e'),
            backgroundColor: RosTheme.danger,
          ),
        );
      }
    }
  }

  Future<void> _openTelegramUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: RosTheme.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF229ED9).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF229ED9).withValues(alpha: 0.3),
                  ),
                ),
                child: const Icon(
                  Icons.send_rounded,
                  color: Color(0xFF229ED9),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Telegram Alerts & Bot',
                      style: TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      _isConnected && !_isEditing
                          ? 'Operational notifications active'
                          : 'Connect to receive live restaurant updates',
                      style: const TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 11.5,
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

          const SizedBox(height: 16),

          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 36),
              child: Center(
                child: CircularProgressIndicator(color: Color(0xFF229ED9)),
              ),
            )
          else ...[
            if (_isConnected && !_isEditing)
              _buildConnectedCard()
            else if (_isOtpStep)
              _buildOtpVerificationStep()
            else
              _buildConnectForm(),
          ],
        ],
      ),
    );
  }

  // ── 1. Connected State View ───────────────────────────────────────────────

  Widget _buildConnectedCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF229ED9).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF229ED9).withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                    Icon(Icons.check_circle_rounded,
                        color: RosTheme.secondary, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'Connected & Active',
                      style: TextStyle(
                        color: RosTheme.secondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              if (_botUsername.isNotEmpty)
                GestureDetector(
                  onTap: () => _openTelegramUrl('https://t.me/$_botUsername'),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: RosTheme.bgBorder),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Bot: ',
                          style: TextStyle(
                              color: RosTheme.textMuted, fontSize: 10.5),
                        ),
                        Text(
                          '@$_botUsername',
                          style: const TextStyle(
                            color: Color(0xFF229ED9),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.open_in_new_rounded,
                            size: 12, color: Color(0xFF229ED9)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // User details block
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: RosTheme.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: RosTheme.bgBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Linked Telegram Account',
                      style: TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _username != null && _username!.isNotEmpty
                          ? '@$_username'
                          : (_chatId != null ? 'Chat ID: $_chatId' : 'Connected User'),
                      style: const TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const Icon(Icons.verified_rounded,
                    color: Color(0xFF229ED9), size: 22),
              ],
            ),
          ),

          const SizedBox(height: 10),
          const Text(
            'Live notifications for new orders, kitchen KOT dispatches, bill settlements, and reports are being sent in real-time to your Telegram.',
            style: TextStyle(
              color: RosTheme.textSecondary,
              fontSize: 11,
              height: 1.35,
            ),
          ),

          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _isEditing = true;
                      _isOtpStep = false;
                    });
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    side: const BorderSide(color: RosTheme.bgBorder),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Change Account',
                    style: TextStyle(fontSize: 12, color: RosTheme.textPrimary),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isProcessing ? null : _disconnectTelegram,
                  icon: const Icon(Icons.link_off_rounded, size: 16),
                  label: _isProcessing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Disconnect', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RosTheme.danger.withValues(alpha: 0.15),
                    foregroundColor: RosTheme.danger,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: RosTheme.danger.withValues(alpha: 0.3),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── 2. Connect Mode View (Step 1) ─────────────────────────────────────────

  Widget _buildConnectForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Mode Selector Tab (Username vs Phone)
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: RosTheme.bgElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: RosTheme.bgBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _connectMode = 'username');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _connectMode == 'username'
                          ? const Color(0xFF229ED9)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'By Username (@)',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: _connectMode == 'username'
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: _connectMode == 'username'
                            ? Colors.white
                            : RosTheme.textMuted,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _connectMode = 'phone');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _connectMode == 'phone'
                          ? const Color(0xFF229ED9)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'By Mobile Phone',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: _connectMode == 'phone'
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: _connectMode == 'phone'
                            ? Colors.white
                            : RosTheme.textMuted,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        if (_connectMode == 'username') ...[
          const Text(
            'Telegram Username (@handle)',
            style: TextStyle(
              color: RosTheme.textSecondary,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _usernameController,
            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'e.g. chef_alex or @chef_alex',
              hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 13),
              filled: true,
              fillColor: RosTheme.bgElevated,
              prefixIcon: const Icon(Icons.alternate_email_rounded,
                  color: Color(0xFF229ED9), size: 18),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.bgBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.bgBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF229ED9)),
              ),
            ),
          ),
        ] else ...[
          const Text(
            'Registered Phone Number',
            style: TextStyle(
              color: RosTheme.textSecondary,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            style: const TextStyle(color: RosTheme.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'e.g. +91 98765 43210',
              hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 13),
              filled: true,
              fillColor: RosTheme.bgElevated,
              prefixIcon: const Icon(Icons.phone_rounded,
                  color: Color(0xFF229ED9), size: 18),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.bgBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: RosTheme.bgBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF229ED9)),
              ),
            ),
          ),
        ],

        if (_botUsername.isNotEmpty) ...[
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => _openTelegramUrl('https://t.me/$_botUsername'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF229ED9).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: const Color(0xFF229ED9).withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded,
                      size: 15, color: Color(0xFF229ED9)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Tip: Tap here to open @$_botUsername on Telegram and press "Start" first.',
                      style: const TextStyle(
                        color: Color(0xFF229ED9),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded,
                      size: 11, color: Color(0xFF229ED9)),
                ],
              ),
            ),
          ),
        ],

        if (_errorMessage != null) ...[
          const SizedBox(height: 10),
          Text(
            _errorMessage!,
            style: const TextStyle(color: RosTheme.danger, fontSize: 11),
          ),
        ],

        const SizedBox(height: 18),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _isProcessing ? null : _requestOtp,
            icon: _isProcessing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.shield_rounded, size: 18),
            label: Text(
              _isProcessing ? 'Generating OTP...' : 'Get Verification OTP',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF229ED9),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),

        if (_isEditing) ...[
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () => setState(() => _isEditing = false),
              child: const Text('Cancel & Keep Existing Connection',
                  style: TextStyle(color: RosTheme.textMuted, fontSize: 12)),
            ),
          ),
        ],
      ],
    );
  }

  // ── 3. OTP Verification View (Step 2) ─────────────────────────────────────

  Widget _buildOtpVerificationStep() {
    final targetDisplay = _connectMode == 'username'
        ? '@${_usernameController.text.trim().replaceAll('@', '')}'
        : _phoneController.text.trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF229ED9).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: const Color(0xFF229ED9).withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.mark_email_read_rounded,
                      color: Color(0xFF229ED9), size: 16),
                  SizedBox(width: 6),
                  Text(
                    'Verification OTP Sent!',
                    style: TextStyle(
                      color: Color(0xFF229ED9),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'We dispatched a 6-digit OTP code to your Telegram account ($targetDisplay).',
                style: const TextStyle(
                  color: RosTheme.textPrimary,
                  fontSize: 11.5,
                ),
              ),
              if (_otpDeepLink != null) ...[
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => _openTelegramUrl(_otpDeepLink!),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '👉 Tap here to Open Bot & View Code',
                        style: TextStyle(
                          color: Color(0xFF229ED9),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.open_in_new_rounded,
                          size: 13, color: Color(0xFF229ED9)),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),
        const Text(
          'ENTER 6-DIGIT OTP CODE',
          style: TextStyle(
            color: RosTheme.textMuted,
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: RosTheme.textPrimary,
            fontSize: 22,
            fontWeight: FontWeight.w900,
            letterSpacing: 10,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: '••••••',
            hintStyle: TextStyle(
              color: RosTheme.textMuted.withValues(alpha: 0.4),
              letterSpacing: 8,
            ),
            filled: true,
            fillColor: RosTheme.bgElevated,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: RosTheme.bgBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: RosTheme.bgBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: RosTheme.secondary),
            ),
          ),
        ),

        if (_errorMessage != null) ...[
          const SizedBox(height: 8),
          Text(
            _errorMessage!,
            style: const TextStyle(color: RosTheme.danger, fontSize: 11),
          ),
        ],

        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _isProcessing ? null : _verifyOtp,
            icon: _isProcessing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.check_circle_rounded, size: 18),
            label: Text(
              _isProcessing ? 'Verifying...' : 'Verify & Connect Account',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: RosTheme.secondary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),

        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: _isProcessing ? null : _requestOtp,
              child: const Text('Resend Code',
                  style: TextStyle(color: Color(0xFF229ED9), fontSize: 12)),
            ),
            TextButton(
              onPressed: () => setState(() => _isOtpStep = false),
              child: const Text('Change Username/Phone',
                  style: TextStyle(color: RosTheme.textMuted, fontSize: 12)),
            ),
          ],
        ),
      ],
    );
  }
}
