// Política de privacidad y términos (plan, etapa 9). BORRADOR: describe lo que la app guarda
// de verdad (ver docs/arquitectura.md), pero lo tiene que revisar un abogado antes del piloto.
// Los datos del responsable están en content/legal.ts y se completan antes de publicar.
import type { ReactNode } from 'react';
import { LEGAL_CONTACT } from '../../content/legal.ts';
import { PageHeader } from '../../components/PageHeader.tsx';

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pt-6 pb-safe">
      <PageHeader title={title} />
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        Borrador: falta la revisión legal y los datos del responsable. Última actualización:{' '}
        {LEGAL_CONTACT.updated}.
      </p>
      <div className="grid gap-4 text-gray-800 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <Page title="Privacidad">
      <section>
        <h2>En pocas palabras</h2>
        <ul>
          <li>Los chicos juegan con un apodo. Nunca les pedimos email, nombre real ni fotos.</li>
          <li>Sin cuenta, todo queda solo en el dispositivo.</li>
          <li>No vendemos datos ni mostramos publicidad personalizada.</li>
          <li>Una familia puede borrar un perfil con todo su progreso cuando quiera.</li>
        </ul>
      </section>

      <section>
        <h2>Quién es responsable</h2>
        <p>
          {LEGAL_CONTACT.responsible}, contacto: {LEGAL_CONTACT.email}. Tratamos los datos según la
          Ley 25.326 de Protección de los Datos Personales de la República Argentina.
        </p>
      </section>

      <section>
        <h2>Qué guardamos de los chicos</h2>
        <ul>
          <li>El apodo y el gatito que eligieron.</li>
          <li>
            Cómo juegan: qué palabras respondieron, si acertaron, cuánto tardaron, y lo que se
            calcula a partir de eso (progreso, premios).
          </li>
          <li>
            Si entran por un aula: el aula y un PIN de 4 números, guardado de forma que nadie lo
            puede leer (ni siquiera nosotros).
          </li>
        </ul>
        <p>
          Sin una cuenta de familia o un aula, esto queda solo en el dispositivo y no nos llega.
        </p>
      </section>

      <section>
        <h2>Qué guardamos de los adultos</h2>
        <ul>
          <li>
            El email con el que entran, y si entran con Google, lo que Google comparte para iniciar
            sesión (nombre y foto). Lo usamos solo para identificar la cuenta.
          </li>
          <li>Si son docentes: el nombre de sus aulas.</li>
        </ul>
      </section>

      <section>
        <h2>Para qué</h2>
        <p>
          Para que el juego funcione: guardar el progreso, recuperarlo en otro dispositivo y
          mostrarle al docente cómo avanza su aula. Nada más.
        </p>
      </section>

      <section>
        <h2>Datos técnicos</h2>
        <ul>
          <li>
            Para frenar intentos repetidos de adivinar un PIN contamos intentos por conexión. No
            guardamos la dirección IP: solo un código que no se puede revertir, y lo borramos al día
            siguiente.
          </li>
          <li>
            Si la app falla, nos llega un aviso con el error y la pantalla, sin datos del chico.
          </li>
        </ul>
      </section>

      <section>
        <h2>Dónde están</h2>
        <p>
          En servidores de Supabase (base de datos y acceso de adultos, en San Pablo, Brasil) y de
          Cloudflare (la app y el servidor). Ninguno los usa para sus propios fines.
        </p>
      </section>

      <section>
        <h2>Quién los ve</h2>
        <ul>
          <li>La familia: los perfiles de su cuenta.</li>
          <li>
            El docente: el apodo y el progreso de los chicos de sus aulas. No ve nada de otros
            chicos ni de otras aulas.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cuánto tiempo</h2>
        <p>
          Mientras el perfil exista. La familia puede borrar un perfil desde la app (Familias y
          docentes → el tacho). Para borrar un perfil de aula o una cuenta, escribinos a{' '}
          {LEGAL_CONTACT.email}.
        </p>
      </section>

      <section>
        <h2>Derechos</h2>
        <p>
          Podés pedir acceder, corregir o borrar los datos (Ley 25.326, arts. 14 a 16) escribiendo a{' '}
          {LEGAL_CONTACT.email}. La Agencia de Acceso a la Información Pública, como órgano de
          control de la ley, atiende las denuncias y reclamos por incumplimiento de las normas de
          protección de datos personales.
        </p>
      </section>

      <section>
        <h2>Chicos y escuelas</h2>
        <p>
          El juego está pensado para chicos. Una cuenta la crea siempre un adulto (familia o
          docente), que es quien acepta esta política. En las aulas, la escuela o el docente informa
          a las familias.
        </p>
      </section>
    </Page>
  );
}

export function TermsPage() {
  return (
    <Page title="Términos de uso">
      <section>
        <h2>El servicio</h2>
        <p>
          La Gatita Gramática es un juego para practicar la acentuación en español. Se puede usar
          sin cuenta. Las cuentas de familia y de docente sirven para guardar el progreso en la nube
          y para seguir el avance de un aula.
        </p>
      </section>
      <section>
        <h2>Cuentas</h2>
        <ul>
          <li>Las crea un adulto. Los chicos no se registran ni dan datos personales.</li>
          <li>
            Los apodos no pueden ser el nombre real, un email ni un teléfono: la app los rechaza.
          </li>
          <li>Cada adulto cuida el acceso a su cuenta.</li>
        </ul>
      </section>
      <section>
        <h2>Uso adecuado</h2>
        <p>
          No se permite intentar entrar a perfiles o aulas ajenas, ni usar la app para algo que no
          sea jugar y aprender.
        </p>
      </section>
      <section>
        <h2>Contenido</h2>
        <p>
          Revisamos las palabras y las reglas con docentes, pero puede haber errores. Si encontrás
          uno, avisanos a {LEGAL_CONTACT.email}.
        </p>
      </section>
      <section>
        <h2>Disponibilidad</h2>
        <p>
          El juego funciona también sin internet. Hacemos lo posible para que el servicio en línea
          esté disponible, pero puede tener interrupciones.
        </p>
      </section>
      <section>
        <h2>Cambios</h2>
        <p>
          Si cambian estos términos o la política de privacidad, lo avisamos en la app antes de que
          rijan.
        </p>
      </section>
    </Page>
  );
}
