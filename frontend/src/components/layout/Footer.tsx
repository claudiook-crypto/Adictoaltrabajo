import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-dark-900 border-t border-dark-700 pt-10 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
          
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary-500" />
            <span className="text-lg font-bold text-white">Adicto al Trabajo</span>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-gray-400 mb-2">Conectando talento con oportunidades en Villa del Rosario, Luque y Rincón.</p>
            <div className="flex justify-center md:justify-end space-x-4">
              <Link to="/politica-privacidad" className="text-sm text-primary-500 hover:text-primary-400">Política de Privacidad y Cookies</Link>
            </div>
          </div>

        </div>
        
        <div className="mt-8 text-center text-xs text-gray-600 border-t border-dark-800 pt-6">
          &copy; {new Date().getFullYear()} Adicto al Trabajo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
