export function schoolDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function offsetSchoolDate(dateKey, offsetDays) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

// Present open demo trips on today's school date without changing stored records.
export function normalizeDemoTripDates(workspace, date = schoolDateKey()) {
  if (workspace.settings?.demoMode !== true || !Array.isArray(workspace.trips)) return workspace;

  let changed = false;
  const trips = workspace.trips.map(trip => {
    const isOpenDemoTrip = trip.simulated === true && ['In progress', 'Scheduled'].includes(trip.status);
    if (!isOpenDemoTrip || !trip.date || trip.date >= date) return trip;
    changed = true;
    return { ...trip, date };
  });

  return changed ? { ...workspace, trips } : workspace;
}
