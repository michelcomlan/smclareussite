import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function ApercuGratuit() {
  const { etudiant } = useEtudiant();
  const navigate = useNavigate();

  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [indexCourant, setIndexCourant] = useState(0);
  const [reponseRevelee, setReponseRevelee] = useState(false);
  const [choixSelectionne, setChoixSelectionne] = useState(null); // mode qcu
  const [scoreQcu, setScoreQcu] = useState(0); // mode qcu
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    if (!etudiant) {
      navigate('/inscription');
      return;
    }
    api.apercuGratuit().then(setDonnees).catch((err) => setErreur(err.message));
  }, [etudiant, navigate]);

  function suivantFiche() {
    const estDerniere = indexCourant === donnees.questions.length - 1;
    if (estDerniere) {
      setTermine(true);
    } else {
      setReponseRevelee(false);
      setIndexCourant((i) => i + 1);
    }
  }

  function validerChoixQcu() {
    if (choixSelectionne === null) return;
    const question = donnees.questions[indexCourant];
    if (choixSelectionne === question.indexBonneReponse) {
      setScoreQcu((s) => s + 1);
    }
    setReponseRevelee(true);
  }

  function suivantQcu() {
    const estDerniere = indexCourant === donnees.questions.length - 1;
    if (estDerniere) {
      setTermine(true);
    } else {
      setReponseRevelee(false);
      setChoixSelectionne(null);
      setIndexCourant((i) => i + 1);
    }
  }

  if (erreur) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-body text-red-600">{erreur}</p>
      </section>
    );
  }

  if (!donnees) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center font-body text-encre-900/60">
        Chargement de l'aperçu…
      </section>
    );
  }

  const estQcu = donnees.type_quiz === 'qcu';

  if (termine) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-4">
          Aperçu terminé
        </p>
        <h1 className="font-display text-3xl mb-4">
          Bravo {etudiant.prenom} !
        </h1>
        <p className="font-body text-encre-900/70 mb-2">
          Vous venez de tester {donnees.questions.length} questions de {donnees.qcm_titre}
          {estQcu && ` — ${scoreQcu} / ${donnees.questions.length} bonnes réponses`}.
        </p>
        <p className="font-body text-encre-900/70 mb-10">
          Abonnez-vous pour un accès illimité à tous les QCM de votre filière pendant 30 jours.
        </p>
        <Link
          to="/abonnement"
          className="inline-block bg-indigo-600 text-creme-50 font-body font-medium px-8 py-3 rounded-full hover:bg-indigo-950 transition-colors"
        >
          S'abonner pour 3000 FCFA / mois
        </Link>
      </section>
    );
  }

  const question = donnees.questions[indexCourant];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-indigo-950 text-creme-50 flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-6 pt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-or-400 mb-3">
          Aperçu gratuit · {donnees.qcm_titre}
        </p>
        <ProgressBar courant={indexCourant + 1} total={donnees.questions.length} />
      </div>

      <div className="max-w-2xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <p className="font-mono text-or-400 text-sm mb-4">Q{indexCourant + 1}</p>
        <h1 className="font-display text-2xl md:text-3xl font-medium leading-snug mb-8">
          {question.enonce}
        </h1>

        {estQcu ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              {question.options.map((option, i) => {
                const estLaBonne = i === question.indexBonneReponse;
                const estChoisie = i === choixSelectionne;
                let style = 'bg-creme-50/5 border-creme-50/15 hover:bg-creme-50/10';
                if (reponseRevelee) {
                  if (estLaBonne) style = 'bg-green-500/90 text-encre-900 border-green-500 font-medium';
                  else if (estChoisie) style = 'bg-red-500/20 border-red-400/40 text-red-200';
                  else style = 'bg-creme-50/5 border-creme-50/10 opacity-60';
                } else if (estChoisie) {
                  style = 'bg-or-400 text-encre-900 border-or-400 font-medium';
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={reponseRevelee}
                    onClick={() => setChoixSelectionne(i)}
                    className={`text-left px-5 py-3.5 rounded-xl border transition-colors font-body ${style}`}
                  >
                    <span className="font-mono text-xs opacity-60 mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {!reponseRevelee ? (
              <button
                type="button"
                onClick={validerChoixQcu}
                disabled={choixSelectionne === null}
                className="self-start px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium disabled:opacity-40"
              >
                Valider
              </button>
            ) : (
              <button
                type="button"
                onClick={suivantQcu}
                className="self-start px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium"
              >
                {indexCourant === donnees.questions.length - 1 ? 'Terminer' : 'Question suivante'}
              </button>
            )}
          </div>
        ) : !reponseRevelee ? (
          <button
            type="button"
            onClick={() => setReponseRevelee(true)}
            className="self-start px-6 py-3 rounded-full bg-or-400 text-encre-900 font-body font-medium"
          >
            Voir la réponse
          </button>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="p-5 rounded-xl bg-creme-50/10 border border-creme-50/15">
              <p className="font-mono text-xs uppercase tracking-widest text-or-400 mb-2">Réponse</p>
              <p className="font-body leading-relaxed">{question.reponse}</p>
            </div>
            <button
              type="button"
              onClick={suivantFiche}
              className="self-start px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium"
            >
              {indexCourant === donnees.questions.length - 1 ? 'Terminer' : 'Question suivante'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
