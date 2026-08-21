import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-indigo-950 text-creme-50">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight">
          SMC <span className="text-or-400">la Réussite</span>
        </Link>
        <nav className="flex items-center gap-6 font-body text-sm">
          <Link to="/" className="hover:text-or-400 transition-colors">
            Catalogue
          </Link>
          <Link to="/retrouver" className="hover:text-or-400 transition-colors">
            Retrouver mes achats
          </Link>
        </nav>
      </div>
    </header>
  );
}
