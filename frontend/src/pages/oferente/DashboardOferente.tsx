import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Users, Edit, Trash2, Search, MapPin, CheckCircle,
  XCircle, X, FileText, Loader2, AlertCircle, RefreshCw, MessageCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Oferta {
  id: number;
  titulo: string;
  zona: string;
  modalidad: string;
  tipo_contrato: string;
  experiencia: string;
  categoria: string;
  salario: string;
  estado: 'Activa' | 'Pausada' | 'Cerrada';
  creado_en: string;
  total_postulantes: number;
}

interface Postulante {
  candidato_id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  habilidades: string | null;
  experiencia_candidato: string | null;
  cv_url: string | null;
  foto_url: string | null;
  telefono: string | null;
  email: string;
  estado_postulacion: string;
  fecha_postulacion: string;
  visto: boolean;
}

const API = '/api';

const DashboardOferente = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'ofertas' | 'respuestas'>((sessionStorage.getItem('oferenteTab') as 'ofertas' | 'respuestas') || 'ofertas');

  useEffect(() => {
    sessionStorage.setItem('oferenteTab', activeTab);
  }, [activeTab]);
  const [misOfertas, setMisOfertas] = useState<Oferta[]>([]);
  const [respuestas, setRespuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Modal crear/editar
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOferta, setEditingOferta] = useState<Oferta | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Modal candidatos
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedOfertaTitle, setSelectedOfertaTitle] = useState('');
  const [selectedOfertaId, setSelectedOfertaId] = useState<number | null>(null);
  const [candidatos, setCandidatos] = useState<Postulante[]>([]);
  const [candidatosLoading, setCandidatosLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    zona: 'Villa del Rosario',
    modalidad: 'Presencial',
    tipoContrato: 'Tiempo completo',
    experiencia: 'Sin experiencia',
    categoria: 'Servicios',
    salario: '',
    salarioValor: 0,
  });

  // ── Cargar mis ofertas y respuestas ──────────────────────────────
  const cargarOfertas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [resOfertas, resResp] = await Promise.all([
        fetch(`${API}/ofertas/mis-ofertas`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/notifications/sugerencias/oferente`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (!resOfertas.ok) throw new Error('Error al cargar datos');
      
      setMisOfertas(await resOfertas.json());
      if (resResp.ok) {
        setRespuestas(await resResp.json());
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargarOfertas(); }, [cargarOfertas]);

  // ── Filtros ──────────────────────────────────────────────────────
  const filteredOfertas = misOfertas.filter(o => {
    const matchesQuery =
      o.titulo.toLowerCase().includes(query.toLowerCase()) ||
      (o.zona || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || o.estado === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // ── Abrir modal crear ────────────────────────────────────────────
  const abrirCrear = () => {
    setEditingOferta(null);
    setFormData({ titulo: '', descripcion: '', zona: 'Villa del Rosario', modalidad: 'Presencial', tipoContrato: 'Tiempo completo', experiencia: 'Sin experiencia', categoria: 'Servicios', salario: '', salarioValor: 0 });
    setShowCreateModal(true);
  };

  // ── Abrir modal editar ───────────────────────────────────────────
  const abrirEditar = (oferta: Oferta) => {
    setEditingOferta(oferta);
    setFormData({
      titulo: oferta.titulo,
      descripcion: '',
      zona: oferta.zona || 'Villa del Rosario',
      modalidad: oferta.modalidad || 'Presencial',
      tipoContrato: oferta.tipo_contrato || 'Tiempo completo',
      experiencia: oferta.experiencia || 'Sin experiencia',
      categoria: oferta.categoria || 'Servicios',
      salario: oferta.salario || '',
      salarioValor: 0,
    });
    setShowCreateModal(true);
  };

  // ── Guardar (crear o editar) ─────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const url = editingOferta ? `${API}/ofertas/${editingOferta.id}` : `${API}/ofertas`;
      const method = editingOferta ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar');
      }
      setShowCreateModal(false);
      cargarOfertas();
    } catch (e: any) {
      alert(e.message || 'Error al guardar la oferta');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Cambiar estado ───────────────────────────────────────────────
  const cambiarEstado = async (oferta: Oferta, nuevoEstado: 'Activa' | 'Pausada' | 'Cerrada') => {
    try {
      const res = await fetch(`${API}/ofertas/${oferta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: oferta.titulo,
          descripcion: '',
          zona: oferta.zona,
          modalidad: oferta.modalidad,
          tipoContrato: oferta.tipo_contrato,
          experiencia: oferta.experiencia,
          categoria: oferta.categoria,
          salario: oferta.salario,
          salarioValor: 0,
          estado: nuevoEstado
        })
      });
      if (res.ok) cargarOfertas();
    } catch {
      alert('Error al cambiar el estado');
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────
  const eliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de que querés eliminar esta oferta?')) return;
    try {
      const res = await fetch(`${API}/ofertas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) cargarOfertas();
    } catch {
      alert('Error al eliminar la oferta');
    }
  };

  // ── Ver candidatos ───────────────────────────────────────────────
  const verCandidatos = async (oferta: Oferta) => {
    setSelectedOfertaTitle(oferta.titulo);
    setSelectedOfertaId(oferta.id);
    setShowCandidatesModal(true);
    setCandidatosLoading(true);
    try {
      const res = await fetch(`${API}/ofertas/${oferta.id}/postulantes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCandidatos(data);
    } catch {
      setCandidatos([]);
    } finally {
      setCandidatosLoading(false);
    }
  };

  const handleVerCV = async (c: Postulante) => {
    if (!c.visto && selectedOfertaId) {
      try {
        await fetch(`${API}/ofertas/postulaciones/visto`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ofertaId: selectedOfertaId, usuarioId: c.usuario_id })
        });
        setCandidatos(prev => prev.map(cand => cand.candidato_id === c.candidato_id ? { ...cand, visto: true } : cand));
      } catch (e) {
        console.error('Error al marcar visto', e);
      }
    }
    // Prefix the URL to prevent React Router from catching it, if it starts with /uploads
    const cvUrl = c.cv_url || undefined;
    if (cvUrl) {
      window.open(cvUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const estadoColor = (estado: string) => {
    if (estado === 'Activa')  return 'bg-green-900/20 text-green-400 border-green-900/50';
    if (estado === 'Pausada') return 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50';
    return 'bg-red-900/20 text-red-400 border-red-900/50';
  };

  const formatDate = (str: string) => {
    try { return new Date(str).toLocaleDateString('es-AR'); } catch { return str; }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mi Panel de Publicaciones</h1>
          <p className="text-gray-400">Gestioná tus publicaciones de empleo y revisá los candidatos</p>
        </div>
        <div className="flex gap-3">
          <Link to="/buscar-candidatos"
            className="bg-dark-700 hover:bg-dark-600 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 border border-dark-600 transition-colors">
            <Search size={18} /> Buscar Candidatos
          </Link>
          <button onClick={abrirCrear}
            className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105">
            <Plus size={20} /> Crear Nueva Publicación
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-700 mb-6 space-x-8">
        <button
          onClick={() => setActiveTab('ofertas')}
          className={`pb-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'ofertas' ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Mis Publicaciones
        </button>
        <button
          onClick={() => setActiveTab('respuestas')}
          className={`pb-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'respuestas' ? 'border-primary-500 text-primary-400' : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Solicitudes Directas
          {respuestas.length > 0 && (
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">{respuestas.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'ofertas' ? (
        <>
          {/* Filtros */}
          <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full flex items-center bg-dark-900 rounded-md px-3 py-2 border border-dark-600 focus-within:border-primary-500">
              <Search className="text-gray-400 mr-2" size={18} />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar en mis publicaciones..."
                className="bg-transparent w-full outline-none text-white text-sm" />
            </div>
            <div className="w-full md:w-auto flex items-center gap-4">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-dark-900 border border-dark-600 rounded-md py-2 px-4 text-white text-sm outline-none focus:border-primary-500">
                <option value="Todos">Todos los estados</option>
                <option value="Activa">Activas</option>
                <option value="Pausada">Pausadas</option>
                <option value="Cerrada">Cerradas</option>
              </select>
              <button onClick={cargarOfertas} title="Actualizar"
                className="p-2 bg-dark-900 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors border border-dark-600">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Opciones de solicitudes directas */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-400">Candidatos que aceptaron tu sugerencia y enviaron su CV.</p>
            <button onClick={cargarOfertas} title="Actualizar"
              className="p-2 bg-dark-800 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors border border-dark-700">
              <RefreshCw size={16} />
            </button>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 mb-4 flex items-center gap-2 text-red-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Tabla Ofertas / Respuestas */}
      {activeTab === 'ofertas' ? (
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="bg-dark-900/50 border-b border-dark-700 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Título de la Publicación</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Zona / Modalidad</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Candidatos</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      Cargando publicaciones...
                    </td>
                  </tr>
                ) : filteredOfertas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {misOfertas.length === 0
                        ? 'No tenés publicaciones aún. ¡Creá tu primera oferta!'
                        : 'No se encontraron publicaciones con estos filtros.'}
                    </td>
                  </tr>
                ) : (
                  filteredOfertas.map(oferta => (
                    <tr key={oferta.id} className="hover:bg-dark-700/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white text-base mb-1">{oferta.titulo}</div>
                        <div className="text-xs text-gray-500">Publicado: {formatDate(oferta.creado_en)}</div>
                        {oferta.categoria && (
                          <span className="text-xs bg-dark-700 px-2 py-0.5 rounded-full text-gray-400 mt-1 inline-block">
                            {oferta.categoria}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-gray-400">
                            <MapPin size={14} /> {oferta.zona || '—'}
                          </span>
                          <span className="text-xs bg-dark-900 px-2 py-0.5 rounded-full border border-dark-600 w-max text-gray-400">
                            {oferta.modalidad || '—'}
                          </span>
                          {oferta.salario && (
                            <span className="text-xs text-primary-400">{oferta.salario}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => verCandidatos(oferta)}
                            className="flex flex-col items-center bg-dark-900 hover:bg-dark-600 border border-dark-600 px-4 py-2 rounded-lg text-primary-400 hover:text-primary-300 transition-colors"
                            title="Ver postulantes">
                            <span className="flex items-center gap-2 font-bold text-base">
                              <Users size={18} /> {oferta.total_postulantes}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase mt-1">Ver CVs</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border flex w-max items-center gap-1 ${estadoColor(oferta.estado)}`}>
                            {oferta.estado === 'Activa'  && <CheckCircle size={12} />}
                            {oferta.estado === 'Cerrada' && <XCircle size={12} />}
                            {oferta.estado}
                          </span>
                          <select
                            value={oferta.estado}
                            onChange={e => cambiarEstado(oferta, e.target.value as any)}
                            className="text-xs bg-dark-900 border border-dark-600 rounded px-2 py-1 text-gray-400 outline-none w-max">
                            <option value="Activa">Activar</option>
                            <option value="Pausada">Pausar</option>
                            <option value="Cerrada">Cerrar</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => abrirEditar(oferta)}
                            className="p-2 bg-dark-900 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
                            title="Editar Publicación">
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => eliminar(oferta.id)}
                            className="p-2 bg-dark-900 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-900/30 transition-colors"
                            title="Eliminar Publicación">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {respuestas.length === 0 ? (
            <div className="bg-dark-800 rounded-xl p-10 text-center border border-dark-700">
              <Users size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-lg">Aún no hay respuestas a tus sugerencias.</p>
            </div>
          ) : (
            respuestas.map(r => (
              <div key={r.id} className="bg-dark-800 border border-dark-700 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center text-lg font-bold text-gray-300 border border-dark-600 overflow-hidden">
                      {r.foto_url ? (
                        <img src={r.foto_url} alt={r.nombre} className="w-full h-full object-cover" />
                      ) : (
                        r.nombre?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{r.nombre} {r.apellido}</h3>
                      <p className="text-gray-400 text-sm">{r.email}</p>
                      <span className="text-[10px] text-gray-500 mt-1 block">Aceptó el {formatDate(r.creada_en)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {r.cv_url && (
                      <button onClick={() => window.open(r.cv_url, '_blank')}
                        className="flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium border border-dark-600 transition-colors">
                        <FileText size={16} /> <span className="hidden sm:inline">Ver CV</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-chat', {
                          detail: {
                            receptorId: r.postulante_id,
                            ofertaId: 0,
                            nombre: `${r.nombre} ${r.apellido || ''}`.trim(),
                            foto: r.foto_url,
                            ofertaTitulo: 'Sugerencia Directa'
                          }
                        }));
                      }}
                      className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                    >
                      <MessageCircle size={16} /> <span className="hidden sm:inline">Contactar</span>
                    </button>
                  </div>
                </div>
                {(r.habilidades || r.experiencia) && (
                  <div className="mt-4 pt-4 border-t border-dark-700 space-y-2">
                    {r.habilidades && (
                      <p className="text-xs text-gray-400">
                        <span className="text-gray-500 uppercase font-medium">Habilidades:</span> {r.habilidades}
                      </p>
                    )}
                    {r.experiencia && (
                      <p className="text-xs text-gray-400">
                        <span className="text-gray-500 uppercase font-medium">Experiencia:</span> {r.experiencia}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Modal Crear/Editar ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingOferta ? 'Editar Publicación' : 'Crear Nueva Publicación'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Título del Puesto u Oficio *</label>
                  <input type="text" required value={formData.titulo}
                    onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Ej: Maestro Albañil, Cajero/a..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Zona</label>
                    <select value={formData.zona} onChange={e => setFormData(p => ({ ...p, zona: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white outline-none">
                      <option>Villa del Rosario</option>
                      <option>Luque</option>
                      <option>Rincón</option>
                      <option>Remoto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Modalidad</label>
                    <select value={formData.modalidad} onChange={e => setFormData(p => ({ ...p, modalidad: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white outline-none">
                      <option>Presencial</option>
                      <option>Remoto</option>
                      <option>Híbrido</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Contrato</label>
                    <select value={formData.tipoContrato} onChange={e => setFormData(p => ({ ...p, tipoContrato: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white outline-none">
                      <option>Tiempo completo</option>
                      <option>Temporal</option>
                      <option>Por obra</option>
                      <option>Por hora</option>
                      <option>A convenir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Rubro / Categoría</label>
                    <select value={formData.categoria} onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white outline-none">
                      <option>Construcción</option>
                      <option>Comercio</option>
                      <option>Servicios</option>
                      <option>Tecnología</option>
                      <option>Hogar</option>
                      <option>Administración</option>
                      <option>Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Experiencia Requerida</label>
                  <select value={formData.experiencia} onChange={e => setFormData(p => ({ ...p, experiencia: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white outline-none">
                    <option>Sin experiencia</option>
                    <option>Menos de 1 año</option>
                    <option>1 a 3 años</option>
                    <option>Más de 3 años</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Descripción Completa *</label>
                  <textarea required rows={4} value={formData.descripcion}
                    onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Detallá qué tareas hay que realizar, requisitos, horarios..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Salario / Pago (Opcional)</label>
                    <input type="text" value={formData.salario}
                      onChange={e => setFormData(p => ({ ...p, salario: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ej: A convenir, $300.000, Por obra..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Valor numérico del salario</label>
                    <input type="number" min={0} value={formData.salarioValor}
                      onChange={e => setFormData(p => ({ ...p, salarioValor: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="0 si es a convenir" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-dark-700">
                  <button type="button" onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2.5 rounded-lg text-gray-300 hover:bg-dark-700 font-medium">
                    Cancelar
                  </button>
                  <button type="submit" disabled={formSubmitting}
                    className="bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white px-8 py-2.5 rounded-lg font-medium shadow-lg flex items-center gap-2">
                    {formSubmitting ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : 'Publicar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Candidatos ─────────────────────────────────────────── */}
      {showCandidatesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Candidatos Postulados</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Postulaciones para: <span className="text-primary-400 font-medium">{selectedOfertaTitle}</span>
                </p>
              </div>
              <button onClick={() => setShowCandidatesModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {candidatosLoading ? (
                <div className="text-center py-10 text-gray-400">
                  <Loader2 className="animate-spin mx-auto mb-2" size={28} /> Cargando candidatos...
                </div>
              ) : candidatos.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Users size={40} className="mx-auto mb-3 text-gray-600" />
                  <p>Aún no hay postulantes para esta oferta.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {candidatos.map(c => (
                    <div key={c.candidato_id} className="bg-dark-900 border border-dark-700 rounded-xl p-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center text-lg font-bold text-gray-300 border border-dark-600 overflow-hidden">
                            {c.foto_url ? (
                              <img src={c.foto_url} alt={c.nombre} className="w-full h-full object-cover" />
                            ) : (
                              c.nombre?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-lg">{c.nombre} {c.apellido}</h3>
                            <p className="text-gray-400 text-sm">{c.email}</p>
                            {c.telefono && <p className="text-gray-500 text-xs">{c.telefono}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {c.visto && (
                            <span className="text-xs text-primary-400 font-medium px-2 bg-primary-900/20 border border-primary-900/50 rounded-full py-0.5">Visto</span>
                          )}
                          <div className="flex gap-2 ml-auto sm:ml-0">
                            {c.cv_url && (
                              <button onClick={() => handleVerCV(c)}
                                className="flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium border border-dark-600 transition-colors">
                                <FileText size={16} /> <span className="hidden sm:inline">{c.visto ? 'Ver CV' : 'Ver CV (Nuevo)'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-chat', {
                                  detail: {
                                    receptorId: c.usuario_id,
                                    ofertaId: selectedOfertaId,
                                    nombre: `${c.nombre} ${c.apellido || ''}`.trim(),
                                    foto: c.foto_url,
                                    ofertaTitulo: selectedOfertaTitle
                                  }
                                }));
                                setShowCandidatesModal(false);
                              }}
                              className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                            >
                              <MessageCircle size={16} /> <span className="hidden sm:inline">Contactar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      {(c.habilidades || c.experiencia_candidato) && (
                        <div className="mt-3 pt-3 border-t border-dark-700 space-y-1">
                          {c.habilidades && (
                            <p className="text-xs text-gray-400">
                              <span className="text-gray-500">Habilidades:</span> {c.habilidades}
                            </p>
                          )}
                          {c.experiencia_candidato && (
                            <p className="text-xs text-gray-400">
                              <span className="text-gray-500">Experiencia:</span> {c.experiencia_candidato}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardOferente;
