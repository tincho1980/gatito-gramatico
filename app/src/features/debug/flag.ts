// Modo debug: se prende con `?debug=1` y queda prendido en la pestaña.
const KEY = 'gatita-debug';

export function isDebug(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      sessionStorage.setItem(KEY, '1');
    }
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
