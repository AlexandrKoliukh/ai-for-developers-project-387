import { useEffect, useRef, useState } from 'react';
import type { EventType, EventTypeCreateRequest } from '../../api/types';

interface Props {
  /** When provided, the form is in "edit" mode (no slug field). */
  initial?: EventType;
  onSave: (data: EventTypeCreateRequest) => void;
  onCancel: () => void;
}

/**
 * Reusable inline form for both creating and editing an EventType.
 * Rendered inside an AnimatePresence accordion in EventTypeManager.
 */
export default function EventTypeForm({ initial, onSave, onCancel }: Props) {
  const [title,    setTitle]    = useState(initial?.title        ?? '');
  const [desc,     setDesc]     = useState(initial?.description  ?? '');
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 30));
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description:     desc || undefined,
      durationMinutes: parseInt(duration, 10),
    });
  };

  return (
    <div className="inline-form">
      <form onSubmit={handleSubmit}>
        <div className="inline-form-body">
          <div className="field-group">
            <label className="field-label">Название *</label>
            <input
              ref={titleRef}
              className="field-input"
              type="text"
              placeholder="30-минутный звонок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Длительность (мин) *</label>
            <input
              className="field-input"
              type="number"
              min={5}
              max={480}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="field-group full">
            <label className="field-label">Описание</label>
            <textarea
              className="field-textarea"
              placeholder="Краткое описание встречи…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ minHeight: 56 }}
            />
          </div>
        </div>

        <div className="inline-form-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className="btn btn-solid">
            {initial ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}
