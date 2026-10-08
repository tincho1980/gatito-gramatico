# Puesta en marcha: Supabase y Cloudflare

Hay **un solo proyecto de Supabase en la nube: el de producción**. Las pruebas se hacen en tu máquina, con la base local de `supabase start` (Docker), y los tests automáticos usan una base embebida que no necesita nada.

**Ninguna contraseña ni clave se pega en el chat ni en el repo**: se escriben en tu terminal, en los paneles de Supabase y Cloudflare, o en `.env.local`, que no se versiona (los nombres de las variables están en `.env.example`).

Lo que sí va en el repo (no es secreto): la URL del proyecto de Supabase y el id de Hyperdrive, en `api/wrangler.jsonc`.

## 1. Probar en local

Requiere Docker Desktop abierto.

```bash
npx supabase@2.117.0 start      # Postgres en 127.0.0.1:54322 y Auth en 127.0.0.1:54321
npx supabase@2.117.0 db reset   # aplica las migraciones y seed.sql (borra lo que haya)
npm run build -w app            # el Worker sirve la app desde app/dist
npm run dev -w api              # wrangler dev en :8787, contra la base local
npm run dev -w app              # Vite en :3000, con proxy de /api a :8787
```

- La configuración de arriba de `api/wrangler.jsonc` es la local: base `127.0.0.1:54322` (credenciales de desarrollo de Supabase, que no son secretas) y Auth en `127.0.0.1:54321`.
- Cada cambio de esquema se prueba primero acá con `db reset`, antes de llevarlo a producción.
- `npx supabase@2.117.0 stop` apaga todo. Los datos locales son de prueba: nunca datos reales de chicos.
- Los tests del Worker (`npm test -w api`) no necesitan nada de esto: usan Postgres embebido (PGlite) con las mismas migraciones.

## 2. Proyecto de Supabase (producción)

1. En [supabase.com](https://supabase.com), crear el proyecto `gatita`. Región: São Paulo (`sa-east-1`), la más cercana a Argentina. Guardar la contraseña de la base en tu gestor de contraseñas.
2. Aplicar las migraciones desde tu terminal:

   ```bash
   npx supabase@2.117.0 login
   npx supabase@2.117.0 link --project-ref <ref-del-proyecto>
   npx supabase@2.117.0 db push
   ```

   `link` pide la contraseña de la base: escribila ahí, en la terminal.

3. Chequeo de seguridad: con la clave pública, la API REST de Supabase no puede leer `private`. En tu terminal, con la URL y la clave publicable del panel (**Project Settings → API Keys**):

   ```bash
   curl -s "https://<ref>.supabase.co/rest/v1/profiles?select=*" -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Accept-Profile: private"
   ```

   Tiene que responder con un error (el esquema `private` no está expuesto). Si devuelve datos, no sigas y avisame.

Antes del piloto con escuelas reales, pasar el proyecto a Pro (plan, etapa 9).

## 3. Cloudflare y la conexión del Worker

1. En tu terminal: `npx wrangler login` (abre el navegador para autorizar).
2. Copiá `.env.example` a `.env.local` en la raíz del repo y completá `SUPABASE_ADMIN_DB_URL` con la cadena del **Session pooler** del proyecto (botón **Connect** en Supabase), con la contraseña de la base del paso 2.1. Es IPv4, que es lo que necesita Hyperdrive.
3. Conectá el Worker con la base:

   ```bash
   npm run setup:db -w api
   ```

   El script:

   - genera una contraseña aleatoria para el rol `gatita_worker` y se la pone en Supabase;
   - prueba que el rol entra por el pooler y lee `private`;
   - crea la conexión de Cloudflare a la base (Hyperdrive `gatita`) con esa contraseña, o la actualiza si ya existe;
   - escribe el id de Hyperdrive y la URL del proyecto en `env.production` de `api/wrangler.jsonc` (no son secretos: commitealos).

   La contraseña de `gatita_worker` no se muestra ni se guarda: solo la conocen la base y Hyperdrive. Para cambiarla, se vuelve a correr el script.

4. Publicar (app + API en el mismo Worker):

   ```bash
   npm run build
   npm run deploy -w api
   ```

   `deploy` publica siempre la configuración de producción, nunca la local. Wrangler muestra la URL (`https://gatita-gramatica.<tu-subdominio>.workers.dev`).

## Qué queda para la etapa 8

El login adulto (Google y enlace por email) se configura en el panel de Supabase (**Authentication → Providers**); en local, `supabase start` ya trae Auth y un buzón de prueba para los enlaces por email. La app va a necesitar la URL y la clave publicable en `.env.local`. Hasta entonces no hay perfiles vinculados y la app no sincroniza.
