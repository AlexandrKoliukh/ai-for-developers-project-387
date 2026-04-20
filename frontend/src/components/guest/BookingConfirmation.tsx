import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { Booking, EventType } from '../../api/types';

interface Props {
  booking: Booking;
  eventType: EventType;
  onReset: () => void;
}

// Each detail row fades in with a delay
const rowVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.2 + i * 0.06, duration: 0.22 },
  }),
};

export default function BookingConfirmation({ booking, eventType, onReset }: Props) {
  const start = new Date(booking.startTime);
  const end   = new Date(booking.endTime);

  const details = [
    { label: 'Встреча', value: eventType.title },
    { label: 'Дата',    value: format(start, 'EEEE, d MMMM yyyy', { locale: ru }) },
    { label: 'Время',   value: `${format(start, 'HH:mm')} — ${format(end, 'HH:mm')}` },
    { label: 'Гость',   value: booking.guestName },
    { label: 'Email',   value: booking.guestEmail },
    ...(booking.guestNote ? [{ label: 'Заметка', value: booking.guestNote }] : []),
  ];

  return (
    <motion.div
      className="confirmation-block"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Check mark */}
      <motion.div
        className="conf-check"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 20 }}
      >
        ✓
      </motion.div>

      {/* Title */}
      <motion.h2
        className="conf-title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.22 }}
      >
        Запись подтверждена
      </motion.h2>

      {/* Detail rows */}
      <div className="conf-details">
        {details.map(({ label, value }, i) => (
          <motion.div
            key={label}
            className="detail-row"
            custom={i}
            variants={rowVariants}
            initial="hidden"
            animate="visible"
          >
            <span className="detail-label">{label}</span>
            <span className="detail-value">{value}</span>
          </motion.div>
        ))}
      </div>

      {/* Booking ID */}
      <motion.p
        className="conf-id"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
      >
        ID: {booking.id}
      </motion.p>

      {/* Reset button */}
      <motion.button
        className="btn btn-ghost"
        onClick={onReset}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.62 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ← К списку встреч
      </motion.button>
    </motion.div>
  );
}
