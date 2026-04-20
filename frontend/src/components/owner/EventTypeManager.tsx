import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ownerApi } from '../../api/client';
import type { EventType, EventTypeCreateRequest } from '../../api/types';
import EventTypeForm from './EventTypeForm';

type EditState =
  | { mode: 'none' }
  | { mode: 'create' }
  | { mode: 'edit'; target: EventType };

export default function EventTypeManager() {
  const [items,     setItems]     = useState<EventType[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ mode: 'none' });

  const load = () => {
    setLoading(true);
    ownerApi
      .listEventTypes()
      .then((res) => setItems(res.items))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    try {
      await ownerApi.deleteEventType(id);
      setItems((prev) => prev.filter((et) => et.id !== id));
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleSave = async (data: EventTypeCreateRequest) => {
    try {
      if (editState.mode === 'create') {
        const created = await ownerApi.createEventType(data);
        setItems((prev) => [...prev, created]);
      } else if (editState.mode === 'edit') {
        const updated = await ownerApi.updateEventType(editState.target.id, {
          title:           data.title,
          description:     data.description,
          durationMinutes: data.durationMinutes,
        });
        setItems((prev) =>
          prev.map((et) => (et.id === updated.id ? updated : et)),
        );
      }
      setEditState({ mode: 'none' });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const toggleCreate = () =>
    setEditState(editState.mode === 'create' ? { mode: 'none' } : { mode: 'create' });

  return (
    <div className="owner-section">
      <div className="section-header">
        <span className="section-title">Типы событий</span>
        <button className="btn btn-primary" onClick={toggleCreate}>
          {editState.mode === 'create' ? '✕ Отмена' : '+ Добавить'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editState.mode === 'create' && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <EventTypeForm
              onSave={handleSave}
              onCancel={() => setEditState({ mode: 'none' })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="error-state">{error}</div>}

      {loading ? (
        <div className="loading-state">Загрузка…</div>
      ) : (
        <div className="data-table">
          <div className="table-row t-head" style={{ gridTemplateColumns: '1fr 80px 64px' }}>
            <span>Название / описание</span>
            <span>Длит.</span>
            <span />
          </div>

          {items.map((et) => (
            <motion.div key={et.id} layout transition={{ duration: 0.2 }}>
              <div className="table-row" style={{ gridTemplateColumns: '1fr 80px 64px' }}>
                <div data-label="Название">
                  <div className="cell-primary">{et.title}</div>
                  {et.description && (
                    <div className="cell-secondary">
                      {et.description.length > 80
                        ? et.description.slice(0, 80) + '…'
                        : et.description}
                    </div>
                  )}
                </div>

                <span className="cell-secondary" data-label="Длительность">{et.durationMinutes} мин</span>

                <div className="row-actions">
                  <button
                    className="icon-btn"
                    title="Редактировать"
                    onClick={() =>
                      setEditState(
                        editState.mode === 'edit' && editState.target.id === et.id
                          ? { mode: 'none' }
                          : { mode: 'edit', target: et },
                      )
                    }
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Удалить"
                    onClick={() => handleDelete(et.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {editState.mode === 'edit' && editState.target.id === et.id && (
                  <motion.div
                    key={`edit-${et.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <EventTypeForm
                      initial={et}
                      onSave={handleSave}
                      onCancel={() => setEditState({ mode: 'none' })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {items.length === 0 && (
            <div className="loading-state">Типов событий пока нет</div>
          )}
        </div>
      )}
    </div>
  );
}
