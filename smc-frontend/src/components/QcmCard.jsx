import React from 'react';
import { Link } from 'react-router-dom';

const COULEUR_NIVEAU = {
  Licence: 'text-indigo-600',
  Master: 'text-or-400',
};

export default function QcmCard({ qcm, filiereNom, matiereNom }) {
  const couleur = COULEUR_NIVEAU[qcm.niveau] || 'text-indigo-600';

  return (
    <Link
      to={`/qcm/${qcm.id}`}
      className="block group focus-visible:outline-none"
      aria-label={`${qcm.titre}, niveau ${qcm.niveau}, ${qcm.prix} FCFA`}
    >
      <div className="relative pt-2">
        <span className="ticket-notch-left" aria-hidden="true" />
        <span className="ticket-notch-right" aria-hidden="true" />
        <div className="ticket-qcm p-6 pt-8 transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-display text-lg font-medium leading-snug text-encre-900">
              {qcm.titre}
            </h3>
            <div className={`sceau-niveau shrink-0 ${couleur}`} aria-hidden="true">
              {qcm.niveau === 'Master' ? 'M' : 'L'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5 text-xs font-body text-encre-900/70">
            {filiereNom && (
              <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-600">
                {filiereNom}
              </span>
            )}
            {matiereNom && (
              <span className="px-2 py-1 rounded-full bg-or-100 text-encre-900">
                {matiereNom}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-encre-900/20 pt-4">
            <span className="font-mono text-xs text-encre-900/60">
              {qcm.nombre_questions} questions
            </span>
            <span className="font-mono text-base font-medium text-indigo-600">
              {qcm.prix.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
