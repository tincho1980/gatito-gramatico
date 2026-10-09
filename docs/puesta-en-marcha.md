# Puesta en marcha: Supabase y Cloudflare

Hay **un solo proyecto de Supabase en la nube: el de producción**. Las pruebas se hacen en tu máquina, sobre una base embebida (PGlite) que no necesita Docker ni Supabase, y los tests automáticos usan lo mismo.

**Ninguna contraseña ni clave se pega en el chat ni en el repo**: se escriben en tu terminal, en los paneles de Supabase y Cloudflare, o en `.env.local`, que no se versiona (los nombres de las variables están en `.env.example`). GitHub solo tiene el token de Cloudflare para publicar, nunca la conexión a la base.

Lo que sí va en el repo (no es secreto): la URL del proyecto de Supabase y el id de Hyperdrive, en `api/wrangler.jsonc`.

Resumen de comandos:

| Comando | Qué hace | Dónde |
| --- | --- | --- |
| `npm run dev:local` | API local sobre `.local-db/` | Tu máquina |
| `npm run db:push` | Aplica las migraciones pendientes en Supabase | Tu máquina (`.env.local`) |
| `npm run setup:db -w api` | Contraseña de `gatita_worker` + Hyperdrive | Tu máquina (`.env.local`) |
| `npm run setup:secret -w api` | Secreto del Worker para los chicos de aula (una sola vez) | Tu máquina |
| `npm run deploy -w api` | Publica app + API en producción | GitHub Actions al mergear a `main` (o tu máquina la primera vez) |

## 1. Probar en local (sin Docker)

Dos terminales desde la raíz:

```bash
npm run dev:local           # API en http://127.0.0.1:8787/api, base en .local-db/
npm run dev:local -w app    # app en http://localhost:3000, con proxy de /api y login de prueba
```

- `dev:local` aplica las mismas migraciones que producción sobre PGlite y guarda los datos en `.local-db/` (no se versiona). Para empezar de cero, borrá esa carpeta.
- El login de adultos es de prueba: en **Familias y docentes** escribís cualquier email y entrás sin enlace (botón "Entrar (prueba local)"). Solo existe en `npm run dev:local -w app` (modo `localauth` de Vite) y en los e2e; el build que se publica (`production`) no lo tiene y la API publicada verifica los JWT de Supabase.
- Para probar un aula: entrá como docente, creá un aula y, en otra ventana privada (otro "celular"), **Entrar a mi aula** con el código.
- Datos de prueba solamente: nunca datos reales de chicos.
- Los tests del Worker (`npm test -w api`) usan la misma base embebida, en memoria.
- Alternativa con Docker, si algún día hace falta probar Auth de Supabase en local: `npx supabase@2.117.0 start` y `npm run dev -w api` (usa `localConnectionString` de `wrangler.jsonc`).

## 2. Proyecto de Supabase (producción)

