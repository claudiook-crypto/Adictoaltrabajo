import React, { useState } from 'react';
import { Check, Star, Zap, Crown, ExternalLink, User, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PlanesPage = () => {
  const { user } = useAuth();
  const defaultTab = user?.role === 'oferente' ? 'empresas' : 'postulantes';
  const [activeTab, setActiveTab] = useState<'empresas' | 'postulantes'>(defaultTab);

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Planes y Suscripciones
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Elegí el plan que mejor se adapte a tus necesidades para conectar más rápido en el mercado laboral.
        </p>
      </div>

      <div className="flex justify-center mb-12">
        <div className="bg-dark-800 p-1.5 rounded-xl inline-flex shadow-xl border border-dark-700">
          <button
            onClick={() => setActiveTab('postulantes')}
            className={`px-8 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'postulantes'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            Para Postulantes
          </button>
          <button
            onClick={() => setActiveTab('empresas')}
            className={`px-8 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'empresas'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            Para Empresas / Sponsors
          </button>
        </div>
      </div>

      {activeTab === 'postulantes' && (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan Postulante Simple */}
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <User size={24} className="text-gray-400" /> Plan Simple
            </h3>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-white">$0</span>
              <span className="text-gray-400"> ARS / mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start text-gray-300">
                <Check className="text-green-500 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Creación de currículum vivo (multimedia)</span>
              </li>
              <li className="flex items-start text-gray-300">
                <Check className="text-green-500 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Visualización de la bolsa de trabajo</span>
              </li>
              <li className="flex items-start text-gray-500 mt-6 pt-6 border-t border-dark-700">
                <span className="font-semibold text-gray-400 mb-2 block w-full">Limitaciones:</span>
              </li>
              <li className="flex items-start text-gray-400 text-sm">
                <span className="mr-3 mt-0.5 shrink-0 font-bold">•</span>
                <span>Máximo 3 postulaciones/chats por semana</span>
              </li>
              <li className="flex items-start text-gray-400 text-sm">
                <span className="mr-3 mt-0.5 shrink-0 font-bold">•</span>
                <span>Posicionamiento estándar</span>
              </li>
              <li className="flex items-start text-gray-400 text-sm">
                <span className="mr-3 mt-0.5 shrink-0 font-bold">•</span>
                <span>Notificaciones diferidas</span>
              </li>
            </ul>
            
            <button className="w-full bg-dark-700 hover:bg-dark-600 text-white font-bold py-3 px-4 rounded-lg transition-colors border border-dark-600">
              Crear perfil gratis
            </button>
          </div>

          {/* Plan Postulante Premium */}
          <div className="bg-gradient-to-b from-primary-900/50 to-dark-800 rounded-2xl border-2 border-primary-500 p-8 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/20">
            <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Recomendado
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Star size={24} className="text-primary-400" /> Plan Premium
            </h3>
            <div className="my-6">
              <span className="text-4xl font-extrabold text-white">$5.000</span>
              <span className="text-primary-200"> ARS / mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start text-white">
                <Check className="text-primary-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Postulaciones y chats <strong>ilimitados</strong></span>
              </li>
              <li className="flex items-start text-white">
                <Check className="text-primary-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Prioridad máxima (Top Rank) en búsquedas de empresas</span>
              </li>
              <li className="flex items-start text-white">
                <Check className="text-primary-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Alertas tempranas por WhatsApp</span>
              </li>
              <li className="flex items-start text-white">
                <Check className="text-primary-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Asistencia ilimitada de IA para optimizar el perfil</span>
              </li>
            </ul>
            
            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-primary-500/30">
              Mejorar mi perfil ahora
            </button>
          </div>
        </div>
      )}

      {activeTab === 'empresas' && (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan Empresas */}
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Briefcase size={24} className="text-blue-400" /> Plan Empresas
            </h3>
            <span className="text-sm font-semibold text-blue-400 mb-4 inline-block">OBLIGATORIO</span>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">$20.000</span>
              <span className="text-gray-400"> ARS / mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start text-gray-300">
                <Check className="text-blue-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Publicación de ofertas garantizadas</span>
              </li>
              <li className="flex items-start text-gray-300">
                <Check className="text-blue-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Cruce inteligente con IA (Matching)</span>
              </li>
              <li className="flex items-start text-gray-300">
                <Check className="text-blue-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Filtros avanzados de selección</span>
              </li>
              <li className="flex items-start text-gray-300">
                <Check className="text-blue-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Chat directo ilimitado con candidatos</span>
              </li>
            </ul>
            
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
              Publicar mi primera oferta
            </button>
          </div>

          {/* Espacios Publicitarios */}
          <div className="bg-gradient-to-br from-purple-900/40 to-dark-800 rounded-2xl border border-purple-500/50 p-8 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Crown size={24} className="text-purple-400" /> Sponsors
            </h3>
            <span className="text-sm font-semibold text-purple-400 mb-4 inline-block">ESPACIOS PUBLICITARIOS</span>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">$100.000</span>
              <span className="text-gray-400"> ARS / mes</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start text-gray-300">
                <Check className="text-purple-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Banner publicitario exclusivo en la plataforma</span>
              </li>
              <li className="flex items-start text-gray-300">
                <Check className="text-purple-400 mr-3 mt-0.5 shrink-0" size={18} />
                <span>Máxima visibilidad local</span>
              </li>
              <li className="flex items-start text-gray-400 mt-4 text-sm bg-dark-900/50 p-4 rounded-lg">
                Ideal para institutos, universidades, agencias de reclutamiento o grandes marcas que buscan posicionamiento.
              </li>
            </ul>
            
            <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
              Consultar disponibilidad <ExternalLink size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanesPage;
