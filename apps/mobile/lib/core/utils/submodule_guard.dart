// =============================================================================
// SubmoduleGuard — Flutter widget for granular submodule-level access control
//
// Usage:
//   SubmoduleGuard(
//     submoduleId: 'kds_cook_station',
//     user: authState.user,
//     child: CookStationWidget(),
//   )
//
// Behavior:
// - Tenant Admin / OWNER: renders child normally.
// - Staff with 'sub:<submoduleId>' permission: renders child normally.
// - Staff WITHOUT permission: shows a grayed-out, tap-disabled version with a lock icon.
// - If hideIfLocked is true: completely hides the widget.
// =============================================================================

import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class SubmoduleGuard extends StatelessWidget {
  /// The submodule id as defined in FEATURE_MODULES (e.g. 'kds_cook_station')
  final String submoduleId;

  /// The authenticated user
  final AuthUser? user;

  /// The widget to render if access is granted
  final Widget child;

  /// Optional label for the lock overlay
  final String? lockedLabel;

  /// If true, completely hides the widget when locked (default: false = show dimmed)
  final bool hideIfLocked;

  const SubmoduleGuard({
    super.key,
    required this.submoduleId,
    required this.user,
    required this.child,
    this.lockedLabel,
    this.hideIfLocked = false,
  });

  bool get _hasAccess {
    if (user == null) return false;
    if (user!.isPlatformAdmin || user!.isTenantAdmin) return true;
    return user!.permissions.contains('sub:$submoduleId');
  }

  @override
  Widget build(BuildContext context) {
    if (_hasAccess) return child;
    if (hideIfLocked) return const SizedBox.shrink();

    return Stack(
      children: [
        // Dimmed, non-interactive content
        IgnorePointer(
          child: Opacity(
            opacity: 0.25,
            child: ColorFiltered(
              colorFilter: const ColorFilter.matrix([
                0.2126, 0.7152, 0.0722, 0, 0,
                0.2126, 0.7152, 0.0722, 0, 0,
                0.2126, 0.7152, 0.0722, 0, 0,
                0,      0,      0,      1, 0,
              ]),
              child: child,
            ),
          ),
        ),

        // Lock overlay
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              color: RosTheme.bgCard.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: RosTheme.bgBorder.withValues(alpha: 0.5)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: RosTheme.bgElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RosTheme.bgBorder),
                  ),
                  child: const Icon(
                    Icons.lock_rounded,
                    color: RosTheme.textMuted,
                    size: 20,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  lockedLabel ?? 'Access Restricted',
                  style: const TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                const Text(
                  'Not granted for your account',
                  style: TextStyle(
                    color: RosTheme.textMuted,
                    fontSize: 10,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
