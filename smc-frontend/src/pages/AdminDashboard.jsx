import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminDashboard() {
  const { token } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    api.dashboardAdmin(token).then(setStats).catch((err) => setErreur(err.message));
  }, [token]);

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Tableau de bord</h1>

      {erreur && <p className="font-body text-red-600">{erreur}</p>}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
          <div className="ticket-qcm p-6 pt-8 relative">
            <span className="ticket-notch-left" aria-hidden="true" />
            <span className="ticket-notch-right" aria-hidden="true" />
            <p className="font-mono text-xs uppercase tracking-widest text-encre-900/50 mb-2">
              Ventes confirmées
            </p>
            <p className="font-display text-4xl">{stats.nombreVentes}</p>
          </div>
          <div className="ticket-qcm p-6 pt-8 relative">
            <span className="ticket-notch-left" aria-hidden="true" />
            <span className="ticket-notch-right" aria-hidden="true" />
            <p className="font-mono text-xs uppercase tracking-widest text-encre-900/50 mb-2">
              Revenu total
            </p>
            <p className="font-display text-4xl text-indigo-600">
              {stats.revenuTotal.toLocaleString('fr-FR')}{' '}
              <span className="text-lg text-encre-900/50">FCFA</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
