import { addDays, format, isToday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { EventType, TimeSlot } from '../../api/types';

interface Props {
  eventType: EventType;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onBack: () => void;
  slotsMap?: Record<string, TimeSlot[]>;
}

export default function CalendarPicker({
  eventType,
  selectedDate,
  onSelectDate,
  onBack,
  slotsMap,
}: Props) {
  const today = new Date();
  const days  = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  return (
    <div className="calendar-section">
      {/* Header: back button + selected event info */}
      <div className="calendar-header">
        <button className="back-btn" onClick={onBack}>
          ← Назад
        </button>
        <span className="cal-event-badge">
          <strong>{eventType.title}</strong>&nbsp;·&nbsp;{eventType.durationMinutes} мин
        </span>
      </div>

      {/* 14-day grid (7 columns → 2 rows) */}
      <div className="days-grid">
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const dayKey     = format(day, 'yyyy-MM-dd');
          const daySlots   = slotsMap?.[dayKey];
          const available  = daySlots?.filter(s => s.available) ?? [];

          // Show "HH:mm – HH:mm" range of first..last available slot
          let slotRange: string | null = null;
          if (available.length > 0) {
            const first = format(new Date(available[0].startTime), 'HH:mm');
            const last  = format(new Date(available[available.length - 1].startTime), 'HH:mm');
            slotRange = first === last ? first : `${first}–${last}`;
          }

          const hasNoSlots = daySlots !== undefined && available.length === 0;

          return (
            <motion.div
              key={day.toISOString()}
              className={[
                'day-cell',
                isToday(day)  ? 'today'    : '',
                isSelected    ? 'selected' : '',
                hasNoSlots    ? 'no-avail' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(day)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="day-name">
                {format(day, 'EEE', { locale: ru })}
              </span>
              <span className="day-num">
                {format(day, 'd')}
              </span>
              <span className="day-month">
                {format(day, 'LLL', { locale: ru })}
              </span>
              {slotRange ? (
                <span className="day-slots-range">{slotRange}</span>
              ) : daySlots !== undefined ? (
                <span className="day-slots-empty">—</span>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
