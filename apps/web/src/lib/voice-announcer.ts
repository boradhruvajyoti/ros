// =============================================================================
// Voice Announcer — Text-To-Speech (TTS) Human Voice Notifications
// =============================================================================

let activeUtterances: SpeechSynthesisUtterance[] = [];
let audioUnlocked = false;

// Audio unlock on user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Format item title matching the exact POS menu styling for spoken audio
 */
export function formatSpeechItemTitle(item: any): string {
  if (!item) return 'Dish Item';
  let base = '';
  let vName = '';

  if (typeof item === 'object') {
    base = item.menuItem?.name || item.name || item.title || 'Dish Item';
    vName = item.variant?.name || item.variantName || '';
  } else {
    base = String(item);
  }

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

/**
 * Speak any text with a human-like voice
 */
export function speakVoice(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    // Cancel any previous hung speech
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Select the best natural-sounding voice available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice =
        voices.find((v) => v.lang === 'en-IN' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural'))) ||
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => (v.lang === 'en-US' || v.lang === 'en-GB') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    // Keep reference in activeUtterances so Chromium garbage collector doesn't stop it mid-sentence
    activeUtterances.push(utterance);
    utterance.onend = () => {
      activeUtterances = activeUtterances.filter((u) => u !== utterance);
    };
    utterance.onerror = () => {
      activeUtterances = activeUtterances.filter((u) => u !== utterance);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Voice Announcer Error:', err);
  }
}

/**
 * After sending KOT: "New Order received : {Read the items, their variants and quantity and table number}"
 */
export function announceNewOrder(params: {
  items: Array<any>;
  tableName?: string | number | null;
  tableNumber?: string | number | null;
  orderType?: string;
  kotNumber?: string | number;
}): void {
  const { items = [], tableName, tableNumber, orderType } = params;

  // Format dishes: "2 Paneer Butter Masala Full, 1 Butter Naan"
  const itemDescriptions = items
    .filter((it) => it && (it.menuItem?.name || it.name || it.title || typeof it === 'string'))
    .map((it) => {
      const qty = Number(it.quantity || 1);
      const title = formatSpeechItemTitle(it);
      return `${qty} ${title}`;
    });

  const dishesText = itemDescriptions.length > 0
    ? itemDescriptions.join(', ')
    : 'New Dishes';

  let locationText = '';
  const tbl = tableName || tableNumber;
  if (tbl) {
    locationText = ` for Table ${tbl}`;
  } else if (orderType) {
    const formattedType = orderType.replace(/_/g, ' ').toLowerCase();
    locationText = ` for ${formattedType}`;
  }

  const message = `New Order received : ${dishesText}${locationText}`;
  speakVoice(message);
}

/**
 * On accepting order: "Order for {KOT Number} Accepted"
 */
export function announceOrderAccepted(kotNumber: string | number): void {
  const cleanKot = String(kotNumber || '').replace(/^#/, '');
  const message = `Order for ${cleanKot.toUpperCase().startsWith('KOT') ? cleanKot : `KOT ${cleanKot}`} Accepted`;
  speakVoice(message);
}

/**
 * On Ready to serve: "Order {KOT Number} is ready to be served"
 */
export function announceOrderReady(kotNumber: string | number): void {
  const cleanKot = String(kotNumber || '').replace(/^#/, '');
  const message = `Order ${cleanKot.toUpperCase().startsWith('KOT') ? cleanKot : `KOT ${cleanKot}`} is ready to be served`;
  speakVoice(message);
}

/**
 * On marking as paid: "Payment of Rs {Order amount} is received. Thank you for choosing {Name of the restaurant}"
 */
export function announcePaymentReceived(amount: number | string, restaurantName?: string): void {
  const num = Number(amount || 0);
  const formattedAmt = isNaN(num) ? String(amount || '0') : num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  const name = restaurantName?.trim() || 'our restaurant';
  const message = `Payment of Rs ${formattedAmt} is received. Thank you for choosing ${name}`;
  speakVoice(message);
}
