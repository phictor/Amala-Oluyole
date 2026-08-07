import { useWindowDimensions } from 'react-native';

/**
 * Responsive sizing utilities that scale with the device screen.
 *
 * Design baseline: 390px wide (iPhone 14 / Pixel 7)
 * - xs phone: 320px (iPhone SE)
 * - sm phone: 375px (iPhone 13 mini)
 * - md phone: 390px (iPhone 14) ← baseline
 * - lg phone: 430px (iPhone 14 Plus / Pro Max)
 * - tablet:   768px+
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const BASE = 390;
  const scale = width / BASE;

  const isTablet = width >= 768;
  const isSmall = width < 360;
  const isLarge = width >= 428;

  /**
   * Scale a pixel value proportionally to the screen width.
   * Clamps to ±30% of the original value to prevent extreme scaling.
   */
  const rs = (size: number) => {
    const scaled = size * scale;
    const min = size * 0.75;
    const max = isTablet ? size * 1.5 : size * 1.2;
    return Math.round(Math.min(Math.max(scaled, min), max));
  };

  /**
   * Scale a font size. Slightly more conservative than rs() to keep text readable.
   */
  const rf = (size: number) => {
    const scaled = size * Math.min(scale, isTablet ? 1.3 : 1.15);
    return Math.round(Math.max(scaled, size * 0.85));
  };

  /**
   * Fluid column width for grid layouts.
   * @param cols - number of columns
   * @param gap - gap between columns (default 12)
   * @param padding - horizontal screen padding (default 16)
   */
  const colWidth = (cols: number, gap = 12, padding = 16) => {
    const totalGaps = (cols - 1) * gap;
    const available = width - padding * 2 - totalGaps;
    return Math.floor(available / cols);
  };

  /**
   * Responsive padding — larger on tablets, smaller on tiny phones.
   */
  const rp = (base: number) => {
    if (isTablet) return Math.round(base * 1.5);
    if (isSmall) return Math.round(base * 0.85);
    return base;
  };

  return { width, height, scale, isTablet, isSmall, isLarge, rs, rf, colWidth, rp };
}
