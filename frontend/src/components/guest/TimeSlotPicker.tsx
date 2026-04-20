import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { guestApi } from '../../api/client';
import type { TimeSlot } from '../../api/types';

interface Props {
  eventTypeId: string;
  date: Date;
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}

// Slots stagger in from the top when the date changes
const gridVariants = {
  hidden:  { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.03 } },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.12 } },
};

const slotVariants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
};

export default function TimeSlotPicker({
  eventTypeId,
  date,
  selectedSlot,
  onSelectSlot,
}: Props) {
  const [slots,   setSlots]   = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Re-fetch whenever the selected date changes
  useEffect(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setLoading(true);
    setError(null);
    setSlots([]);

    guestApi
      .getAvailableSlots(eventTypeId, dateStr)
      .then((res) => {
        // Defense-in-depth: filter out slots less than 1 hour from now
        const cutoff = Date.now() + 60 * 60_000;
        const future = res.slots.filter(
          (s) => new Date(s.startTime).getTime() >= cutoff,
        );
        setSlots(future);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventTypeId, date]);

  const dateLabel = format(date, 'EEEE, d MMMM', { locale: ru });

  return (
    <div className="slots-panel">
      <div className="slots-date-label">{dateLabel}</div>

      {loading && <div className="no-slots">Загрузка слотов…</div>}
      {error   && <div className="error-state">{error}</div>}

      {!loading && !error && slots.length === 0 && (
        <div className="no-slots">Нет доступных слотов на эту дату</div>
      )}

      <AnimatePresence mode="wait">
        {!loading && !error && slots.length > 0 && (
          <motion.div
            key={date.toISOString()}
            className="slots-grid"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {slots.map((slot) => {
              const timeLabel = format(new Date(slot.startTime), 'HH:mm');
              const isSelected = selectedSlot?.startTime === slot.startTime;

              return (
                <motion.button
                  key={slot.startTime}
                  className={[
                    'slot-btn',
                    isSelected     ? 'selected'   : '',
                    !slot.available ? 'unavailable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  variants={slotVariants}
                  onClick={() => slot.available && onSelectSlot(slot)}
                  disabled={!slot.available}
                  whileHover={slot.available ? { scale: 1.04 } : undefined}
                  whileTap={slot.available   ? { scale: 0.96 } : undefined}
                >
                  {timeLabel}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
