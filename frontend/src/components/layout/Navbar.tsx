import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Settings, LogOut, Bell, X, Crown, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatDrawer } from '../chat/ChatDrawer';

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  contenido: string;
  leida: boolean;
  data_extra: string | null;
  creada_en: string;
}

const Navbar = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (!token || !user) return;
    try {
      const resp = await fetch('/api/notifications/mis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) setNotifs(await resp.json());
    } catch { /* silencioso */ }
  }, [token, user]);

  // Polling cada 30 segundos
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Cerrar al click afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Escuchar evento global para abrir chat
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
      setIsChatOpen(true);
    };
    window.addEventListener('open-chat' as any, handleOpenChat);
    return () => window.removeEventListener('open-chat' as any, handleOpenChat);
  }, []);

  const unreadCount = notifs.filter(n => !n.leida).length;

  const handleNotifClick = async (notif: Notificacion) => {
    // Marcar como leída
    try {
      await fetch(`/api/notifications/${notif.id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
    } catch { /* silencioso */ }

    // Navegar según tipo
    if (notif.tipo === 'interes_oferente' && notif.data_extra) {
      try {
        const extra = JSON.parse(notif.data_extra);
        if (extra.oferenteId) navigate(`/perfil-oferente/${extra.oferenteId}`);
      } catch { /* nada */ }
    } else if (notif.tipo === 'nueva_postulacion') {
      navigate(user?.role === 'oferente' ? '/dashboard-oferente' : '/dashboard-postulante');
    } else if (notif.tipo === 'nueva_oferta') {
      navigate('/dashboard-postulante');
    }
    setShowNotif(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    } catch { /* silencioso */ }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Al hacer click en el logo: si está autenticado cierra sesión, si no va al home
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (token && user) {
      if (window.confirm(`¿Cerrar sesión, ${user?.firstName || user?.name || user?.companyName || 'Usuario'}?`)) {
        logout();
        navigate('/login');
      }
    } else {
      navigate('/');
    }
  };
  
  // Mostrar solo el nombre de pila si es postulante, o el nombre de la empresa, nunca el email
  const displayName = user?.firstName || user?.name || user?.companyName || 'Usuario';

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return new Date(date).toLocaleDateString('es-AR');
  };

  const tipoIcon = (tipo: string) => {
    if (tipo === 'interes_oferente') return '⭐';
    if (tipo === 'nueva_postulacion') return '📋';
    if (tipo === 'nueva_oferta') return '💼';
    return '🔔';
  };

  return (
    <nav className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a
              href="/"
              onClick={handleLogoClick}
              className="flex items-center gap-2 group"
              title={token && user ? `Cerrar sesión (${displayName})` : 'Inicio'}
            >
              <Briefcase className={`h-7 w-7 md:h-8 md:w-8 text-primary-500 ${token && user ? 'group-hover:text-red-400' : 'group-hover:text-primary-400'} transition-colors`} />
              <span className="text-lg md:text-xl font-bold text-white hidden sm:inline">Adicto al Trabajo</span>
            </a>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {token && user ? (
              <>
                <div className="flex items-center gap-2">
                  {user.fotoUrl ? (
                    <img src={user.fotoUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-dark-600 hidden md:block" />
                  ) : null}
                  <span className="text-sm text-gray-300 font-medium hidden md:inline">
                    {user.fotoUrl ? displayName : `Hola, ${displayName}`}
                  </span>
                </div>

                {/* Campana de notificaciones */}
                <div className="relative" ref={panelRef}>
                  <button
                    onClick={() => setShowNotif(!showNotif)}
                    className="relative text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                    title="Notificaciones"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotif && (
                    <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-dark-700 flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm">Notificaciones</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-primary-400 hover:text-primary-300">
                              Marcar todas leídas
                            </button>
                          )}
                          <button onClick={() => setShowNotif(false)} className="text-gray-500 hover:text-white">
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifs.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell size={28} className="text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Sin notificaciones</p>
                          </div>
                        ) : (
                          notifs.map(n => {
                            let extra: any = null;
                            try { if (n.data_extra) extra = JSON.parse(n.data_extra); } catch {}
                            const isInterest = n.tipo === 'interes_oferente' && extra;
                            return (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`w-full px-4 py-3 text-left hover:bg-dark-800 transition-colors border-b border-dark-800 last:border-0 ${!n.leida ? 'bg-dark-800/70' : ''}`}
                            >
                              {isInterest && extra.nombreEmpresa ? (
                                <div className="flex gap-3 items-start">
                                  {extra.avatar ? (
                                    <img src={extra.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-dark-600" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-primary-400 font-bold text-sm">
                                      {extra.nombreEmpresa.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm mb-0.5 ${!n.leida ? 'text-white font-semibold' : 'text-gray-200'}`}>
                                      {extra.nombreEmpresa}
                                    </p>
                                    {extra.ubicacion && (
                                      <p className="text-[11px] text-primary-400/80">📍 {extra.ubicacion}</p>
                                    )}
                                    {extra.descripcion && (
                                      <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{extra.descripcion}</p>
                                    )}
                                    <p className="text-xs text-primary-500 font-medium mt-1">Tocá para ver perfil y enviar CV →</p>
                                    <span className="text-[10px] text-gray-500 mt-1 block">{timeAgo(n.creada_en)}</span>
                                  </div>
                                  {!n.leida && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />}
                                </div>
                              ) : (
                                <div className="flex gap-3 items-start">
                                  <span className="text-lg flex-shrink-0 mt-0.5">{tipoIcon(n.tipo)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm mb-0.5 truncate ${!n.leida ? 'text-white font-medium' : 'text-gray-300'}`}>
                                      {n.titulo}
                                    </p>
                                    <p className="text-xs text-gray-400 line-clamp-2">{n.contenido}</p>
                                    <span className="text-[10px] text-gray-500 mt-1 block">{timeAgo(n.creada_en)}</span>
                                  </div>
                                  {!n.leida && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />}
                                </div>
                              )}
                            </button>
                          );})
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón de Chat */}
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="relative text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                  title="Mensajes"
                >
                  <MessageCircle size={20} />
                </button>

                <Link to={user.role === 'postulante' ? '/dashboard-postulante' : '/dashboard-oferente'}
                  className="text-gray-300 hover:text-white px-2 py-2 rounded-md text-sm font-medium flex items-center gap-1 md:gap-2" title="Mi Panel">
                  <Briefcase size={18} /> <span className="hidden sm:inline">Panel</span>
                </Link>

                <Link to="/planes"
                  className="text-primary-400 hover:text-primary-300 px-2 py-2 rounded-md text-sm font-medium flex items-center gap-1 md:gap-2" title="Suscripciones">
                  <Crown size={18} /> <span className="hidden sm:inline">Planes</span>
                </Link>

                <Link to="/perfil"
                  className="text-gray-300 hover:text-white px-2 py-2 rounded-md text-sm font-medium flex items-center gap-1 md:gap-2 group" title="Ajustes de Perfil">
                  <Settings size={18} className="group-hover:animate-[spin_3s_linear_infinite]" />
                  <span className="hidden sm:inline">Ajustes</span>
                </Link>

                <button onClick={handleLogout}
                  className="bg-dark-700 hover:bg-dark-600 text-white px-3 py-2 md:px-4 rounded-md text-sm font-medium flex items-center gap-1 md:gap-2 transition-colors">
                  <LogOut size={18} /> <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Iniciar Sesión</Link>
                <Link to="/registro" className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-2 md:px-4 rounded-md text-sm font-medium transition-colors shadow-lg">Registrarse</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </nav>
  );
};

export default Navbar;