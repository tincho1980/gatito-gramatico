// Publicidad (arquitectura §11, plan etapa 9): apagada por defecto. Solo se muestra si el build
// tiene VITE_ADS_ENABLED=true y un cliente de AdSense; nunca a perfiles de aula y nunca durante
// una ronda (solo se usa en el inicio y en los resultados). Sitio para chicos: anuncios sin
// personalizar. Antes de activarla, revisar la configuración de AdSense para sitios dirigidos
// a menores y la política de privacidad.
import { useEffect, useRef } from 'react';
import { adsConfig } from '../lib/ads.ts';
import { useActiveProfile } from '../features/profile/hooks.ts';

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

let scriptLoaded = false;
function loadScript(client: string) {
  if (scriptLoaded) return;
  scriptLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

export function AdSlot({ slot }: { slot: 'home' | 'results' }) {
  const profile = useActiveProfile();
  const ref = useRef<HTMLModElement>(null);
  const config = adsConfig(import.meta.env);
  const show = config.enabled && profile?.link?.via !== 'classroom';
  const slotId = config.slots[slot];

  useEffect(() => {
    if (!show || !slotId || !ref.current) return;
    loadScript(config.client);
    const ads = (window.adsbygoogle ??= []);
    ads.requestNonPersonalizedAds = 1;
    ads.push({});
  }, [show, slotId, config.client]);

  if (!show || !slotId) return null;
  return (
    // Alto reservado: el anuncio no mueve la pantalla al cargar.
    <div className="min-h-[100px] w-full overflow-hidden" aria-label="Publicidad">
      <ins
        ref={ref}
        className="adsbygoogle block"
        data-ad-client={config.client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-tag-for-age-treatment="1"
      />
    </div>
  );
}
