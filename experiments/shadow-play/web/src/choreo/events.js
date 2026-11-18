let EV = []; export let BPM_KEYS = [[0, 60], [50, 60]];
export async function loadEvents() { const r = await fetch('../shared/events.json'); const j = await r.json(); EV = j.events; BPM_KEYS = j.bpm; }
export const events = (name) => EV.filter(e => e.name === name);
export const first = (name) => EV.find(e => e.name === name);
export const T = (name, i = 0) => events(name)[i].t;
/** age since the most recent event of this name (null if not started yet) */
export function since(name, t) { let best = null; for (const e of EV) if (e.name === name && e.t <= t) best = t - e.t; return best; }
