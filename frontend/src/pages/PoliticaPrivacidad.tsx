import React from 'react';

const PoliticaPrivacidad = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-dark-800 rounded-2xl p-8 md:p-12 border border-dark-700 shadow-xl prose prose-invert max-w-none text-gray-300">
        <h1 className="text-3xl font-bold text-white mb-6">Política de Privacidad y Tratamiento de Datos</h1>
        
        <p className="mb-4">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Introducción</h2>
        <p className="mb-4">En "Adicto al Trabajo", valoramos enormemente su privacidad. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos sus datos personales en nuestra plataforma.</p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Recopilación de Datos</h2>
        <p className="mb-4">Recopilamos la información que usted nos proporciona directamente al registrarse (nombre, correo electrónico, perfil profesional). Utilizamos autenticación segura (OAuth) que minimiza la recolección innecesaria.</p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Seguridad de Nivel de Fila (Row Level Security - RLS)</h2>
        <p className="mb-4">Para garantizar la máxima seguridad, nuestra base de datos emplea <strong>Row Level Security (RLS)</strong> y políticas de autorización estrictas en el servidor. Esto significa que a nivel de la base de datos es criptográficamente imposible que un usuario no autorizado acceda a los datos privados o mensajes de otro usuario. Cada consulta está aislada por el ID del usuario autenticado.</p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Política de Cookies</h2>
        <p className="mb-4">Utilizamos cookies de sesión para mantenerlo autenticado y cookies de análisis. Usted puede aceptar o rechazar el rastreo utilizando el aviso de cookies al ingresar al sitio por primera vez.</p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Protección contra Abusos</h2>
        <p className="mb-4">Nuestra API cuenta con <strong>Rate Limiting</strong> (limitación de tasa) para evitar abusos, ataques DDoS y garantizar un funcionamiento óptimo, preparándonos también para futuras integraciones de Inteligencia Artificial.</p>
        
        <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Contacto</h2>
        <p className="mb-4">Para cualquier duda relacionada con sus datos, contáctenos a privacidad@adictoaltrabajo.com.</p>
      </div>
    </div>
  );
};

export default PoliticaPrivacidad;
