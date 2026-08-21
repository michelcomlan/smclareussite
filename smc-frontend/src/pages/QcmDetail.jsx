import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function QcmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qcm, setQcm] = useState(null);
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    api
      .getQcm(id)
      .then(setQcm)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, [id]);

  async function handleAchat(e) {
    e.preventDefault();
    setErreur(null);

    if (telephone.trim().length < 8) {
      setErreur('Merci de saisir un numéro de téléphone valide.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const { achat_id, paiement_url } = await api.initierPaiement(id, telephone.trim());
      // On garde une trace de l'achat en attente pour retrouver le statut
      // après le retour de FedaPay.
      sessionStorage.setItem('smc_achat_en_attente', JSON.stringify({ achat_id, qcm_id: id }));
      window.location.href = paiement_url;
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return <p className="max-w-3xl mx-auto px-6 py-16 font-body text-encre-900/60">Chargement…</p>;
  }

  if (erreur && !qcm) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="font-body text-red-600 mb-4">{erreur}</p>
        <button onClick={() => navigate('/')} className="font-body underline">
          Retour au catalogue
        </button>
      </div>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-6 py-16">
      <button
        onClick={() => navigate('/')}
        className="font-mono text-xs text-encre-900/50 hover:text-indigo-600 mb-8"
      >
        ← Retour au catalogue
      </button>

      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-3">
        {qcm.niveau}
      </p>
      <h1 className="font-display text-3xl font-medium mb-6">{qcm.titre}</h1>

      <div className="flex items-center gap-6 mb-10 font-mono text-sm text-encre-900/70">
        <span>{qcm.nombre_questions} questions</span>
        <span className="text-indigo-600 font-medium text-lg">
          {qcm.prix.toLocaleString('fr-FR')} FCFA
        </span>
      </div>

      <form onSubmit={handleAchat} className="ticket-qcm p-6 pt-8 relative">
        <span className="ticket-notch-left" aria-hidden="true" />
        <span className="ticket-notch-right" aria-hidden="true" />

        <label htmlFor="telephone" className="block font-body text-sm font-medium mb-2">
          Numéro Mobile Money (MTN ou Moov)
        </label>
        <input
          id="telephone"
          type="tel"
          inputMode="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Ex : 97 00 00 00"
          className="w-full px-4 py-3 rounded-lg border border-encre-900/20 font-body mb-4 focus-visible:outline-none"
        />

        {erreur && <p className="font-body text-sm text-red-600 mb-4">{erreur}</p>}

        <button
          type="submit"
          disabled={envoiEnCours}
          className="w-full bg-indigo-600 text-creme-50 font-body font-medium py-3 rounded-lg hover:bg-indigo-950 transition-colors disabled:opacity-60"
        >
          {envoiEnCours ? 'Redirection vers le paiement…' : `Payer ${qcm.prix.toLocaleString('fr-FR')} FCFA`}
        </button>

        <p className="font-body text-xs text-encre-900/50 mt-4">
          Vous serez redirigé vers FedaPay pour confirmer le paiement, puis renvoyé ici
          automatiquement.
        </p>
      </form>
    </section>
  );
}
