import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('');

  const handleSearch = () => {
    navigate(`/dashboard-postulante?zona=${encodeURIComponent(zone)}&q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="bg-hero-pattern h-[500px] flex items-center justify-center relative">
        <div className="absolute inset-0 bg-dark-900/60 z-0"></div>
        <div className="z-10 text-center px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Encuentra trabajo u ofrece tus oficios en tu ciudad
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Villa del Rosario, Luque y Rincón. Conectando talento local con oportunidades reales.
          </p>
          
          {/* Buscador Simple */}
          <div className="bg-dark-800 p-2 rounded-lg flex flex-col md:flex-row gap-2 max-w-4xl mx-auto shadow-2xl border border-dark-700">
            <div className="flex-1 flex items-center bg-dark-900 rounded-md px-3 py-2 border border-dark-700 focus-within:border-primary-500 transition-colors">
              <Search className="text-gray-400 mr-2" size={20} />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. Albañil, Electricista, Vendedor..." 
                className="bg-transparent w-full outline-none text-white placeholder-gray-500"
              />
            </div>
            <div className="flex-1 flex items-center bg-dark-900 rounded-md px-3 py-2 border border-dark-700 focus-within:border-primary-500 transition-colors">
              <MapPin className="text-gray-400 mr-2" size={20} />
              <select 
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="bg-transparent w-full outline-none text-white appearance-none"
              >
                <option value="" className="text-black">Cualquier zona</option>
                <option value="Villa del Rosario" className="text-black">Villa del Rosario</option>
                <option value="Luque" className="text-black">Luque</option>
                <option value="Rincón" className="text-black">Rincón</option>
              </select>
            </div>
            <button 
              onClick={handleSearch}
              className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-md font-medium transition-colors md:w-auto w-full"
            >
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-dark-800 p-8 rounded-xl border border-dark-700 hover:border-primary-500/50 transition-colors text-center">
              <h2 className="text-2xl font-bold mb-4">Soy Postulante / Trabajador</h2>
              <p className="text-gray-400 mb-6">Busco empleo estable o quiero ofrecer mis oficios (plomería, electricidad, etc.)</p>
              <Link to="/registro?role=postulante" className="inline-block bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-lg font-medium">
                Crear Perfil Gratis
              </Link>
            </div>
            <div className="bg-dark-800 p-8 rounded-xl border border-dark-700 hover:border-primary-500/50 transition-colors text-center">
              <h2 className="text-2xl font-bold mb-4">Soy Oferente / Empresa</h2>
              <p className="text-gray-400 mb-6">Necesito contratar personal para mi empresa o busco un profesional para un arreglo en casa.</p>
              <Link to="/registro?role=oferente" className="inline-block bg-dark-700 hover:bg-dark-600 text-white px-6 py-3 rounded-lg font-medium border border-dark-600">
                Publicar un Trabajo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
