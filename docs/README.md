# Documentación — La Gatita Gramática

Juego web (PWA, mobile first) para que chicos y adolescentes practiquen la acentuación en español, pensado para usar en el aula.

## Qué leer y en qué orden

| Archivo | Para qué |
| --- | --- |
| [plan-de-desarrollo.md](plan-de-desarrollo.md) | **Empezar acá.** Etapas de desarrollo, tareas y criterios de aceptación. |
| [especificacion-del-juego.md](especificacion-del-juego.md) | Reglas exactas del juego: turno, ronda, cajas, mundos, jefe, premios. Fuente de verdad de la lógica. |
| [arquitectura.md](arquitectura.md) | Stack, estructura del repo, modelo de datos, API, sincronización y seguridad. |
| [banco-de-palabras.md](banco-de-palabras.md) | Formato del banco de palabras, cómo se valida y cómo se genera. |
| [analisis-y-propuesta.md](analisis-y-propuesta.md) | Contexto: análisis del prototipo original y propuesta de producto. Si algo contradice a los documentos de arriba, mandan los de arriba. |

## Decisiones cerradas

- **Juego offline-first:** se juega sin red; IndexedDB es la copia local y se sincroniza al terminar cada ronda.
- **Sin SSR ni Next.js:** Vite + React como SPA estática en Cloudflare Pages.
- **API:** un Cloudflare Worker (Hono + Zod) es la única puerta a los datos. El cliente nunca habla directo con la base.
- **Datos y login:** Supabase (Postgres + Auth). Tablas en esquema `private`, sin permisos para roles públicos; RLS como segunda línea.
- **Palabras:** banco JSON curado y validado por código. Nada de IA en runtime. La lista actual se da por buena para desarrollo; se amplía y revisa antes del MVP.
- **Niveles:** 10 mundos con nombre propio, uno por regla, con dos bifurcaciones. Solo se avanza venciendo al jefe final.
- **Repaso:** cajas Leitner medidas en rondas jugadas; cajas 4 y 5 piden además al menos 1 día.
- **Menores:** los chicos nunca dan email. Perfil con alias + avatar; cuenta adulta (familia o docente) y código de aula.
