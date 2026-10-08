// §8.3 Tienda: accesorios y fondos que se compran con croquetas, con vista previa de la
// gatita. Lo que ya es del perfil se pone y se saca.
import { useState } from 'react';
import { COLLECTION, isForSale, WORLDS, type CollectionItem } from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Croquetas } from '../../components/Croquetas.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { backgroundClass, BACKGROUNDS } from '../../content/collection.ts';
import type { Look } from '../../db/db.ts';
import { profilesRepo, purchasesRepo } from '../../db/repos.ts';
import { reactTo } from '../../lib/feedback.ts';
import { requestSync } from '../../sync/store.ts';
import { useNotices } from '../notify/store.ts';
import { useActiveProfile, useProfileState, useWallet } from '../profile/hooks.ts';

type Kind = 'accesorio' | 'fondo';

const TABS: { kind: Kind; label: string }[] = [
  { kind: 'accesorio', label: 'Accesorios' },
  { kind: 'fondo', label: 'Fondos' },
];

export function ShopPage() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  const wallet = useWallet(profile?.id, state);
  const push = useNotices((s) => s.push);
  const [kind, setKind] = useState<Kind>('accesorio');
  const [selected, setSelected] = useState<string | null>(null);
  if (!profile || !wallet) return null;

  const look: Look = profile.look ?? {};
  // Primero lo que se compra, de más barato a más caro; al final lo que se gana con jefes.
  const items = COLLECTION.filter((i) => i.kind === kind).sort(
    (a, b) => Number(!isForSale(a)) - Number(!isForSale(b)) || a.price - b.price,
  );
  const item = COLLECTION.find((i) => i.id === selected && i.kind === kind) ?? null;
  // Vista previa: lo elegido encima de lo que tiene puesto.
  const preview: Look = item ? { ...look, [item.kind]: item.id } : look;
  const owned = (i: CollectionItem) => wallet.owned.includes(i.id);
  const worn = (i: CollectionItem) => look[i.kind as Kind] === i.id;

  const wear = (i: CollectionItem, on: boolean) =>
    profilesRepo.setLook(profile.id, { ...look, [i.kind]: on ? i.id : undefined });

  const buy = async (i: CollectionItem) => {
    const problem = await purchasesRepo.buy(profile.id, i.id);
    if (problem) return;
    requestSync();
    reactTo('success', profile.sound);
    push({ icon: '🛍️', text: `¡Compraste ${i.name}!` });
    await wear(i, true);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-6">
      <PageHeader title="Tienda">
        <Croquetas value={wallet.balance} className="text-xl text-amber-600" />
      </PageHeader>

      <div
        className={`flex h-44 items-center justify-center rounded-3xl shadow-sm ${backgroundClass(preview.fondo)}`}
        data-testid="shop-preview"
      >
        <Gatita
          avatar={profile.avatar}
          accessory={preview.accesorio}
          className="h-32 w-32"
          label={item ? `La gatita con ${item.name}` : 'Tu gatita'}
        />
      </div>

      {item ? (
        <ItemAction
          item={item}
          owned={owned(item)}
          worn={worn(item)}
          balance={wallet.balance}
          onBuy={() => void buy(item)}
          onWear={(on) => void wear(item, on)}
        />
      ) : (
        <p className="text-center text-gray-600">Tocá algo para probártelo.</p>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-pink-100 p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={kind === t.kind}
            onClick={() => {
              setKind(t.kind);
              setSelected(null);
            }}
            className={`min-h-11 rounded-xl font-heading font-bold ${kind === t.kind ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-3 gap-3 pb-[env(safe-area-inset-bottom)]">
        {items.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => setSelected(i.id)}
              aria-pressed={selected === i.id}
              className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 bg-white p-2 shadow-sm ${selected === i.id ? 'border-pink-400' : 'border-transparent'}`}
            >
              {i.kind === 'fondo' ? (
                <span className={`h-14 w-14 rounded-xl ${BACKGROUNDS[i.id] ?? ''}`} aria-hidden />
              ) : (
                <Gatita avatar={profile.avatar} accessory={i.id} className="h-14 w-14" label="" />
              )}
              <span className="text-xs leading-tight font-bold text-gray-700">{i.name}</span>
              <span className="text-xs font-semibold text-gray-500">
                {worn(i) ? (
                  'Puesto'
                ) : owned(i) ? (
                  'Tuyo'
                ) : isForSale(i) ? (
                  <Croquetas value={i.price} />
                ) : (
                  '🔒'
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function ItemAction({
  item,
  owned,
  worn,
  balance,
  onBuy,
  onWear,
}: {
  item: CollectionItem;
  owned: boolean;
  worn: boolean;
  balance: number;
  onBuy: () => void;
  onWear: (on: boolean) => void;
}) {
  if (owned) {
    return (
      <Button
        size="lg"
        variant={worn ? 'outline' : 'primary'}
        className="min-h-14 w-full"
        onClick={() => onWear(!worn)}
      >
        {worn ? `Dejar de usar: ${item.name}` : `Usar: ${item.name}`}
      </Button>
    );
  }
  if (!isForSale(item)) {
    const world = WORLDS.find((w) => w.id === item.unlockedBy?.boss);
    return (
      <p className="rounded-2xl bg-white px-4 py-3 text-center text-gray-700 shadow-sm">
        <strong>{item.name}</strong> no se compra: se gana venciendo al jefe de{' '}
        <strong>{world?.name}</strong>.
      </p>
    );
  }
  const missing = item.price - balance;
  return (
    <div className="grid gap-1 text-center">
      <Button size="lg" className="min-h-14 w-full" disabled={missing > 0} onClick={onBuy}>
        Comprar por {item.price} 🐟
      </Button>
      {missing > 0 && (
        <p className="text-sm text-gray-600">
          Te {missing === 1 ? 'falta 1 croqueta' : `faltan ${missing} croquetas`}. Las croquetas se
          ganan cuando una palabra sube a la caja 3 o 5, y venciendo jefes.
        </p>
      )}
    </div>
  );
}
