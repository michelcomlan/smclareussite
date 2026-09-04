import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import { EtudiantProvider } from './context/EtudiantContext.jsx';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import Catalogue from './pages/Catalogue.jsx';
import Accueil from './pages/Accueil.jsx';
import QcmDetail from './pages/QcmDetail.jsx';
import PaiementRetour from './pages/PaiementRetour.jsx';
import Quiz from './pages/Quiz.jsx';
import Resultat from './pages/Resultat.jsx';
import RetrouverAchats from './pages/RetrouverAchats.jsx';
import Inscription from './pages/Inscription.jsx';
import Reconnexion from './pages/Reconnexion.jsx';
import ApercuGratuit from './pages/ApercuGratuit.jsx';
import Abonnement from './pages/Abonnement.jsx';
import AbonnementRetour from './pages/AbonnementRetour.jsx';
import MesQcm from './pages/MesQcm.jsx';
import MesCours from './pages/MesCours.jsx';
import CoursDetail from './pages/CoursDetail.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminQcmListe from './pages/AdminQcmListe.jsx';
import AdminImport from './pages/AdminImport.jsx';
import AdminCours from './pages/AdminCours.jsx';
import AdminEtudiants from './pages/AdminEtudiants.jsx';

export default function App() {
  return (
    <AdminAuthProvider>
      <EtudiantProvider>
        <Routes>
          {/* Le quiz et l'aperçu gratuit occupent tout l'écran (fond indigo) sans header/footer */}
          <Route path="/quiz/:qcmId" element={<Quiz />} />
          <Route path="/decouvrir" element={<ApercuGratuit />} />

          <Route
            path="/*"
            element={
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Accueil />} />
                    <Route path="/catalogue" element={<Catalogue />} />
                    <Route path="/inscription" element={<Inscription />} />
                    <Route path="/reconnexion" element={<Reconnexion />} />
                    <Route path="/abonnement" element={<Abonnement />} />
                    <Route path="/abonnement/retour" element={<AbonnementRetour />} />
                    <Route path="/mes-qcm" element={<MesQcm />} />
                    <Route path="/mes-cours" element={<MesCours />} />
                    <Route path="/cours/:id" element={<CoursDetail />} />
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
                        <Route path="cours" element={<AdminCours />} />
                        <Route path="etudiants" element={<AdminEtudiants />} />
                      </Route>
                    </Route>
                  </Routes>
                </main>
                <Footer />
              </div>
            }
          />
        </Routes>
      </EtudiantProvider>
    </AdminAuthProvider>
  );
}
