import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, MapPin, Send, FileText, Upload, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PerfilOferente = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [sent, setSent] = useState(false);

  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  useEffect(() => {
    // Cargar perfil del oferente desde la BD
    const fetchPerfil = async () => {
      try {
        const resp = await fetch(`/api/candidates/oferente/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) setPerfil(await resp.json());
        else setPerfil({ nombre_empresa: 'Empresa', descripcion: '', ubicacion: '' });
      } catch {
        setPerfil({ nombre_empresa: 'Empresa', descripcion: '', ubicacion: '' });
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchPerfil();
      fetch(`/api/notifications/sugerencia/${id}/estado`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.estado === 'Aceptada') setSent(true); })
        .catch(() => {});
    }
  }, [id, token]);

  useEffect(() => {
    // Load from session storage if exists
    const storedFileName = sessionStorage.getItem('cvFileName');
    const storedUser = sessionStorage.getItem('user');
    if (storedFileName) setCvFileName(storedFileName);
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u.cvUrl) setCvUrl(u.cvUrl);
    }
  }, []);

  const handleEnviarCV = async () => {
    if (!cvFile && !cvUrl) return;
    
    let finalCvUrl = cvUrl;
    
    // Subir el nuevo si eligió otro
    if (cvFile) {
      const formData = new FormData();
      formData.append('cv', cvFile);
      try {
        const res = await fetch('/api/cv/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (data.cvUrl) finalCvUrl = data.cvUrl;
      } catch {
        alert('Error al subir el CV');
        return;
      }
    }

    try {
      const resp = await fetch('/api/notifications/sugerencia/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oferenteId: id, cvUrl: finalCvUrl })
      });
      if (resp.ok) setSent(true);
      else alert('Error al responder a la empresa');
    } catch {
      alert('Error de conexión');
    }
  };

  const clearCv = (e: React.MouseEvent) => {
    e.preventDefault();
    setCvFile(null);
    setCvUrl(null);
    setCvFileName(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="animate-spin border-2 border-primary-500 border-t-transparent rounded-full w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-900/40 to-dark-800 p-8 border-b border-dark-700">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-primary-900/50 border-2 border-primary-500/40 rounded-xl flex items-center justify-center">
              <Building size={36} className="text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{perfil?.nombre_empresa || 'Empresa'}</h1>
              {perfil?.ubicacion && (
                <p className="text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin size={14} /> {perfil.ubicacion}
                </p>
              )}
              <span className="mt-2 inline-block bg-primary-900/30 text-primary-400 border border-primary-900/50 text-xs px-3 py-1 rounded-full">
                Esta empresa está interesada en tu perfil
              </span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">Sobre la empresa</h2>
            {perfil?.descripcion ? (
              <p className="text-gray-300 leading-relaxed">{perfil.descripcion}</p>
            ) : (
              <p className="text-gray-500 italic">Esta empresa aún no ha completado la descripción de su perfil. Podés enviar tu CV para ponerte en contacto y conocer más detalles sobre su propuesta.</p>
            )}
          </div>

          {sent ? (
            <div className="text-center py-8">
              <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">¡CV enviado!</h2>
              <p className="text-gray-400">La empresa recibirá tu currículum y se pondrá en contacto.</p>
              <p className="text-primary-500/80 text-sm mt-4 font-medium">Podés modificar o cancelar el envío en cualquier momento desde tu Historial de Postulaciones.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Send size={20} className="text-primary-500" /> Enviar tu CV a esta empresa
              </h2>

              <label className="block w-full border-2 border-dashed border-dark-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors mb-5">
                <input type="file" accept=".pdf" className="hidden" onChange={e => {
                  if (e.target.files) {
                    setCvFile(e.target.files[0]);
                    setCvFileName(e.target.files[0].name);
                  }
                }} />
                <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                {(cvFile || cvFileName) ? (
                  <>
                    <p className="text-primary-400 font-medium">{cvFileName || cvFile?.name}</p>
                    <p className="text-gray-500 text-sm mt-1 mb-3">Listo para enviar</p>
                    <button onClick={clearCv} className="text-red-400 hover:text-red-300 text-sm">Eliminar y elegir otro</button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 font-medium mb-1">Subí tu CV en PDF</p>
                    <p className="text-gray-500 text-sm">Tocá para seleccionar el archivo</p>
                  </>
                )}
              </label>

              <button
                onClick={handleEnviarCV}
                disabled={!cvFile && !cvUrl}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg"
              >
                <Send size={18} /> Enviar CV a {perfil?.nombre_empresa || 'esta empresa'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerfilOferente;

