import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPostulante from './pages/postulante/DashboardPostulante';
import DashboardOferente from './pages/oferente/DashboardOferente';
import BuscarCandidatos from './pages/oferente/BuscarCandidatos';
import PerfilOferente from './pages/postulante/PerfilOferente';
import ProfilePage from './pages/ProfilePage';
import PlanesPage from './pages/Planes/PlanesPage';
import PoliticaPrivacidad from './pages/PoliticaPrivacidad';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CookieBanner from './components/layout/CookieBanner';
import ProtectedRoute from './components/ProtectedRoute';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '196406899949-your-client-id.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-dark-900 font-inter selection:bg-primary-500/30">
            <Navbar />
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />
                <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />

                {/* Rutas protegidas */}
                <Route path="/dashboard-postulante" element={<ProtectedRoute />}>
                  <Route index element={<DashboardPostulante />} />
                </Route>
                <Route path="/dashboard-oferente" element={<ProtectedRoute />}>
                  <Route index element={<DashboardOferente />} />
                </Route>
                <Route path="/buscar-candidatos" element={<ProtectedRoute />}>
                  <Route index element={<BuscarCandidatos />} />
                </Route>
                <Route path="/perfil-oferente/:id" element={<ProtectedRoute />}>
                  <Route index element={<PerfilOferente />} />
                </Route>
                <Route path="/perfil" element={<ProtectedRoute />}>
                  <Route index element={<ProfilePage />} />
                </Route>
                <Route path="/planes" element={<ProtectedRoute />}>
                  <Route index element={<PlanesPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
            <CookieBanner />
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;