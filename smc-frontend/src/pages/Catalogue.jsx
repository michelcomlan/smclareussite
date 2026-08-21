import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import QcmCard from '../components/QcmCard.jsx';
import Filtres from '../components/Filtres.jsx';

export default function Catalogue() {
  const [qcms, setQcms] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [valeurs, setValeurs] = useState({ niveau: '', filiere_id: '', matiere_id: '' });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    api
      .listerFilieres()
      .then(setFilieres)
      .catch(() => {});
    api
      .listerMatieres()
      .then(setMatieres)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setChargement(true);
    const filtresActifs = Object.fromEntries(
      Object.entries(valeurs).filter(([, v]) => v !== '')
    );
    api
      .listerQcm(filtresActifs)
      .then((data) => {
        setQcms(data);
        setErreur(null);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, [valeurs]);

  const nomFiliere = (id) => filieres.find((f) => f.id === id)?.nom;
  const nomMatiere = (id) => matieres.find((m) => m.id === id)?.nom;

  return (
    <>
      {/* Hero */}
      <section className="bg-indigo-950 text-creme-50">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20">
          <p className="font-mono text-xs uppercase tracking-widest text-or-400 mb-4">
            Révision · Licence &amp; Master
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-medium leading-tight max-w-2xl">
            Réussis tes examens,{' '}
            <span className="text-or-400">un QCM à la fois.</span>
          </h1>
          <p className="mt-5 max-w-xl text-creme-50/75 font-body">
            Des QCM de révision par filière et par matière, payables par Mobile Money.
            Passe le quiz en ligne, obtiens ton score immédiatement.
          </p>
        </div>
      </section>

      {/* Catalogue */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <Filtres filieres={filieres} matieres={matieres} valeurs={valeurs} onChange={setValeurs} />

        {chargement && <p className="font-body text-encre-900/60">Chargement du catalogue…</p>}

        {erreur && (
          <p className="font-body text-red-600">
            Impossible de charger le catalogue pour le moment. Réessayez dans un instant.
          </p>
        )}

        {!chargement && !erreur && qcms.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-xl text-encre-900/70">
              Aucun QCM ne correspond à ces filtres pour l'instant.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {qcms.map((qcm) => (
            <QcmCard
              key={qcm.id}
              qcm={qcm}
              filiereNom={nomFiliere(qcm.filiere_id)}
              matiereNom={nomMatiere(qcm.matiere_id)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
