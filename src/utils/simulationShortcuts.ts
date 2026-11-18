/**
 * Pure keyboard shortcut resolution and playback speed cycling helpers
 * for the Stamping Simulation view.
 */

export type SimulationPlaybackSpeed = 1 | 2 | 5;

export type SimulationShortcutAction =
  | 'toggle_play'
  | 'restart'
  | 'cycle_speed'
  | 'zoom_in'
  | 'zoom_out'
  | 'full_line';

export interface ShortcutTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => unknown;
  matches?: (selector: string) => boolean;
}

export interface ShortcutKeyEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  target?: EventTarget | ShortcutTargetLike | null;
}

const TEXT_OR_FORM_SELECTOR =
  'input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"], [role="listbox"], [role="slider"], [role="spinbutton"], [role="menuitem"], [role="option"]';

const SPACE_INTERACTIVE_SELECTOR =
  'a, summary, header button, nav button, [role="tab"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"]';

/**
 * Cycles simulation speed strictly in the order: 1x -> 2x -> 5x -> 1x.
 */
export function getNextSimulationSpeed(current: SimulationPlaybackSpeed): SimulationPlaybackSpeed {
  if (current === 1) return 2;
  if (current === 2) return 5;
  return 1;
}

function targetMatchesOrInside(target: ShortcutTargetLike, selector: string): boolean {
  if (typeof target.closest === 'function') {
    return Boolean(target.closest(selector));
  }
  if (typeof target.matches === 'function') {
    return target.matches(selector);
  }
  return false;
}

/**
 * Returns true if the event uses browser modifiers or targets an input, dropdown,
 * slider, or native interactive element that should handle the key directly.
 */
export function shouldIgnoreSimulationShortcut(event: ShortcutKeyEventLike): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  const target = event.target as ShortcutTargetLike | null | undefined;
  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') {
    return true;
  }

  const role = target.getAttribute?.('role')?.toLowerCase() ?? '';
  if (
    role === 'textbox' ||
    role === 'combobox' ||
    role === 'listbox' ||
    role === 'slider' ||
    role === 'spinbutton' ||
    role === 'menuitem' ||
    role === 'option'
  ) {
    return true;
  }

  if (targetMatchesOrInside(target, TEXT_OR_FORM_SELECTOR)) {
    return true;
  }

  const isSpace = event.code === 'Space' || event.key === ' ';
  if (isSpace) {
    if (
      tag === 'A' ||
      tag === 'SUMMARY' ||
      role === 'tab' ||
      role === 'link' ||
      role === 'checkbox' ||
      role === 'radio' ||
      role === 'switch' ||
      targetMatchesOrInside(target, SPACE_INTERACTIVE_SELECTOR)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves a keyboard event into a Stamping Simulation control action, or null if unhandled/ignored.
 */
export function resolveSimulationShortcut(
  event: ShortcutKeyEventLike
): SimulationShortcutAction | null {
  if (shouldIgnoreSimulationShortcut(event)) {
    return null;
  }

  const key = event.key || '';
  const code = event.code || '';

  if (code === 'Space' || key === ' ') {
    return event.repeat ? null : 'toggle_play';
  }

  const lower = key.toLowerCase();
  if (lower === 'r') {
    return event.repeat ? null : 'restart';
  }
  if (lower === 's') {
    return event.repeat ? null : 'cycle_speed';
  }
  if (lower === 'f') {
    return event.repeat ? null : 'full_line';
  }

  if (key === '+' || code === 'NumpadAdd') {
    return 'zoom_in';
  }
  if (key === '-' || code === 'NumpadSubtract') {
    return 'zoom_out';
  }

  return null;
}
