/**
 * Error boundary helper for UI components
 * Catches render errors and shows a fallback instead of crashing the plugin
 */

import { handleError } from "./error-handler";

/**
 * Run a component render function inside an error boundary.
 * On error: log, notify user, and return the fallback result.
 */
export function withErrorBoundary<T>(
	component: () => T,
	fallback: () => T,
	componentName = "Component"
): T {
	try {
		return component();
	} catch (error) {
		handleError(error, { component: componentName, notifyUser: true });
		return fallback();
	}
}
