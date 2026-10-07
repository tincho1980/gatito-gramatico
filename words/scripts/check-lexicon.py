"""Chequea las palabras del banco contra el diccionario es_AR (Hunspell/LibreOffice)
y calcula su frecuencia (escala Zipf, corpus OpenSubtitles de FrequencyWords).

Escribe data/lexicon.json, que el build y el validador usan sin necesitar Python.
Correrlo cada vez que se agregan palabras a src/.

Requisitos (una vez):
  pip install spylls
  curl -O https://raw.githubusercontent.com/LibreOffice/dictionaries/master/es/es_AR.dic
  curl -O https://raw.githubusercontent.com/LibreOffice/dictionaries/master/es/es_AR.aff
  curl -O https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_full.txt

Uso: python3 scripts/check-lexicon.py --dict ruta/es_AR --freq ruta/es_full.txt
"""
import argparse, glob, json, math, os, re, unicodedata

from spylls.hunspell import Dictionary

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRIP = str.maketrans('áéíóú', 'aeiou')
ADD = dict(zip('aeiou', 'áéíóú'))


def source_words():
    words = set()
    for path in sorted(glob.glob(os.path.join(ROOT, 'src', 'world-*.txt'))):
        for line in open(path, encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith(('//', '@')):
                continue
            head = line.split('|')[0]
            tok = [t for t in head.split() if not t[0] in '#=!']
            words.add(unicodedata.normalize('NFC', ' '.join(tok).lower()))
    return sorted(words)


def variants(word):
    base = word.translate(STRIP)
    out = {base}
    for i, c in enumerate(base):
        if c in ADD:
            out.add(base[:i] + ADD[c] + base[i + 1:])
    out.discard(word)
    return sorted(out)


def load_freq(path):
    counts, total = {}, 0
    with open(path, encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split(' ')
            if len(parts) != 2:
                continue
            w, n = parts[0], int(parts[1])
            counts[w] = counts.get(w, 0) + n
            total += n
    return counts, total


AMB_MIN = 3.0   # Zipf mínimo de la otra forma para considerarla competencia
AMB_GAP = 1.0   # ...y no más de 1 punto Zipf (10 veces) menos frecuente que la palabra


def load_allow():
    path = os.path.join(ROOT, 'data', 'lexicon-allow.txt')
    if not os.path.exists(path):
        return set()
    out = set()
    for line in open(path, encoding='utf-8'):
        w = line.split('//')[0].strip().lower()
        if w:
            out.add(unicodedata.normalize('NFC', w))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dict', required=True, help='ruta sin extensión a es_AR (.dic/.aff)')
    ap.add_argument('--freq', required=True, help='es_full.txt de FrequencyWords')
    args = ap.parse_args()

    d = Dictionary.from_files(args.dict)
    counts, total = load_freq(args.freq)
    zipf = lambda w: round(math.log10(counts[w] / total * 1e9), 2) if counts.get(w) else None
    allow = load_allow()
    out = {}
    for w in source_words():
        z = zipf(w)
        others = {v: zipf(v) for v in variants(w) if d.lookup(v)}
        # Ambigua = la otra forma es una palabra común y casi tan frecuente como esta.
        # (El corpus trae faltas de ortografía: "musica" aparece mucho, pero mucho menos que "música".)
        amb = sorted((v for v, zv in others.items() if (zv or 0) >= AMB_MIN and (zv or 0) >= (z or 0) - AMB_GAP),
                     key=lambda v: -(others[v] or 0))
        out[w] = {
            'valid': bool(d.lookup(w)) or w in allow,
            'allowlisted': w in allow and not d.lookup(w),
            'otherForms': others,
            'ambiguousWith': amb,
            'zipf': z,
        }
    path = os.path.join(ROOT, 'data', 'lexicon.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1, sort_keys=True)
    bad = [w for w, v in out.items() if not v['valid']]
    print(f'{len(out)} palabras · {len(bad)} fuera del diccionario: {", ".join(bad) or "-"}')


if __name__ == '__main__':
    main()
