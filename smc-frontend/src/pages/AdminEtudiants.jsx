import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminEtudiants() {
  const { token } = useAdminAuth();
  const [telephone, setTelephone] = useState('');
  const [code, setCode] = useState('');
  const [resultats, setResultats] = useState(null);
  const [resultatCode, setResultatCode] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [erreurCode, setErreurCode] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [chargementCode, setChargementCode] = useState(false);

  async function rechercher(e) {
    e.preventDefault();
    setErreur(null);
    setResultats(null);
    if (!telephone.trim()) return;

    setChargement(true);
    try {
      const data = await api.rechercherEtudiantAdmin(token, telephone.trim());
      setResultats(data);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function rechercherParCode(e) {
    e.preventDefault();
    setErreurCode(null);
    setResultatCode(null);
    if (!code.trim()) return;

    setChargementCode(true);
    try {
      const data = await api.rechercherEtudiantParCode(token, code.trim());
      setResultatCode(data);
    } catch (err) {
      setErreurCode(err.message);
    } finally {
      setChargementCode(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl mb-2">Retrouver un compte par code d'abonnement</h1>
      <p className="font-body text-xs text-encre-900/50 mb-3">
        Le plus fiable si plusieurs comptes existent avec le même numéro.
      </p>
      <form onSubmit={rechercherParCode} className="flex gap-3 mb-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex : SMC-76B6D213"
          className="flex-1 px-4 py-2.5 rounded-md border border-encre-900/20 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={chargementCode}
          className="px-5 py-2.5 rounded-md bg-indigo-900 text-white text-sm font-medium disabled:opacity-40"
        >
          {chargementCode ? 'Recherche…' : 'Rechercher'}
        </button>
      </form>
      {erreurCode && <p className="font-body text-sm text-red-600 mb-4">{erreurCode}</p>}
      {resultatCode && (
        <div className="bg-white border border-indigo-200 rounded-lg p-4 mb-8">
          <p className="font-body font-medium mb-1">
            {resultatCode.etudiant?.prenom} {resultatCode.etudiant?.nom}
          </p>
          <p className="font-mono text-xs text-encre-900/50 mb-1">
            ID étudiant : {resultatCode.etudiant?.id}
          </p>
          <p className="font-mono text-xs text-encre-900/50">
            Téléphone : {resultatCode.etudiant?.telephone || '(non renseigné)'}
          </p>
          <p className="font-mono text-xs mt-2 text-green-700">
            {resultatCode.abonnement.statut} · jusqu'au{' '}
            {new Date(resultatCode.abonnement.date_fin).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      <hr className="border-encre-900/10 mb-8" />

      <h1 className="font-display text-2xl mb-4">Rechercher un étudiant par téléphone</h1>

      <form onSubmit={rechercher} className="flex gap-3 mb-8">
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Numéro de téléphone"
          className="flex-1 px-4 py-2.5 rounded-md border border-encre-900/20 text-sm"
        />
        <button
          type="submit"
          disabled={chargement}
          className="px-5 py-2.5 rounded-md bg-indigo-900 text-white text-sm font-medium disabled:opacity-40"
        >
          {chargement ? 'Recherche…' : 'Rechercher'}
        </button>
      </form>

      {erreur && <p className="font-body text-sm text-red-600 mb-4">{erreur}</p>}

      {resultats && resultats.length === 0 && (
        <p className="font-body text-sm text-encre-900/50">Aucun compte trouvé avec ce numéro.</p>
      )}

      {resultats?.map((etudiant) => (
        <div key={etudiant.id} className="bg-white border border-encre-900/15 rounded-lg p-4 mb-3">
          <p className="font-body font-medium mb-1">
            {etudiant.prenom} {etudiant.nom}
          </p>
          <p className="font-mono text-xs text-encre-900/40 mb-3">
            ID : {etudiant.id} · Créé le {new Date(etudiant.created_at).toLocaleString('fr-FR')}
          </p>

          {etudiant.abonnements.length === 0 ? (
            <p className="font-body text-xs text-encre-900/40">Aucun abonnement.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {etudiant.abonnements.map((a) => (
                <div
                  key={a.id}
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    a.statut === 'actif' ? 'bg-green-50 text-green-700' : 'bg-encre-900/5 text-encre-900/50'
                  }`}
                >
                  {a.statut}
                  {a.code_abonnement ? ` · ${a.code_abonnement}` : ''}
                  {a.date_fin ? ` · jusqu'au ${new Date(a.date_fin).toLocaleDateString('fr-FR')}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
