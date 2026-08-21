import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminLayout() {
  const { estConnecte, deconnecter } = useAdminAuth();
  const location = useLocation();

  if (!estConnecte) {
    return <Navigate to="/admin" replace />;
  }

  const lienActif = (chemin) =>
    location.pathname === chemin
      ? 'text-indigo-600 font-medium'
      : 'text-encre-900/60 hover:text-indigo-600';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-10">
        <nav className="flex gap-6 font-body text-sm">
          <Link to="/admin/dashboard" className={lienActif('/admin/dashboard')}>
            Tableau de bord
          </Link>
          <Link to="/admin/qcm" className={lienActif('/admin/qcm')}>
            Mes QCM
          </Link>
          <Link to="/admin/import" className={lienActif('/admin/import')}>
            Importer un QCM
          </Link>
        </nav>
        <button onClick={deconnecter} className="font-body text-sm text-encre-900/50 underline">
          Se déconnecter
        </button>
      </div>
      <Outlet />
    </div>
  );
}
