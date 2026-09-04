import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminImport() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formatImport, setFormatImport] = useState('fiche'); // 'fiche' | 'qcu'

  const [filieres, setFilieres] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [form, setForm] = useState({
    titre: '',
    niveau: 'Licence',
    filiere_id: '',
    matiere_id: '',
    prix: '',
  });
  const [texte, setTexte] = useState(''); // contenu brut du fichier .json (mode fiche)
  const [fichierQcu, setFichierQcu] = useState(null); // File brut (mode qcu, .docx)
  const [nomFichier, setNomFichier] = useState('');
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    api.listerFilieres().then(setFilieres).catch(() => {});
    api.listerMatieres().then(setMatieres).catch(() => {});
  }, []);

  function changerFormat(nouveauFormat) {
    setFormatImport(nouveauFormat);
    setTexte('');
    setFichierQcu(null);
    setNomFichier('');
    setApercu(null);
    setErreur(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function onFichierChoisiFiche(e) {
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

      if (result.matiereSuggeree && !form.matiere_id) {
        setForm((f) => ({ ...f, matiere_id: result.matiereSuggeree.id }));
      }
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

  async function onFichierChoisiQcu(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setNomFichier(fichier.name);
    setFichierQcu(fichier);
    setErreur(null);
    setApercu(null);

    if (!form.titre) {
      const titreSuggere = fichier.name.replace(/\.docx$/i, '').replace(/_/g, ' ');
      setForm((f) => ({ ...f, titre: titreSuggere }));
    }

    setChargement(true);
    try {
      const donneesForm = new FormData();
      donneesForm.append('fichier', fichier);
      const result = await api.previewImportQcu(token, donneesForm);
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
      if (formatImport === 'fiche') {
        if (!texte) {
          setErreur('Choisissez un fichier .json avant de continuer.');
          setChargement(false);
          return;
        }
        await api.creerQcm(token, {
          ...form,
          prix: Number(form.prix),
          filiere_id: form.filiere_id || null,
          matiere_id: form.matiere_id || null,
          texte,
          publie,
        });
      } else {
        if (!fichierQcu) {
          setErreur('Choisissez un fichier .docx avant de continuer.');
          setChargement(false);
          return;
        }
        const donneesForm = new FormData();
        donneesForm.append('fichier', fichierQcu);
        donneesForm.append('titre', form.titre);
        donneesForm.append('niveau', form.niveau);
        donneesForm.append('filiere_id', form.filiere_id || '');
        donneesForm.append('matiere_id', form.matiere_id || '');
        donneesForm.append('prix', String(Number(form.prix)));
        donneesForm.append('publie', String(publie));
        await api.creerQcmQcu(token, donneesForm);
      }
      navigate('/admin/qcm');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl mb-4">Importer un QCM</h1>

      <div className="inline-flex rounded-full border border-encre-900/20 p-1 mb-6">
        <button
          type="button"
          onClick={() => changerFormat('fiche')}
          className={`px-4 py-1.5 rounded-full text-sm font-body font-medium transition-colors ${
            formatImport === 'fiche' ? 'bg-indigo-900 text-white' : 'text-encre-900/60'
          }`}
        >
          Fiches de révision (.json)
        </button>
        <button
          type="button"
          onClick={() => changerFormat('qcu')}
          className={`px-4 py-1.5 rounded-full text-sm font-body font-medium transition-colors ${
            formatImport === 'qcu' ? 'bg-indigo-900 text-white' : 'text-encre-900/60'
          }`}
        >
          Épreuve QCU (.docx)
        </button>
      </div>

      {formatImport === 'fiche' ? (
        <>
          <label className="block font-body text-sm font-medium mb-1">
            Fichier de questions (export QCMmaker, .json)
          </label>
          <p className="font-body text-xs text-encre-900/50 mb-2">
            Chaque question doit avoir au minimum un champ "text" (l'énoncé) et "answer" (la
            réponse). Le quiz proposera de révéler la réponse puis de s'auto-évaluer.
          </p>
        </>
      ) : (
        <>
          <label className="block font-body text-sm font-medium mb-1">
            Fichier Word (.docx) au format épreuve à choix unique
          </label>
          <p className="font-body text-xs text-encre-900/50 mb-2">
            Une ligne par question, suivie de ses choix : préfixez les mauvaises réponses par
            "-" et la bonne réponse par "*". Exemple :<br />
            <span className="font-mono">
              Quelle est la capitale du Bénin ?<br />
              -Cotonou<br />
              *Porto-Novo<br />
              -Parakou
            </span>
          </p>
        </>
      )}

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={formatImport === 'fiche' ? '.json,application/json' : '.docx'}
          onChange={formatImport === 'fiche' ? onFichierChoisiFiche : onFichierChoisiQcu}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-5 py-2.5 rounded-full border border-encre-900/20 font-body font-medium"
        >
          {nomFichier ? 'Changer de fichier' : `Choisir un fichier ${formatImport === 'fiche' ? '.json' : '.docx'}`}
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

          {apercu.errors && apercu.errors.length > 0 && (
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
                {formatImport === 'fiche' ? (
                  <p className="font-body text-sm text-green-700">{q.reponse}</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {q.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={`font-body text-sm ${
                          oi === q.indexBonneReponse ? 'text-green-700 font-medium' : 'text-encre-900/60'
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                        {oi === q.indexBonneReponse ? ' ✓' : ''}
                      </li>
                    ))}
                  </ul>
                )}
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
