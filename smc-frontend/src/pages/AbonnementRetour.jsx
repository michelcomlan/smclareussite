import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';

const INTERVALLE_POLLING_MS = 3000;
const TIMEOUT_POLLING_MS = 2 * 60 * 1000; // 2 minutes

export default function AbonnementRetour() {
  const [searchParams] = useSearchParams();
  const abonnementId = searchParams.get('abonnement_id');
  const [statut, setStatut] = useState('en_attente');
  const [code, setCode] = useState(null);
  const [dateFin, setDateFin] = useState(null);
  const [erreur, setErreur] = useState(null);
  const debutRef = useRef(Date.now());

  useEffect(() => {
    if (!abonnementId) {
      setErreur('Référence de paiement manquante.');
      return;
    }

    let annule = false;

    async function verifier() {
      try {
        const data = await api.statutAbonnement(abonnementId);
        if (annule) return;

        if (data.statut === 'actif') {
          setStatut('actif');
          setCode(data.code_abonnement);
          setDateFin(data.date_fin);
          sessionStorage.removeItem('smc_abonnement_en_attente');
          return;
        }

        if (data.statut === 'echoue') {
          setStatut('echoue');
          return;
        }

        if (Date.now() - debutRef.current > TIMEOUT_POLLING_MS) {
          setStatut('timeout');
          return;
        }
        setTimeout(verifier, INTERVALLE_POLLING_MS);
      } catch (err) {
        if (!annule) setErreur(err.message);
      }
    }

    verifier();
    return () => {
      annule = true;
    };
  }, [abonnementId]);

  const dateFormatee = dateFin
    ? new Date(dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <section className="max-w-lg mx-auto px-6 py-24 text-center">
      {erreur && <p className="font-body text-red-600">{erreur}</p>}

      {!erreur && statut === 'en_attente' && (
        <>
          <div className="w-12 h-12 mx-auto mb-6 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <h1 className="font-display text-2xl mb-2">Confirmation du paiement…</h1>
          <p className="font-body text-encre-900/60">
            Cela peut prendre quelques secondes. Ne fermez pas cette page.
          </p>
        </>
      )}

      {!erreur && statut === 'actif' && (
        <>
          <p className="font-mono text-xs uppercase tracking-widest text-indigo-600 mb-4">
            Abonnement activé
          </p>
          <h1 className="font-display text-3xl mb-6">Bienvenue dans SMC la Réussite !</h1>

          <div className="p-6 rounded-xl bg-indigo-950 text-creme-50 mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-or-400 mb-2">
              Votre code d'abonnement
            </p>
            <p className="font-mono text-2xl tracking-widest">{code}</p>
          </div>

          {dateFormatee && (
            <p className="font-body text-encre-900/60 mb-8">Valable jusqu'au {dateFormatee}.</p>
          )}

          <Link
            to="/"
            className="inline-block bg-indigo-600 text-creme-50 font-body font-medium px-8 py-3 rounded-full hover:bg-indigo-950 transition-colors"
          >
            Accéder à mes QCM
          </Link>
        </>
      )}

      {!erreur && statut === 'echoue' && (
        <>
          <h1 className="font-display text-2xl mb-2 text-red-600">Paiement échoué</h1>
          <p className="font-body text-encre-900/60 mb-6">
            Le paiement n'a pas pu être confirmé. Aucun montant ne devrait avoir été débité
            durablement — vérifiez auprès de votre opérateur en cas de doute.
          </p>
          <Link to="/abonnement" className="font-body underline text-indigo-600">
            Réessayer
          </Link>
        </>
      )}

      {!erreur && statut === 'timeout' && (
        <>
          <h1 className="font-display text-2xl mb-2">La confirmation prend plus de temps que prévu</h1>
          <p className="font-body text-encre-900/60">
            Si le paiement a bien été effectué, votre code d'abonnement sera actif d'ici quelques
            minutes.
          </p>
        </>
      )}
    </section>
  );
}
