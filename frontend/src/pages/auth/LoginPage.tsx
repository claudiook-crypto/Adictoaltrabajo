import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ExternalLink } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Credenciales inválidas');
        setErrorCode(data.code || '');
        return;
      }

      login(data.token, data.user);
      navigate(data.user.role === 'oferente' ? '/dashboard-oferente' : '/dashboard-postulante');
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: decoded.email, name: decoded.name, googleId: decoded.sub }),
      });
      const data = await response.json();

      if (response.status === 404) {
        navigate('/registro', { state: { googleData: { email: decoded.email, name: decoded.name, firstName: decoded.given_name || '', lastName: decoded.family_name || '' } } });
        return;
      }
      if (!response.ok) {
        setError(data.message || 'Error en autenticación con Google');
        return;
      }
      login(data.token, data.user);
      navigate(data.user.role === 'oferente' ? '/dashboard-oferente' : '/dashboard-postulante');
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-dark-800 p-8 rounded-xl border border-dark-700 shadow-2xl">
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">Iniciar Sesión</h2>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <p className="text-red-400 text-sm">{error}</p>
                  {errorCode === 'NOT_REGISTERED' && (
                    <Link to={`/registro`} className="text-primary-400 text-sm underline mt-1 inline-block">
                      Ir a Registrarse →
                    </Link>
                  )}
                  {errorCode === 'ALREADY_REGISTERED' && (
                    <Link to={`/registro`} className="text-primary-400 text-sm underline mt-1 inline-block">
                      Ir a Registrarse →
                    </Link>
                  )}
                  {errorCode === 'USE_GOOGLE' && (
                    <p className="text-yellow-400 text-xs mt-1">Usá el botón "Acceder con Google" de abajo.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-dark-600 bg-dark-900 placeholder-gray-500 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Correo electrónico"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-dark-600 bg-dark-900 placeholder-gray-500 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Contraseña"
              />
            </div>
          </div>

          <button type="submit" className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-500 focus:outline-none">
            Ingresar
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-600"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-dark-800 text-gray-400">O continuá con</span></div>
          </div>
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Error con Google')} theme="filled_black" text="signin_with" shape="rectangular" width="100%" />
        </div>

        <p className="text-center text-sm text-gray-400">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="font-medium text-primary-500 hover:text-primary-400">Registrate</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
