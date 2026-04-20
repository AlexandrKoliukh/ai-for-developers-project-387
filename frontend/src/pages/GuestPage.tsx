import { Fragment, useState, useEffect, useRef, memo } from 'react';
import { addDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import type { Booking, EventType, TimeSlot } from '../api/types';
import { guestApi } from '../api/client';
import EventTypeSelector   from '../components/guest/EventTypeSelector';
import CalendarPicker      from '../components/guest/CalendarPicker';
import TimeSlotPicker      from '../components/guest/TimeSlotPicker';
import GuestForm           from '../components/guest/GuestForm';
import BookingConfirmation from '../components/guest/BookingConfirmation';

// Isolated clock component — has its own state so only it re-renders every second
const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="datetime-bar">
      <div className="datetime-item">
        <span className="datetime-label">Сегодня</span>
        <span className="datetime-value">
          {format(now, 'd MMMM yyyy', { locale: ru })}
        </span>
      </div>
      <div className="datetime-item">
        <span className="datetime-label">Время</span>
        <span className="datetime-time">
          {format(now, 'HH:mm:ss')}
        </span>
      </div>
      <div className="datetime-item">
        <span className="datetime-label">День недели</span>
        <span className="datetime-value">
          {format(now, 'EEEE', { locale: ru })}
        </span>
      </div>
    </div>
  );
});

// -------------------------------------------------------
// Types
// -------------------------------------------------------

type Step = 'eventTypes' | 'calendar' | 'form' | 'confirmation';

const stepVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    (dir: number) => ({ opacity: 0, x: dir * -28, transition: { duration: 0.16 } }),
};

