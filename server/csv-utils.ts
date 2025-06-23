import type { Punch } from "../shared/schema";

export function formatPunchesForCSV(punches: Punch[]) {
  return punches.map(punch => ({
    date: new Date(punch.timestamp).toLocaleDateString(),
    time: new Date(punch.timestamp).toLocaleTimeString(),
    type: punch.punchType,
    location: punch.latitude && punch.longitude 
      ? `${punch.latitude.toFixed(6)}, ${punch.longitude.toFixed(6)}`
      : "N/A"
  }));
}