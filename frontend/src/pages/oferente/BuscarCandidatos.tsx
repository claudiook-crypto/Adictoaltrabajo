import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Send, User, Star, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Candidato {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  habilidades: string | null;
  experiencia: string | null;
  emailParcial: string;
  matchScore?: number;
  matchRazon?: string;
}

const BuscarCandidatos = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [profesion, setProfesion] = useState('');
  const [experienciaFilter, setExperienciaFilter] = useState('');
  const [descripcionOferta, setDescripcionOferta] = useState('');
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [sugerenciaEnviada, setSugerenciaEnviada] = useState<Record<number, boolean>>({});
  const [showConfig, setShowConfig] = useState(true);

  useEffect(() => {
    // Cargar sugerencias ya enviadas al montar
    const cargarEnviadas = async () => {
      try {
        const res = await fetch('/api/notifications/sugerencias/enviadas', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const map: Record<number, boolean> = {};
          data.postulanteIds.forEach((id: number) => { map[id] = true; });
          setSugerenciaEnviada(map);
        }
      } catch { /* silencioso */ }
    };
    if (token) cargarEnviadas();
  }, [token]);
  const [error, setError] = useState('');

  const buscar = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (habilidades) params.set('habilidades', habilidades);
      if (profesion) params.set('profesion', profesion);
      if (experienciaFilter) params.set('experienciaFilter', experienciaFilter);

      const resp = await fetch(`/api/candidates/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Error en la búsqueda');
      const data = await resp.json();
      setCandidatos(data);
    } catch (e) {
      setError('Error al buscar candidatos');
    } finally {
      setLoading(false);
    }
  };

  const hacerMatchIA = async () => {
    if (!descripcionOferta.trim()) {
      setError('Escribí una descripción del puesto para que la IA haga el match');
      return;
    }
    if (candidatos.length === 0) {
      setError('Primero buscá candidatos');
      return;
    }
    setMatchLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/match/candidatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ofertaDescripcion: descripcionOferta, candidatos })
      });
      if (resp.ok) {
        const ranked = await resp.json();
        setCandidatos(ranked);
      }
    } catch {
      setError('Error al calcular match con IA');
    } finally {
      setMatchLoading(false);
    }
  };

  const enviarSugerencia = async (postulanteId: number) => {
    try {
      const resp = await fetch('/api/notifications/sugerencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ postulanteId })
      });
      if (resp.ok || resp.status === 409) {
        setSugerenciaEnviada(prev => ({ ...prev, [postulanteId]: true }));
      }
    } catch {
      // silencioso
    }
  };

  const getMatchColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMatchBg = (score?: number) => {
    if (!score) return 'border-dark-700';
    if (score >= 80) return 'border-green-500/40 bg-green-900/10';
    if (score >= 60) return 'border-yellow-500/40 bg-yellow-900/10';
    return 'border-dark-700';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Search size={24} className="text-primary-500" /> Buscar Candidatos
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Explorá perfiles públicos de postulantes. La IA puede ayudarte a encontrar el mejor match.</p>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Volver a Solicitudes
        </button>
      </div>

      {/* Panel de búsqueda */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl mb-6 overflow-hidden">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full px-6 py-4 flex justify-between items-center text-white font-medium hover:bg-dark-700/30 transition-colors"
        >
          <span className="flex items-center gap-2"><Search size={18} /> Filtros de búsqueda</span>
          {showConfig ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showConfig && (
          <div className="px-6 pb-6 space-y-5 border-t border-dark-700 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Palabra clave</label>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Nombre, habilidad, tecnología..."
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Habilidades</label>
                <input value={habilidades} onChange={e => setHabilidades(e.target.value)}
                  placeholder="Ej: React, Excel, Electricidad..."
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Profesión</label>
                <input value={profesion} onChange={e => setProfesion(e.target.value)}
                  placeholder="Ej: Desarrollador, Albañil..."
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Experiencia</label>
                <input value={experienciaFilter} onChange={e => setExperienciaFilter(e.target.value)}
                  placeholder="Ej: 5 años, Senior..."
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm"
                />
              </div>
            </div>

            <button onClick={buscar} disabled={loading}
              className="w-full md:w-auto px-8 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center gap-2">
              {loading ? <><span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> Buscando...</> : <><Search size={16} /> Buscar candidatos</>}
            </button>

            {/* Match IA */}
            {candidatos.length > 0 && (
              <div className="border-t border-dark-700 pt-5">
                <label className="block text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                  <Sparkles size={16} /> Match con IA — describí el puesto que ofrecés
                </label>
                <textarea
                  value={descripcionOferta}
                  onChange={e => setDescripcionOferta(e.target.value)}
                  rows={3}
                  placeholder="Ej: Buscamos electricista matriculado con experiencia en instalaciones industriales, disponibilidad full-time, zona Villa del Rosario..."
                  className="w-full bg-dark-900 border border-yellow-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 text-sm resize-none"
                />
                <button onClick={hacerMatchIA} disabled={matchLoading}
                  className="mt-3 px-6 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50">
                  {matchLoading ? <><span className="animate-spin border-2 border-yellow-400 border-t-transparent rounded-full w-4 h-4" /> Calculando...</> : <><Sparkles size={16} /> Calcular Match IA</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 mb-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Resultados */}
      {candidatos.length > 0 && (
        <div>
          <p className="text-gray-400 text-sm mb-4">{candidatos.length} candidato(s) encontrado(s){candidatos[0]?.matchScore !== undefined ? ' • Ordenados por Match IA' : ''}</p>
          <div className="space-y-4">
            {candidatos.map((c, idx) => (
              <div key={c.id} className={`bg-dark-800 border rounded-xl p-6 transition-colors ${getMatchBg(c.matchScore)}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-xl font-bold text-gray-300 border border-dark-600">
                      {c.nombre[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{c.nombre} {c.apellido}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail size={13} className="text-gray-500" />
                        <span className="text-gray-500 text-sm">{c.emailParcial}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {c.matchScore !== undefined && (
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getMatchColor(c.matchScore)}`}>{c.matchScore}%</p>
                        <p className="text-[10px] text-gray-500 uppercase">Match IA</p>
                      </div>
                    )}
                    {idx === 0 && c.matchScore && c.matchScore >= 80 && (
                      <span className="bg-green-900/30 text-green-400 border border-green-500/30 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Star size={10} /> Top Match
                      </span>
                    )}
                  </div>
                </div>

                {(c.habilidades || c.experiencia) && (
                  <div className="mt-4 space-y-2">
                    {c.habilidades && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-medium">Habilidades</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {c.habilidades.split(',').slice(0, 6).map((h, i) => (
                            <span key={i} className="bg-dark-900 text-gray-300 text-xs px-2 py-1 rounded-full border border-dark-600">{h.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {c.experiencia && (
                      <p className="text-gray-400 text-sm"><span className="text-gray-500">Experiencia:</span> {c.experiencia}</p>
                    )}
                    {c.matchRazon && (
                      <p className="text-yellow-400/80 text-xs italic">💡 {c.matchRazon}</p>
                    )}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  {sugerenciaEnviada[c.usuario_id] ? (
                    <span className="text-green-400 text-sm flex items-center gap-2">
                      ✓ Sugerencia enviada — el candidato recibirá una notificación
                    </span>
                  ) : (
                    <button
                      onClick={() => enviarSugerencia(c.usuario_id)}
                      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
                    >
                      <Send size={15} /> Enviar Sugerencia
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {candidatos.length === 0 && !loading && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center">
          <User size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Usá los filtros para buscar candidatos</p>
          <p className="text-gray-500 text-sm mt-2">Una vez que encuentres perfiles, podés usar la IA para hacer match con tu oferta</p>
        </div>
      )}
    </div>
  );
};

export default BuscarCandidatos;

