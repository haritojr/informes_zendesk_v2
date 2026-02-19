document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const cards = document.querySelectorAll('.card-link');
    
    const appContainer = document.getElementById('appContainer');
    const landingPage = document.getElementById('landingPage');
    const landingFileInput = document.getElementById('landingFileInput');
    const enterDashboardBtn = document.getElementById('enterDashboardBtn');

    initView();

    if(fileInput) fileInput.addEventListener('change', (e) => handleFileSelect(e));
    if(uploadArea) {
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('active'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('active'); });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault(); uploadArea.classList.remove('active');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect({ target: fileInput });
            }
        });
    }

    if(landingFileInput) landingFileInput.addEventListener('change', (e) => handleFileSelect(e, true));
    if(enterDashboardBtn) enterDashboardBtn.addEventListener('click', () => showDashboard());

    window.cleanAndRestart = function() { Core.clearData(); };

    function initView() {
        if (Core.hasData()) {
            showDashboard();
            updateDashboardUI();
            Core.togglePreloader(false); 
        } else {
            showLanding();
            Core.togglePreloader(false); 
        }
    }

    function showDashboard() {
        if(landingPage) landingPage.classList.add('hidden');
        if(appContainer) appContainer.classList.remove('hidden');
        updateDashboardUI();
    }

    function showLanding() {
        if(appContainer) appContainer.classList.add('hidden');
        if(landingPage) landingPage.classList.remove('hidden');
    }

    function handleFileSelect(e, fromLanding = false) {
        const file = e.target.files[0];
        if (!file) return;

        // Validación básica
        if (file.name.split('.').pop().toLowerCase() !== 'csv') {
            alert("Por favor, seleccione un archivo .CSV");
            return;
        }
        
        if (file.size === 0) {
            alert("El archivo seleccionado está vacío.");
            return;
        }

        // 1. Mostrar Preloader
        Core.togglePreloader(true, "Analizando archivo...");

        // 2. Procesamiento diferido para no bloquear UI
        setTimeout(() => {
            // Lógica principal de procesamiento
            const startProcessing = () => {
                const reader = new FileReader();
                
                reader.onload = function(evt) {
                    const csvText = evt.target.result;
                    
                    try {
                        // Usamos PapaParse para previsualizar cabeceras
                        Papa.parse(csvText, {
                            header: true,
                            preview: 1, 
                            skipEmptyLines: true,
                            complete: (results) => {
                                // Validación extra de resultados
                                if (!results || !results.meta) {
                                    throw new Error("No se pudo leer la estructura del CSV.");
                                }

                                // 3. Guardar datos
                                const success = Core.saveData(csvText, results.meta.fields);
                                
                                if (success) {
                                    setTimeout(() => {
                                        if (fromLanding) showDashboard();
                                        updateDashboardUI();
                                        Core.togglePreloader(false); 
                                    }, 500);
                                } else {
                                    Core.togglePreloader(false);
                                }
                            },
                            error: (err) => {
                                console.error("PapaParse error:", err);
                                alert("Error leyendo el CSV: " + err.message);
                                Core.togglePreloader(false);
                            }
                        });
                    } catch (e) {
                        console.error("Error crítico en lectura:", e);
                        alert("Error al procesar el archivo: " + (e.message || e));
                        Core.togglePreloader(false);
                    }
                };

                reader.onerror = function() {
                    alert("Error de lectura del archivo (Permisos o archivo corrupto).");
                    Core.togglePreloader(false);
                };

                reader.readAsText(file);
            };

            // VERIFICACIÓN Y CARGA DINÁMICA DE LIBRERÍA
            if (typeof Papa === 'undefined') {
                console.warn("Librería PapaParse no detectada. Iniciando carga dinámica de emergencia...");
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
                
                script.onload = () => {
                    console.log("PapaParse cargado dinámicamente con éxito.");
                    startProcessing();
                };
                
                script.onerror = () => {
                    alert("Error Crítico: No se pudo cargar la librería necesaria para leer CSVs. Por favor verifique su conexión a internet.");
                    Core.togglePreloader(false);
                };
                
                document.head.appendChild(script);
            } else {
                startProcessing();
            }

        }, 100);
    }

    function updateDashboardUI() {
        if (Core.hasData()) {
            if(uploadArea) {
                uploadArea.classList.add('success');
                uploadArea.innerHTML = `
                    <div class="text-green font-bold mb-2">¡Datos en Memoria!</div>
                    <p class="text-sm text-muted mb-4">El sistema está listo para el análisis.</p>
                    <button onclick="cleanAndRestart()" class="btn-upload btn-secondary">Borrar y Reiniciar</button>
                `;
            }
            cards.forEach(card => card.classList.remove('disabled'));
        } else {
            cards.forEach(card => card.classList.add('disabled'));
        }
    }
});