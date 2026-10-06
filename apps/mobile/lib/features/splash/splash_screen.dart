// =============================================================================
// Startup / Splash Screen — ROS Platform
// =============================================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/shell.dart';
import '../../core/utils/submodule_guard.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;
  Timer? _navTimer;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _fadeAnim = CurvedAnimation(
      parent: _animCtrl,
      curve: Curves.easeOutCubic,
    );

    _scaleAnim = Tween<double>(begin: 0.88, end: 1.0).animate(
      CurvedAnimation(
        parent: _animCtrl,
        curve: Curves.easeOutBack,
      ),
    );

    _animCtrl.forward();
    _scheduleNavigation();
  }

  void _scheduleNavigation() {
    _navTimer = Timer(const Duration(milliseconds: 2200), () {
      if (!mounted) return;
      final authState = ref.read(authProvider);
      final isLoggedIn = authState.isAuthenticated;
      final user = authState.user;

      if (isLoggedIn && user != null) {
        if (user.isPlatformAdmin) {
          context.go('/super-admin');
        } else {
          final target = getDefaultLandingRoute(user);
          context.go(target);
        }
      } else {
        context.go('/login');
      }
    });
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    _animCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: RosTheme.bg,
      body: Stack(
        children: [
          // Background ambient gradient glow
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 0.9,
                  colors: [
                    RosTheme.primary.withValues(alpha: 0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // ── Middle Center: Logo & Platform Title ──
          Center(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: ScaleTransition(
                scale: _scaleAnim,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Brand Logo Badge (sharp non-rounded edges)
                    Container(
                      width: 92,
                      height: 92,
                      decoration: BoxDecoration(
                        gradient: RosTheme.primaryGradient,
                        borderRadius: BorderRadius.zero,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.25),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: RosTheme.primary.withValues(alpha: 0.45),
                            blurRadius: 36,
                            spreadRadius: 2,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.restaurant_menu_rounded,
                          color: Colors.white,
                          size: 48,
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Platform Title
                    const Text(
                      'ROS',
                      style: TextStyle(
                        color: RosTheme.textPrimary,
                        fontSize: 40,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 4.0,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Platform Subtitle
                    const Text(
                      'RESTAURANT OPERATING SYSTEM',
                      style: TextStyle(
                        color: RosTheme.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 3.2,
                      ),
                    ),
                    const SizedBox(height: 6),

                    const Text(
                      'Next-Gen POS, Kitchen & Operations Platform',
                      style: TextStyle(
                        color: RosTheme.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.3,
                      ),
                    ),

                    const SizedBox(height: 36),

                    // Sleek rectangular loading indicator
                    SizedBox(
                      width: 140,
                      child: ClipRRect(
                        borderRadius: BorderRadius.zero,
                        child: LinearProgressIndicator(
                          minHeight: 2.5,
                          backgroundColor: RosTheme.bgElevated,
                          valueColor: const AlwaysStoppedAnimation<Color>(RosTheme.primary),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Bottom Center: BY OXOMSOFT ──
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: RosTheme.bgElevated.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.zero,
                          border: Border.all(
                            color: RosTheme.bgBorder.withValues(alpha: 0.6),
                            width: 1,
                          ),
                        ),
                        child: const Text(
                          'BY OXOMSOFT',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: RosTheme.textSecondary,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 3.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
