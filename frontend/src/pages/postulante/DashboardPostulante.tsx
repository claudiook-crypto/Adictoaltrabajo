import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Building, Clock, Search, X, FileText,
  Upload, CheckCircle, Loader2, AlertCircle, RefreshCw, Briefcase
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Oferta {
  id: number;
  titulo: string;
  descripcion: string;
  zona: string;
  modalidad: string;
  tipo_contrato: string;
  experiencia: string;
  categoria: string;
  salario: string;
  salario_valor: number;
  estado: string;
  creado_en: string;
  empresa: string;
  empresa_descripcion: string;
  empresa_usuario_id: number;
}

interface PostulacionHistorial {
  postulacion_id: number;
  estado: string;
  fecha_postulacion: string;
  oferta_id: number;
  titulo: string;
  zona: string;
  modalidad: string;
  salario: string;
  estado_oferta: string;
  tipo?: string;
  cv_url?: string;
  empresa: string;
}

const API = '/api';

const DashboardPostulante = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'buscar' | 'historial'>((sessionStorage.getItem('postulanteTab') as 'buscar' | 'historial') || 'buscar');

  useEffect(() => {
    sessionStorage.setItem('postulanteTab', activeTab);
  }, [activeTab]);

  const [zoneFilter, setZoneFilter]         = useState(searchParams.get('zona') || 'Todas');
  const [queryFilter, setQueryFilter]       = useState(searchParams.get('q') || '');
  const [modalityFilters, setModalityFilters] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [salaryFilter, setSalaryFilter]     = useState('Todos');
  const [expFilter, setExpFilter]           = useState('Todas');

  const [allOfertas, setAllOfertas]         = useState<Oferta[]>([]);
  const [displayedOfertas, setDisplayedOfertas] = useState<Oferta[]>([]);
  const [misPostulaciones, setMisPostulaciones] = useState<PostulacionHistorial[]>([]);

  const [loading, setLoading]               = useState(true);
  const [apiError, setApiError]             = useState('');

  const [selectedOferta, setSelectedOferta] = useState<Oferta | null>(null);
  const [cvFile, setCvFile]                 = useState<File | null>(null);
  const [applying, setApplying]             = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [applyError, setApplyError]         = useState('');

  const profileCvName = sessionStorage.getItem('cvFileName');

  const cargarData = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const [resOfertas, resPostulaciones] = await Promise.all([
        fetch(`${API}/ofertas/publicas`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/ofertas/mis-postulaciones`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (!resOfertas.ok) throw new Error('No se pudieron cargar las ofertas');
      setAllOfertas(await resOfertas.json());
      if (resPostulaciones.ok) setMisPostulaciones(await resPostulaciones.json());
    } catch (e: any) {
      setApiError(e.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargarData(); }, [cargarData]);

  useEffect(() => {
    let filtered = [...allOfertas];
    if (queryFilter) {
      const q = queryFilter.toLowerCase();
      filtered = filtered.filter(o =>
        o.titulo.toLowerCase().includes(q) ||
        (o.empresa || '').toLowerCase().includes(q) ||
        (o.descripcion || '').toLowerCase().includes(q)
      );
    }
    if (modalityFilters.length > 0) filtered = filtered.filter(o => modalityFilters.includes(o.modalidad));
    if (categoryFilter !== 'Todas') filtered = filtered.filter(o => o.categoria === categoryFilter);
    if (salaryFilter !== 'Todos') {
      filtered = filtered.filter(o => {
        if (salaryFilter === 'A convenir / Por obra') return !o.salario_valor || o.salario_valor === 0;
        if (salaryFilter === 'Menos de $200.000')     return o.salario_valor > 0 && o.salario_valor < 200000;
        if (salaryFilter === '$200.000 - $500.000')   return o.salario_valor >= 200000 && o.salario_valor <= 500000;
        if (salaryFilter === 'Más de $500.000')       return o.salario_valor > 500000;
        return true;
      });
    }
    if (expFilter !== 'Todas') filtered = filtered.filter(o => o.experiencia === expFilter);
    if (zoneFilter && zoneFilter !== 'Todas') {
      const deLaZona = filtered.filter(o => o.zona === zoneFilter);
      const otras = filtered.filter(o => o.zona !== zoneFilter);
      filtered = [...deLaZona, ...otras];
    }
    setDisplayedOfertas(filtered);
    setSearchParams({ zona: zoneFilter, q: queryFilter });
  }, [allOfertas, zoneFilter, queryFilter, modalityFilters, categoryFilter, salaryFilter, expFilter]);

  const handleModalityChange = (mod: string) => {
    setModalityFilters(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const handleApply = async () => {
    if (!selectedOferta) return;
    setApplying(true);
    setApplyError('');
    try {
      if (cvFile) {
        const formData = new FormData();
        formData.append('cv', cvFile);
        const cvRes = await fetch('/api/cv/upload', { method: 'POST', body: formData });
        if (!cvRes.ok) throw new Error('Error al subir el CV.');
        const d = await cvRes.json();
        sessionStorage.setItem('cvFileName', cvFile.name);
        const u = JSON.parse(sessionStorage.getItem('user') || '{}');
        u.cvUrl = d.cvUrl;
        sessionStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('storage'));
      }
      const res = await fetch(`${API}/ofertas/${selectedOferta.id}/postular`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al postularse');
      setApplicationSuccess(true);
      cargarData();
      setTimeout(() => { setSelectedOferta(null); setCvFile(null); }, 2500);
    } catch (e: any) {
      setApplyError(e.message || 'Error al enviar la postulación');
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (str: string) => {
    try {
      const d = new Date(str);
      const diff = Date.now() - d.getTime();
      const h = Math.floor(diff / 3600000);
      if (h < 1) return 'Hace un momento';
      if (h < 24) return `Hace ${h} hora${h !== 1 ? 's' : ''}`;
      const day = Math.floor(h / 24);
      if (day === 1) return 'Ayer';
      return `Hace ${day} días`;
    } catch { return str; }
  };

  const yaPostulado = (ofertaId: number) => misPostulaciones.some(p => p.oferta_id === ofertaId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">
      {/* Tabs */}
      <div className="flex gap-1 sm:gap-6 border-b border-dark-700 mb-8">
        <button onClick={() => setActiveTab('buscar')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'buscar' ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Buscar Empleo
        </button>
        <button onClick={() => setActiveTab('historial')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'historial' ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Mis Postulaciones
          {misPostulaciones.length > 0 && (
            <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{misPostulaciones.length}</span>
          )}
        </button>
      </div>

      {/* ══ TAB: BUSCAR ══ */}
      {activeTab === 'buscar' && (
        <div className="flex flex-col md:flex-row gap-8 w-full">
          {/* Sidebar */}
          <div className="w-full md:w-72 flex-shrink-0">
            <div className="bg-dark-800 p-5 rounded-xl border border-dark-700 md:sticky md:top-24 max-h-[85vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-6 text-white flex items-center gap-2"><Search size={20} className="text-primary-500" /> Filtros</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Buscar</label>
                  <input type="text" value={queryFilter} onChange={e => setQueryFilter(e.target.value)} placeholder="Palabra clave..."
                    className="w-full bg-dark-900 border border-dark-600 rounded-md py-2 px-3 text-white outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Zona</label>
                  <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-md py-2 px-3 text-white outline-none focus:border-primary-500">
                    <option value="Todas">Todas las zonas</option>
                    <option value="Villa del Rosario">Villa del Rosario</option>
                    <option value="Luque">Luque</option>
                    <option value="Rincón">Rincón</option>
                    <option value="Remoto">Remoto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Categoría</label>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-md py-2 px-3 text-white outline-none focus:border-primary-500">
                    <option value="Todas">Todas</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Comercio">Comercio / Ventas</option>
                    <option value="Servicios">Servicios / Oficios</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Hogar">Hogar / Cuidados</option>
                    <option value="Administración">Administración</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Salario</label>
                  <select value={salaryFilter} onChange={e => setSalaryFilter(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-md py-2 px-3 text-white outline-none focus:border-primary-500">
                    <option value="Todos">Todos</option>
                    <option value="A convenir / Por obra">A convenir</option>
                    <option value="Menos de $200.000">{'< $200.000'}</option>
                    <option value="$200.000 - $500.000">$200k - $500k</option>
                    <option value="Más de $500.000">{'> $500.000'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Experiencia</label>
                  <select value={expFilter} onChange={e => setExpFilter(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-md py-2 px-3 text-white outline-none focus:border-primary-500">
                    <option value="Todas">Todas</option>
                    <option value="Sin experiencia">Sin experiencia</option>
                    <option value="Menos de 1 año">{'< 1 año'}</option>
                    <option value="1 a 3 años">1 a 3 años</option>
                    <option value="Más de 3 años">{'> 3 años'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Modalidad</label>
                  <div className="space-y-3">
                    {['Presencial', 'Remoto', 'Híbrido'].map(mod => (
                      <label key={mod} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={modalityFilters.includes(mod)} onChange={() => handleModalityChange(mod)}
                          className="w-4 h-4 rounded bg-dark-900 border-dark-600 text-primary-600" />
                        <span className="text-gray-300 group-hover:text-white transition-colors">{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ofertas */}
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-end border-b border-dark-700 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Encontrá tu próximo empleo</h1>
                <p className="text-gray-400">
                  {displayedOfertas.length} resultado{displayedOfertas.length !== 1 ? 's' : ''}
                  {zoneFilter !== 'Todas' ? ` · ${zoneFilter} primero` : ''}
                </p>
              </div>
              <button onClick={cargarData} title="Actualizar" className="p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>

            {apiError && (
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex items-center gap-2 text-red-400">
                <AlertCircle size={18} /> {apiError}
              </div>
            )}

            {loading ? (
              <div className="bg-dark-800 rounded-xl p-10 text-center border border-dark-700">
                <Loader2 className="animate-spin mx-auto mb-3 text-primary-500" size={32} />
                <p className="text-gray-400">Cargando ofertas...</p>
              </div>
            ) : displayedOfertas.length === 0 ? (
              <div className="bg-dark-800 rounded-xl p-10 text-center border border-dark-700">
                <Briefcase size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-lg">No se encontraron resultados.</p>
                <button onClick={() => { setZoneFilter('Todas'); setQueryFilter(''); setModalityFilters([]); setCategoryFilter('Todas'); setSalaryFilter('Todos'); setExpFilter('Todas'); }}
                  className="mt-4 text-primary-500 hover:underline">Limpiar filtros</button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOfertas.map((oferta, index) => {
                  const isPreferred = zoneFilter !== 'Todas' && oferta.zona === zoneFilter;
                  const prevIsPreferred = zoneFilter !== 'Todas' && index > 0 && displayedOfertas[index - 1].zona === zoneFilter;
                  const posted = yaPostulado(oferta.id);

                  return (
                    <div key={oferta.id} className={`bg-dark-800 border ${isPreferred ? 'border-primary-500/50' : 'border-dark-700'} rounded-xl p-6 hover:border-primary-500 transition-colors relative`}>
                      {isPreferred && index === 0 && (
                        <div className="absolute -top-3 left-6 bg-primary-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">Tu zona elegida</div>
                      )}
                      {!isPreferred && prevIsPreferred && (
                        <div className="absolute -top-4 inset-x-0 flex justify-center">
                          <span className="bg-dark-700 text-gray-400 text-xs px-4 py-1 rounded-full border border-dark-600 shadow-md">Otras zonas</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                        <h2 className="text-xl font-bold text-white">{oferta.titulo}</h2>
                        <div className="flex items-center gap-2">
                          {posted && (
                            <span className="bg-green-900/30 text-green-400 border border-green-900/50 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                              <CheckCircle size={12} /> Postulado
                            </span>
                          )}
                          <span className="bg-dark-700 text-gray-300 text-xs px-3 py-1 rounded-full">{oferta.categoria || 'Sin categoría'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1 font-medium text-gray-300"><Building size={16} /> {oferta.empresa || 'Empresa'}</span>
                        <span className={`flex items-center gap-1 ${isPreferred ? 'text-primary-400 font-medium' : ''}`}><MapPin size={16} /> {oferta.zona || '—'}</span>
                        <span className="flex items-center gap-1"><Clock size={16} /> {formatDate(oferta.creado_en)}</span>
                      </div>

                      <p className="text-gray-300 mb-4 text-sm leading-relaxed line-clamp-2">{oferta.descripcion}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {oferta.modalidad && <span className="bg-dark-700 text-gray-300 text-xs px-3 py-1 rounded-full">{oferta.modalidad}</span>}
                        {oferta.experiencia && <span className="bg-dark-700 text-gray-300 text-xs px-3 py-1 rounded-full border border-dark-600">Exp: {oferta.experiencia}</span>}
                        {oferta.salario && <span className="bg-primary-900/30 text-primary-400 border border-primary-900/50 text-xs px-3 py-1 rounded-full font-medium">{oferta.salario}</span>}
                      </div>

                      <div className="flex justify-end">
                        {posted ? (
                          <button disabled className="bg-dark-700 text-green-400 border border-green-900/30 px-6 py-2 rounded-md font-medium cursor-default flex items-center gap-2">
                            <CheckCircle size={18} /> Ya te postulaste
                          </button>
                        ) : (
                          <button onClick={() => { setSelectedOferta(oferta); setApplicationSuccess(false); setCvFile(null); setApplyError(''); }}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-md font-medium transition-colors shadow-lg">
                            Postularme
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: HISTORIAL ══ */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-dark-700 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Historial de Postulaciones</h1>
              <p className="text-gray-400">{misPostulaciones.length} postulación{misPostulaciones.length !== 1 ? 'es' : ''} en tu historial.</p>
            </div>
            <button onClick={cargarData} title="Actualizar" className="p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="bg-dark-800 rounded-xl p-10 text-center border border-dark-700">
              <Loader2 className="animate-spin mx-auto mb-3 text-primary-500" size={32} />
              <p className="text-gray-400">Cargando historial...</p>
            </div>
          ) : misPostulaciones.length === 0 ? (
            <div className="bg-dark-800 rounded-xl p-10 text-center border border-dark-700">
              <FileText size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-lg">Todavía no te postulaste a ningún empleo.</p>
              <button onClick={() => setActiveTab('buscar')} className="mt-4 text-primary-500 hover:underline">Explorar ofertas</button>
            </div>
          ) : (
            <div className="space-y-4">
              {misPostulaciones.map(p => (
                <div key={p.postulacion_id} className="bg-dark-800 border border-dark-700 rounded-xl p-6 hover:border-dark-600 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <h2 className="text-xl font-bold text-white">{p.titulo}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        p.estado === 'Pendiente' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50' :
                        p.estado === 'Aceptado' ? 'bg-green-900/30 text-green-400 border-green-900/50' :
                        'bg-red-900/30 text-red-400 border-red-900/50'
                      }`}>{p.estado}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        p.estado_oferta === 'Activa' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : 'bg-dark-700 text-gray-400 border-dark-600'
                      }`}>Oferta {p.estado_oferta}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Building size={16} /> {p.empresa}</span>
                    {p.zona && <span className="flex items-center gap-1"><MapPin size={16} /> {p.zona}</span>}
                    <span className="flex items-center gap-1"><Clock size={16} /> {formatDate(p.fecha_postulacion)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.modalidad && <span className="bg-dark-700 text-gray-300 text-xs px-3 py-1 rounded-full">{p.modalidad}</span>}
                    {p.salario && <span className="bg-primary-900/30 text-primary-400 border border-primary-900/50 text-xs px-3 py-1 rounded-full font-medium">{p.salario}</span>}
                  </div>
                  <div className="flex justify-end border-t border-dark-700 pt-3 gap-2 sm:gap-3">
                      <label className="text-primary-400 hover:text-primary-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer flex items-center justify-center">
                        Modificar CV
                        <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const formData = new FormData();
                            formData.append('cv', file);
                            try {
                              const token = sessionStorage.getItem('token');
                              const res = await fetch('/api/cv/upload', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: formData
                              });
                              if (!res.ok) throw new Error('Error al subir CV');
                              const data = await res.json();
                              
                              const updateRes = await fetch(`/api/ofertas/postulaciones/${p.postulacion_id}/cv`, {
                                method: 'PUT',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}` 
                                },
                                body: JSON.stringify({ cvUrl: data.cvUrl, tipo: p.tipo || 'postulacion' })
                              });
                              
                              if (updateRes.ok) {
                                alert('CV actualizado correctamente para esta postulación.');
                                cargarData();
                              } else {
                                alert('Error al actualizar el CV.');
                              }
                            } catch (error) {
                              alert('Error de red al actualizar CV.');
                            }
                          }
                        }} />
                      </label>
                      <button 
                        onClick={async () => {
                        if (confirm('¿Estás seguro de que quieres cancelar esta postulación?')) {
                          try {
                            const res = await fetch(`${API}/ofertas/postulaciones/${p.postulacion_id}`, {
                              method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) cargarData();
                            else alert('Error al cancelar');
                          } catch {
                            alert('Error al cancelar');
                          }
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-dark-700 transition-colors">
                      Cancelar Postulación
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Postulación ── */}
      {selectedOferta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button onClick={() => setSelectedOferta(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
            <div className="p-6 sm:p-8">
              {applicationSuccess ? (
                <div className="text-center py-12">
                  <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">¡Postulación enviada!</h2>
                  <p className="text-gray-400">El oferente recibirá una notificación con tu perfil.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">Postularse a {selectedOferta.titulo}</h2>
                  <p className="text-gray-400 mb-6 flex items-center gap-2"><Building size={16} /> {selectedOferta.empresa}</p>

                  <div className="bg-dark-900 rounded-lg p-5 mb-6 border border-dark-700">
                    <h3 className="text-lg font-bold text-white mb-2">Sobre el Empleo</h3>
                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">{selectedOferta.descripcion}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedOferta.zona && <div><span className="text-gray-500">Zona:</span> <span className="text-gray-300">{selectedOferta.zona}</span></div>}
                      {selectedOferta.modalidad && <div><span className="text-gray-500">Modalidad:</span> <span className="text-gray-300">{selectedOferta.modalidad}</span></div>}
                      {selectedOferta.experiencia && <div><span className="text-gray-500">Experiencia:</span> <span className="text-gray-300">{selectedOferta.experiencia}</span></div>}
                      {selectedOferta.salario && <div><span className="text-gray-500">Salario:</span> <span className="text-primary-400 font-medium">{selectedOferta.salario}</span></div>}
                    </div>
                    {selectedOferta.empresa_descripcion && (
                      <>
                        <h3 className="text-lg font-bold text-white mb-2 pt-4 border-t border-dark-800">Sobre la Empresa</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{selectedOferta.empresa_descripcion}</p>
                      </>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-3">Tu CV</h3>
                    {(profileCvName && !cvFile) ? (
                      <div className="bg-dark-900 border border-primary-900/50 rounded-lg p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary-900/30 p-2 rounded-lg text-primary-500"><FileText size={24} /></div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">CV de tu perfil</p>
                            <p className="text-gray-400 text-xs">{profileCvName}</p>
                          </div>
                        </div>
                        <div className="border-t border-dark-700 pt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">¿CV distinto para esta oferta?</span>
                          <label className="text-primary-400 hover:text-primary-300 text-xs font-medium cursor-pointer">
                            Cargar otro
                            <input type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) setCvFile(e.target.files[0]); }} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-dark-600 rounded-lg p-5 text-center hover:bg-dark-700/50 transition-colors">
                        <Upload className="mx-auto text-gray-500 mb-2" size={24} />
                        <p className="text-sm text-white mb-2">{cvFile ? 'CV seleccionado' : 'Subir un PDF (opcional)'}</p>
                        <label className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer inline-block mb-3">
                          Examinar
                          <input type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) setCvFile(e.target.files[0]); }} />
                        </label>
                        {cvFile && (
                          <div className="flex items-center justify-center gap-2">
                            <FileText size={16} className="text-primary-400" />
                            <p className="text-primary-400 text-sm font-medium">{cvFile.name}</p>
                            <button onClick={() => setCvFile(null)} className="text-red-400 hover:text-red-300 text-xs ml-2">Quitar</button>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-gray-500 text-xs mt-2">El oferente verá tu perfil guardado en la plataforma.</p>
                  </div>

                  {applyError && (
                    <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle size={16} /> {applyError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-dark-700">
                    <button onClick={() => setSelectedOferta(null)} className="px-6 py-2.5 rounded-lg text-gray-300 hover:bg-dark-700 font-medium w-full sm:w-auto">Cancelar</button>
                    <button onClick={handleApply} disabled={applying}
                      className="bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white px-8 py-2.5 rounded-lg font-medium shadow-lg w-full sm:w-auto flex items-center justify-center gap-2">
                      {applying ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Confirmar Postulación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPostulante;
