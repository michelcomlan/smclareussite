import React from 'react';

export default function Filtres({ filieres, matieres, valeurs, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 mb-10">
      <select
        value={valeurs.niveau}
        onChange={(e) => onChange({ ...valeurs, niveau: e.target.value })}
        className="px-4 py-2 rounded-full border border-encre-900/20 bg-white font-body text-sm focus-visible:outline-none"
        aria-label="Filtrer par niveau"
      >
        <option value="">Tous niveaux</option>
        <option value="Licence">Licence</option>
        <option value="Master">Master</option>
      </select>

      <select
        value={valeurs.filiere_id}
        onChange={(e) => onChange({ ...valeurs, filiere_id: e.target.value })}
        className="px-4 py-2 rounded-full border border-encre-900/20 bg-white font-body text-sm focus-visible:outline-none"
        aria-label="Filtrer par filière"
      >
        <option value="">Toutes filières</option>
        {filieres.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nom}
          </option>
        ))}
      </select>

      <select
        value={valeurs.matiere_id}
        onChange={(e) => onChange({ ...valeurs, matiere_id: e.target.value })}
        className="px-4 py-2 rounded-full border border-encre-900/20 bg-white font-body text-sm focus-visible:outline-none"
        aria-label="Filtrer par matière"
      >
        <option value="">Toutes matières</option>
        {matieres.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nom}
          </option>
        ))}
      </select>
    </div>
  );
}
