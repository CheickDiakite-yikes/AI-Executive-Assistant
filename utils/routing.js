/** @typedef {'voice' | 'text'} ViewMode */

export const TEXT_PATH = '/text';

/**
 * @param {string} pathname
 * @returns {ViewMode}
 */
export const getViewModeFromPath = (pathname) => {
  if (!pathname) return 'voice';
  return pathname.startsWith(TEXT_PATH) ? 'text' : 'voice';
};

/**
 * @param {ViewMode} mode
 * @returns {string}
 */
export const getPathForViewMode = (mode) => {
  return mode === 'text' ? TEXT_PATH : '/';
};
