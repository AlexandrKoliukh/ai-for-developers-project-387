import EventTypeManager  from '../components/owner/EventTypeManager';
import UpcomingBookings from '../components/owner/UpcomingBookings';

export default function OwnerPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Панель владельца</h1>
        <p className="page-subtitle">
          Управление типами событий и просмотр предстоящих встреч
        </p>
      </div>

      <UpcomingBookings />
      <EventTypeManager />
    </div>
  );
}
