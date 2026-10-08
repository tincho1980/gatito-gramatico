// Cola de avisos (Zustand). Cada aviso se va solo a los pocos segundos.
import { create } from 'zustand';
import type { Notice } from './notices.ts';

export const NOTICE_MS = 4000;

interface ShownNotice extends Notice {
  id: number;
}

interface NoticeStore {
  notices: ShownNotice[];
  push: (...notices: Notice[]) => void;
  dismiss: (id: number) => void;
}

let next = 0;

export const useNotices = create<NoticeStore>((set) => ({
  notices: [],
  push: (...notices) => {
    const shown = notices.map((n) => ({ ...n, id: ++next }));
    set((s) => ({ notices: [...s.notices, ...shown] }));
    for (const n of shown) {
      setTimeout(
        () => set((s) => ({ notices: s.notices.filter((x) => x.id !== n.id) })),
        NOTICE_MS,
      );
    }
  },
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((x) => x.id !== id) })),
}));
