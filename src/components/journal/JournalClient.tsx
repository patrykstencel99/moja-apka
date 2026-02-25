'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { uiCopy } from '@/lib/copy';

import styles from './JournalClient.module.css';

type JournalNote = {
  id: string;
  localDate: string;
  content: string;
  createdAt: string;
};

const JOURNAL_MAX_LENGTH = 8000;

function todayLocalDate() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftDate(localDate: string, dayDelta: number) {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + dayDelta);

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function JournalClient() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayLocalDate());
  const [notes, setNotes] = useState<JournalNote[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = useMemo(() => draft.trim().length > 0 && !isSaving, [draft, isSaving]);

  const handleUnauthorized = useCallback(() => {
    setError(uiCopy.journal.sessionExpired);
    router.replace('/login');
    router.refresh();
  }, [router]);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/journal?date=${selectedDate}`, { cache: 'no-store' });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(uiCopy.journal.loadError);
        return;
      }

      const data = (await response.json().catch(() => null)) as { notes?: JournalNote[] } | null;
      setNotes(data?.notes ?? []);
    } catch {
      setError(uiCopy.journal.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, selectedDate]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const saveNote = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          localDate: selectedDate,
          content: draft.trim()
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(uiCopy.journal.saveError);
        return;
      }

      const data = (await response.json().catch(() => null)) as { note?: JournalNote } | null;
      if (data?.note) {
        setNotes((prev) => [data.note as JournalNote, ...prev]);
      }
      setDraft('');
      setStatus(uiCopy.journal.savedStatus);
    } catch {
      setError(uiCopy.journal.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="stack-lg">
      {status && (
        <Banner tone="success" title={uiCopy.today.banners.statusTitle}>
          {status}
        </Banner>
      )}

      {error && (
        <Banner tone="danger" title={uiCopy.today.banners.errorTitle}>
          {error}
        </Banner>
      )}

      <Card tone="elevated" title={uiCopy.journal.title} subtitle={uiCopy.journal.subtitle}>
        <div className={styles.controlsRow}>
          <Button onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))} size="sm" variant="ghost">
            {uiCopy.journal.previousDayButton}
          </Button>

          <label className={styles.datePicker}>
            <span>{uiCopy.journal.pickDateLabel}</span>
            <input
              className={styles.dateInput}
              max="2100-12-31"
              min="2000-01-01"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
          </label>

          <Button onClick={() => setSelectedDate(todayLocalDate())} size="sm" variant="secondary">
            {uiCopy.journal.todayButton}
          </Button>
          <Button onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))} size="sm" variant="ghost">
            {uiCopy.journal.nextDayButton}
          </Button>
        </div>
      </Card>

      <Card className={styles.paperCard} tone="default" title={uiCopy.journal.editorTitle} subtitle={uiCopy.journal.editorSubtitle}>
        <div className={styles.paperFrame}>
          <textarea
            className={styles.paperTextarea}
            maxLength={JOURNAL_MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={uiCopy.journal.textareaPlaceholder}
            value={draft}
          />
        </div>
        <div className={styles.editorFooter}>
          <small>
            {draft.length}/{JOURNAL_MAX_LENGTH}
          </small>
          <Button disabled={!canSave} onClick={() => void saveNote()} variant="primary">
            {isSaving ? uiCopy.journal.savingButton : uiCopy.journal.saveButton}
          </Button>
        </div>
      </Card>

      <Card tone="elevated" title={uiCopy.journal.historyTitle} subtitle={selectedDate}>
        {isLoading ? (
          <div className="empty-state">Ładowanie notatek...</div>
        ) : notes.length === 0 ? (
          <div className="empty-state">{uiCopy.journal.emptyState}</div>
        ) : (
          <div className={styles.notesList}>
            {notes.map((note) => (
              <article className={styles.notePaper} key={note.id}>
                <p className={styles.noteMeta}>{formatTimestamp(note.createdAt)}</p>
                <p className={styles.noteContent}>{note.content}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
