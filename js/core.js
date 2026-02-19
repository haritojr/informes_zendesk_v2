const APP_KEY = 'mp_tickets_data';
const SCHEMA_KEY = 'mp_schema_map';
const FILTER_KEY = 'mp_date_filter'; 

const Core = {
    loadingStartTime: 0, 

    // --- 1. GESTIÓN DE INTERFAZ Y MÓVIL ---
    initSidebar: () => {
        const container = document.getElementById('appSidebar'); 
        if (!container) return;

        // Inyectar Overlay para móvil
        if (!document.getElementById('sidebarOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            document.body.appendChild(overlay);
            
            // Cerrar al hacer clic fuera
            overlay.addEventListener('click', () => {
                container.classList.remove('mobile-active');
                overlay.classList.remove('active');
            });
        }

        // Inyectar Botón Flotante para móvil
        if (!document.getElementById('mobileMenuTrigger')) {
            const fab = document.createElement('button');
            fab.id = 'mobileMenuTrigger';
            fab.innerHTML = '☰'; // Icono Hamburguesa
            fab.title = "Abrir Menú";
            document.body.appendChild(fab);
            
            fab.addEventListener('click', () => {
                container.classList.add('mobile-active');
                document.getElementById('sidebarOverlay').classList.add('active');
            });
        }

        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        const filter = Core.getDateFilter();

        const menuItems = [
            { file: 'index.html', icon: '🏠', text: 'Inicio' },
            { file: 'solicitantes.html', icon: '👤', text: 'Solicitantes' },
            { file: 'organizaciones.html', icon: '🏢', text: 'Organizaciones' },
            { file: 'org_desglose.html', icon: '📊', text: 'Desglose' },
            { file: 'estadisticas.html', icon: '📈', text: 'Estadísticas' }, 
            { file: 'tickets_detalle.html', icon: '⏱️', text: 'Auditoría' }
        ];

        let navHtml = menuItems.map(item => {
            const isActive = currentFile === item.file ? 'active' : '';
            return `<a href="${item.file}" class="nav-link ${isActive}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.text}</span>
                    </a>`;
        }).join('');

        // Filtro compacto
        const bottomSectionHtml = `
            <div style="background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);">
                <div style="padding: 0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; font-weight: bold;">📅 Periodo</span>
                        <span id="activeFilterLabel" style="font-size: 0.65rem; color: var(--mp-red); ${filter.mode === 'all' ? 'display:none' : ''}">● Filtro</span>
                    </div>
                    
                    <select id="globalDatePreset" style="width: 100%; background: #1e293b; color: white; border: 1px solid #334155; padding: 4px; border-radius: 4px; font-size: 0.8rem;">
                        <option value="all" ${filter.mode === 'all' ? 'selected' : ''}>Todo el histórico</option>
                        <option value="this_year" ${filter.mode === 'this_year' ? 'selected' : ''}>Este Año</option>
                        <option value="last_30" ${filter.mode === 'last_30' ? 'selected' : ''}>Últimos 30 días</option>
                        <option value="custom" ${filter.mode === 'custom' ? 'selected' : ''}>Personalizado...</option>
                    </select>
                    
                    <div id="customDateInputs" class="${filter.mode !== 'custom' ? 'hidden' : ''}" style="margin-top: 6px;">
                        <div style="display: flex; gap: 4px; margin-bottom: 4px;">
                            <input type="date" id="globalDateStart" value="${filter.start}" style="width: 50%; background: #1e293b; color: white; border: 1px solid #334155; padding: 2px; border-radius: 3px; font-size: 0.7rem;">
                            <input type="date" id="globalDateEnd" value="${filter.end}" style="width: 50%; background: #1e293b; color: white; border: 1px solid #334155; padding: 2px; border-radius: 3px; font-size: 0.7rem;">
                        </div>
                        <button id="btnApplyFilter" style="width:100%; background: var(--mp-red); color: white; border: none; padding: 4px; border-radius: 3px; cursor: pointer; font-size: 0.75rem; font-weight: 600;">Aplicar</button>
                    </div>
                </div>
                <div class="sidebar-footer" style="padding: 0.5rem; text-align: center; font-size: 0.65rem; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05);">
                    MP Intelligence v2.3
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="sidebar-header" style="padding: 1rem 1.5rem; height: 70px;">
                <div class="logo-container">
                    <img src="assets/logo.png" alt="MP" class="logo-img logo-invert" style="height: 28px;">
                    
                </div>
                <button id="sidebarToggle" title="Colapsar menú" style="display: flex;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            </div>
            
            <nav class="nav-menu" style="flex: 1; overflow-y: auto;">
                ${navHtml}
            </nav>
            
            ${bottomSectionHtml}
        `;

        // Eventos Toggle (Desktop) y Cierre (Móvil)
        const toggleBtn = document.getElementById('sidebarToggle');
        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                // En móvil, este botón (dentro del menú) sirve para cerrar el menú
                if (window.innerWidth <= 768) {
                    container.classList.remove('mobile-active');
                    document.getElementById('sidebarOverlay').classList.remove('active');
                } else {
                    container.classList.toggle('collapsed');
                }
            });
        }

        // Filtros
        const presetSelect = document.getElementById('globalDatePreset');
        const customInputs = document.getElementById('customDateInputs');
        const activeLabel = document.getElementById('activeFilterLabel');
        const btnApply = document.getElementById('btnApplyFilter');

        if(presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                if (mode === 'custom') {
                    customInputs.classList.remove('hidden');
                    if(activeLabel) activeLabel.style.display = 'none';
                } else {
                    customInputs.classList.add('hidden');
                    Core.setDateFilter(mode);
                    window.location.reload();
                }
            });
        }

        if(btnApply) {
            btnApply.addEventListener('click', () => {
                const start = document.getElementById('globalDateStart').value;
                const end = document.getElementById('globalDateEnd').value;
                Core.setDateFilter('custom', start, end);
                window.location.reload();
            });
        }
    },

    // --- 2. FILTRADO FECHAS ---
    getDateFilter: () => {
        try { return JSON.parse(sessionStorage.getItem(FILTER_KEY)) || { mode: 'all', start: '', end: '' }; } 
        catch { return { mode: 'all', start: '', end: '' }; }
    },
    setDateFilter: (mode, start = '', end = '') => {
        sessionStorage.setItem(FILTER_KEY, JSON.stringify({ mode, start, end }));
    },
    applyDateFilter: (rows, colDate) => {
        const filter = Core.getDateFilter();
        if (filter.mode === 'all') return rows;

        let startDate = null;
        let endDate = null;
        const now = new Date();

        if (filter.mode === 'this_year') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        } else if (filter.mode === 'last_30') {
            startDate = new Date();
            startDate.setDate(now.getDate() - 30);
            endDate = now;
        } else if (filter.mode === 'custom') {
            if (filter.start) startDate = new Date(filter.start);
            if (filter.end) {
                endDate = new Date(filter.end);
                endDate.setHours(23, 59, 59);
            }
        }

        if (!startDate && !endDate) return rows;

        return rows.filter(row => {
            const dateStr = row[colDate];
            if (!dateStr) return false;
            const d = Core.parseDate(dateStr);
            if (!d) return false;
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        });
    },
    parseDate: (dateStr) => {
        try {
            let d = new Date(String(dateStr));
            if (!isNaN(d.getTime())) return d;
            const parts = String(dateStr).split(/[\/\-\s]/);
            if (parts.length >= 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } catch(e) { return null; }
        return null;
    },

    // --- 3. EXPORTACIÓN ---
    downloadCSV: (data, filename) => {
        if (!data || !data.length) { alert("No hay datos."); return; }
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },
    downloadExcel: (data, filename, sheetName = "Datos") => {
        if (!data || !data.length) { alert("No hay datos."); return; }
        if (typeof XLSX === 'undefined') {
            Core.togglePreloader(true, "Cargando Excel...");
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
            script.onload = () => { Core._generateXLSX(data, filename, sheetName); Core.togglePreloader(false); };
            script.onerror = () => { alert("Error red Excel."); Core.togglePreloader(false); };
            document.head.appendChild(script);
        } else { Core._generateXLSX(data, filename, sheetName); }
    },
    _generateXLSX: (data, filename, sheetName) => {
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            if (data.length > 0) {
                ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 15) }));
            }
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
        } catch (e) { alert("Error generando Excel."); }
    },

    // --- 4. SISTEMA ---
    togglePreloader: (show, text = "Cargando...") => {
        const el = document.getElementById('preloader');
        const txtEl = document.getElementById('preloaderText');
        if (!el) return;
        if (txtEl) txtEl.innerText = text;
        if (show) {
            Core.loadingStartTime = Date.now();
            el.classList.remove('hidden');
            void el.offsetWidth; el.style.opacity = '1';
        } else {
            const minDuration = 300;
            const elapsed = Date.now() - Core.loadingStartTime;
            const remaining = Math.max(0, minDuration - elapsed);
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.classList.add('hidden'), 500); }, remaining);
        }
    },
    saveData: (csvText, metaFields) => {
        try {
            sessionStorage.setItem(APP_KEY, csvText);
            if(metaFields && Array.isArray(metaFields)) {
                try {
                    const schema = Core.detectSchema(metaFields);
                    sessionStorage.setItem(SCHEMA_KEY, JSON.stringify(schema));
                } catch(e){}
            }
            return true;
        } catch (e) { alert("Error: Archivo muy grande."); return false; }
    },
    getData: () => sessionStorage.getItem(APP_KEY),
    getSchema: () => { try { return JSON.parse(sessionStorage.getItem(SCHEMA_KEY)) || {}; } catch { return {}; } },
    hasData: () => { try { const data = sessionStorage.getItem(APP_KEY); return data && data.length > 0; } catch { return false; } },
    clearData: () => {
        sessionStorage.removeItem(APP_KEY);
        sessionStorage.removeItem(SCHEMA_KEY);
        sessionStorage.removeItem(FILTER_KEY);
        window.location.href = 'index.html';
    },
    detectSchema: (headers) => {
        if (!Array.isArray(headers)) return {};
        const h = headers.map(x => String(x || '').toLowerCase().trim());
        const find = (kw, ex) => headers[h.findIndex(x => kw.some(k => x.includes(k)) && (!ex || !x.includes(ex)))];
        return {
            org: find(['organiz', 'empresa', 'company', 'cliente']),
            user: find(['solicitante', 'requester', 'nombre', 'user'], 'agente'),
            agent: find(['agente', 'tecnico', 'asignado']),
            date: find(['fecha', 'date', 'creado', 'created']),
            time: find(['tiempo', 'time', 'minutos', 'duration']),
            ticketId: find(['id', 'ticket', 'número', 'nº'])
        };
    }
};

document.addEventListener('DOMContentLoaded', () => { Core.initSidebar(); });