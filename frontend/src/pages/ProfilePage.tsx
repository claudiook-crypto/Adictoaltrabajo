import React, { useState, useEffect } from 'react';
import { User, Building, MapPin, Briefcase, Camera, Save, FileText, Upload, Sparkles, Loader2, Trash2, ImageIcon, CheckCircle } from 'lucide-react';

const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  
  // States for Postulante
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profession, setProfession] = useState('');
  const [skills, setSkills] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [esPublico, setEsPublico] = useState(false);
  
  // States for Oferente
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [tipoOferente, setTipoOferente] = useState('Empresa');
  
  // Shared States
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  const [saved, setSaved] = useState(false);

  // AI States
  const [aiMode, setAiMode] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (userData) {
      setUser(userData);
      
      if (userData.role === 'postulante') {
        const cvParsed = JSON.parse(sessionStorage.getItem('cvParsed') || 'null');
        setFirstName(userData.firstName || cvParsed?.firstName || userData.name?.split(' ')[0] || '');
        setLastName(userData.lastName || cvParsed?.lastName || userData.name?.split(' ').slice(1).join(' ') || '');
        setProfession(userData.profession || cvParsed?.profession || '');
        setSkills(userData.skills || cvParsed?.skills || '');
        setPhone(userData.phone || cvParsed?.phone || '');
        setZone(userData.zone || cvParsed?.zone || '');
        setEsPublico(userData.esPublico || false);
        setCvFileName(sessionStorage.getItem('cvFileName') || '');
        setCvUrl(userData.cvUrl || '');
        setFotoUrl(userData.fotoUrl || '');
        setBannerUrl(userData.bannerUrl || '');
      } else {
        setCompanyName(userData.companyName || userData.name || '');
        setDescription(userData.description || '');
        setPhone(userData.phone || '');
        setZone(userData.zone || '');
        setFotoUrl(userData.fotoUrl || '');
        setTipoOferente(userData.tipoOferente || 'Empresa');
        setBannerUrl(userData.bannerUrl || '');
      }
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = { 
      ...user,
      firstName: user.role === 'postulante' ? firstName : '',
      lastName: user.role === 'postulante' ? lastName : '',
      companyName: user.role === 'oferente' ? companyName : '',
      profession,
      skills,
      phone,
      zone,
      description,
      esPublico,
      cvUrl,
      fotoUrl,
      bannerUrl,
      tipoOferente: user.role === 'oferente' ? tipoOferente : undefined
    };
    
    if (user.role === 'postulante') {
      updatedUser.name = `${firstName} ${lastName}`.trim();
      if(cvFileName) sessionStorage.setItem('cvFileName', cvFileName);
    } else {
      updatedUser.name = companyName.trim();
    }
    
    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedUser)
        });
      }
    } catch (err) {
      console.error("Failed to save to backend", err);
    }

    // Usar AuthContext para actualizar los datos en toda la app si está disponible
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Dispatch custom event to notify other components (like AuthContext if it was listening, or Navbar)
    window.dispatchEvent(new Event('storage'));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch('/api/cv/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.imageUrl) {
            setFotoUrl(data.imageUrl);
          }
        } else {
          alert("Hubo un error al subir la imagen.");
        }
      } catch (error) {
        console.error(error);
        alert("Error de conexión al subir la imagen.");
      }
    }
  };

  const handleDeletePhoto = () => {
    setFotoUrl('');
    // Actualizar en sessionStorage inmediatamente
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    currentUser.fotoUrl = '';
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    window.dispatchEvent(new Event('storage'));
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch('/api/cv/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.imageUrl) {
            setBannerUrl(data.imageUrl);
            // Guardar en sessionStorage inmediatamente
            const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
            currentUser.bannerUrl = data.imageUrl;
            sessionStorage.setItem('user', JSON.stringify(currentUser));
          }
        } else {
          alert("Hubo un error al subir la imagen del banner.");
        }
      } catch (error) {
        console.error(error);
        alert("Error de conexión al subir el banner.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFileName(file.name);
      sessionStorage.setItem('cvFileName', file.name);

      setIsUploading(true);
      const formData = new FormData();
      formData.append('cv', file);

      if (aiMode) {
        try {
          const response = await fetch('/api/cv/parse', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.firstName) setFirstName(data.firstName);
            if (data.lastName) setLastName(data.lastName);
            if (data.profession) setProfession(data.profession);
            if (data.skills) setSkills(data.skills);
            if (data.phone) setPhone(data.phone);
            if (data.cvUrl) setCvUrl(data.cvUrl);
            alert("¡Jobi ha completado tus datos con éxito y tu CV fue guardado!");
          } else {
            alert("Hubo un error al leer el CV con IA. Verifica que sea un PDF válido.");
          }
        } catch (error) {
          console.error(error);
          alert("Error de conexión al procesar el CV con Inteligencia Artificial.");
        } finally {
          setIsUploading(false);
          setAiMode(null); // Reset mode after upload
        }
      } else {
        // Carga manual sin IA
        try {
          const response = await fetch('/api/cv/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.cvUrl) setCvUrl(data.cvUrl);
            alert("CV guardado exitosamente. Ahora completa tus datos manualmente.");
          } else {
            alert("Hubo un error al subir el CV.");
          }
        } catch (error) {
          console.error(error);
          alert("Error de conexión al subir el CV.");
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  if (!user) return <div className="p-8 text-center text-white">Cargando...</div>;

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      
      {/* AI CV Mode Selection Banner for Postulantes */}
      {user.role === 'postulante' && aiMode === null && !cvFileName && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6">¡Hola, {firstName || 'Usuario'}!</h2>
          <p className="text-center text-gray-400 mb-8">¿Querés cargar tu CV a partir de un archivo o de forma manual?</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <button 
              onClick={() => setAiMode(true)}
              className="bg-white hover:bg-gray-50 text-dark-900 p-6 rounded-xl border border-gray-200 shadow-xl transition-transform hover:-translate-y-1 text-left flex flex-col justify-between relative overflow-hidden h-full group"
            >
              <div className="z-10 relative">
                <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                  <Sparkles className="text-primary-600" /> Lectura automática con Jobi
                </h3>
                <p className="text-sm text-gray-600">
                  Tu perfil se autocompletará con la ayuda de <strong>Jobi</strong>, nuestro asistente de <strong>inteligencia artificial</strong>, a partir del archivo que cargues en PDF. Podrás verificar la información y editarla si es necesario.
                </p>
              </div>
            </button>

            <button 
              onClick={() => setAiMode(false)}
              className="bg-white hover:bg-gray-50 text-dark-900 p-6 rounded-xl border border-gray-200 shadow-xl transition-transform hover:-translate-y-1 text-left flex flex-col justify-between h-full"
            >
              <h3 className="font-bold text-xl mb-3">Cargar mi CV manualmente</h3>
              <p className="text-sm text-gray-600">
                Te guiaremos paso a paso por las secciones del perfil y completarás la información de forma manual.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Main Profile Form */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden">
        
        {/* Header con imagen de fondo */}
        {/* Header con imagen de fondo editable */}
        <div className="h-40 bg-gradient-to-r from-primary-900 to-dark-800 relative group/banner">
          <img 
            src={bannerUrl || "https://srt-assets.tadevel-cdn.com/68a498577c32ef30ad8d3e87/720.jpeg"} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
          {/* Botón cambiar banner */}
          <label className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all opacity-0 group-hover/banner:opacity-100 flex items-center gap-1.5">
            <ImageIcon size={14} /> Cambiar banner
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </label>
          {/* Avatar con botón eliminar */}
          <div className="absolute -bottom-16 left-8 flex items-end gap-2">
            <label className="relative group cursor-pointer block">
              <div className="w-32 h-32 bg-dark-700 rounded-full border-4 border-dark-800 flex items-center justify-center overflow-hidden">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : user.role === 'oferente' ? (
                  <Building size={48} className="text-gray-400" />
                ) : (
                  <User size={48} className="text-gray-400" />
                )}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            {fotoUrl && (
              <button 
                type="button"
                onClick={handleDeletePhoto}
                className="mb-1 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors shadow-lg"
                title="Eliminar foto"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="pt-20 px-8 pb-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
            {saved && (
              <span className="flex items-center text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
                <Save size={16} className="mr-2" /> Guardado con éxito
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            
            {/* POSTULANTE FIELDS */}
            {user.role === 'postulante' && (
              <>
                {(aiMode === true || isUploading) && (
                  <div className="bg-primary-900/30 border border-primary-500/50 rounded-lg p-6 text-center">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                        <p className="text-primary-300 font-medium">Jobi está analizando tu CV...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Sparkles className="text-primary-400" size={32} />
                        <p className="text-primary-100 font-medium mb-2">Sube tu CV en PDF y Jobi completará tus datos</p>
                        <label className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-md font-medium cursor-pointer transition-colors shadow-lg">
                          Seleccionar PDF
                          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                        <button type="button" onClick={() => setAiMode(null)} className="text-sm text-gray-400 hover:text-white mt-2">Cancelar</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Nombre</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={e => setFirstName(e.target.value.replace(/[0-9]/g, ''))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Apellido</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={e => setLastName(e.target.value.replace(/[0-9]/g, ''))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Profesión u Oficio principal</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      value={profession}
                      onChange={e => setProfession(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="Ej: Albañil, Programador, Plomero..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Habilidades (Separadas por coma)</label>
                  <textarea 
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                    rows={3}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ej: Revoque fino, pintura exterior, colocación de cerámicos..."
                  ></textarea>
                </div>

                {!isUploading && (
                  <div className="border border-dashed border-dark-600 rounded-lg p-6 bg-dark-900/50">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2"><FileText size={18}/> Mi Currículum (Opcional)</h3>
                    
                    {cvFileName ? (
                      <div className="flex items-center justify-between bg-dark-800 p-3 rounded border border-dark-700">
                        <div className="flex items-center gap-2 text-primary-400">
                          <FileText size={20} />
                          <span className="text-sm font-medium">{cvFileName}</span>
                        </div>
                        <button type="button" onClick={() => setCvFileName('')} className="text-red-400 hover:text-red-300 text-sm">Quitar</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Upload className="text-gray-500 mb-2" size={32} />
                        <p className="text-sm text-gray-400 mb-4">
                          {aiMode 
                            ? 'Sube tu CV en PDF y Jobi completará tus datos automáticamente.' 
                            : 'Sube tu CV en formato PDF manualmente.'}
                        </p>
                        <label className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors">
                          Seleccionar Archivo PDF
                          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-dark-800/50 border border-dark-600 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-medium flex items-center gap-2">
                        Perfil Público
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Si tu perfil es público, las empresas podrán encontrarte en sus búsquedas y la Inteligencia Artificial podrá recomendarte para ofertas compatibles. Si es privado, solo verán tus datos si te postulás a su oferta.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={esPublico}
                        onChange={(e) => setEsPublico(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                  <div className={`text-sm px-3 py-2 rounded ${esPublico ? 'bg-primary-900/30 text-primary-400 border border-primary-500/20' : 'bg-dark-700 text-gray-400'}`}>
                    {esPublico ? 'Estado actual: Público (Recomendado)' : 'Estado actual: Privado (Oculto en búsquedas)'}
                  </div>
                </div>
              </>
            )}

            {/* OFERENTE FIELDS */}
            {user.role === 'oferente' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Cuenta</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-dark-900 px-4 py-3 border border-dark-600 rounded-lg flex-1 transition-colors hover:border-primary-500">
                      <input 
                        type="radio" 
                        name="tipoOferente" 
                        value="Empresa" 
                        checked={tipoOferente === 'Empresa'}
                        onChange={(e) => setTipoOferente(e.target.value)}
                        className="text-primary-500 bg-dark-800 border-dark-600"
                      />
                      <span className="text-white font-medium">Empresa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-dark-900 px-4 py-3 border border-dark-600 rounded-lg flex-1 transition-colors hover:border-primary-500">
                      <input 
                        type="radio" 
                        name="tipoOferente" 
                        value="Particular" 
                        checked={tipoOferente === 'Particular'}
                        onChange={(e) => setTipoOferente(e.target.value)}
                        className="text-primary-500 bg-dark-800 border-dark-600"
                      />
                      <span className="text-white font-medium">Particular</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {tipoOferente === 'Empresa' ? 'Nombre de la Empresa' : 'Tu Nombre o Nombre de Familia'}
                  </label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Descripción de la Empresa</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="Describe a tu empresa o el tipo de trabajos que ofreces..."
                  ></textarea>
                </div>
              </>
            )}

            {/* SHARED FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono de Contacto</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Zona de residencia / operaciones</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-500" size={18} />
                  <select 
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-10 pr-4 py-2.5 text-white appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="Villa del Rosario" className="bg-dark-900 text-white">Villa del Rosario</option>
                    <option value="Luque" className="bg-dark-900 text-white">Luque</option>
                    <option value="Rincón" className="bg-dark-900 text-white">Rincón</option>
                    <option value="Otra" className="bg-dark-900 text-white">Otra zona</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-dark-700 flex justify-end">
              <button 
                type="submit"
                disabled={saved}
                className={`${saved ? 'bg-green-500 hover:bg-green-500 cursor-default' : 'bg-primary-600 hover:bg-primary-500 transform hover:scale-105 active:scale-95'} text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-all`}
              >
                {saved ? (
                  <><CheckCircle size={20} /> ¡Guardado!</>
                ) : (
                  <><Save size={20} /> Guardar Cambios</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
