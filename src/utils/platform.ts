/**
 * Platform detection for desktop vs mobile and touch support
 * Used for layout and accessibility (e.g. larger touch targets on mobile)
 */

/** Whether the app is running in Obsidian Mobile */
declare const window: Window & { obsidian?: { isMobile?: boolean } };

export const Platform = {
	/** True when running in Obsidian Mobile (iOS/Android) */
	isMobile(): boolean {
		return typeof window !== "undefined" && !!window.obsidian?.isMobile;
	},

	/** True when the device supports touch (may be true on desktop with touch screen) */
	isTouch(): boolean {
		return typeof window !== "undefined" && "ontouchstart" in window;
	},
};
