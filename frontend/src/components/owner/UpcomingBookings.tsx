import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ownerApi } from '../../api/client';
import type { Booking } from '../../api/types';

export default function UpcomingBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    ownerApi
      .listBookings({ limit: 100 })
      .then((res) => setBookings(res.items))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="owner-section">
      <div className="section-header">
        <span className="section-title">Предстоящие встречи</span>
        {!loading && (
          <span className="tag">{bookings.length}</span>
        )}
      </div>

      {error && <div className="error-state">{error}</div>}

      {loading ? (
        <div className="loading-state">Загрузка…</div>
      ) : bookings.length === 0 ? (
        <div className="loading-state">Нет предстоящих встреч</div>
      ) : (
        <div className="data-table">
          <div className="table-row t-head" style={{ gridTemplateColumns: '180px 1fr 1fr' }}>
            <span>Дата и время</span>
            <span>Гость</span>
            <span>Заметка</span>
          </div>

          {bookings.map((booking, i) => {
            const start = new Date(booking.startTime);
            const end   = new Date(booking.endTime);

            return (
              <motion.div
                key={booking.id}
                className="table-row"
                style={{ gridTemplateColumns: '180px 1fr 1fr' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.035, duration: 0.2 }}
              >
                <div data-label="Дата и время">
                  <div className="cell-primary">
                    {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                  </div>
                  <div className="cell-secondary">
                    {format(start, 'EEE d MMM yyyy', { locale: ru })}
                  </div>
                </div>

                <div data-label="Гость">
                  <div className="cell-primary">{booking.guestName}</div>
                  <div className="cell-secondary">{booking.guestEmail}</div>
                </div>

                <div data-label="Заметка">
                  {booking.guestNote ? (
                    <div className="cell-secondary">
                      {booking.guestNote.length > 80
                        ? booking.guestNote.slice(0, 80) + '…'
                        : booking.guestNote}
                    </div>
                  ) : (
                    <span className="cell-secondary" style={{ opacity: 0.4 }}>—</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
