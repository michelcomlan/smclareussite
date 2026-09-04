import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ProgressBar from '../components/ProgressBar.jsx';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function Quiz() {
  const { qcmId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { etudiant } = useEtudiant();
  const achatId = searchParams.get('achat_id');
  const tokenAcces = searchParams.get('token_acces');
  // Accès par abonnement étudiant si aucun achat unitaire n'est fourni dans l'URL
  const acces = achatId && tokenAcces
    ? { achat_id: achatId, token_acces: tokenAcces }
    : { etudiant_id: etudiant?.id };

  const [typeQuiz, setTypeQuiz] = useState('fiche'); // 'fiche' | 'qcu'
  const [questions, setQuestions] = useState(null);
  const [indexCourant, setIndexCourant] = useState(0);
  const [reponseRevelee, setReponseRevelee] = useState(false);
  const [autoEvaluations, setAutoEvaluations] = useState({}); // mode fiche : { question_id: true|false }
  const [choixSelectionne, setChoixSelectionne] = useState(null); // mode qcu : index choisi pour la question courante
  const [reponsesQcu, setReponsesQcu] = useState({}); // mode qcu : { question_id: index_choisi }
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    if (!acces.achat_id && !acces.etudiant_id) {
      setErreur("Accès invalide. Connectez-vous ou souscrivez un abonnement pour accéder à ce QCM.");
      return;
    }
    api
      .getQuestions(qcmId, acces)
      .then((data) => {
        setTypeQuiz(data.type_quiz || 'fiche');
        setQuestions(data.questions);
      })
      .catch((err) => setErreur(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qcmId, achatId, tokenAcces, etudiant?.id]);

  async function envoyerResultatFiche(evaluationsCompletes) {
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const reponsesFormatees = Object.entries(evaluationsCompletes).map(([question_id, reussi]) => ({
        question_id,
        reussi,
      }));
      const resultat = await api.soumettreQuiz(qcmId, acces, reponsesFormatees);
      navigate(`/resultat/${qcmId}`, { state: { resultat, questions, typeQuiz } });
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  async function envoyerResultatQcu(reponsesCompletes) {
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const reponsesFormatees = Object.entries(reponsesCompletes).map(([question_id, index_choisi]) => ({
        question_id,
        index_choisi,
      }));
      const resultat = await api.soumettreQuiz(qcmId, acces, reponsesFormatees);
      navigate(`/resultat/${qcmId}`, { state: { resultat, questions, typeQuiz } });
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  function autoEvaluer(reussi) {
    const question = questions[indexCourant];
    const misesAJour = { ...autoEvaluations, [question.id]: reussi };
    setAutoEvaluations(misesAJour);

    const estDerniere = indexCourant === questions.length - 1;
    if (estDerniere) {
      envoyerResultatFiche(misesAJour);
    } else {
      setReponseRevelee(false);
      setIndexCourant((i) => i + 1);
    }
  }

  function questionSuivanteQcu() {
    if (choixSelectionne === null) return;
    const question = questions[indexCourant];
    const misesAJour = { ...reponsesQcu, [question.id]: choixSelectionne };
    setReponsesQcu(misesAJour);

    const estDerniere = indexCourant === questions.length - 1;
    if (estDerniere) {
      envoyerResultatQcu(misesAJour);
    } else {
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

  if (!questions) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center font-body text-encre-900/60">
        Chargement du quiz…
      </section>
    );
  }

  const question = questions[indexCourant];
  const estDerniere = indexCourant === questions.length - 1;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-indigo-950 text-creme-50 flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-6 pt-10">
        <ProgressBar courant={indexCourant + 1} total={questions.length} />
      </div>

      <div className="max-w-2xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <p className="font-mono text-or-400 text-sm">Q{indexCourant + 1}</p>
          {question.difficulte && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-creme-50/10 text-creme-50/70">
              {question.difficulte}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-medium leading-snug mb-8">
          {question.enonce}
        </h1>

        {typeQuiz === 'qcu' ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              {question.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setChoixSelectionne(i)}
                  className={`text-left px-5 py-3.5 rounded-xl border transition-colors font-body ${
                    choixSelectionne === i
                      ? 'bg-or-400 text-encre-900 border-or-400 font-medium'
                      : 'bg-creme-50/5 border-creme-50/15 hover:bg-creme-50/10'
                  }`}
                >
                  <span className="font-mono text-xs opacity-60 mr-2">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={questionSuivanteQcu}
              disabled={choixSelectionne === null || envoiEnCours}
              className="self-start px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium disabled:opacity-40"
            >
              {estDerniere ? 'Terminer' : 'Question suivante'}
            </button>
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

            <div>
              <p className="font-body text-sm text-creme-50/60 mb-3">
                Aviez-vous la bonne réponse ?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => autoEvaluer(false)}
                  disabled={envoiEnCours}
                  className="flex-1 px-5 py-3 rounded-xl border border-red-400/40 text-red-300 font-body font-medium hover:bg-red-400/10 disabled:opacity-40"
                >
                  À revoir
                </button>
                <button
                  type="button"
                  onClick={() => autoEvaluer(true)}
                  disabled={envoiEnCours}
                  className="flex-1 px-5 py-3 rounded-xl bg-green-500/90 text-encre-900 font-body font-medium hover:bg-green-500 disabled:opacity-40"
                >
                  J'ai réussi
                </button>
              </div>
            </div>
          </div>
        )}

        {erreur && <p className="font-body text-red-400 mt-4">{erreur}</p>}

        {envoiEnCours && estDerniere && (
          <p className="font-body text-sm text-creme-50/50 mt-6">Calcul du score…</p>
        )}
      </div>
    </div>
  );
}
