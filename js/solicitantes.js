let allData = []; // Todos los datos procesados
let chartInstance = null;
const MAX_SELECTION = 25;

window.addEventListener('load', () => {
    if (!Core || !Core.hasData()) {
        window.location.href = 'index.html';
        return;
    }
    
    if (typeof Papa === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
        script.onload = () => initParse();
        document.head.appendChild(script);
    } else {
        initParse();
    }
});

function initParse() {
    Core.togglePreloader(true, "Analizando Solicitantes...");
    setTimeout(() => {
        Papa.parse(Core.getData(), {
            header: true, skipEmptyLines: true,
            complete: (results) => processData(results.data, results.meta.fields),
            error: (err) => { console.error(err); Core.togglePreloader(false); }
        });
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Buscador Tabla
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderTable(allData.filter(d => d.name.toLowerCase().includes(term)));
        });

        // --- BOTONES EXPORTAR ---
        const btnContainer = document.createElement('div');
        btnContainer.style.float = 'right';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '8px';
        btnContainer.style.marginLeft = '10px';

        const btnStyle = {
            padding: '6px 12px',
            fontSize: '0.85rem',
            border: '1px solid #e2e8f0',
            backgroundColor: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#1e293b',
            fontWeight: '600',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        };

        const btnCsv = document.createElement('button');
        btnCsv.innerHTML = '📥 CSV';
        Object.assign(btnCsv.style, btnStyle);
        btnCsv.onclick = () => {
            if(!allData || allData.length === 0) { alert("No hay datos"); return; }
            const exportData = allData.map(item => ({ "Solicitante": item.name, "Cantidad": item.value }));
            Core.downloadCSV(exportData, 'solicitantes.csv');
        };

        const btnExcel = document.createElement('button');
        btnExcel.innerHTML = '📊 Excel';
        Object.assign(btnExcel.style, btnStyle);
        btnExcel.style.borderColor = '#22c55e';
        btnExcel.style.color = '#15803d';
        btnExcel.onclick = () => {
            if(!allData || allData.length === 0) { alert("No hay datos"); return; }
            const exportData = allData.map(item => ({ "Solicitante": item.name, "Cantidad": item.value }));
            Core.downloadExcel(exportData, 'solicitantes', 'Solicitantes');
        };

        btnContainer.appendChild(btnCsv);
        btnContainer.appendChild(btnExcel);
        searchInput.parentElement.insertBefore(btnContainer, searchInput);
    }

    // Configuración adicional UI
    const btnToggle = document.getElementById('btnToggleConfig');
    const panel = document.getElementById('configPanel');
    if(btnToggle && panel) btnToggle.addEventListener('click', () => panel.classList.toggle('hidden'));

    const btnUpdate = document.getElementById('btnUpdateChart');
    if(btnUpdate) btnUpdate.addEventListener('click', updateChartFromSelection);

    const btnClear = document.getElementById('btnClearSelection');
    if(btnClear) btnClear.addEventListener('click', () => {
        document.querySelectorAll('.chart-selector').forEach(c => c.checked = false);
        updateSelectionCounter();
    });

    const searchSelector = document.getElementById('searchSelector');
    if(searchSelector) {
        searchSelector.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.checkbox-label').forEach(lbl => {
                lbl.style.display = lbl.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }
});

function localDetectSchema(headers) {
    if (!headers || !headers.length) return {};
    const h = headers.map(x => String(x).toLowerCase().trim());
    
    // Función de búsqueda con exclusión estricta
    const find = (keywords, excludeList = []) => {
        const idx = h.findIndex(x => 
            keywords.some(k => x.includes(k)) && 
            !excludeList.some(ex => x.includes(ex))
        );
        return idx !== -1 ? headers[idx] : null;
    };

    return { 
        // CLAVE: Excluir explícitamente palabras de organización/agente para encontrar el usuario real
        user: find(['solicitante', 'requester', 'nombre', 'user', 'contacto'], ['organiz', 'empresa', 'cliente', 'agente', 'tecnico']),
        date: find(['fecha', 'date', 'creado']) 
    };
}

