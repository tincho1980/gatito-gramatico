import { useNavigate } from 'react-router';
import { Welcome } from './Welcome.tsx';

/** Agregar otro perfil en este dispositivo (desde el perfil). */
export function NewProfilePage() {
  const navigate = useNavigate();
  return <Welcome onCreated={() => navigate('/')} />;
}
