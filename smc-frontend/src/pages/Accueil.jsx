import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEtudiant } from '../context/EtudiantContext.jsx';

/**
 * Page d'accueil : redirige directement vers l'espace pertinent plutôt que
 * d'afficher l'ancien catalogue d'achat à l'unité (remplacé par
 * l'abonnement). Un étudiant déjà connecté va droit à ses QCM ; un visiteur
 * va vers l'inscription gratuite.
 */
export default function Accueil() {
  const { etudiant } = useEtudiant();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(etudiant ? '/mes-qcm' : '/inscription', { replace: true });
  }, [etudiant, navigate]);

  return null;
}
