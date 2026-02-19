const APP_KEY = 'mp_tickets_data';
const SCHEMA_KEY = 'mp_schema_map';
const FILTER_KEY = 'mp_date_filter'; 
const THEME_KEY = 'mp_theme_mode'; // Nueva key para el tema

const Core = {
    loadingStartTime: 0, 

    // --- GESTIÓN DE INTERFAZ ---
    initSidebar: () => {
        const container = document.getElementById('appSidebar'); 
        if (!container) return;

        // Overlay y Botón Móvil
        if (!document.getElementById('sidebarOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;opacity:0;pointer-events:none;transition:opacity 0.3s;";
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => {
                container.classList.remove('mobile-active');
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
            });
        }

        if (!document.getElementById('mobileMenuTrigger')) {
            const fab = document.createElement('button');
            fab.id = 'mobileMenuTrigger';
            fab.innerHTML = '☰';
            document.body.appendChild(fab);
            fab.addEventListener('click', () => {
                container.classList.add('mobile-active');
                const ov = document.getElementById('sidebarOverlay');
                ov.style.opacity = '1';
                ov.style.pointerEvents = 'auto';
            });
        }

        const path = window.location.pathname;
        const currentFile = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        const filter = Core.getDateFilter();
        const isDark = Core.getTheme() === 'dark'; // Verificar tema

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

        // HTML del Footer con Switch de Modo Oscuro
        const bottomSectionHtml = `
            <div class="sidebar-bottom">
                <div class="sidebar-filter-label">
                    <span>📅 Periodo</span>
                    <span id="activeFilterLabel" class="text-red" style="${filter.mode === 'all' ? 'display:none' : ''}">● Activo</span>
                </div>
                
                <select id="globalDatePreset" class="sidebar-select">
                    <option value="all" ${filter.mode === 'all' ? 'selected' : ''}>Todo el histórico</option>
                    <option value="this_year" ${filter.mode === 'this_year' ? 'selected' : ''}>Este Año</option>
                    <option value="last_30" ${filter.mode === 'last_30' ? 'selected' : ''}>Últimos 30 días</option>
                    <option value="custom" ${filter.mode === 'custom' ? 'selected' : ''}>Personalizado...</option>
                </select>
                
                <div id="customDateInputs" class="${filter.mode !== 'custom' ? 'hidden' : ''}">
                    <div class="sidebar-date-row">
                        <input type="date" id="globalDateStart" value="${filter.start}" class="sidebar-date-input">
                        <input type="date" id="globalDateEnd" value="${filter.end}" class="sidebar-date-input">
                    </div>
                    <button id="btnApplyFilter" class="sidebar-btn-apply">Aplicar Filtro</button>
                </div>

                <!-- SWITCH MODO OSCURO -->
                <div class="theme-switch-wrapper">
                    <span class="theme-label">☀️</span>
                    <label class="theme-switch" for="checkboxTheme">
                        <input type="checkbox" id="checkboxTheme" ${isDark ? 'checked' : ''}>
                        <div class="slider"></div>
                    </label>
                    <span class="theme-label">🌙</span>
                </div>

                <div class="sidebar-footer-text">MP Intelligence v2.4</div>
            </div>
        `;

        container.innerHTML = `
            <div class="sidebar-header">
                <div class="logo-container">
                    <img src="assets/logo.png" alt="MP" class="logo-img">
                </div>
                <button id="sidebarToggle" title="Colapsar menú">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            </div>
            <nav class="nav-menu">${navHtml}</nav>
            ${bottomSectionHtml}
        `;

        // Eventos
        const toggleBtn = document.getElementById('sidebarToggle');
        if(toggleBtn) toggleBtn.addEventListener('click', () => container.classList.toggle('collapsed'));

        const presetSelect = document.getElementById('globalDatePreset');
        const customInputs = document.getElementById('customDateInputs');
        const activeLabel = document.getElementById('activeFilterLabel');
        const btnApply = document.getElementById('btnApplyFilter');
        const themeSwitch = document.getElementById('checkboxTheme');

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

        if(themeSwitch) {
            themeSwitch.addEventListener('change', Core.toggleTheme);
        }
    },

    // --- TEMA OSCURO ---
    getTheme: () => localStorage.getItem(THEME_KEY) || 'light',
    
    toggleTheme: (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem(THEME_KEY, 'light');
        }
    },

    applyStoredTheme: () => {
        const currentTheme = localStorage.getItem(THEME_KEY);
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    },

    // --- FILTRADO FECHAS ---
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

    // --- EXPORTACIÓN ---
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

    // --- SISTEMA ---
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

// Aplicar tema al cargar
document.addEventListener('DOMContentLoaded', () => { 
    Core.applyStoredTheme(); 
    Core.initSidebar(); 
});
