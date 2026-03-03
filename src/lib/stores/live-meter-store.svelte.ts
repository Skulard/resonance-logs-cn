import type { LiveDataPayload } from "$lib/api";

let liveData = $state<LiveDataPayload | null>(null);

export function setLiveData(data: LiveDataPayload) {
  liveData = data;
}

export function getLiveData() {
  return liveData;
}

export function clearLiveData() {
  liveData = null;
}

export function clearMeterData() {
  clearLiveData();
}

export function cleanupStores() {
  clearLiveData();
}