const STEPS: { key: Exclude<Step, 'confirmation'>; label: string }[] = [
  { key: 'eventTypes', label: 'Тип встречи' },
  { key: 'calendar',   label: 'Дата и время' },
  { key: 'form',       label: 'Данные' },
];

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default function GuestPage() {
  const [step,      setStep]      = useState<Step>('eventTypes');
  const [direction, setDirection] = useState(1);

  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [selectedDate,      setSelectedDate]      = useState<Date | null>(null);
  const [selectedSlot,      setSelectedSlot]      = useState<TimeSlot | null>(null);
  const [confirmedBooking,  setConfirmedBooking]  = useState<Booking | null>(null);

  const [slotsMap, setSlotsMap] = useState<Record<string, TimeSlot[]>>({});
  const slotsRef = useRef<HTMLDivElement>(null);

  // Load all 14-day slots when event type is selected
  useEffect(() => {
    if (!selectedEventType) return;
    setSlotsMap({});
    const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
    Promise.all(
      days.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const res = await guestApi.getAvailableSlots(selectedEventType.id, dateStr);
          return { dateStr, slots: res.slots };
        } catch {
          return { dateStr, slots: [] };
        }
      })
    ).then((results) => {
      const map: Record<string, TimeSlot[]> = {};
      for (const { dateStr, slots } of results) map[dateStr] = slots;
      setSlotsMap(map);
    });
  }, [selectedEventType]);

  const go = (nextStep: Step, dir: number) => {
    setDirection(dir);
    setStep(nextStep);
  };

  const handleSelectEventType = (et: EventType) => {
    if (selectedEventType?.id !== et.id) {
      setSelectedDate(null);
      setSelectedSlot(null);
    }
    setSelectedEventType(et);
    go('calendar', 1);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    // Auto-scroll to slots on mobile
    if (window.innerWidth <= 480) {
      setTimeout(() => {
        slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinueToForm = () => {
    if (selectedSlot) go('form', 1);
  };

  const handleBookingSuccess = (booking: Booking) => {
    setConfirmedBooking(booking);
    go('confirmation', 1);
  };

  const handleReset = () => {
    setSelectedEventType(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setConfirmedBooking(null);
    go('eventTypes', -1);
  };

  // Stepper click: navigate to any accessible step, preserving state
  const handleStepClick = (targetKey: Exclude<Step, 'confirmation'>) => {
    if (targetKey === step) return;
    if (targetKey === 'calendar' && !selectedEventType) return;
    if (targetKey === 'form' && (!selectedEventType || !selectedDate || !selectedSlot)) return;

    const targetIdx = STEPS.findIndex((s) => s.key === targetKey);
    const dir = targetIdx > currentStepIdx ? 1 : -1;
    go(targetKey, dir);
  };

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  const dateLabel = selectedDate
    ? format(selectedDate, 'd MMMM yyyy', { locale: ru })
    : null;
  const slotLabel = selectedSlot
    ? `${format(new Date(selectedSlot.startTime), 'HH:mm')} – ${format(new Date(selectedSlot.endTime), 'HH:mm')}`
    : null;

  // Determine which steps are accessible for click
  const isStepAccessible = (key: Exclude<Step, 'confirmation'>) => {
    if (key === 'eventTypes') return true;
    if (key === 'calendar') return !!selectedEventType;
    if (key === 'form') return !!(selectedEventType && selectedDate && selectedSlot);
    return false;
  };

  return (
    <div>
      {/* Current date & time bar — isolated component, won't trigger parent re-renders */}
      <LiveClock />

      {/* Step indicator — clickable, hidden on confirmation */}
      {step !== 'confirmation' && (
        <div className="step-indicator">
          {STEPS.map((s, i) => {
            const isDone     = i < currentStepIdx;
            const isActive   = s.key === step;
            const accessible = isStepAccessible(s.key);
            const clickable  = accessible && !isActive;

            return (
              <Fragment key={s.key}>
                {i > 0 && <span className="step-sep" />}
                <button
                  type="button"
                  className={[
                    'step-item',
                    isActive  ? 'active'    : '',
                    isDone    ? 'done'      : '',
                    clickable ? 'clickable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => clickable && handleStepClick(s.key)}
                  tabIndex={clickable ? 0 : -1}
                >
                  <span className="step-num">{isDone ? '✓' : i + 1}</span>
                  {s.label}
                </button>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Selection summary */}
      {(selectedEventType || selectedDate || selectedSlot) && step !== 'confirmation' && (
        <div className="selection-summary">
          <div className="summary-item">
            <span className="summary-item-label">Тип встречи</span>
            {selectedEventType ? (
              <span className="summary-item-value">{selectedEventType.title}&nbsp;·&nbsp;{selectedEventType.durationMinutes} мин</span>
            ) : (
              <span className="summary-item-empty">не выбрано</span>
            )}
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Дата</span>
            {dateLabel ? (
              <span className="summary-item-value">{dateLabel}</span>
            ) : (
              <span className="summary-item-empty">не выбрано</span>
            )}
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Время</span>
            {slotLabel ? (
              <span className="summary-item-value">{slotLabel}</span>
            ) : (
              <span className="summary-item-empty">не выбрано</span>
            )}
          </div>
        </div>
      )}

      {/* Animated step content */}
      <AnimatePresence mode="wait" custom={direction}>
        {step === 'eventTypes' && (
          <motion.div
            key="eventTypes"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <EventTypeSelector onSelect={handleSelectEventType} />
          </motion.div>
        )}

        {step === 'calendar' && selectedEventType && (
          <motion.div
            key="calendar"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <CalendarPicker
              eventType={selectedEventType}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onBack={() => go('eventTypes', -1)}
              slotsMap={slotsMap}
            />

            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  ref={slotsRef}
                  key={selectedDate.toISOString()}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden', borderTop: '1px solid var(--c-border)', background: 'var(--c-surface)' }}
                >
                  <TimeSlotPicker
                    eventTypeId={selectedEventType.id}
                    date={selectedDate}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSelectSlot}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedSlot && (
                <motion.div
                  className="calendar-continue"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  <button className="btn btn-solid" onClick={handleContinueToForm}>
                    Продолжить →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 'form' &&
          selectedEventType &&
          selectedDate &&
          selectedSlot && (
          <motion.div
            key="form"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <GuestForm
              eventType={selectedEventType}
              date={selectedDate}
              slot={selectedSlot}
              onBack={() => go('calendar', -1)}
              onSuccess={handleBookingSuccess}
            />
          </motion.div>
        )}

        {step === 'confirmation' && confirmedBooking && selectedEventType && (
          <motion.div
            key="confirmation"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <BookingConfirmation
              booking={confirmedBooking}
              eventType={selectedEventType}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
