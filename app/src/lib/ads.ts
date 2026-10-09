// Configuración de la publicidad desde las variables del build (apagada si falta algo).
export interface AdsConfig {
  enabled: boolean;
  client: string;
  slots: { home?: string; results?: string };
}

export function adsConfig(env: Record<string, unknown>): AdsConfig {
  const client = typeof env.VITE_ADSENSE_CLIENT === 'string' ? env.VITE_ADSENSE_CLIENT : '';
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  return {
    enabled: env.VITE_ADS_ENABLED === 'true' && client.startsWith('ca-pub-'),
    client,
    slots: { home: str(env.VITE_ADSENSE_SLOT_HOME), results: str(env.VITE_ADSENSE_SLOT_RESULTS) },
  };
}
