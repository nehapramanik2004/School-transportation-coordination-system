import { localDateKey } from './date.js';

export function currentTrip(data, routeId, date = localDateKey()) {
  const todaysTrips = tripsForRouteOnDate(data, routeId, date);
  return todaysTrips.find(trip => trip.status === 'In progress')
    || todaysTrips.find(trip => trip.status === 'Scheduled');
}

export function tripsForRouteOnDate(data, routeId, date = localDateKey()) {
  if (!routeId) return [];
  return data.trips.filter(trip => trip.routeId === routeId && trip.date === date);
}

export function selectedDriver(data, driverId) {
  return data.drivers.find(driver => driver.id === driverId) || data.drivers[0] || null;
}

export function parentGreeting(child) {
  const firstName = child?.parent?.trim().split(/\s+/)[0] || 'Parent';
  return `Good morning, ${firstName} 👋`;
}
