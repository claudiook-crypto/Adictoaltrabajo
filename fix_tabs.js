const fs = require('fs');

// Fix DashboardOferente - persist activeTab
let oferente = fs.readFileSync('frontend/src/pages/oferente/DashboardOferente.tsx', 'utf8');
oferente = oferente.replace(
  `const [activeTab, setActiveTab] = useState<'ofertas' | 'respuestas'>('ofertas');`,
  `const [activeTab, setActiveTab] = useState<'ofertas' | 'respuestas'>((sessionStorage.getItem('oferenteTab') as 'ofertas' | 'respuestas') || 'ofertas');\n\n  useEffect(() => {\n    sessionStorage.setItem('oferenteTab', activeTab);\n  }, [activeTab]);`
);
fs.writeFileSync('frontend/src/pages/oferente/DashboardOferente.tsx', oferente);
console.log("DashboardOferente done");

// Fix DashboardPostulante - persist activeTab
let postulante = fs.readFileSync('frontend/src/pages/postulante/DashboardPostulante.tsx', 'utf8');
postulante = postulante.replace(
  `const [activeTab, setActiveTab] = useState<'buscar' | 'historial'>('buscar');`,
  `const [activeTab, setActiveTab] = useState<'buscar' | 'historial'>((sessionStorage.getItem('postulanteTab') as 'buscar' | 'historial') || 'buscar');\n\n  useEffect(() => {\n    sessionStorage.setItem('postulanteTab', activeTab);\n  }, [activeTab]);`
);
fs.writeFileSync('frontend/src/pages/postulante/DashboardPostulante.tsx', postulante);
console.log("DashboardPostulante done");
