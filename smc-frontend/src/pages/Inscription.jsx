import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function Inscription() {
  const navigate = useNavigate();
  const { inscrire } = useEtudiant();

  const [filieres, setFilieres] = useState([]);
  const [form, setForm] = useState({ nom: '', prenom: '', filiere_id: '', telephone: '' });
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    api.listerFilieres().then(setFilieres).catch(() => {});
  }, []);

  async function envoyer(e) {
    e.preventDefault();
    setErreur(null);

    if (!form.nom.trim() || !form.prenom.trim() || !form.filiere_id) {
      setErreur('Nom, prénom et filière sont requis.');
      return;
    }

    setEnvoiEnCours(true);
    try {
      const { etudiant } = await api.inscrireEtudiant(form);
      inscrire(etudiant);
      navigate('/decouvrir');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="max-w-md mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-3">
        Inscription gratuite
      </p>
      <h1 className="font-display text-3xl mb-2">Créez votre compte</h1>
      <p className="font-body text-encre-900/60 mb-8">
        Nom, prénom et filière suffisent — aucun mot de passe, c'est gratuit.
      </p>

      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <div>
          <label className="block font-body text-sm font-medium mb-1">Nom</label>
          <input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          />
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">Prénom</label>
          <input
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          />
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">Filière</label>
          <select
            value={form.filiere_id}
            onChange={(e) => setForm({ ...form, filiere_id: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          >
            <option value="">Choisissez votre filière</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">
            Téléphone <span className="text-encre-900/40">(pour recevoir votre code d'abonnement plus tard)</span>
          </label>
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            placeholder="Ex : 97 00 00 00"
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          />
        </div>

        {erreur && <p className="font-body text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={envoiEnCours}
          className="mt-2 px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium disabled:opacity-50"
        >
          {envoiEnCours ? 'Création…' : 'Créer mon compte gratuitement'}
        </button>
      </form>

      <p className="font-body text-sm text-encre-900/50 mt-6">
        Déjà un compte ?{' '}
        <Link to="/reconnexion" className="text-indigo-600 underline">
          Reconnectez-vous
        </Link>
      </p>
    </section>
  );
}
