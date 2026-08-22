import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Quiz() {
  const { qcmId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const achatId = searchParams.get('achat_id');
  const tokenAcces = searchParams.get('token_acces');

  const [questions, setQuestions] = useState(null);
  const [indexCourant, setIndexCourant] = useState(0);
  const [reponseRevelee, setReponseRevelee] = useState(false);
  const [autoEvaluations, setAutoEvaluations] = useState({}); // { question_id: true|false }
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    if (!achatId || !tokenAcces) {
      setErreur("Accès invalide. Ce QCM n'a pas été acheté ou le lien a expiré.");
      return;
    }
    api
      .getQuestions(qcmId, achatId, tokenAcces)
      .then((data) => setQuestions(data.questions))
      .catch((err) => setErreur(err.message));
  }, [qcmId, achatId, tokenAcces]);

  async function envoyerResultat(evaluationsCompletes) {
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const reponsesFormatees = Object.entries(evaluationsCompletes).map(([question_id, reussi]) => ({
        question_id,
        reussi,
      }));
      const resultat = await api.soumettreQuiz(qcmId, achatId, tokenAcces, reponsesFormatees);
      navigate(`/resultat/${qcmId}`, { state: { resultat, questions } });
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
      envoyerResultat(misesAJour);
    } else {
      setReponseRevelee(false);
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

        {!reponseRevelee ? (
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
