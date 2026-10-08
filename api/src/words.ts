// Banco de palabras dentro del Worker: el mismo que publica la app (words/bank).
import { indexWords, type WordEntry, type WordIndex } from '@gatita/shared';
import index from '../../words/bank/index.json' with { type: 'json' };
import w01 from '../../words/bank/world-01.json' with { type: 'json' };
import w02 from '../../words/bank/world-02.json' with { type: 'json' };
import w03 from '../../words/bank/world-03.json' with { type: 'json' };
import w04 from '../../words/bank/world-04.json' with { type: 'json' };
import w05 from '../../words/bank/world-05.json' with { type: 'json' };
import w06 from '../../words/bank/world-06.json' with { type: 'json' };
import w07 from '../../words/bank/world-07.json' with { type: 'json' };
import w08 from '../../words/bank/world-08.json' with { type: 'json' };
import w09 from '../../words/bank/world-09.json' with { type: 'json' };
import w10 from '../../words/bank/world-10.json' with { type: 'json' };

export interface Bank {
  version: string;
  index: WordIndex;
}

export const BANK: Bank = {
  version: index.version,
  index: indexWords(
    [w01, w02, w03, w04, w05, w06, w07, w08, w09, w10].flatMap((f) => f.words as WordEntry[]),
  ),
};
