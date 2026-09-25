// =============================================================================
// Cross-Browser Fullscreen Helper
// Supports standard HTML5 Fullscreen API, WebKit (iOS/Safari), Mozilla, MS
// =============================================================================

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

export async function enterFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    } else if ((target as any).webkitRequestFullscreen) {
      await (target as any).webkitRequestFullscreen();
      return true;
    } else if ((target as any).mozRequestFullScreen) {
      await (target as any).mozRequestFullScreen();
      return true;
    } else if ((target as any).msRequestFullscreen) {
      await (target as any).msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request failed:', err);
  }
  return false;
}

export async function exitFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (document.exitFullscreen && isFullscreenActive()) {
      await document.exitFullscreen();
      return true;
    } else if ((document as any).webkitExitFullscreen && isFullscreenActive()) {
      await (document as any).webkitExitFullscreen();
      return true;
    } else if ((document as any).mozCancelFullScreen && isFullscreenActive()) {
      await (document as any).mozCancelFullScreen();
      return true;
    } else if ((document as any).msExitFullscreen && isFullscreenActive()) {
      await (document as any).msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Exit fullscreen failed:', err);
  }
  return false;
}

export async function toggleFullscreen(element?: HTMLElement): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitFullscreen();
    return false;
  } else {
    await enterFullscreen(element);
    return true;
  }
}
