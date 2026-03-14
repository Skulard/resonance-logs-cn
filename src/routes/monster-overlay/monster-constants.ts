import type {
  MonsterOverlayPositions,
  MonsterOverlaySizes,
} from "$lib/settings-store";

export const DEFAULT_MONSTER_OVERLAY_POSITIONS: MonsterOverlayPositions = {
  monsterBuffPanel: { x: 40, y: 40 },
};

export const DEFAULT_MONSTER_OVERLAY_SIZES: MonsterOverlaySizes = {
  monsterBuffPanelScale: 1,
};

export const MIN_MONSTER_PANEL_SCALE = 0.5;
export const MAX_MONSTER_PANEL_SCALE = 2.5;
