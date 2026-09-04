import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function MesQcm() {
  const { etudiant } = useEtudiant();
  const navigate = useNavigate();

  const [statut, setStatut] = useState('verification'); // verification | abonne | non_abonne
  const [dateFin, setDateFin] = useState(null);
  const [qcms, setQcms] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!etudiant) {
      navigate('/inscription');
      return;
    }

    api
      .abonnementActif(etudiant.id)
      .then(({ abonnement_actif }) => {
        if (!abonnement_actif) {
          setStatut('non_abonne');
          return;
        }
        setStatut('abonne');
        setDateFin(abonnement_actif.date_fin);

        return Promise.all([
          api.listerQcm({ filiere_id: etudiant.filiere_id }),
          api.listerMatieres(),
        ]).then(([listeQcm, listeMatieres]) => {
          setQcms(listeQcm);
          setMatieres(listeMatieres);
        });
      })
      .catch((err) => setErreur(err.message));
  }, [etudiant, navigate]);

  const nomMatiere = (id) => matieres.find((m) => m.id === id)?.nom;

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
        <h1 className="font-display text-3xl mb-4">
          {etudiant?.prenom}, abonnez-vous pour accéder à vos QCM
        </h1>
        <p className="font-body text-encre-900/70 mb-10">
          3000 FCFA / mois pour un accès illimité à tous les QCM de votre filière.
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

  const dateFormatee = dateFin
    ? new Date(dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-2">
        Mes QCM
      </p>
      <h1 className="font-display text-3xl mb-2">Bonjour {etudiant.prenom} 👋</h1>
      {dateFormatee && (
        <p className="font-body text-encre-900/60 mb-10">
          Abonnement actif jusqu'au {dateFormatee}.
        </p>
      )}

      {erreur && <p className="font-body text-red-600 mb-6">{erreur}</p>}

      {qcms.length === 0 && !erreur && (
        <p className="font-body text-encre-900/60">
          Aucun QCM publié pour votre filière pour l'instant — revenez bientôt.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
        {qcms.map((qcm) => (
          <Link
            key={qcm.id}
            to={`/quiz/${qcm.id}`}
            className="block group focus-visible:outline-none"
          >
            <div className="relative pt-2">
              <span className="ticket-notch-left" aria-hidden="true" />
              <span className="ticket-notch-right" aria-hidden="true" />
              <div className="ticket-qcm p-6 pt-8 transition-transform duration-200 group-hover:-translate-y-1">
                <h3 className="font-display text-lg font-medium leading-snug text-encre-900 mb-4">
                  {qcm.titre}
                </h3>
                {nomMatiere(qcm.matiere_id) && (
                  <span className="inline-block px-2 py-1 rounded-full bg-or-100 text-encre-900 text-xs font-body mb-5">
                    {nomMatiere(qcm.matiere_id)}
                  </span>
                )}
                <div className="flex items-center justify-between border-t border-dashed border-encre-900/20 pt-4">
                  <span className="font-mono text-xs text-encre-900/60">
                    {qcm.nombre_questions} questions
                  </span>
                  <span className="font-body text-sm text-indigo-600 font-medium">
                    Réviser →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
