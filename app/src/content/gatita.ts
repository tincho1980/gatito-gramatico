// Mensajes de la gatita (especificación §9): voseo, varios por situación, elegidos al azar.
// Los errores nunca dicen "mal" solos: el porqué lo da la línea de la regla.

export const GATITA = {
  success: [
    '¡Miau! ¡La tenés clarísima!',
    '¡Ronroneo de orgullo!',
    '¡Eso! Ni un pelo fuera de lugar.',
    '¡Bigotes de oro!',
    '¡Muy bien! Esa palabra ya es tuya.',
  ],
  error: [
    'Casi. Mirá la regla y la próxima sale.',
    '¡Uy! Esta tiene su truco.',
    'No pasa nada: así se aprende.',
    'Fijate dónde suena más fuerte.',
    'Tranqui, la vas a volver a ver.',
  ],
  hint: [
    'Te marco la sílaba fuerte para ayudarte.',
    'Va una ayudita: la sílaba fuerte está marcada.',
  ],
  results: {
    great: ['¡Ronda espectacular!', '¡Sos una máquina de tildes!'],
    good: ['¡Buena ronda!', '¡Vas muy bien!'],
    keepGoing: ['Cada ronda suma. ¡Seguimos!', 'Las que costaron vuelven pronto para practicar.'],
  },
} as const;

export const pick = <T>(options: readonly T[]): T =>
  options[Math.floor(Math.random() * options.length)] as T;
