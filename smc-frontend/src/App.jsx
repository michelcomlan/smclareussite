import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import Catalogue from './pages/Catalogue.jsx';
import QcmDetail from './pages/QcmDetail.jsx';
import PaiementRetour from './pages/PaiementRetour.jsx';
import Quiz from './pages/Quiz.jsx';
import Resultat from './pages/Resultat.jsx';
import RetrouverAchats from './pages/RetrouverAchats.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminQcmListe from './pages/AdminQcmListe.jsx';
import AdminImport from './pages/AdminImport.jsx';

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Le quiz occupe tout l'écran (fond indigo) sans header/footer */}
        <Route path="/quiz/:qcmId" element={<Quiz />} />

        <Route
          path="/*"
          element={
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Catalogue />} />
                  <Route path="/qcm/:id" element={<QcmDetail />} />
                  <Route path="/paiement/retour" element={<PaiementRetour />} />
                  <Route path="/resultat/:qcmId" element={<Resultat />} />
                  <Route path="/retrouver" element={<RetrouverAchats />} />

                  <Route path="/admin">
                    <Route index element={<AdminLogin />} />
                    <Route element={<AdminLayout />}>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="qcm" element={<AdminQcmListe />} />
                      <Route path="import" element={<AdminImport />} />
                    </Route>
                  </Route>
                </Routes>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </AdminAuthProvider>
  );
}
