import { useState } from 'react';
import { motion } from 'framer-motion';
import { guestApi } from '../../api/client';
import { ApiError } from '../../api/types';
import type { Booking, EventType, TimeSlot } from '../../api/types';

interface Props {
  eventType: EventType;
  date: Date;
  slot: TimeSlot;
  onBack: () => void;
  onSuccess: (booking: Booking) => void;
}

const fieldVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.25 },
  }),
};

export default function GuestForm({ eventType, slot, onBack, onSuccess }: Props) {
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [note,       setNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const booking = await guestApi.createBooking({
        eventTypeId: eventType.id,
        startTime:   slot.startTime,
        guestName:   name.trim(),
        guestEmail:  email.trim(),
        guestNote:   note.trim() || undefined,
      });
      onSuccess(booking);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Этот слот уже занят. Пожалуйста, вернитесь и выберите другое время.');
      } else {
        setError((err as Error).message ?? 'Произошла ошибка. Попробуйте снова.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-section">
      <form onSubmit={handleSubmit}>
        <div className="form-body">
          {error && <div className="error-state">{error}</div>}

          <motion.div
            className="field-group"
            custom={0}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <label className="field-label">Имя *</label>
            <input
              className="field-input"
              type="text"
              placeholder="Иван Иванов"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </motion.div>

          <motion.div
            className="field-group"
            custom={1}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <label className="field-label">Email *</label>
            <input
              className="field-input"
              type="email"
              placeholder="ivan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>

          <motion.div
            className="field-group"
            custom={2}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <label className="field-label">Примечание</label>
            <textarea
              className="field-textarea"
              placeholder="Расскажите, что хотите обсудить…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </motion.div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Назад
          </button>
          <motion.button
            type="submit"
            className="btn btn-solid"
            disabled={submitting || !name.trim() || !email.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? 'Отправка…' : 'Подтвердить →'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
