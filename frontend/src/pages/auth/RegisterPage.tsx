import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, Upload, Sparkles, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../../contexts/AuthContext';

type CvMethod = null | 'ia' | 'manual';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const googlePreData = (location.state as any)?.googleData;

  const [role, setRole] = useState('postulante');
  const [showEmailForm, setShowEmailForm] = useState(!!googlePreData);
  const [error, setError] = useState('');

  // Auth fields
  const [email, setEmail] = useState(googlePreData?.email || '');
  const [password, setPassword] = useState('');

  // Postulante fields
  const [firstName, setFirstName] = useState(googlePreData?.firstName || '');
  const [lastName, setLastName] = useState(googlePreData?.lastName || '');

  // Oferente fields
  const [companyName, setCompanyName] = useState('');

  // Terms
  const [acceptTerms, setAcceptTerms] = useState(false);

  // CV modal state (after registration for postulantes)
  const [showCvModal, setShowCvModal] = useState(false);
  const [cvMethod, setCvMethod] = useState<CvMethod>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvSuccess, setCvSuccess] = useState(false);
  const [registeredToken, setRegisteredToken] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!acceptTerms) {
      setError('Debés aceptar las Condiciones de uso y Políticas de privacidad.');
      return;
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, firstName, lastName, companyName, zone: 'Villa del Rosario' }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'ALREADY_REGISTERED') {
          setError('');
          setError(data.message);
        } else {
          setError(data.message || 'Error al registrarse');
        }
        return;
      }

      if (role === 'postulante') {
        // Show CV modal before navigating
        setRegisteredToken(data.token);
        setRegisteredUser(data.user);
        setShowCvModal(true);
      } else {
        login(data.token, data.user);
        navigate('/dashboard-oferente');
      }
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const loginResp = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: decoded.email, name: decoded.name, googleId: decoded.sub }),
      });
      const loginData = await loginResp.json();

      if (loginResp.status === 404) {
        // Not registered → register with Google
        const regResp = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: decoded.email, password: decoded.sub, role,
            firstName: decoded.given_name || '', lastName: decoded.family_name || '',
            companyName: role === 'oferente' ? (decoded.name || '') : '',
            zone: 'Villa del Rosario'
          }),
        });
        const regData = await regResp.json();
        if (!regResp.ok) {
          setError(regData.code === 'ALREADY_REGISTERED' ? regData.message : (regData.message || 'Error al registrarse'));
          return;
        }
        if (role === 'postulante') {
          setRegisteredToken(regData.token);
          setRegisteredUser(regData.user);
          setShowCvModal(true);
        } else {
          login(regData.token, regData.user);
          navigate('/dashboard-oferente');
        }
        return;
      }

      if (!loginResp.ok) {
        setError(loginData.message || 'Error en autenticación');
        return;
      }

      if (loginData.user.role !== role) {
        const requestedRoleName = role === 'oferente' ? 'Empresa/Oferente' : 'Postulante';
        const existingRoleName = loginData.user.role === 'oferente' ? 'Empresa/Oferente' : 'Postulante';
        setError(`Este correo ya está en uso por una cuenta de ${existingRoleName}. Por favor, utilizá otro correo para registrarte como ${requestedRoleName}.`);
        return;
      }

      login(loginData.token, loginData.user);
      navigate(loginData.user.role === 'oferente' ? '/dashboard-oferente' : '/dashboard-postulante');
    } catch {
      setError('Error de conexión con el servidor');
    }
  };

  const handleCvWithIA = async () => {
    if (!cvFile) return;
    setCvLoading(true);
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      const resp = await fetch('/api/cv/parse', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${registeredToken}` },
        body: formData,
      });
      if (resp.ok) {
        const parsed = await resp.json();
        // Save to sessionStorage for ProfilePage to pick up
        sessionStorage.setItem('cvParsed', JSON.stringify(parsed));
        sessionStorage.setItem('cvFileName', cvFile.name);
      }
      setCvSuccess(true);
      setTimeout(() => finishRegistration(), 1500);
    } catch {
      setCvSuccess(true);
      setTimeout(() => finishRegistration(), 1500);
    } finally {
      setCvLoading(false);
    }
  };

  const finishRegistration = () => {
    login(registeredToken, registeredUser);
    navigate('/dashboard-postulante');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 bg-dark-900">

      {/* CV Modal */}
      {showCvModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl p-8">
            {cvSuccess ? (
              <div className="text-center py-8">
                <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h2>
                <p className="text-gray-400">Entrando a tu panel...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary-900/40 p-2 rounded-lg"><FileText className="text-primary-400" size={24} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-white">¿Cómo querés cargar tu CV?</h2>
                    <p className="text-gray-400 text-sm">Podés hacerlo ahora o más tarde desde Ajustes</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {/* Opción IA */}
                  <button
                    onClick={() => setCvMethod('ia')}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all ${cvMethod === 'ia' ? 'border-primary-500 bg-primary-900/20' : 'border-dark-600 bg-dark-900 hover:border-dark-500'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="text-yellow-400" size={22} />
                      <span className="font-bold text-white">Cargar con IA ✨</span>
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Recomendado</span>
                    </div>
                    <p className="text-gray-400 text-sm">Subí tu CV en PDF y la IA completará automáticamente tus datos de perfil (habilidades, experiencia, etc.)</p>
                  </button>

                  {/* Opción manual */}
                  <button
                    onClick={() => setCvMethod('manual')}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all ${cvMethod === 'manual' ? 'border-primary-500 bg-primary-900/20' : 'border-dark-600 bg-dark-900 hover:border-dark-500'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <User className="text-gray-400" size={22} />
                      <span className="font-bold text-white">Cargar manualmente</span>
                    </div>
                    <p className="text-gray-400 text-sm">Completá vos mismo los datos de tu perfil. Podés usar la IA después desde Ajustes cuando quieras.</p>
                  </button>
                </div>

                {cvMethod === 'ia' && (
                  <div className="mb-6">
                    <label className="block w-full border-2 border-dashed border-dark-500 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 transition-colors">
                      <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files && setCvFile(e.target.files[0])} />
                      <Upload className="mx-auto text-gray-400 mb-2" size={28} />
                      {cvFile ? (
                        <p className="text-primary-400 font-medium text-sm">{cvFile.name}</p>
                      ) : (
                        <p className="text-gray-400 text-sm">Tocá para seleccionar tu CV (PDF)</p>
                      )}
                    </label>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={finishRegistration}
                    className="flex-1 py-3 rounded-lg border border-dark-600 text-gray-300 hover:bg-dark-700 text-sm font-medium"
                  >
                    Omitir por ahora
                  </button>

                  {cvMethod === 'ia' ? (
                    <button
                      onClick={handleCvWithIA}
                      disabled={!cvFile || cvLoading}
                      className="flex-1 py-3 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2"
                    >
                      {cvLoading ? (
                        <><span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> Analizando...</>
                      ) : (
                        <><Sparkles size={16} /> Analizar con IA</>
                      )}
                    </button>
                  ) : cvMethod === 'manual' ? (
                    <button onClick={finishRegistration} className="flex-1 py-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm">
                      Continuar
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-xl w-full bg-dark-800 p-8 rounded-xl border border-dark-700 shadow-2xl">
        <h2 className="text-center text-2xl font-bold text-white mb-6">Creá tu cuenta</h2>

        {googlePreData && (
          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-blue-400 text-sm">
              Tu cuenta de Google no estaba registrada. Por favor, elegí tu rol y completá tus datos para crearla.
            </p>
          </div>
        )}

        {/* Role selector */}
        <div className="flex bg-dark-900 rounded-lg p-1 border border-dark-700 mb-8">
          <button type="button" onClick={() => setRole('postulante')}
            className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${role === 'postulante' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <User size={16} /> Soy Postulante
          </button>
          <button type="button" onClick={() => setRole('oferente')}
            className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${role === 'oferente' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Briefcase size={16} /> Soy Empresa/Particular
          </button>
        </div>

        {!showEmailForm ? (
          <div className="space-y-4">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Error con Google')} theme="filled_blue" text="signup_with" shape="rectangular" width="100%" />
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-600"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-dark-800 text-gray-400">O</span></div>
            </div>
            <button onClick={() => setShowEmailForm(true)}
              className="w-full flex justify-center items-center py-2 px-4 border border-dark-500 rounded-md text-sm font-medium text-gray-300 bg-dark-800 hover:bg-dark-700 transition-colors">
              <Mail className="h-5 w-5 mr-2" /> Continuar con correo electrónico
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-red-400 text-sm">{error}</p>
                  {error.includes('ya está registrada') && (
                    <Link to="/login" className="text-primary-400 text-sm underline mt-1 inline-block">
                      Ir a Iniciar Sesión →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {role === 'postulante' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Apellido <span className="text-red-500">*</span></label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Empresa o Particular <span className="text-red-500">*</span></label>
                <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Correo electrónico <span className="text-red-500">*</span></label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" />
            </div>

            {!googlePreData && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña <span className="text-red-500">*</span></label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500" />
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" required checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded bg-dark-900 border-dark-600 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-300">
                Acepto las <a href="/politica-privacidad" className="text-primary-500 hover:underline">Condiciones de uso</a> y <a href="/politica-privacidad" className="text-primary-500 hover:underline">Política de privacidad</a>. <span className="text-red-500">*</span>
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEmailForm(false)}
                className="w-1/3 py-3 border border-dark-600 rounded-md text-sm font-medium text-gray-300 bg-dark-800 hover:bg-dark-700">
                Atrás
              </button>
              <button type="submit" className="w-2/3 py-3 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 shadow-lg">
                Crear cuenta
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-primary-500 hover:text-primary-400">Iniciá Sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
