const today = () => new Date().toISOString().slice(0, 10);

export function createSeed() {
  return {
    students: [
      { id: 'stu-1', name: 'Aarav Mehta', grade: 'Grade 4 · A', parent: 'Priya Mehta', phone: '+91 98765 43210', routeId: 'route-1', stop: 'Lakeview Apartments', pickup: '7:35 AM', avatar: 'AM', active: true },
      { id: 'stu-2', name: 'Anaya Kapoor', grade: 'Grade 2 · B', parent: 'Rohan Kapoor', phone: '+91 98765 43211', routeId: 'route-1', stop: 'Maple Street', pickup: '7:42 AM', avatar: 'AK', active: true },
      { id: 'stu-3', name: 'Ishaan Sharma', grade: 'Grade 6 · A', parent: 'Neha Sharma', phone: '+91 98765 43212', routeId: 'route-2', stop: 'Green Park Gate', pickup: '7:30 AM', avatar: 'IS', active: true },
      { id: 'stu-4', name: 'Diya Nair', grade: 'Grade 3 · C', parent: 'Arjun Nair', phone: '+91 98765 43213', routeId: 'route-2', stop: 'Orchid Residency', pickup: '7:48 AM', avatar: 'DN', active: true },
      { id: 'stu-5', name: 'Kabir Rao', grade: 'Grade 5 · B', parent: 'Meera Rao', phone: '+91 98765 43214', routeId: 'route-3', stop: 'Cedar Lane', pickup: '7:40 AM', avatar: 'KR', active: true },
      { id: 'stu-6', name: 'Mira Joshi', grade: 'Grade 1 · A', parent: 'Amit Joshi', phone: '+91 98765 43215', routeId: 'route-3', stop: 'Sunrise Enclave', pickup: '7:52 AM', avatar: 'MJ', active: true }
    ],
    drivers: [
      { id: 'drv-1', name: 'Rajesh Kumar', phone: '+91 98100 11223', busId: 'bus-1', routeId: 'route-1', status: 'On route', avatar: 'RK' },
      { id: 'drv-2', name: 'Suresh Patel', phone: '+91 98100 11224', busId: 'bus-2', routeId: 'route-2', status: 'On route', avatar: 'SP' },
      { id: 'drv-3', name: 'Vikram Singh', phone: '+91 98100 11225', busId: 'bus-3', routeId: 'route-3', status: 'Ready', avatar: 'VS' }
    ],
    buses: [
      { id: 'bus-1', number: 'DL 1C AB 2486', label: 'Bus 01', capacity: 32, status: 'On route', routeId: 'route-1' },
      { id: 'bus-2', number: 'DL 1C AB 7312', label: 'Bus 02', capacity: 28, status: 'On route', routeId: 'route-2' },
      { id: 'bus-3', number: 'DL 1C AB 9154', label: 'Bus 03', capacity: 32, status: 'Ready', routeId: 'route-3' },
      { id: 'bus-4', number: 'DL 1C AB 4068', label: 'Bus 04', capacity: 24, status: 'Ready', routeId: null }
    ],
    routes: [
      { id: 'route-1', name: 'Lakeview Loop', color: 'blue', busId: 'bus-1', driverId: 'drv-1', stops: ['Lakeview Apartments', 'Maple Street', 'Riverside Market', 'Northview School'], students: 2, startTime: '7:15 AM', duration: '42 min', status: 'Active' },
      { id: 'route-2', name: 'Green Park Express', color: 'purple', busId: 'bus-2', driverId: 'drv-2', stops: ['Green Park Gate', 'Orchid Residency', 'City Library', 'Northview School'], students: 2, startTime: '7:10 AM', duration: '38 min', status: 'Active' },
      { id: 'route-3', name: 'Cedar Grove Route', color: 'orange', busId: 'bus-3', driverId: 'drv-3', stops: ['Cedar Lane', 'Sunrise Enclave', 'Oakwood Circle', 'Northview School'], students: 2, startTime: '7:20 AM', duration: '45 min', status: 'Active' }
    ],
    trips: [
      { id: 'trip-1', routeId: 'route-1', date: today(), type: 'Morning pickup', status: 'In progress', startedAt: new Date(Date.now() - 17 * 60000).toISOString(), eta: '8:18 AM', attendance: { 'stu-1': 'Picked up', 'stu-2': 'Upcoming' }, simulated: true },
      { id: 'trip-2', routeId: 'route-2', date: today(), type: 'Morning pickup', status: 'In progress', startedAt: new Date(Date.now() - 12 * 60000).toISOString(), eta: '8:22 AM', attendance: { 'stu-3': 'Picked up', 'stu-4': 'Upcoming' }, simulated: true },
      { id: 'trip-3', routeId: 'route-3', date: today(), type: 'Morning pickup', status: 'Scheduled', startedAt: null, eta: '8:30 AM', attendance: { 'stu-5': 'Upcoming', 'stu-6': 'Upcoming' }, simulated: true },
      { id: 'trip-4', routeId: 'route-1', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), type: 'Afternoon drop', status: 'Completed', startedAt: new Date(Date.now() - 86400000 + 9 * 3600000).toISOString(), eta: '3:42 PM', attendance: { 'stu-1': 'Dropped off', 'stu-2': 'Dropped off' }, simulated: true }
    ],
    alerts: [
      { id: 'alert-1', type: 'Pickup', title: 'Aarav was picked up', detail: 'Lakeview Apartments · Bus 01', time: new Date(Date.now() - 5 * 60000).toISOString(), read: false },
      { id: 'alert-2', type: 'Info', title: 'Bus 02 is on its way', detail: 'Green Park Express · ETA 8:22 AM', time: new Date(Date.now() - 11 * 60000).toISOString(), read: false },
      { id: 'alert-3', type: 'Drop', title: 'Yesterday’s trip completed', detail: 'Aarav arrived at Lakeview Apartments', time: new Date(Date.now() - 18 * 3600000).toISOString(), read: true }
    ],
    settings: { schoolName: 'Northview Academy', demoMode: true }
  };
}
