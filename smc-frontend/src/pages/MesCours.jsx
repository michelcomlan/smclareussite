import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function MesCours() {
  const { etudiant } = useEtudiant();
  const navigate = useNavigate();

  const [statut, setStatut] = useState('verification');
  const [coursParChapitre, setCoursParChapitre] = useState([]);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!etudiant) {
      navigate('/inscription');
      return;
    }

    api
      .listerCours(etudiant.id)
      .then((liste) => {
        setStatut('abonne');
        const groupes = new Map();
        liste.forEach((c) => {
          if (!groupes.has(c.chapitre)) groupes.set(c.chapitre, []);
          groupes.get(c.chapitre).push(c);
        });
        setCoursParChapitre(Array.from(groupes.entries()));
      })
      .catch((err) => {
        if (err.message === 'Abonnement actif requis.') {
          setStatut('non_abonne');
        } else {
          setErreur(err.message);
        }
      });
  }, [etudiant, navigate]);

  if (statut === 'verification') {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center font-body text-encre-900/60">
        Vérification de votre abonnement…
      </section>
    );
  }

  if (statut === 'non_abonne') {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-4">
          Abonnement requis
        </p>
        <h1 className="font-display text-3xl mb-4">Abonnez-vous pour accéder aux cours</h1>
        <p className="font-body text-encre-900/70 mb-10">
          3000 FCFA / mois pour un accès illimité aux QCM et aux cours de votre filière.
        </p>
        <Link
          to="/abonnement"
          className="inline-block bg-indigo-600 text-creme-50 font-body font-medium px-8 py-3 rounded-full hover:bg-indigo-950 transition-colors"
        >
          S'abonner maintenant
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-2">
        Mes cours
      </p>
      <h1 className="font-display text-3xl mb-10">Cours de votre filière</h1>

      {erreur && <p className="font-body text-red-600 mb-6">{erreur}</p>}

      {coursParChapitre.length === 0 && !erreur && (
        <p className="font-body text-encre-900/60">
          Aucun cours publié pour votre filière pour l'instant.
        </p>
      )}

      <div className="flex flex-col gap-10">
        {coursParChapitre.map(([chapitre, coursListe]) => (
          <div key={chapitre}>
            <h2 className="font-display text-lg mb-3">{chapitre}</h2>
            <div className="flex flex-col gap-2">
              {coursListe.map((c) => (
                <Link
                  key={c.id}
                  to={`/cours/${c.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-encre-900/15 bg-white hover:border-indigo-600 transition-colors"
                >
                  <span className="font-body text-sm text-encre-900">{c.titre}</span>
                  <span className="font-mono text-xs text-indigo-600 shrink-0 ml-4">
                    {c.type === 'video' ? '▶ Vidéo' : '📄 Document'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
