import { create } from 'zustand';
import { isFullscreenActive, toggleFullscreen as toggleBrowserFullscreen } from '@/lib/fullscreen';

interface UIState {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  toggleFullscreen: () => void;
}

export const useUIStore = create<UIState>((set) => {
  // Listen to browser fullscreen change events to ensure state is always synchronized
  if (typeof window !== 'undefined') {
    const handleFullscreenChange = () => {
      set({ isFullscreen: isFullscreenActive() });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  }

  return {
    mobileSidebarOpen: false,
    setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
    toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
    isFullscreen: typeof document !== 'undefined' ? isFullscreenActive() : false,
    setIsFullscreen: (val) => set({ isFullscreen: val }),
    toggleFullscreen: () => {
      toggleBrowserFullscreen().then((active) => {
        set({ isFullscreen: active });
      });
    },
  };
});
