// =============================================================================
// Restaurant Order Notification Sound Dispatcher
// Replaces previous Text-To-Speech with pleasant restaurant chimes & bells
// =============================================================================

import {
  playNewOrderSound,
  playOrderAcceptedSound,
  playOrderReadySound,
  playPaymentReceivedSound,
  playChimeSound,
} from './order-sound';

export {
  playNewOrderSound,
  playOrderAcceptedSound,
  playOrderReadySound,
  playPaymentReceivedSound,
  playChimeSound,
};

/**
 * Format item title helper (kept for text formatting compatibility if needed)
 */
export function formatSpeechItemTitle(item: any): string {
  if (!item) return 'Dish Item';
  if (typeof item === 'object') {
    const base = item.menuItem?.name || item.name || item.title || 'Dish Item';
    const vName = item.variant?.name || item.variantName || '';
    if (!vName) return base;
    const lower = vName.toLowerCase().trim();
    if (
      lower === 'regular' ||
      lower === 'regular portion' ||
      lower === 'standard' ||
      lower === 'default' ||
      lower === 'single' ||
      lower === 'normal' ||
      lower === 'standard portion' ||
      lower === 'portion' ||
      lower.includes('regular portion')
    ) {
      return base;
    }
    return `${base} ${vName}`;
  }
  return String(item);
}

/**
 * Empty voice stub — SpeechSynthesis is completely decommissioned
 */
export function speakVoice(_text: string): void {
  // TTS has been completely scrapped in favor of restaurant audio chimes
  playNewOrderSound();
}

/**
 * 🔔 Trigger restaurant chime on new order / KOT received
 */
export function announceNewOrder(_params?: any): void {
  playNewOrderSound();
}

/**
 * 👨‍🍳 Trigger affirmative chime on order acceptance
 */
export function announceOrderAccepted(_kotNumber?: string | number): void {
  playOrderAcceptedSound();
}

/**
 * 🛎️ Trigger service bell on order ready to serve
 */
export function announceOrderReady(_kotNumber?: string | number): void {
  playOrderReadySound();
}

/**
 * 💳 Trigger cash/payment success chime on payment mark/receipt
 */
export function announcePaymentReceived(_amount?: number | string, _restaurantName?: string): void {
  playPaymentReceivedSound();
}
