import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';

export default function Resultat() {
  const location = useLocation();
  const { qcmId } = useParams();
  const { resultat, questions } = location.state || {};

  if (!resultat) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-body text-encre-900/60 mb-6">
          Résultat introuvable. Ce QCM a peut-être déjà été terminé dans une autre session.
        </p>
        <Link to="/" className="font-body underline text-indigo-600">
          Retour au catalogue
        </Link>
      </section>
    );
  }

  const { score, score_sur, detail } = resultat;
  const pourcentage = Math.round((score / score_sur) * 100);
  const questionParId = new Map((questions || []).map((q) => [q.id, q]));

  return (
    <section className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-4">
          Résultat
        </p>
        <p className="font-display text-7xl font-semibold text-encre-900">
          {score}
          <span className="text-3xl text-encre-900/40"> / {score_sur}</span>
        </p>
        <p className="font-body text-encre-900/60 mt-3">{pourcentage}% de bonnes réponses</p>
      </div>

      <h2 className="font-display text-lg mb-4">Détail des réponses</h2>
      <ul className="flex flex-col gap-3">
        {detail.map((d, idx) => {
          const question = questionParId.get(d.question_id);
          return (
            <li
              key={d.question_id}
              className={`p-4 rounded-xl border font-body text-sm ${
                d.correct ? 'border-green-600/30 bg-green-50' : 'border-red-600/30 bg-red-50'
              }`}
            >
              <p className="font-medium mb-2">
                {idx + 1}. {question?.enonce || 'Question'}
              </p>
              {question && (
                <p className="text-encre-900/70">
                  Votre réponse :{' '}
                  <span className={d.correct ? 'text-green-700' : 'text-red-700'}>
                    {question.options[d.index_choisi]}
                  </span>
                  {!d.correct && (
                    <>
                      {' '}
                      · Bonne réponse :{' '}
                      <span className="text-green-700">
                        {question.options[d.index_bonne_reponse]}
                      </span>
                    </>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="text-center mt-12">
        <Link
          to="/"
          className="inline-block bg-indigo-600 text-creme-50 font-body font-medium px-8 py-3 rounded-full hover:bg-indigo-950 transition-colors"
        >
          Retour au catalogue
        </Link>
      </div>
    </section>
  );
}
