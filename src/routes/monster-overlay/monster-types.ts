import type { TextBuffDisplay } from "../game-overlay/overlay-types";

export type MonsterBossBuffSection = {
  bossUid: number;
  title: string;
  rows: TextBuffDisplay[];
  isPlaceholder?: boolean;
};

export type MonsterDragState = {
  startX: number;
  startY: number;
  startPos: { x: number; y: number };
};

export type MonsterResizeState = {
  startX: number;
  startY: number;
  startValue: number;
};

export type GhostArea = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};
