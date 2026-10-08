# Puesta en marcha: Supabase y Cloudflare

Pasos para crear la base, conectar el Worker y publicar. **Ninguna contraseña ni clave se pega en el chat ni en el repo**: se escriben en tu terminal o en los paneles de Supabase y Cloudflare.

Lo que sí va en el repo (no es secreto): la URL del proyecto de Supabase y el id de Hyperdrive, en `api/wrangler.jsonc`. Las conexiones de administrador van en `.env.local`, que no se versiona (los nombres de las variables están en `.env.example`).

## 1. Proyecto de Supabase (desarrollo)

1. En [supabase.com](https://supabase.com), crear un proyecto `gatita-dev`. Región: São Paulo (`sa-east-1`), la más cercana a Argentina. Guardar la contraseña de la base en tu gestor de contraseñas.
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

## 2. Cloudflare y la conexión del Worker

1. En tu terminal: `npx wrangler login` (abre el navegador para autorizar).
2. Copiá `.env.example` a `.env.local` en la raíz del repo y completá `SUPABASE_ADMIN_DB_URL_PREVIEW` con la cadena del **Session pooler** del proyecto (botón **Connect** en Supabase), con la contraseña de la base del paso 1.1. Es IPv4, que es lo que necesita Hyperdrive. `.env.local` no se versiona.
3. Conectá el Worker con la base:

   ```bash
   npm run setup:db -w api -- --env preview
   ```

   El script:

   - genera una contraseña aleatoria para el rol `gatita_worker` y se la pone en Supabase;
   - prueba que el rol entra por el pooler y lee `private`;
   - crea la conexión de Cloudflare a la base (Hyperdrive `gatita-preview`) con esa contraseña, o la actualiza si ya existe;
   - escribe el id de Hyperdrive y la URL del proyecto en `env.preview` de `api/wrangler.jsonc` (no son secretos: commitealos).

   La contraseña de `gatita_worker` no se muestra ni se guarda: solo la conocen la base y Hyperdrive. Para cambiarla, se vuelve a correr el script.

4. Publicar la versión de prueba (app + API en el mismo Worker):

   ```bash
   npm run build
   npm run deploy -w api -- --env preview
   ```

   Wrangler muestra la URL (`https://gatita-gramatica-preview.<tu-subdominio>.workers.dev`).

5. Para producción, lo mismo con un proyecto `gatita-prod`: `SUPABASE_ADMIN_DB_URL_PRODUCTION` en `.env.local`, `npm run setup:db -w api -- --env production` y `--env production` al publicar. Antes del piloto con escuelas reales, pasar Supabase a Pro (plan, etapa 9).

## 3. Desarrollo local con la base

Requiere Docker Desktop abierto.

```bash
npx supabase@2.117.0 start      # Postgres en 127.0.0.1:54322 y Auth en 127.0.0.1:54321
npx supabase@2.117.0 db reset   # aplica las migraciones y seed.sql
npm run dev -w api              # wrangler dev en :8787, usa localConnectionString
npm run dev -w app              # Vite en :3000, con proxy de /api a :8787
```

Los tests del Worker (`npm test -w api`) no necesitan nada de esto: usan Postgres embebido.

## Qué queda para la etapa 8

El login adulto (Google y enlace por email) se configura en el panel de Supabase (**Authentication → Providers**). La app va a necesitar la URL y la clave publicable en un `.env.local` (no se versiona; los nombres van en `.env.example`). Hasta entonces no hay perfiles vinculados y la app no sincroniza.
