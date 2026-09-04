import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function Abonnement() {
  const { etudiant } = useEtudiant();
  const navigate = useNavigate();
  const [telephone, setTelephone] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function payer(e) {
    e.preventDefault();
    setErreur(null);

    if (!etudiant) {
      navigate('/inscription');
      return;
    }
    if (telephone.trim().length < 8) {
      setErreur('Merci de saisir un numéro de téléphone valide.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const { abonnement_id, paiement_url } = await api.initierAbonnement(
        etudiant.id,
        telephone.trim()
      );
      sessionStorage.setItem('smc_abonnement_en_attente', JSON.stringify({ abonnement_id }));
      window.location.href = paiement_url;
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  if (!etudiant) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-body text-encre-900/70 mb-6">
          Créez d'abord votre compte gratuit avant de vous abonner.
        </p>
        <Link to="/inscription" className="font-body underline text-indigo-600">
          S'inscrire gratuitement
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-3">
        Abonnement mensuel
      </p>
      <h1 className="font-display text-4xl mb-2">3000 FCFA</h1>
      <p className="font-body text-encre-900/60 mb-10">
        Accès illimité pendant 30 jours à tous les QCM de votre filière, {etudiant.prenom}.
      </p>

      <form onSubmit={payer} className="ticket-qcm p-6 pt-8 relative text-left">
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
          {envoiEnCours ? 'Redirection vers le paiement…' : 'Payer 3000 FCFA'}
        </button>

        <p className="font-body text-xs text-encre-900/50 mt-4">
          Vous serez redirigé vers FedaPay pour confirmer le paiement, puis renvoyé ici
          automatiquement avec votre code d'abonnement.
        </p>
      </form>
    </section>
  );
}
