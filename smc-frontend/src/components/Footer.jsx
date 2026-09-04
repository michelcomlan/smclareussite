import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-indigo-950 text-creme-50/80 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm font-body">
        <div>
          <p className="font-display text-base text-creme-50 mb-1">SMC la Réussite</p>
          <p>Dr SEDONOU Michel Comlan</p>
          <p>01 97 96 84 70 · sedonoumichel@gmail.com</p>
        </div>
        <div className="flex flex-col gap-1">
          <Link to="/mes-qcm" className="hover:text-or-400 transition-colors">
            Mes QCM
          </Link>
          <Link to="/admin" className="hover:text-or-400 transition-colors">
            Espace administrateur
          </Link>
        </div>
      </div>
    </footer>
  );
}
