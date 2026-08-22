import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminImport() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [filieres, setFilieres] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [form, setForm] = useState({
    titre: '',
    niveau: 'Licence',
    filiere_id: '',
    matiere_id: '',
    prix: '',
  });
  const [texte, setTexte] = useState(''); // contenu brut du fichier .json
  const [nomFichier, setNomFichier] = useState('');
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    api.listerFilieres().then(setFilieres).catch(() => {});
    api.listerMatieres().then(setMatieres).catch(() => {});
  }, []);

  async function onFichierChoisi(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setNomFichier(fichier.name);
    setErreur(null);
    setApercu(null);

    const contenu = await fichier.text();
    setTexte(contenu);

    setChargement(true);
    try {
      const result = await api.previewImport(token, contenu);
      setApercu(result);

      // Si une matière a été reconnue automatiquement à partir du fichier,
      // on la présélectionne (l'admin peut toujours la changer).
      if (result.matiereSuggeree && !form.matiere_id) {
        setForm((f) => ({ ...f, matiere_id: result.matiereSuggeree.id }));
      }
      // Titre par défaut basé sur le nom du fichier, si pas déjà rempli
      if (!form.titre) {
        const titreSuggere = fichier.name.replace(/\.json$/i, '').replace(/_/g, ' ');
        setForm((f) => ({ ...f, titre: titreSuggere }));
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function publier(publie) {
    setErreur(null);
    if (!form.titre || !form.prix) {
      setErreur('Titre et prix sont requis.');
      return;
    }
    if (!texte) {
      setErreur('Choisissez un fichier .json avant de continuer.');
      return;
    }
    setChargement(true);
    try {
      await api.creerQcm(token, {
        ...form,
        prix: Number(form.prix),
        filiere_id: form.filiere_id || null,
        matiere_id: form.matiere_id || null,
        texte,
        publie,
      });
      navigate('/admin/qcm');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl mb-8">Importer un QCM</h1>

      <label className="block font-body text-sm font-medium mb-1">
        Fichier de questions (export QCMmaker, .json)
      </label>
      <p className="font-body text-xs text-encre-900/50 mb-2">
        Chaque question doit avoir au minimum un champ "text" (l'énoncé) et "answer" (la
        réponse). Les champs "domain", "subCategory", "difficulty", "points" et "timeLimit"
        sont repris automatiquement s'ils sont présents.
      </p>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFichierChoisi}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-5 py-2.5 rounded-full border border-encre-900/20 font-body font-medium"
        >
          {nomFichier ? 'Changer de fichier' : 'Choisir un fichier .json'}
        </button>
        {nomFichier && <span className="ml-3 font-mono text-sm text-encre-900/60">{nomFichier}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block font-body text-sm font-medium mb-1">Titre</label>
          <input
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          />
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">Prix (FCFA)</label>
          <input
            type="number"
            min="0"
            value={form.prix}
            onChange={(e) => setForm({ ...form, prix: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body font-mono"
          />
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">Niveau</label>
          <select
            value={form.niveau}
            onChange={(e) => setForm({ ...form, niveau: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          >
            <option value="Licence">Licence</option>
            <option value="Master">Master</option>
          </select>
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">Filière</label>
          <select
            value={form.filiere_id}
            onChange={(e) => setForm({ ...form, filiere_id: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          >
            <option value="">—</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-body text-sm font-medium mb-1">
            Matière {apercu?.matiereSuggeree && <span className="text-green-700">(détectée)</span>}
          </label>
          <select
            value={form.matiere_id}
            onChange={(e) => setForm({ ...form, matiere_id: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-encre-900/20 font-body"
          >
            <option value="">—</option>
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chargement && !apercu && (
        <p className="font-body text-sm text-encre-900/50 mb-6">Lecture du fichier…</p>
      )}

      {apercu && (
        <div className="mb-8">
          <p className="font-body text-sm font-medium mb-3">
            {apercu.questions.length} question(s) détectée(s)
            {apercu.domaineDetecte && (
              <span className="text-encre-900/50"> · matière du fichier : {apercu.domaineDetecte}</span>
            )}
          </p>

          {apercu.errors.length > 0 && (
            <ul className="mb-4 flex flex-col gap-1">
              {apercu.errors.map((e, i) => (
                <li key={i} className="font-body text-xs text-red-600">
                  ⚠ {e}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto pr-1">
            {apercu.questions.slice(0, 30).map((q, i) => (
              <div key={i} className="p-4 rounded-xl border border-encre-900/15 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-body text-sm font-medium">
                    {i + 1}. {q.enonce}
                  </p>
                  {q.difficulte && (
                    <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-encre-900/5 text-encre-900/60">
                      {q.difficulte}
                    </span>
                  )}
                </div>
                <p className="font-body text-sm text-green-700">{q.reponse}</p>
              </div>
            ))}
            {apercu.questions.length > 30 && (
              <p className="font-body text-xs text-encre-900/40">
                … et {apercu.questions.length - 30} question(s) de plus (non affichées dans l'aperçu).
              </p>
            )}
          </div>
        </div>
      )}

      {erreur && <p className="font-body text-sm text-red-600 mb-4">{erreur}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => publier(false)}
          disabled={chargement || !apercu}
          className="px-6 py-3 rounded-full border border-encre-900/20 font-body font-medium disabled:opacity-50"
        >
          Enregistrer sans publier
        </button>
        <button
          onClick={() => publier(true)}
          disabled={chargement || !apercu}
          className="px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium disabled:opacity-50"
        >
          Enregistrer et publier
        </button>
      </div>
    </div>
  );
}
