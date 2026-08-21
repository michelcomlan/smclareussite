import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminLogin() {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const { connecter } = useAdminAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { token } = await api.loginAdmin(identifiant.trim(), motDePasse);
      connecter(token);
      navigate('/admin/dashboard');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto px-6 py-24">
      <h1 className="font-display text-2xl mb-8">Espace administrateur</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="identifiant" className="block font-body text-sm font-medium mb-1">
            Identifiant
          </label>
          <input
            id="identifiant"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-encre-900/20 font-body focus-visible:outline-none"
          />
        </div>
        <div>
          <label htmlFor="motDePasse" className="block font-body text-sm font-medium mb-1">
            Mot de passe
          </label>
          <input
            id="motDePasse"
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-encre-900/20 font-body focus-visible:outline-none"
          />
        </div>
        {erreur && <p className="font-body text-sm text-red-600">{erreur}</p>}
        <button
          type="submit"
          disabled={chargement}
          className="bg-indigo-950 text-creme-50 font-body font-medium py-3 rounded-lg disabled:opacity-60"
        >
          {chargement ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </section>
  );
}
