// Panel docente: sus aulas con el código para compartir, y crear una nueva.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { ClassroomSummary } from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { adultApi, ApiError } from '../../sync/api.ts';

export function TeacherPanel({ token }: { token: string }) {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(() => {
    adultApi(token)
      .classrooms()
      .then((r) => setClassrooms(r.classrooms))
      .catch(() => setError('No pudimos traer tus aulas.'));
  }, [token]);
  useEffect(refresh, [refresh]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await adultApi(token).createClassroom(name.trim());
      setName('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.reason ? err.reason : 'No se pudo crear el aula.');
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setCopied(null); // sin permiso de portapapeles: el código igual está a la vista
    }
  };

  return (
    <div className="grid gap-5">
      <section aria-labelledby="aulas" className="grid gap-3">
        <h2 id="aulas" className="font-heading text-xl font-bold text-gray-800">
          Tus aulas
        </h2>
        {classrooms?.length === 0 && (
          <p className="text-gray-600">Todavía no tenés aulas. Creá la primera abajo.</p>
        )}
        {classrooms?.map((c) => (
          <article key={c.id} className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-heading text-lg font-bold text-gray-800">{c.name}</h3>
              <span className="text-sm text-gray-500">
                {c.students === 1 ? '1 alumno' : `${c.students} alumnos`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Código para entrar:</span>
              <span
                className="rounded-xl bg-pink-50 px-3 py-1 font-heading text-2xl font-bold tracking-[0.25em] text-pink-700"
                aria-label={`Código ${c.code.split('').join(' ')}`}
              >
                {c.code}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => void copy(c.code)}
              >
                {copied === c.code ? '¡Copiado!' : 'Copiar'}
              </Button>
            </div>
            <Link
              to={`/aula/${c.id}`}
              className="flex min-h-12 items-center justify-center rounded-2xl bg-pink-500 font-heading font-bold text-white"
            >
              Ver el tablero
            </Link>
          </article>
        ))}
      </section>

      <form onSubmit={create} className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <label className="grid gap-1">
          <span className="font-heading text-lg font-bold text-gray-800">Crear un aula</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Por ejemplo, 4.º B – Turno mañana"
            className="min-h-12 rounded-2xl border-2 border-pink-200 px-4 text-lg focus:border-pink-400"
          />
        </label>
        <Button type="submit">Crear aula</Button>
      </form>

      <p className="text-sm text-gray-600">
        Cada alumno entra desde su dispositivo con <strong>Entrar a mi aula</strong>: escribe el
        código, inventa un apodo (nunca su nombre real) y un PIN de 4 números. Con el mismo apodo y
        PIN recupera su progreso en otro dispositivo.
      </p>

      <Link
        to="/revision"
        className="flex min-h-12 items-center justify-between rounded-2xl bg-white px-4 font-bold text-gray-700 shadow-sm"
      >
        Revisar las palabras del juego <span aria-hidden>🔍</span>
      </Link>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
