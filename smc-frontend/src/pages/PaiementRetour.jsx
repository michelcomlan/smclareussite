import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';

const INTERVALLE_POLLING_MS = 3000;
const TIMEOUT_POLLING_MS = 2 * 60 * 1000; // 2 minutes

export default function PaiementRetour() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const achatId = searchParams.get('achat_id');
  const [statut, setStatut] = useState('en_attente');
  const [erreur, setErreur] = useState(null);
  const debutRef = useRef(Date.now());

  useEffect(() => {
    if (!achatId) {
      setErreur("Référence de paiement manquante.");
      return;
    }

    let annule = false;

    async function verifier() {
      try {
        const data = await api.statutPaiement(achatId);
        if (annule) return;

        if (data.statut === 'confirme') {
          setStatut('confirme');
          const infos = JSON.parse(sessionStorage.getItem('smc_achat_en_attente') || '{}');
          sessionStorage.removeItem('smc_achat_en_attente');
          // Redirection automatique vers le quiz après un court instant
          setTimeout(() => {
            navigate(
              `/quiz/${infos.qcm_id}?achat_id=${achatId}&token_acces=${data.token_acces}`
            );
          }, 1200);
          return;
        }

        if (data.statut === 'echoue') {
          setStatut('echoue');
          return;
        }

        // Toujours en attente : on continue le polling, sauf timeout
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
  }, [achatId, navigate]);

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

      {!erreur && statut === 'confirme' && (
        <>
          <div className="sceau-niveau mx-auto mb-6 text-indigo-600" aria-hidden="true">
            ✓
          </div>
          <h1 className="font-display text-2xl mb-2">Paiement confirmé</h1>
          <p className="font-body text-encre-900/60">Redirection vers ton QCM…</p>
        </>
      )}

      {!erreur && statut === 'echoue' && (
        <>
          <h1 className="font-display text-2xl mb-2 text-red-600">Paiement échoué</h1>
          <p className="font-body text-encre-900/60 mb-6">
            Le paiement n'a pas pu être confirmé. Aucun montant ne devrait avoir été débité
            durablement — vérifiez auprès de votre opérateur en cas de doute.
          </p>
          <Link to="/" className="font-body underline text-indigo-600">
            Retour au catalogue
          </Link>
        </>
      )}

      {!erreur && statut === 'timeout' && (
        <>
          <h1 className="font-display text-2xl mb-2">La confirmation prend plus de temps que prévu</h1>
          <p className="font-body text-encre-900/60 mb-6">
            Si le paiement a bien été effectué, vous pourrez le retrouver via "Retrouver mes
            achats" avec votre numéro de téléphone dans quelques minutes.
          </p>
          <Link to="/retrouver" className="font-body underline text-indigo-600">
            Retrouver mes achats
          </Link>
        </>
      )}
    </section>
  );
}
