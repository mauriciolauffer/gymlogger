export function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(secs: number): string {
  if (!secs) return "0m";
  const m = Math.floor(secs / 60);
  return `${m}m`;
}

export function formatDurationHours(secs: number): string {
  if (!secs) return "0.0 hrs";
  return `${(secs / 3600).toFixed(1)} hrs`;
}
