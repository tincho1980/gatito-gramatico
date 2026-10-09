import { describe, expect, it } from 'vitest';
import { adsConfig } from './ads.ts';

describe('publicidad', () => {
  it('apagada por defecto', () => {
    expect(adsConfig({}).enabled).toBe(false);
    expect(adsConfig({ VITE_ADS_ENABLED: 'true' }).enabled).toBe(false); // falta el cliente
    expect(adsConfig({ VITE_ADS_ENABLED: 'false', VITE_ADSENSE_CLIENT: 'ca-pub-1' }).enabled).toBe(
      false,
    );
  });

  it('se prende solo con la bandera y un cliente de AdSense', () => {
    const c = adsConfig({
      VITE_ADS_ENABLED: 'true',
      VITE_ADSENSE_CLIENT: 'ca-pub-123',
      VITE_ADSENSE_SLOT_HOME: '42',
    });
    expect(c).toEqual({
      enabled: true,
      client: 'ca-pub-123',
      slots: { home: '42', results: undefined },
    });
  });
});
