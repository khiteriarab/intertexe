export type DetectedDevice = 'iphone' | 'android' | 'ipad' | 'desktop';

export function detectDevice(): DetectedDevice {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone/.test(ua)) return 'iphone';
  if (/ipad/.test(ua) || (ua.includes('mac') && navigator.maxTouchPoints > 1)) return 'ipad';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}
