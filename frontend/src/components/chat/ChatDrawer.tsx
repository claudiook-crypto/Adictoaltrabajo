import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send, User, MessageCircle, AlertCircle, Wand2, ShieldBan, ShieldAlert, Loader2 } from 'lucide-react';

interface Mensaje {
  id: number;
  remitente_id: number;
  contenido: string;
  creado_en: string;
  leido: boolean;
}

interface ChatListItem {
  chat_id: number;
  ultimo_mensaje_fecha: string;
  oferta_id: number;
  oferta_titulo: string;
  otro_usuario_id: number;
  otro_usuario_nombre: string;
  otro_usuario_foto: string;
  ultimo_mensaje: string;
  no_leidos: number;
}

export const ChatDrawer = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { token, user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatListItem | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  
  const msgsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) cargarChats();
  }, [isOpen]);

  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
      const { receptorId, ofertaId, nombre, foto, ofertaTitulo } = e.detail;
      // Crear un chat virtual para enviar el primer msj
      const virtualChat: ChatListItem = {
        chat_id: 0, // 0 indica que aún no está creado en DB
        ultimo_mensaje_fecha: new Date().toISOString(),
        oferta_id: ofertaId,
        oferta_titulo: ofertaTitulo || 'Oferta seleccionada',
        otro_usuario_id: receptorId,
        otro_usuario_nombre: nombre || 'Usuario',
        otro_usuario_foto: foto || '',
        ultimo_mensaje: '',
        no_leidos: 0
      };
      
      // Buscar si ya existe el chat en la lista cargada
      const existente = chats.find(c => c.otro_usuario_id === receptorId && (c.oferta_id === ofertaId || !c.oferta_id));
      
      setActiveChat(existente || virtualChat);
    };

    window.addEventListener('open-chat' as any, handleOpenChat);
    return () => window.removeEventListener('open-chat' as any, handleOpenChat);
  }, [chats]);

  useEffect(() => {
    if (activeChat) {
      if (activeChat.chat_id > 0) {
        cargarMensajes(activeChat.chat_id);
      } else {
        setMensajes([]);
      }
      setSugerencias([]);
    }
  }, [activeChat]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const cargarChats = async () => {
    setLoadingChats(true);
    try {
      const res = await fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setChats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChats(false);
    }
  };

  const cargarMensajes = async (chatId: number) => {
    setLoadingMsg(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setMensajes(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsg(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const res = await fetch('/api/chats/mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: activeChat.chat_id,
          receptorId: activeChat.otro_usuario_id,
          ofertaId: activeChat.oferta_id,
          contenido: newMessage
        })
      });
      if (res.ok) {
        setNewMessage('');
        cargarMensajes(activeChat.chat_id);
        cargarChats();
      } else {
        const d = await res.json();
        alert(d.message || 'Error al enviar');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pedirSugerencias = async () => {
    if (!activeChat || user?.role !== 'oferente') return;
    setLoadingSug(true);
    try {
      const res = await fetch('/api/chats/sugerir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ofertaId: activeChat.oferta_id,
          postulanteId: activeChat.otro_usuario_id
        })
      });
      if (res.ok) {
        const d = await res.json();
        setSugerencias(d.sugerencias || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSug(false);
    }
  };

  const bloquearUsuario = async (bloqueadoId: number) => {
    if (!confirm('¿Estás seguro de que deseas bloquear a este usuario? No podrá enviarte más mensajes.')) return;
    try {
      const res = await fetch('/api/chats/bloquear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bloqueadoId })
      });
      if (res.ok) {
        alert('Usuario bloqueado exitosamente.');
        setActiveChat(null);
        cargarChats();
      } else {
        alert('Error al bloquear usuario.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50">
      <div className="w-full max-w-4xl bg-dark-900 h-full shadow-2xl flex flex-col md:flex-row transform transition-transform">
        
        {/* Lista de Chats (Sidebar) */}
        <div className={`w-full md:w-1/3 border-r border-dark-700 flex flex-col h-full ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-dark-700 flex justify-between items-center bg-dark-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle size={20} className="text-primary-500" /> Mensajes
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white md:hidden">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-4 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No tienes conversaciones aún.
              </div>
            ) : (
              chats.map(chat => (
                <div key={chat.chat_id} 
                     onClick={() => setActiveChat(chat)}
                     className={`p-4 border-b border-dark-800 cursor-pointer hover:bg-dark-800 transition-colors ${activeChat?.chat_id === chat.chat_id ? 'bg-dark-800 border-l-4 border-primary-500' : ''}`}>
                  <div className="flex items-center gap-3">
                    {chat.otro_usuario_foto ? (
                      <img src={chat.otro_usuario_foto} alt={chat.otro_usuario_nombre} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-gray-400">
                        <User size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h4 className="text-white font-medium truncate text-sm">{chat.otro_usuario_nombre}</h4>
                        {chat.no_leidos > 0 && <span className="bg-primary-500 text-white text-[10px] px-2 py-0.5 rounded-full">{chat.no_leidos}</span>}
                      </div>
                      <p className="text-xs text-primary-400 truncate mb-1">Para: {chat.oferta_titulo}</p>
                      <p className="text-xs text-gray-500 truncate">{chat.ultimo_mensaje || 'Sin mensajes'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de Mensajes */}
        <div className={`w-full md:w-2/3 flex flex-col h-full ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-dark-950 relative">
               <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white hidden md:block">
                <X size={24} />
              </button>
              <MessageCircle size={48} className="mb-4 opacity-50" />
              <p>Selecciona una conversación</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-dark-700 bg-dark-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="text-gray-400 hover:text-white md:hidden mr-2">
                    <X size={20} />
                  </button>
                  {activeChat.otro_usuario_foto ? (
                    <img src={activeChat.otro_usuario_foto} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-gray-400">
                      <User size={20} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold">{activeChat.otro_usuario_nombre}</h3>
                    <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-md">{activeChat.oferta_titulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => bloquearUsuario(activeChat.otro_usuario_id)} title="Bloquear usuario" className="text-gray-500 hover:text-red-400 transition-colors p-2">
                    <ShieldBan size={18} />
                  </button>
                  <button onClick={onClose} className="text-gray-400 hover:text-white hidden md:block p-2">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Mensajes List */}
              <div className="flex-1 overflow-y-auto p-4 bg-dark-950 space-y-4">
                {loadingMsg ? (
                  <div className="text-center text-gray-500 mt-10"><Loader2 className="animate-spin mx-auto" /></div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10 text-sm bg-dark-900 border border-dark-800 p-4 rounded-xl mx-4">
                    <p>No hay mensajes todavía.</p>
                    {user?.role === 'oferente' && (
                       <p className="mt-2 text-primary-400">¡Escríbele para invitarlo a conversar sobre el puesto!</p>
                    )}
                  </div>
                ) : (
                  mensajes.map((m, i) => {
                    const isMe = m.remitente_id === user?.id;
                    return (
                      <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isMe ? 'bg-primary-600 text-white rounded-br-none' : 'bg-dark-800 text-gray-200 border border-dark-700 rounded-bl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{m.contenido}</p>
                          <span className={`text-[10px] mt-1 block ${isMe ? 'text-primary-200 text-right' : 'text-gray-500'}`}>
                            {new Date(m.creado_en).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={msgsEndRef} />
              </div>

              {/* IA Sugerencias (Solo Oferente) */}
              {user?.role === 'oferente' && (
                <div className="bg-dark-900 border-t border-dark-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Wand2 size={12} className="text-purple-400" /> Asistente de reclutamiento IA
                    </span>
                    <button onClick={pedirSugerencias} disabled={loadingSug} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                      {loadingSug ? 'Generando...' : 'Sugerir mensaje inicial'}
                    </button>
                  </div>
                  {sugerencias.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {sugerencias.map((sug, i) => (
                        <button key={i} onClick={() => setNewMessage(sug)}
                          className="text-left text-xs bg-dark-800 border border-purple-900/30 hover:border-purple-500/50 text-gray-300 p-2 rounded-lg min-w-[200px] max-w-[250px] whitespace-normal flex-shrink-0 transition-colors">
                          "{sug}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-dark-800 border-t border-dark-700 flex items-end gap-2">
                <textarea 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white outline-none focus:border-primary-500 resize-none max-h-32 text-sm"
                  rows={Math.min(4, Math.max(1, newMessage.split('\n').length))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button onClick={handleSend} disabled={!newMessage.trim()}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white p-3 rounded-xl transition-colors h-[46px] flex items-center justify-center">
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
