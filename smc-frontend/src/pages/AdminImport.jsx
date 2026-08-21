import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminImport() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();

  const [filieres, setFilieres] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [form, setForm] = useState({
    titre: '',
    niveau: 'Licence',
    filiere_id: '',
    matiere_id: '',
    prix: '',
  });
  const [texte, setTexte] = useState('');
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    api.listerFilieres().then(setFilieres).catch(() => {});
    api.listerMatieres().then(setMatieres).catch(() => {});
  }, []);

  async function genererApercu() {
    setErreur(null);
    setChargement(true);
    try {
      const result = await api.previewImport(token, texte);
      setApercu(result);
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
          <label className="block font-body text-sm font-medium mb-1">Matière</label>
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

      <label className="block font-body text-sm font-medium mb-1">
        Texte du QCM (format QCMmaker)
      </label>
      <p className="font-mono text-xs text-encre-900/50 mb-2">
        Q: Énoncé de la question / A) Option B) Option * C) Option D) Option (étoile = bonne
        réponse)
      </p>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={12}
        className="w-full px-4 py-3 rounded-lg border border-encre-900/20 font-mono text-sm mb-4"
        placeholder={'Q: Quelle est la capitale du Bénin ?\nA) Cotonou\nB) Porto-Novo *\nC) Parakou'}
      />

      <button
        onClick={genererApercu}
        disabled={!texte || chargement}
        className="font-body text-sm text-indigo-600 underline mb-8 disabled:opacity-40"
      >
        Générer l'aperçu
      </button>

      {apercu && (
        <div className="mb-8">
          <p className="font-body text-sm font-medium mb-3">
            {apercu.questions.length} question(s) détectée(s)
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

          <div className="flex flex-col gap-3">
            {apercu.questions.map((q, i) => (
              <div key={i} className="p-4 rounded-xl border border-encre-900/15 bg-white">
                <p className="font-body text-sm font-medium mb-2">
                  {i + 1}. {q.enonce}
                </p>
                <ul className="font-body text-sm text-encre-900/70 flex flex-col gap-1">
                  {q.options.map((opt, oi) => (
                    <li key={oi} className={oi === q.indexBonneReponse ? 'text-green-700' : ''}>
                      {oi === q.indexBonneReponse ? '✓ ' : '– '}
                      {opt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {erreur && <p className="font-body text-sm text-red-600 mb-4">{erreur}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => publier(false)}
          disabled={chargement}
          className="px-6 py-3 rounded-full border border-encre-900/20 font-body font-medium disabled:opacity-50"
        >
          Enregistrer sans publier
        </button>
        <button
          onClick={() => publier(true)}
          disabled={chargement}
          className="px-6 py-3 rounded-full bg-indigo-600 text-creme-50 font-body font-medium disabled:opacity-50"
        >
          Enregistrer et publier
        </button>
      </div>
    </div>
  );
}
