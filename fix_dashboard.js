const fs = require('fs');
let txt = fs.readFileSync('frontend/src/pages/postulante/DashboardPostulante.tsx', 'utf8');

const replacement = `<div className="flex justify-end border-t border-dark-700 pt-3 gap-2 sm:gap-3">
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
                                headers: { Authorization: \`Bearer \${token}\` },
                                body: formData
                              });
                              if (!res.ok) throw new Error('Error al subir CV');
                              const data = await res.json();
                              
                              const updateRes = await fetch(\`/api/ofertas/postulaciones/\${p.postulacion_id}/cv\`, {
                                method: 'PUT',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  Authorization: \`Bearer \${token}\` 
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
                        onClick={async () => {`;

txt = txt.replace(/<div className="flex justify-end border-t border-dark-700 pt-3">\s*<button \s*onClick={async \(\) => {/, replacement);

fs.writeFileSync('frontend/src/pages/postulante/DashboardPostulante.tsx', txt);
console.log("Done updating DashboardPostulante");
