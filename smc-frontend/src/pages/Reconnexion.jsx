import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function Reconnexion() {
  const navigate = useNavigate();
  const { inscrire } = useEtudiant();
  const [telephone, setTelephone] = useState('');
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setErreur(null);

    if (telephone.trim().length < 8) {
      setErreur('Merci de saisir un numéro de téléphone valide.');
      return;
    }

    setChargement(true);
    try {
      const { etudiant } = await api.reconnecterEtudiant(telephone.trim());
      inscrire(etudiant);
      navigate('/mes-qcm');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="max-w-md mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-3">
        Se reconnecter
      </p>
      <h1 className="font-display text-3xl mb-2">Retrouvez votre compte</h1>
      <p className="font-body text-encre-900/60 mb-8">
        Entrez le numéro de téléphone utilisé lors de votre inscription.
      </p>

      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Ex : 97 00 00 00"
          className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
        />

        {erreur && <p className="font-body text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={chargement}
          className="px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium disabled:opacity-50"
        >
          {chargement ? 'Recherche…' : 'Retrouver mon compte'}
        </button>
      </form>

      <p className="font-body text-sm text-encre-900/50 mt-6">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="text-indigo-600 underline">
          Inscrivez-vous gratuitement
        </Link>
      </p>
    </section>
  );
}
