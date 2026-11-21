import Icon from '../components/Icon.jsx';
import { Button, Heading, PanelTitle, ActivityList } from '../components/UI.jsx';

export default function Notifications({ data, role, mutate }) {
  const unread = data.alerts.filter(alert => !alert.read).length;
  return <><Heading title="Notifications" description="Pickup, drop-off, route and safety updates." actions={role === 'admin' && <Button onClick={() => mutate('/alerts/read', 'PATCH', {}, 'All notifications marked as read.')} disabled={!unread}>Mark all as read</Button>}/><section className="panel"><PanelTitle title="All notifications" subtitle={`${unread} unread updates`}/><ActivityList alerts={data.alerts} empty="No notifications yet."/></section></>;
}
