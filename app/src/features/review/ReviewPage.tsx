// Revisión del banco de palabras por docentes (/revision, plan etapa 9): cada palabra con su
// clasificación (sílabas, tónica, tipo, tilde, regla, tier, frase, trampa) y un botón para
// marcarla con una nota. Las marcas se exportan con `npm run reviews:export`.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { RULE_NAMES, WORLDS, type WordEntry } from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { initAdultAuth, useAdultAuth } from '../../auth/adult.ts';
import { adultApi, type Review } from '../../sync/api.ts';
import { useWords } from '../../words/words.ts';

const TYPE_NAMES: Record<WordEntry['type'], string> = {
  monosilaba: 'monosílaba',
  aguda: 'aguda',
  grave: 'grave',
  esdrujula: 'esdrújula',
  sobreesdrujula: 'sobreesdrújula',
};

export function ReviewPage() {
  const { status, session } = useAdultAuth();
  const { words } = useWords();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [world, setWorld] = useState(8);
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0);
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initAdultAuth();
  }, []);

  const load = useCallback(() => {
    if (!session) return;
    adultApi(session.token)
      .reviews()
      .then((r) => setReviews(r.reviews))
      .catch(() => setError('No pudimos traer tus marcas.'));
  }, [session]);
  useEffect(load, [load]);

  const marks = useMemo(() => new Map((reviews ?? []).map((r) => [r.wordId, r])), [reviews]);
  const list = useMemo(() => {
    const all = words?.index.byWorld.get(world) ?? [];
    const q = query.trim().toLowerCase();
    return all.filter(
      (w) =>
        (tier === 0 || w.tier === tier) &&
        (!onlyMarked || marks.has(w.id)) &&
        (!q || w.word.toLowerCase().includes(q)),
    );
  }, [words, world, tier, onlyMarked, query, marks]);

  if (status === 'out') {
    return (
      <Shell>
        <p className="text-gray-700">
          Para revisar palabras,{' '}
          <Link to="/adultos" className="font-bold text-pink-600 underline">
            entrá como docente
          </Link>
          .
        </p>
      </Shell>
    );
  }
  if (!words || !reviews || !session) {
    return (
      <Shell>
        <p className="text-gray-600">{error ?? 'Cargando…'}</p>
      </Shell>
    );
  }

  const api = adultApi(session.token);
  const save = (wordId: string, note: string) =>
    api
      .markReview(wordId, note)
      .then((r) => setReviews(r.reviews))
      .catch(() => setError('No se pudo guardar la marca.'));
  const unmark = (wordId: string) =>
    api
      .unmarkReview(wordId)
      .then((r) => setReviews(r.reviews))
      .catch(() => setError('No se pudo quitar la marca.'));

  return (
    <Shell>
      <p className="-mt-2 text-gray-700">
        Fijate que la sílaba fuerte, el tipo, la tilde y la frase estén bien. Si algo no te
        convence, marcá la palabra y contanos por qué. Llevás{' '}
        <strong>{reviews.length === 1 ? '1 marca' : `${reviews.length} marcas`}</strong>.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1">
          <span className="font-bold text-gray-700">Mundo</span>
          <select
            value={world}
            onChange={(e) => setWorld(Number(e.target.value))}
            className="min-h-12 w-full min-w-0 rounded-2xl border-2 border-pink-200 bg-white px-3"
          >
            {WORLDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id}. {w.name} ({w.topic})
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="font-bold text-gray-700">Buscar</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Una palabra"
            className="min-h-12 w-full min-w-0 rounded-2xl border-2 border-pink-200 bg-white px-3"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Dificultad">
        {([0, 1, 2, 3] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tier === t}
            onClick={() => setTier(t)}
            className={`min-h-11 rounded-xl px-3 font-bold ${tier === t ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 shadow-sm'}`}
          >
            {t === 0 ? 'Todas' : `Tier ${t}`}
          </button>
        ))}
        <label className="ml-auto flex min-h-11 items-center gap-2 font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={onlyMarked}
            onChange={(e) => setOnlyMarked(e.target.checked)}
            className="h-5 w-5 accent-pink-500"
          />
          Solo marcadas
        </label>
      </div>

      <p className="text-sm text-gray-500" aria-live="polite">
        {list.length === 1 ? '1 palabra' : `${list.length} palabras`}
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      <ul className="grid gap-3">
        {list.map((w) => (
          <WordCard
            key={w.id}
            word={w}
            review={marks.get(w.id)}
            onSave={(note) => void save(w.id, note)}
            onUnmark={() => void unmark(w.id)}
          />
        ))}
      </ul>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col gap-4 px-4 pt-6 pb-safe">
      <PageHeader title="Revisar palabras" back="/adultos" />
      {children}
    </main>
  );
}

function WordCard({
  word,
  review,
  onSave,
  onUnmark,
}: {
  word: WordEntry;
  review: Review | undefined;
  onSave: (note: string) => void;
  onUnmark: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(review?.note ?? '');
  const sentence = word.sentence?.split(/\[([^\]]+)\]/);

  return (
    <li
      className={`grid gap-2 rounded-2xl p-4 shadow-sm ${review ? 'border-2 border-amber-400 bg-amber-50' : 'bg-white'}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-heading text-2xl font-bold text-gray-800">{word.word}</span>
        <span className="text-sm text-gray-500">Tier {word.tier}</span>
      </div>
      <p className="font-heading text-lg text-gray-700" aria-label="Sílabas">
        {word.syllables.map((s, i) => (
          <span key={i}>
            {i > 0 && <span className="text-gray-400"> · </span>}
            <span className={i === word.stressIndex ? 'font-bold text-pink-700 underline' : ''}>
              {s}
            </span>
          </span>
        ))}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-semibold text-gray-500">Tipo</dt>
        <dd className="text-gray-800">{TYPE_NAMES[word.type]}</dd>
        <dt className="font-semibold text-gray-500">Tilde</dt>
        <dd className="text-gray-800">{word.hasTilde ? 'sí' : 'no'}</dd>
        <dt className="font-semibold text-gray-500">Regla</dt>
        <dd className="text-gray-800">{RULE_NAMES[word.rule]}</dd>
        <dt className="font-semibold text-gray-500">Trampa</dt>
        <dd className="text-gray-800">{word.distractor}</dd>
        {word.related && (
          <>
            <dt className="font-semibold text-gray-500">Par</dt>
            <dd className="text-gray-800">{word.related}</dd>
          </>
        )}
        {sentence && (
          <>
            <dt className="font-semibold text-gray-500">Frase</dt>
            <dd className="text-gray-800">
              {sentence.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
            </dd>
          </>
        )}
        {word.tags.length > 0 && (
          <>
            <dt className="font-semibold text-gray-500">Etiquetas</dt>
            <dd className="text-gray-800">{word.tags.join(', ')}</dd>
          </>
        )}
      </dl>

      {editing ? (
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-gray-700">¿Qué hay que revisar?</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl border-2 border-amber-300 p-2"
            />
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="min-h-11"
              onClick={() => {
                onSave(note);
                setEditing(false);
              }}
            >
              Guardar marca
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : review ? (
        <div className="grid gap-2">
          <p className="text-sm text-amber-900">
            <strong>Marcada.</strong> {review.note || 'Sin nota.'}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditing(true)}
            >
              Editar nota
            </Button>
            <Button size="sm" variant="outline" className="min-h-11" onClick={onUnmark}>
              Quitar marca
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="min-h-11 justify-self-start"
          onClick={() => setEditing(true)}
        >
          Marcar para revisar
        </Button>
      )}
    </li>
  );
}
