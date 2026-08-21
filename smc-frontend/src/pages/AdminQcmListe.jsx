import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminQcmListe() {
  const { token } = useAdminAuth();
  const [qcms, setQcms] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

  function charger() {
    setChargement(true);
    api
      .listerQcmAdmin(token)
      .then(setQcms)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(charger, [token]);

  async function togglePublication(qcm) {
    try {
      await api.modifierQcm(token, qcm.id, { publie: !qcm.publie });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer(qcm) {
    if (!window.confirm(`Supprimer définitivement "${qcm.titre}" ?`)) return;
    try {
      await api.supprimerQcm(token, qcm.id);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">Mes QCM</h1>
        <Link
          to="/admin/import"
          className="bg-indigo-600 text-creme-50 font-body text-sm font-medium px-5 py-2.5 rounded-full"
        >
          + Importer un QCM
        </Link>
      </div>

      {erreur && <p className="font-body text-red-600 mb-4">{erreur}</p>}
      {chargement && <p className="font-body text-encre-900/60">Chargement…</p>}

      <div className="flex flex-col gap-3">
        {qcms.map((qcm) => (
          <div
            key={qcm.id}
            className="flex items-center justify-between gap-4 p-4 rounded-xl border border-encre-900/15 bg-white"
          >
            <div>
              <p className="font-body font-medium">{qcm.titre}</p>
              <p className="font-mono text-xs text-encre-900/50 mt-1">
                {qcm.niveau} · {qcm.nombre_questions} questions ·{' '}
                {qcm.prix.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-body ${
                  qcm.publie ? 'bg-green-100 text-green-700' : 'bg-encre-900/10 text-encre-900/60'
                }`}
              >
                {qcm.publie ? 'Publié' : 'Non publié'}
              </span>
              <button
                onClick={() => togglePublication(qcm)}
                className="font-body text-sm text-indigo-600 underline"
              >
                {qcm.publie ? 'Dépublier' : 'Publier'}
              </button>
              <button
                onClick={() => supprimer(qcm)}
                className="font-body text-sm text-red-600 underline"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}

        {!chargement && qcms.length === 0 && (
          <p className="font-body text-encre-900/60">Aucun QCM importé pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
