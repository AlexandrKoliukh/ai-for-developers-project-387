import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { guestApi } from '../../api/client';
import type { EventType } from '../../api/types';

interface Props {
  onSelect: (eventType: EventType) => void;
}

// Stagger children into view on mount
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function EventTypeSelector({ onSelect }: Props) {
  const [items, setItems]   = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    guestApi
      .listEventTypes()
      .then((res) => setItems(res.items))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Загрузка типов событий…</div>;
  if (error)   return <div className="error-state">{error}</div>;

  return (
    <motion.div
      className="event-types-grid"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((et) => (
        <motion.div
          key={et.id}
          className="event-type-card"
          variants={cardVariants}
          onClick={() => onSelect(et)}
          whileHover={{ scale: 1.006 }}
          whileTap={{ scale: 0.996 }}
        >
          <h3 className="et-title">{et.title}</h3>
          {et.description && (
            <p className="et-desc">{et.description}</p>
          )}
          <div className="et-footer">
            <span className="et-duration">{et.durationMinutes} мин</span>
            <span className="et-arrow">→</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
