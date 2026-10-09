// Área de adultos (/adultos): ingreso con Google o enlace por email, elección de rol (una sola
// vez) y el panel de familia o de docente. Los chicos no necesitan entrar acá.
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import {
  authConfigured,
  initAdultAuth,
  isLocalAuth,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  useAdultAuth,
} from '../../auth/adult.ts';
import { adultApi, ApiError } from '../../sync/api.ts';
import { TeacherPanel } from '../classroom/TeacherPanel.tsx';
import { useActiveProfile } from '../profile/hooks.ts';
import { FamilyPanel } from './FamilyPanel.tsx';

type Role = 'family' | 'teacher';

export function AdultPage() {
  const { status, session } = useAdultAuth();
  const hasProfile = !!useActiveProfile();
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initAdultAuth();
  }, []);

  useEffect(() => {
    if (!session) return;
    let live = true;
    adultApi(session.token)
      .account()
      .then((a) => {
        if (!live) return;
        setAccountId(a.id);
        setRole(a.role);
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 404)
          setRole(null); // sin rol todavía
        else setError('No pudimos conectarnos. Probá de nuevo en un rato.');
      });
    return () => {
      live = false;
    };
  }, [session]);

  const choose = async (r: Role) => {
    if (!session) return;
    setRole(r); // el cambio de panel se ve enseguida; el servidor guarda la preferencia
    const a = await adultApi(session.token).setRole(r);
    setAccountId(a.id);
  };

  let content;
  if (!authConfigured) {
    content = <p className="text-gray-600">El ingreso de adultos todavía no está configurado.</p>;
  } else if (status === 'loading' || (session && role === undefined && !error)) {
    content = <p className="text-gray-600">Cargando…</p>;
  } else if (!session) {
    content = <Login />;
  } else if (error) {
    content = (
      <p role="alert" className="text-red-700">
        {error}
      </p>
    );
  } else if (role === null) {
    content = <RoleChoice onChoose={(r) => void choose(r)} />;
  } else if (role && accountId) {
    // Una cuenta puede ser familia y docente: el selector cambia de panel.
    content = (
      <>
        <RoleTabs role={role} onChange={(r) => void choose(r)} />
        {role === 'family' ? (
          <FamilyPanel token={session.token} accountId={accountId} />
        ) : (
          <TeacherPanel token={session.token} />
        )}
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 pt-6 pb-safe">
      <PageHeader title="Familias y docentes" back={hasProfile ? '/perfil' : '/'}>
        {session && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-11 px-2 text-sm font-bold text-gray-500"
          >
            Salir
          </button>
        )}
      </PageHeader>
      {session && <p className="-mt-3 text-sm text-gray-500">Entraste como {session.email}</p>}
      {content}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if ((await signInWithEmail(email.trim())) === 'sent') setSent(true);
    } catch {
      setError('No pudimos mandar el enlace. Revisá el email y probá de nuevo.');
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-gray-700">
        Esta parte es para adultos: familias que quieren guardar el progreso en la nube y docentes
        que arman su aula. Los chicos juegan sin cuenta.
      </p>
      {!isLocalAuth && (
        <Button
          size="lg"
          variant="outline"
          className="min-h-14"
          onClick={() => void signInWithGoogle()}
        >
          Entrar con Google
        </Button>
      )}
      {sent ? (
        <p role="status" className="rounded-2xl bg-white px-4 py-3 text-gray-700 shadow-sm">
          Te mandamos un enlace a <strong>{email}</strong>. Abrilo desde este dispositivo para
          entrar.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-2">
          <label className="grid gap-1">
            <span className="font-bold text-gray-700">O con tu email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="min-h-12 rounded-2xl border-2 border-pink-200 bg-white px-4 text-lg focus:border-pink-400"
            />
          </label>
          <Button type="submit" size="lg" className="min-h-14">
            {isLocalAuth ? 'Entrar (prueba local)' : 'Mandame el enlace'}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <p className="text-sm text-gray-600">
        Al entrar aceptás los{' '}
        <Link to="/terminos" className="underline">
          términos de uso
        </Link>{' '}
        y la{' '}
        <Link to="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}

function RoleChoice({ onChoose }: { onChoose: (r: Role) => void }) {
  return (
    <div className="grid gap-3">
      <p className="text-gray-700">
        ¿Cómo vas a usar la gatita? Si sos las dos cosas, después cambiás arriba.
      </p>
      <button
        type="button"
        onClick={() => onChoose('family')}
        className="rounded-2xl bg-white p-4 text-left shadow-sm"
      >
        <span className="block font-heading text-xl font-bold text-gray-800">🏠 Soy familia</span>
        <span className="text-gray-600">
          Guardo el progreso de mis chicos y lo veo en otro dispositivo.
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChoose('teacher')}
        className="rounded-2xl bg-white p-4 text-left shadow-sm"
      >
        <span className="block font-heading text-xl font-bold text-gray-800">🏫 Soy docente</span>
        <span className="text-gray-600">
          Armo un aula, mis alumnos entran con un código y veo cómo van.
        </span>
      </button>
    </div>
  );
}

function RoleTabs({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const tabs: { value: Role; label: string }[] = [
    { value: 'family', label: '🏠 Familia' },
    { value: 'teacher', label: '🏫 Docente' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-pink-100 p-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={role === t.value}
          onClick={() => onChange(t.value)}
          className={`min-h-11 rounded-xl font-heading font-bold ${role === t.value ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-500'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
