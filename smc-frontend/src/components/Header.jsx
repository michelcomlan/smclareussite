import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEtudiant } from '../context/EtudiantContext.jsx';

export default function Header() {
  const { etudiant, deconnecter } = useEtudiant();
  const navigate = useNavigate();

  function seDeconnecter() {
    deconnecter();
    navigate('/');
  }

  return (
    <header className="bg-indigo-950 text-creme-50">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight">
          SMC <span className="text-or-400">la Réussite</span>
        </Link>
        <nav className="flex items-center gap-6 font-body text-sm">
          {etudiant ? (
            <>
              <Link to="/mes-qcm" className="hover:text-or-400 transition-colors">
                {etudiant.prenom}
              </Link>
              <Link to="/mes-cours" className="hover:text-or-400 transition-colors">
                Mes cours
              </Link>
              <button
                type="button"
                onClick={seDeconnecter}
                className="text-creme-50/50 hover:text-or-400 transition-colors underline underline-offset-2"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <Link to="/inscription" className="hover:text-or-400 transition-colors">
              S'inscrire gratuitement
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
