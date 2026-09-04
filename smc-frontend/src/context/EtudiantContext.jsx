import React, { createContext, useContext, useState, useCallback } from 'react';

const EtudiantContext = createContext(null);

export function EtudiantProvider({ children }) {
  const [etudiant, setEtudiant] = useState(() => {
    const stocke = localStorage.getItem('smc_etudiant');
    return stocke ? JSON.parse(stocke) : null;
  });

  const inscrire = useCallback((nouvelEtudiant) => {
    localStorage.setItem('smc_etudiant', JSON.stringify(nouvelEtudiant));
    setEtudiant(nouvelEtudiant);
  }, []);

  const deconnecter = useCallback(() => {
    localStorage.removeItem('smc_etudiant');
    setEtudiant(null);
  }, []);

  return (
    <EtudiantContext.Provider value={{ etudiant, inscrire, deconnecter, estInscrit: !!etudiant }}>
      {children}
    </EtudiantContext.Provider>
  );
}

export function useEtudiant() {
  const ctx = useContext(EtudiantContext);
  if (!ctx) throw new Error('useEtudiant doit être utilisé dans EtudiantProvider');
  return ctx;
}