1. En [supabase.com](https://supabase.com), crear el proyecto `gatita`. Región: São Paulo (`sa-east-1`), la más cercana a Argentina. Guardar la contraseña de la base en tu gestor de contraseñas.
2. Copiá `.env.example` a `.env.local` en la raíz del repo y completá `SUPABASE_ADMIN_DB_URL` con la cadena del **Session pooler** (botón **Connect** del proyecto, puerto 5432), con esa contraseña.
3. Aplicá las migraciones:

   ```bash
   npm run db:push
   ```

   Aplica las de `supabase/migrations` que falten, cada una en su transacción (si una falla, no queda a medias), y las registra en la misma tabla que usa la CLI de Supabase. Correrlo de nuevo no hace nada.

4. Chequeo de seguridad: con la clave pública, la API REST de Supabase no puede leer `private`. En tu terminal, con la URL y la clave publicable del panel (**Project Settings → API Keys**):

   ```bash
   curl -s "https://<ref>.supabase.co/rest/v1/profiles?select=*" -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Accept-Profile: private"
   ```

   Tiene que responder con un error (el esquema `private` no está expuesto). Si devuelve datos, no sigas y avisame.

Antes del piloto con escuelas reales, pasar el proyecto a Pro (plan, etapa 9).

## 3. Cloudflare y la conexión del Worker

1. En tu terminal, desde la carpeta `api` (ahí está instalado `wrangler`):

   ```bash
   cd api
   npx wrangler login
   cd ..
   ```

   Abre el navegador para autorizar.
2. Conectá el Worker con la base:

   ```bash
   npm run setup:db -w api
   ```

   El script:

   - genera una contraseña aleatoria para el rol `gatita_worker` y se la pone en Supabase;
   - prueba que el rol entra por el pooler y lee `private`;
   - crea la conexión de Cloudflare a la base (Hyperdrive `gatita`, sin caché de lecturas) con esa contraseña, o la actualiza si ya existe;
   - escribe el id de Hyperdrive y la URL del proyecto en `env.production` de `api/wrangler.jsonc`.

   La contraseña de `gatita_worker` no se muestra ni se guarda: solo la conocen la base y Hyperdrive. Para cambiarla, se vuelve a correr el script. **Commiteá** el cambio de `wrangler.jsonc` (no tiene secretos).

   Hyperdrive va sin caché: por defecto guarda 60 s lo leído, y un dispositivo que pide el estado justo después de subir rondas lo vería viejo.

3. Primera publicación, desde tu máquina:

   ```bash
   npm run build
   npm run deploy -w api
   ```

   `deploy` publica siempre la configuración de producción, nunca la local. Wrangler muestra la URL (`https://gatita-gramatica.<tu-subdominio>.workers.dev`).

## 4. Deploy automático desde `main`

Al mergear un PR a `main`, `.github/workflows/ci.yml` corre `check` y `e2e` y, si pasan, el job `deploy` publica app + API.

**Configuración en GitHub** (una sola vez):

1. Environment `production` que solo puedan usar jobs sobre `main`: *Settings → Environments → New environment* → `production` → *Deployment branches and tags* → *Selected branches* → `main`.
2. Token de API de Cloudflare: en el panel, *My Profile → API Tokens → Create Token* → plantilla **Edit Cloudflare Workers**. En *Account Resources*, solo tu cuenta; en *Zone Resources*, *All zones*. Crear y copiarlo (se muestra una sola vez). Cargarlo sin que quede en ningún archivo:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN --repo tincho1980/gatito-gramatico --env production
   ```

   Pide el valor por consola.

3. El id de la cuenta (no es secreto; está en el panel de Workers, a la derecha):

   ```bash
   gh variable set CLOUDFLARE_ACCOUNT_ID --repo tincho1980/gatito-gramatico --env production --body "<account-id>"
   ```

**Migraciones.** El CI no migra la base (no tiene la conexión). Si un PR trae una migración nueva, corré `npm run db:push` **antes** de mergear a `main`, para que el Worker nuevo no arranque contra un esquema viejo. Las migraciones tienen que ser compatibles con el Worker anterior: agregar tablas o columnas, no renombrar ni borrar en el mismo paso.

## 5. Login de adultos y aulas (etapa 8)

Una sola vez, en este orden:

1. **Migración nueva** (índice de apodos por aula): `npm run db:push`.
2. **Secreto del Worker**, que firma los tokens de los chicos de aula y protege los PIN:

   ```bash
   npm run setup:secret -w api
   ```

   Genera un valor aleatorio y lo carga en Cloudflare sin mostrarlo. **No se cambia nunca**: los PIN guardados dependen de él, y con otro secreto ningún chico podría volver a entrar. Por eso el script no hace nada si ya existe.

3. **Supabase, panel → Authentication**:
   - *JWT Keys*: el proyecto tiene que firmar con una clave **asimétrica** (ECC P-256 o RSA). El Worker verifica contra las claves públicas y no guarda ningún secreto de Supabase. Si todavía usa el *Legacy JWT secret*, migrá desde esa pantalla.
   - *Sign In / Providers → Email*: activado (enlace por email). El envío de emails del plan gratis tiene un límite bajo por hora; alcanza para probar. Para el piloto conviene un SMTP propio (*Emails → SMTP Settings*).
   - *Sign In / Providers → Google*: activado, con una credencial OAuth de Google Cloud (*APIs y servicios → Credenciales → ID de cliente de OAuth*, tipo "Aplicación web") cuyo *URI de redireccionamiento autorizado* sea `https://<ref>.supabase.co/auth/v1/callback`. El ID y el secreto del cliente se pegan en el panel de Supabase, nunca acá ni en el repo.
   - *URL Configuration*: **Site URL** `https://gatita-gramatica.miramallo.workers.dev`; **Redirect URLs**: `https://gatita-gramatica.miramallo.workers.dev/adultos` y `http://localhost:3000/adultos`.

4. **La URL y la clave publicable en el build** (son públicas):
   - En tu `.env.local`: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (la `sb_publishable_…` de *Project Settings → API Keys*, no la anon legada).
   - En GitHub, para el deploy automático:

     ```bash
     gh variable set VITE_SUPABASE_URL --repo tincho1980/gatito-gramatico --env production --body "https://<ref>.supabase.co"
     gh variable set VITE_SUPABASE_PUBLISHABLE_KEY --repo tincho1980/gatito-gramatico --env production --body "<sb_publishable_…>"
     ```

5. Publicar: `npm run build` y `npm run deploy -w api`.

Para probar: abrí la app, **Perfil → Para familias y docentes**, entrá con tu email (te llega el enlace) o con Google y elegí "Soy docente". Creá un aula y entrá desde el celular con **Entrar a mi aula** y el código.

## 6. Cierre del MVP (etapa 9)

1. **Migración nueva** (marcas de revisión del banco): `npm run db:push`. Después, publicar.
2. **Revisión del banco con docentes:** cada docente entra a **Familias y docentes → Docente → Revisar las palabras del juego**, recorre los mundos (empezando por los tiers 3 de los mundos 8, 9 y 10) y marca lo que haya que corregir, con una nota. Para juntar las marcas:

   ```bash
   npm run reviews:export
   ```

   Deja `revisiones.local.csv` en la raíz (no se versiona; se abre con Excel). Las correcciones se hacen en `words/src/*.txt` y después `npm run build -w words`.

3. **Errores:** en el panel de Cloudflare, *Workers & Pages → gatita-gramatica → Logs* (o *Observability*). Los de la app tienen `"type":"client-error"`; los del Worker, `"type":"worker-error"`. Se puede armar una alerta por email desde ese mismo panel.
4. **Privacidad y términos:** completar `app/src/content/legal.ts` (responsable, email de contacto, fecha) y hacer revisar `/privacidad` y `/terminos` por un abogado antes del piloto.
5. **Supabase Pro** antes del piloto con escuelas reales (backups diarios y sin pausa por inactividad).