function processData(rows, headers) {
    let schema = (Core.getSchema && typeof Core.getSchema === 'function') ? Core.getSchema() : {};
    
    // Forzamos la detección local si falta el usuario o si parece incorrecto
    // (Ej: Si la columna detectada contiene 'Organización', está mal)
    if (!schema.user || (schema.user && schema.user.toLowerCase().includes('organiz'))) {
        const local = localDetectSchema(headers);
        schema.user = local.user || schema.user;
        if (!schema.date) schema.date = local.date;
    }

    const colUser = schema.user;
    const colDate = schema.date;

    if (!colUser) { 
        alert("No se encontró la columna de Solicitante. Verifique el archivo CSV."); 
        Core.togglePreloader(false); 
        return; 
    }

    // Aplicar Filtro Global de Fechas
    let filteredRows = rows;
    if (colDate) {
        filteredRows = Core.applyDateFilter(rows, colDate);
    }

    const counts = {};
    filteredRows.forEach(row => {
        const nameRaw = row[colUser];
        // Filtrar vacíos o filas de totales
        if(!nameRaw || String(nameRaw).toLowerCase().includes('total') || nameRaw.trim() === '') return;
        
        const name = nameRaw.trim();
        counts[name] = (counts[name] || 0) + 1;
    });

    allData = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);

    updateKPIs();
    renderTable(allData);
    renderConfigPanel();
    renderChart(allData.slice(0, 15));
    
    Core.togglePreloader(false);
}

function updateKPIs() {
    const total = allData.reduce((a,b) => a + b.value, 0);
    document.getElementById('totalTickets').innerText = total.toLocaleString();
    document.getElementById('totalRequesters').innerText = allData.length.toLocaleString();
    document.getElementById('avgTickets').innerText = allData.length ? (total / allData.length).toFixed(1) : '0';
}

function renderConfigPanel() {
    const container = document.getElementById('checkboxContainer');
    if(!container) return;
    
    container.innerHTML = '';
    const sortedForList = [...allData].sort((a,b) => a.name.localeCompare(b.name));
    const frag = document.createDocumentFragment();

    sortedForList.forEach(item => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const isTop15 = allData.indexOf(item) < 15;
        label.innerHTML = `
            <input type="checkbox" value="${item.name}" ${isTop15 ? 'checked' : ''} class="chart-selector">
            <span class="truncate" title="${item.name}">${item.name} (${item.value})</span>
        `;
        label.querySelector('input').addEventListener('change', handleSelectionChange);
        frag.appendChild(label);
    });

    container.appendChild(frag);
    updateSelectionCounter();
}

function handleSelectionChange(e) {
    const checked = document.querySelectorAll('.chart-selector:checked');
    if (checked.length > MAX_SELECTION) {
        e.target.checked = false;
        alert(`Máximo ${MAX_SELECTION} elementos permitidos.`);
    }
    updateSelectionCounter();
}

function updateSelectionCounter() {
    const count = document.querySelectorAll('.chart-selector:checked').length;
    const badge = document.getElementById('selectionCounter');
    if(badge) {
        badge.innerText = `${count}/${MAX_SELECTION}`;
        badge.classList.toggle('limit', count >= MAX_SELECTION);
    }
}

function updateChartFromSelection() {
    const checkboxes = document.querySelectorAll('.chart-selector:checked');
    const selectedNames = Array.from(checkboxes).map(c => c.value);
    
    if (selectedNames.length === 0) { alert("Selecciona al menos un elemento."); return; }

    let subset = allData.filter(d => selectedNames.includes(d.name));
    const sortType = document.querySelector('input[name="sortOrder"]:checked').value;
    
    if (sortType === 'value') subset.sort((a,b) => b.value - a.value);
    else subset.sort((a,b) => a.name.localeCompare(b.name));

    renderChart(subset);
}

function renderChart(data) {
    const canvas = document.getElementById('requesterChart');
    if(!canvas) return;

    if(chartInstance) chartInstance.destroy();
    const ctx = canvas.getContext('2d');
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Tickets',
                data: data.map(d => d.value),
                backgroundColor: '#c92228',
                borderRadius: 4,
                barPercentage: 0.7
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById('dataTable');
    if(!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center p-4">No se encontraron datos</td></tr>';
        return;
    }

    const displayData = data.slice(0, 500); 
    tbody.innerHTML = displayData.map(d => `
        <tr>
            <td class="text-medium">${d.name}</td>
            <td class="text-right text-bold">${d.value}</td>
        </tr>
    `).join('');
    
    if (data.length > 500) {
        tbody.innerHTML += `<tr><td colspan="2" class="text-center text-muted italic">... Mostrando primeros 500 registros ...</td></tr>`;
    }
}