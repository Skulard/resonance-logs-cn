import { resolveBuffDisplayName } from "$lib/config/buff-name-table";
import { SETTINGS, ensureBuffAliases } from "$lib/settings-store";
import { buildBuffTextRow } from "../game-overlay/overlay-utils";
import type { TextBuffDisplay } from "../game-overlay/overlay-types";
import { monsterRuntime } from "./monster-runtime.svelte.js";
import type { MonsterBossBuffSection } from "./monster-types";

function selectedMonsterBuffIds() {
  return Array.from(new Set([
    ...SETTINGS.monsterMonitor.state.monitoredBuffIds,
    ...SETTINGS.monsterMonitor.state.selfAppliedBuffIds,
  ]));
}

function buildPlaceholderRows(now: number): TextBuffDisplay[] {
  const aliases = ensureBuffAliases(SETTINGS.monsterMonitor.state.buffAliases);
  const selectedIds = selectedMonsterBuffIds();
  const rows = selectedIds
    .map((baseId) =>
      buildBuffTextRow(
        `monster_preview_${baseId}`,
        resolveBuffDisplayName(baseId, aliases),
        {
          baseId,
          durationMs: 0,
          createTimeMs: now,
          layer: 1,
        },
        now,
        true,
      ))
    .filter((row): row is TextBuffDisplay => row !== null);

  if (rows.length > 0) return rows;

  return [
    {
      key: "monster_preview_empty",
      label: "在怪物监控页选择 Buff",
      valueText: "--",
      progressPercent: 0,
      showProgress: false,
      isPlaceholder: true,
    },
  ];
}

export function updateMonsterDisplay() {
  const now = Date.now();
  const aliases = ensureBuffAliases(SETTINGS.monsterMonitor.state.buffAliases);
  const selectedIds = selectedMonsterBuffIds();
  const priorityIndex = new Map(selectedIds.map((id, index) => [id, index]));
  const nextSections: MonsterBossBuffSection[] = [];

  const sortedBossEntries = Array.from(monsterRuntime.bossBuffMap.entries())
    .sort(([leftUid], [rightUid]) => leftUid - rightUid);

  for (const [bossUid, buffMap] of sortedBossEntries) {
    const rows = Array.from(buffMap.values())
      .sort((left, right) => {
        const leftPriority = priorityIndex.get(left.baseId) ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = priorityIndex.get(right.baseId) ?? Number.MAX_SAFE_INTEGER;
        return leftPriority - rightPriority || left.baseId - right.baseId;
      })
      .map((buff) =>
        buildBuffTextRow(
          `monster_${bossUid}_${buff.baseId}`,
          resolveBuffDisplayName(buff.baseId, aliases),
          buff,
          now,
        ))
      .filter((row): row is TextBuffDisplay => row !== null);

    if (rows.length === 0) continue;
    nextSections.push({
      bossUid,
      title: `目标 ${bossUid}`,
      rows,
    });
  }

  if (nextSections.length === 0 && monsterRuntime.isEditing) {
    nextSections.push({
      bossUid: 0,
      title: "预览",
      rows: buildPlaceholderRows(now),
      isPlaceholder: true,
    });
  }

  monsterRuntime.bossSections = nextSections;
  monsterRuntime.rafId = requestAnimationFrame(updateMonsterDisplay);
}
