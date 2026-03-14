import { SETTINGS } from "$lib/settings-store";
import {
  DEFAULT_MONSTER_OVERLAY_POSITIONS,
  DEFAULT_MONSTER_OVERLAY_SIZES,
  MAX_MONSTER_PANEL_SCALE,
  MIN_MONSTER_PANEL_SCALE,
} from "./monster-constants";
import { monsterRuntime } from "./monster-runtime.svelte.js";

function patchMonsterMonitor(
  updater: (state: typeof SETTINGS.monsterMonitor.state) => Partial<typeof SETTINGS.monsterMonitor.state>,
) {
  Object.assign(SETTINGS.monsterMonitor.state, updater(SETTINGS.monsterMonitor.state));
}

function clampPanelScale(value: number) {
  return Math.max(MIN_MONSTER_PANEL_SCALE, Math.min(MAX_MONSTER_PANEL_SCALE, value));
}

export function setMonsterOverlayWindow(
  currentWindow: typeof monsterRuntime.currentWindow,
) {
  monsterRuntime.currentWindow = currentWindow;
}

export function getMonsterOverlayPositions() {
  return SETTINGS.monsterMonitor.state.overlayPositions
    ?? DEFAULT_MONSTER_OVERLAY_POSITIONS;
}

export function getMonsterOverlaySizes() {
  return SETTINGS.monsterMonitor.state.overlaySizes
    ?? DEFAULT_MONSTER_OVERLAY_SIZES;
}

export function getMonsterPanelPosition() {
  return getMonsterOverlayPositions().monsterBuffPanel;
}

export function getMonsterPanelScale() {
  return getMonsterOverlaySizes().monsterBuffPanelScale;
}

export function monsterPanelStyle() {
  return SETTINGS.monsterMonitor.state.panelStyle;
}

export function setMonsterPanelPosition(nextPos: { x: number; y: number }) {
  patchMonsterMonitor(() => ({
    overlayPositions: {
      ...getMonsterOverlayPositions(),
      monsterBuffPanel: nextPos,
    },
  }));
}

export function setMonsterPanelScale(value: number) {
  patchMonsterMonitor(() => ({
    overlaySizes: {
      ...getMonsterOverlaySizes(),
      monsterBuffPanelScale: clampPanelScale(value),
    },
  }));
}

export async function setMonsterEditMode(editing: boolean) {
  monsterRuntime.isEditing = editing;
  if (monsterRuntime.currentWindow) {
    await monsterRuntime.currentWindow.setIgnoreCursorEvents(!editing);
  }
}

export function startMonsterDrag(
  event: PointerEvent,
  startPos: { x: number; y: number },
) {
  if (!monsterRuntime.isEditing) return;
  event.preventDefault();
  event.stopPropagation();
  monsterRuntime.dragState = {
    startX: event.clientX,
    startY: event.clientY,
    startPos,
  };
}

export function startMonsterResize(
  event: PointerEvent,
  startValue: number,
) {
  if (!monsterRuntime.isEditing) return;
  event.preventDefault();
  event.stopPropagation();
  monsterRuntime.resizeState = {
    startX: event.clientX,
    startY: event.clientY,
    startValue,
  };
}

export function onGlobalPointerMove(event: PointerEvent) {
  if (monsterRuntime.dragState) {
    const deltaX = event.clientX - monsterRuntime.dragState.startX;
    const deltaY = event.clientY - monsterRuntime.dragState.startY;
    setMonsterPanelPosition({
      x: Math.max(0, Math.round(monsterRuntime.dragState.startPos.x + deltaX)),
      y: Math.max(0, Math.round(monsterRuntime.dragState.startPos.y + deltaY)),
    });
  }

  if (monsterRuntime.resizeState) {
    const deltaX = event.clientX - monsterRuntime.resizeState.startX;
    const deltaY = event.clientY - monsterRuntime.resizeState.startY;
    const delta = (deltaX + deltaY) / 300;
    setMonsterPanelScale(monsterRuntime.resizeState.startValue + delta);
  }
}

export function onGlobalPointerUp() {
  monsterRuntime.dragState = null;
  monsterRuntime.resizeState = null;
}

export async function onWindowDragPointerDown(event: PointerEvent) {
  if (!monsterRuntime.currentWindow) return;
  event.preventDefault();
  await monsterRuntime.currentWindow.startDragging();
}

export function resetMonsterOverlayPositions() {
  patchMonsterMonitor(() => ({
    overlayPositions: { ...DEFAULT_MONSTER_OVERLAY_POSITIONS },
  }));
}

export function resetMonsterOverlaySizes() {
  patchMonsterMonitor(() => ({
    overlaySizes: { ...DEFAULT_MONSTER_OVERLAY_SIZES },
  }));
}
