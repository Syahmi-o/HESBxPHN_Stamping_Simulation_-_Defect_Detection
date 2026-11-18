import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getNextSimulationSpeed,
  shouldIgnoreSimulationShortcut,
  resolveSimulationShortcut,
  type ShortcutTargetLike
} from '../src/utils/simulationShortcuts';

function makeTarget(
  tagName: string,
  opts: {
    role?: string;
    isContentEditable?: boolean;
    focusVisible?: boolean;
    insideSelector?: string[];
  } = {}
): ShortcutTargetLike {
  const inside = new Set(opts.insideSelector ?? []);
  return {
    tagName,
    isContentEditable: opts.isContentEditable ?? false,
    getAttribute: (name: string) => (name === 'role' ? (opts.role ?? null) : null),
    closest: (selector: string) => {
      for (const item of inside) {
        if (selector.includes(item)) return {};
      }
      return null;
    },
    matches: (selector: string) => {
      if (selector === ':focus-visible') return Boolean(opts.focusVisible);
      return false;
    }
  };
}

test('getNextSimulationSpeed cycles strictly 1x -> 2x -> 5x -> 1x', () => {
  assert.equal(getNextSimulationSpeed(1), 2);
  assert.equal(getNextSimulationSpeed(2), 5);
  assert.equal(getNextSimulationSpeed(5), 1);
});

test('resolveSimulationShortcut maps Space, R, S, +, -, F correctly', () => {
  assert.equal(resolveSimulationShortcut({ key: ' ', code: 'Space' }), 'toggle_play');
  assert.equal(resolveSimulationShortcut({ key: 'r', code: 'KeyR' }), 'restart');
  assert.equal(resolveSimulationShortcut({ key: 'R', code: 'KeyR' }), 'restart');
  assert.equal(resolveSimulationShortcut({ key: 's', code: 'KeyS' }), 'cycle_speed');
  assert.equal(resolveSimulationShortcut({ key: 'S', code: 'KeyS' }), 'cycle_speed');
  assert.equal(resolveSimulationShortcut({ key: 'f', code: 'KeyF' }), 'full_line');
  assert.equal(resolveSimulationShortcut({ key: 'F', code: 'KeyF' }), 'full_line');
  assert.equal(resolveSimulationShortcut({ key: '+', code: 'Equal' }), 'zoom_in');
  assert.equal(resolveSimulationShortcut({ key: '+', code: 'NumpadAdd' }), 'zoom_in');
  assert.equal(resolveSimulationShortcut({ key: '-', code: 'Minus' }), 'zoom_out');
  assert.equal(resolveSimulationShortcut({ key: '-', code: 'NumpadSubtract' }), 'zoom_out');
});

test('resolveSimulationShortcut ignores key-repeat for discrete toggles but allows repeat for smooth zoom', () => {
  assert.equal(resolveSimulationShortcut({ key: ' ', code: 'Space', repeat: true }), null);
  assert.equal(resolveSimulationShortcut({ key: 'r', code: 'KeyR', repeat: true }), null);
  assert.equal(resolveSimulationShortcut({ key: 's', code: 'KeyS', repeat: true }), null);
  assert.equal(resolveSimulationShortcut({ key: 'f', code: 'KeyF', repeat: true }), null);

  assert.equal(resolveSimulationShortcut({ key: '+', code: 'Equal', repeat: true }), 'zoom_in');
  assert.equal(resolveSimulationShortcut({ key: '-', code: 'Minus', repeat: true }), 'zoom_out');
});

test('shouldIgnoreSimulationShortcut respects browser modifier shortcuts (Ctrl/Meta/Alt)', () => {
  assert.equal(resolveSimulationShortcut({ key: 'r', code: 'KeyR', ctrlKey: true }), null);
  assert.equal(resolveSimulationShortcut({ key: 'f', code: 'KeyF', ctrlKey: true }), null);
  assert.equal(resolveSimulationShortcut({ key: 's', code: 'KeyS', metaKey: true }), null);
  assert.equal(resolveSimulationShortcut({ key: '+', code: 'Equal', ctrlKey: true }), null);
  assert.equal(resolveSimulationShortcut({ key: '-', code: 'Minus', metaKey: true }), null);
  assert.equal(resolveSimulationShortcut({ key: ' ', code: 'Space', altKey: true }), null);
});

test('shouldIgnoreSimulationShortcut ignores inputs, textareas, selects, sliders, and contenteditable', () => {
  assert.equal(shouldIgnoreSimulationShortcut({ key: 'r', target: makeTarget('INPUT') }), true);
  assert.equal(shouldIgnoreSimulationShortcut({ key: ' ', target: makeTarget('INPUT', { role: 'slider' }) }), true);
  assert.equal(shouldIgnoreSimulationShortcut({ key: 's', target: makeTarget('SELECT') }), true);
  assert.equal(shouldIgnoreSimulationShortcut({ key: 'f', target: makeTarget('TEXTAREA') }), true);
  assert.equal(shouldIgnoreSimulationShortcut({ key: '+', target: makeTarget('DIV', { isContentEditable: true }) }), true);
  assert.equal(shouldIgnoreSimulationShortcut({ key: '-', target: makeTarget('DIV', { role: 'combobox' }) }), true);
});

test('Space ignores nav/header controls, links, and tabs but works after clicking simulation buttons', () => {
  assert.equal(
    resolveSimulationShortcut({
      key: ' ',
      code: 'Space',
      target: makeTarget('BUTTON', { insideSelector: ['nav button'] })
    }),
    null
  );
  assert.equal(
    resolveSimulationShortcut({
      key: ' ',
      code: 'Space',
      target: makeTarget('BUTTON', { insideSelector: ['header button'] })
    }),
    null
  );
  assert.equal(
    resolveSimulationShortcut({
      key: ' ',
      code: 'Space',
      target: makeTarget('BUTTON', { focusVisible: false })
    }),
    'toggle_play'
  );
  assert.equal(
    resolveSimulationShortcut({
      key: ' ',
      code: 'Space',
      target: makeTarget('A')
    }),
    null
  );
  assert.equal(
    resolveSimulationShortcut({
      key: ' ',
      code: 'Space',
      target: makeTarget('DIV', { role: 'tab' })
    }),
    null
  );
});

test('StampingScene main WebGL setup effect does not depend on showGrid so toggling Grid keeps camera unchanged', () => {
  const sceneSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/3d/StampingScene.tsx'),
    'utf8'
  );
  assert.match(sceneSource, /grid\.visible = showGridRef\.current;/);
  assert.match(sceneSource, /\}, \[rebuildProductionLine\]\);/);
  assert.doesNotMatch(sceneSource, /\}, \[rebuildProductionLine,\s*showGrid\]\);/);
});
