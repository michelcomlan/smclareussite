import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminCours() {
  const { token } = useAdminAuth();
  const [filieres, setFilieres] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [coursListe, setCoursListe] = useState([]);
  const [form, setForm] = useState({
    filiere_id: '',
    matiere_id: '',
    chapitre: '',
    titre: '',
    type: 'document',
    url: '',
    ordre: 0,
  });
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  function chargerListe() {
    api.listerCoursAdmin(token).then(setCoursListe).catch(() => {});
  }

  useEffect(() => {
    api.listerFilieres().then(setFilieres).catch(() => {});
    api.listerMatieres().then(setMatieres).catch(() => {});
    chargerListe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nomFiliere = (id) => filieres.find((f) => f.id === id)?.nom;

  async function ajouter(e) {
    e.preventDefault();
    setErreur(null);

    if (!form.filiere_id || !form.chapitre.trim() || !form.titre.trim() || !form.url.trim()) {
      setErreur('Filière, chapitre, titre et lien sont requis.');
      return;
    }

    setChargement(true);
    try {
      await api.creerCours(token, {
        ...form,
        matiere_id: form.matiere_id || null,
        ordre: Number(form.ordre) || 0,
        publie: false,
      });
      setForm({ filiere_id: '', matiere_id: '', chapitre: '', titre: '', type: 'document', url: '', ordre: 0 });
      chargerListe();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function basculerPublication(id) {
    await api.publierCours(token, id);
    chargerListe();
  }

  async function supprimer(id) {
    await api.supprimerCours(token, id);
    chargerListe();
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h1 className="font-display text-2xl mb-4">Ajouter un cours</h1>
        <p className="font-body text-xs text-encre-900/50 mb-4">
          Collez un lien vers le document (Google Drive, partagé "Toute personne disposant du
          lien") ou vers la vidéo (YouTube, Vimeo). Le cours s'affiche dans le site sans bouton de
          téléchargement direct.
        </p>

        <form onSubmit={ajouter} className="bg-white border border-encre-900/15 rounded-lg p-5 flex flex-col gap-3">
          <select
            value={form.filiere_id}
            onChange={(e) => setForm({ ...form, filiere_id: e.target.value })}
            className="border border-encre-900/20 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Filière</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
          <select
            value={form.matiere_id}
            onChange={(e) => setForm({ ...form, matiere_id: e.target.value })}
            className="border border-encre-900/20 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Matière (optionnel)</option>
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
          <input
            placeholder="Chapitre (ex : Chapitre 1 : Introduction)"
            value={form.chapitre}
            onChange={(e) => setForm({ ...form, chapitre: e.target.value })}
            className="border border-encre-900/20 rounded-md px-3 py-2 text-sm"
          />
          <input
            placeholder="Titre du cours"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            className="border border-encre-900/20 rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-1/2 border border-encre-900/20 rounded-md px-3 py-2 text-sm"
            >
              <option value="document">Document (PDF/Word)</option>
              <option value="video">Vidéo</option>
            </select>
            <input
              placeholder="Ordre (0, 1, 2...)"
              type="number"
              value={form.ordre}
              onChange={(e) => setForm({ ...form, ordre: e.target.value })}
              className="w-1/2 border border-encre-900/20 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <input
            placeholder="Lien (URL du document ou de la vidéo)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="border border-encre-900/20 rounded-md px-3 py-2 text-sm"
          />

          {erreur && <p className="font-body text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="px-4 py-2.5 rounded-md bg-indigo-900 text-white text-sm font-medium disabled:opacity-40"
          >
            Ajouter (non publié)
          </button>
        </form>
      </div>

      <div>
        <h1 className="font-display text-2xl mb-4">Cours existants</h1>
        <div className="flex flex-col gap-2">
          {coursListe.length === 0 && (
            <p className="font-body text-sm text-encre-900/40">Aucun cours pour l'instant.</p>
          )}
          {coursListe.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-encre-900/15 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="font-body text-sm font-medium truncate">{c.titre}</p>
                <p className="font-mono text-xs text-encre-900/40">
                  {c.chapitre} · {nomFiliere(c.filiere_id)} · {c.type === 'video' ? 'Vidéo' : 'Document'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => basculerPublication(c.id)}
                  className={`text-xs px-2 py-1 rounded-full font-body ${
                    c.publie ? 'bg-green-100 text-green-700' : 'bg-encre-900/10 text-encre-900/50'
                  }`}
                >
                  {c.publie ? 'Publié' : 'Dépublié'}
                </button>
                <button
                  onClick={() => supprimer(c.id)}
                  className="text-xs text-red-500 font-body underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
