import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useEtudiant } from '../context/EtudiantContext.jsx';

/** Transforme un lien YouTube classique en URL d'intégration (embed). */
function urlEmbedVideo(url) {
  const idMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (idMatch) return `https://www.youtube.com/embed/${idMatch[1]}`;
  return url; // Vimeo ou autre lien déjà "embeddable" tel quel
}

/** Transforme un lien de document en visionneuse intégrée (sans bouton téléchargement). */
function urlEmbedDocument(url) {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

export default function CoursDetail() {
  const { id } = useParams();
  const { etudiant } = useEtudiant();
  const navigate = useNavigate();

  const [cours, setCours] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!etudiant) {
      navigate('/inscription');
      return;
    }
    api
      .getCours(id, etudiant.id)
      .then(setCours)
      .catch((err) => setErreur(err.message));
  }, [id, etudiant, navigate]);

  if (erreur) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-body text-red-600 mb-6">{erreur}</p>
        <Link to="/mes-cours" className="font-body underline text-indigo-600">
          Retour à mes cours
        </Link>
      </section>
    );
  }

  if (!cours) {
    return (
      <section className="max-w-lg mx-auto px-6 py-24 text-center font-body text-encre-900/60">
        Chargement…
      </section>
    );
  }

  return (
    <section
      className="max-w-4xl mx-auto px-6 py-10"
      onContextMenu={(e) => e.preventDefault()} // dissuade le clic droit → enregistrer
    >
      <Link to="/mes-cours" className="font-body text-sm text-indigo-600 mb-4 inline-block">
        ← Mes cours
      </Link>
      <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-1">
        {cours.chapitre}
      </p>
      <h1 className="font-display text-2xl mb-6">{cours.titre}</h1>

      <div className="rounded-xl overflow-hidden border border-encre-900/15 bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={cours.type === 'video' ? urlEmbedVideo(cours.url) : urlEmbedDocument(cours.url)}
          title={cours.titre}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      <p className="font-body text-xs text-encre-900/40 mt-4">
        Ce contenu est réservé aux abonnés — merci de ne pas le partager en dehors de la
        plateforme.
      </p>
    </section>
  );
}
