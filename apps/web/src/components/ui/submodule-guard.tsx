'use client';

/**
 * SubmoduleGuard — Enforces granular submodule-level access control for staff users.
 *
 * Usage:
 *   <SubmoduleGuard submoduleId="kds_cook_station">
 *     <CookStationTab />
 *   </SubmoduleGuard>
 *
 * Behavior:
 * - Tenant Admin / Owner: always renders children normally.
 * - Staff with 'sub:<submoduleId>' permission: renders children normally.
 * - Staff WITHOUT permission: renders a grayed-out, click-disabled overlay with a lock icon.
 */

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { hasSubmoduleAccess } from '@/lib/nav-permissions';

interface SubmoduleGuardProps {
  /** The submodule id as defined in FEATURE_MODULES (e.g. 'kds_cook_station') */
  submoduleId: string;
  children: React.ReactNode;
  /** Optional label shown in the locked overlay */
  lockedLabel?: string;
  /** If true, completely hides the element instead of graying it out */
  hideIfLocked?: boolean;
  className?: string;
}

export function SubmoduleGuard({
  submoduleId,
  children,
  lockedLabel,
  hideIfLocked = false,
  className,
}: SubmoduleGuardProps) {
  const { user } = useAuthStore();
  const hasAccess = hasSubmoduleAccess(submoduleId, user);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfLocked) {
    return null;
  }

  return (
    <div className={cn('relative select-none', className)}>
      {/* Dimmed / frozen content — visible but not interactive */}
      <div
        className="pointer-events-none opacity-30 blur-[0.5px] grayscale"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center border border-border">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            {lockedLabel || 'Access Restricted'}
          </p>
          <p className="text-[10px] text-muted-foreground/60 max-w-[180px] leading-relaxed">
            Your account has not been granted access to this section.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * SubmoduleTabGuard — Renders a disabled/grayed-out state for a tab trigger.
 * Pass submoduleId; the render-prop callback receives whether it's disabled.
 *
 * Usage:
 *   <SubmoduleTabGuard submoduleId="kds_runner_station">
 *     {(disabled) => (
 *       <button disabled={disabled} className={disabled ? 'opacity-40 cursor-not-allowed' : ''}>
 *         Waiter / Runner
 *       </button>
 *     )}
 *   </SubmoduleTabGuard>
 */
interface SubmoduleTabGuardProps {
  submoduleId: string;
  children: (isDisabled: boolean) => React.ReactNode;
}

export function SubmoduleTabGuard({ submoduleId, children }: SubmoduleTabGuardProps) {
  const { user } = useAuthStore();
  const hasAccess = hasSubmoduleAccess(submoduleId, user);
  return <>{children(!hasAccess)}</>;
}
