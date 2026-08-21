import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('smc_admin_token'));

  const connecter = useCallback((nouveauToken) => {
    localStorage.setItem('smc_admin_token', nouveauToken);
    setToken(nouveauToken);
  }, []);

  const deconnecter = useCallback(() => {
    localStorage.removeItem('smc_admin_token');
    setToken(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ token, connecter, deconnecter, estConnecte: !!token }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans AdminAuthProvider');
  return ctx;
}
