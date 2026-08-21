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
  const [reponses, setReponses] = useState({}); // { question_id: index_choisi }
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

  function choisirReponse(questionId, index) {
    setReponses((prev) => ({ ...prev, [questionId]: index }));
  }

  async function terminerQuiz() {
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const reponsesFormatees = Object.entries(reponses).map(([question_id, index_choisi]) => ({
        question_id,
        index_choisi,
      }));
      const resultat = await api.soumettreQuiz(qcmId, achatId, tokenAcces, reponsesFormatees);
      navigate(`/resultat/${qcmId}`, { state: { resultat, questions } });
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
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
  const reponseChoisie = reponses[question.id];
  const estDerniere = indexCourant === questions.length - 1;
  const toutesReponsesDonnees = questions.every((q) => reponses[q.id] !== undefined);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-indigo-950 text-creme-50 flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-6 pt-10">
        <ProgressBar courant={indexCourant + 1} total={questions.length} />
      </div>

      <div className="max-w-2xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <p className="font-mono text-or-400 text-sm mb-4">Q{indexCourant + 1}</p>
        <h1 className="font-display text-2xl md:text-3xl font-medium leading-snug mb-10">
          {question.enonce}
        </h1>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label={question.enonce}>
          {question.options.map((option, idx) => {
            const selectionne = reponseChoisie === idx;
            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={selectionne}
                onClick={() => choisirReponse(question.id, idx)}
                className={`text-left px-5 py-4 rounded-xl border font-body transition-colors ${
                  selectionne
                    ? 'bg-or-400 border-or-400 text-encre-900'
                    : 'bg-transparent border-creme-50/25 hover:border-or-400/70'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {erreur && <p className="font-body text-red-400 mt-4">{erreur}</p>}

        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={() => setIndexCourant((i) => Math.max(0, i - 1))}
            disabled={indexCourant === 0}
            className="font-body text-sm text-creme-50/60 hover:text-creme-50 disabled:opacity-30"
          >
            ← Précédent
          </button>

          {!estDerniere ? (
            <button
              type="button"
              onClick={() => setIndexCourant((i) => i + 1)}
              disabled={reponseChoisie === undefined}
              className="bg-or-400 text-encre-900 font-body font-medium px-6 py-3 rounded-full disabled:opacity-30"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={terminerQuiz}
              disabled={!toutesReponsesDonnees || envoiEnCours}
              className="bg-or-400 text-encre-900 font-body font-medium px-6 py-3 rounded-full disabled:opacity-30"
            >
              {envoiEnCours ? 'Envoi…' : 'Voir mon score'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
