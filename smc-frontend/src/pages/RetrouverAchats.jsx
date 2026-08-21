import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function RetrouverAchats() {
  const [etape, setEtape] = useState('telephone'); // telephone | code | liste
  const [telephone, setTelephone] = useState('');
  const [code, setCode] = useState('');
  const [tokenOtp, setTokenOtp] = useState(null);
  const [achats, setAchats] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  async function demanderCode(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.demanderOtp(telephone.trim());
      setEtape('code');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function verifierCode(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { token } = await api.verifierOtp(telephone.trim(), code.trim());
      setTokenOtp(token);
      const data = await api.retrouverAchats(token);
      setAchats(data);
      setEtape('liste');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-2xl mb-2">Retrouver mes achats</h1>
      <p className="font-body text-encre-900/60 mb-10 text-sm">
        Un code de vérification vous sera envoyé par SMS pour confirmer que ce numéro vous
        appartient.
      </p>

      {etape === 'telephone' && (
        <form onSubmit={demanderCode} className="flex flex-col gap-4">
          <label htmlFor="tel" className="font-body text-sm font-medium">
            Numéro de téléphone
          </label>
          <input
            id="tel"
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Ex : 97 00 00 00"
            className="px-4 py-3 rounded-lg border border-encre-900/20 font-body focus-visible:outline-none"
          />
          {erreur && <p className="font-body text-sm text-red-600">{erreur}</p>}
          <button
            type="submit"
            disabled={chargement}
            className="bg-indigo-600 text-creme-50 font-body font-medium py-3 rounded-lg disabled:opacity-60"
          >
            {chargement ? 'Envoi…' : 'Recevoir le code par SMS'}
          </button>
        </form>
      )}

      {etape === 'code' && (
        <form onSubmit={verifierCode} className="flex flex-col gap-4">
          <label htmlFor="code" className="font-body text-sm font-medium">
            Code reçu par SMS
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="px-4 py-3 rounded-lg border border-encre-900/20 font-body font-mono tracking-widest text-center text-lg focus-visible:outline-none"
          />
          {erreur && <p className="font-body text-sm text-red-600">{erreur}</p>}
          <button
            type="submit"
            disabled={chargement}
            className="bg-indigo-600 text-creme-50 font-body font-medium py-3 rounded-lg disabled:opacity-60"
          >
            {chargement ? 'Vérification…' : 'Vérifier le code'}
          </button>
          <button
            type="button"
            onClick={() => setEtape('telephone')}
            className="font-body text-sm text-encre-900/50 underline"
          >
            Changer de numéro
          </button>
        </form>
      )}

      {etape === 'liste' && (
        <div className="flex flex-col gap-4">
          {achats.length === 0 && (
            <p className="font-body text-encre-900/60">Aucun achat confirmé pour ce numéro.</p>
          )}
          {achats.map((a) => (
            <div key={a.id} className="ticket-qcm p-5 pt-7 relative">
              <span className="ticket-notch-left" aria-hidden="true" />
              <span className="ticket-notch-right" aria-hidden="true" />
              <p className="font-display text-base mb-3">{a.qcm?.titre}</p>
              <Link
                to={`/quiz/${a.qcm_id}?achat_id=${a.id}&token_acces=${a.token_acces}`}
                className="font-body text-sm text-indigo-600 underline"
              >
                Reprendre ce QCM →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
