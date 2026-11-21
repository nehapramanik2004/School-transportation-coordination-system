import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Button, Heading, PanelTitle, TripTable } from '../components/UI.jsx';

const filters = ['All trips', 'In progress', 'Scheduled', 'Completed'];

export default function Trips({ data, role, openDialog, mutate }) {
  const [filter, setFilter] = useState('All trips');
  const trips = data.trips.filter(trip => filter === 'All trips' || trip.status === filter);
  const updateTrip = (trip, status) => mutate(`/trips/${trip.id}/status`, 'PATCH', { status }, status === 'Completed' ? 'Trip completed.' : 'Trip started.');
  const actions = role === 'admin' && <Button primary onClick={() => openDialog({ kind: 'trip' })}><Icon name="plus"/> Schedule trip</Button>;
  return <><Heading title="Trips & trip history" description="Monitor today’s runs and review completed journeys." actions={actions}/><div className="section-tabs">{filters.map(value => <button className={`tab-button ${filter === value ? 'active' : ''}`} key={value} onClick={() => setFilter(value)}>{value}</button>)}</div><section className="panel wide-panel"><PanelTitle title="All trips" subtitle={`${trips.length} trips ${filter === 'All trips' ? 'in your workspace' : filter.toLowerCase()}`}/><TripTable data={data} trips={trips} onStatus={role === 'parent' ? undefined : updateTrip} actions={role !== 'parent'}/></section></>;
}
