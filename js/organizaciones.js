let allData = [];
let chartInstance = null;
const MAX_SELECTION = 25;

window.addEventListener('load', () => {
    if (!Core.hasData()) { window.location.href = 'index.html'; return; }
    if (typeof Papa === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
        script.onload = () => loadAndProcess();
        document.head.appendChild(script);
    } else { loadAndProcess(); }
});

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
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
            const exportData = allData.map(item => ({ "Organización": item.name, "Total Tickets": item.value }));
            Core.downloadCSV(exportData, 'ranking_organizaciones.csv');
        };

        const btnExcel = document.createElement('button');
        btnExcel.innerHTML = '📊 Excel';
        Object.assign(btnExcel.style, btnStyle);
        btnExcel.style.borderColor = '#22c55e';
        btnExcel.style.color = '#15803d';
        btnExcel.onclick = () => {
            if(!allData || allData.length === 0) { alert("No hay datos"); return; }
            const exportData = allData.map(item => ({ "Organización": item.name, "Total Tickets": item.value }));
            Core.downloadExcel(exportData, 'ranking_organizaciones', 'Ranking');
        };

        btnContainer.appendChild(btnCsv);
        btnContainer.appendChild(btnExcel);
        searchInput.parentElement.insertBefore(btnContainer, searchInput);
    }

    const btnToggle = document.getElementById('btnToggleConfig');
    const panel = document.getElementById('configPanel');
    if(btnToggle && panel) btnToggle.addEventListener('click', () => panel.classList.toggle('hidden'));

    const btnUpdate = document.getElementById('btnUpdateChart');
    if(btnUpdate) btnUpdate.addEventListener('click', updateChartFromSelection);

    const btnClear = document.getElementById('btnClearSelection');
    if(btnClear) btnClear.addEventListener('click', () => {
        document.querySelectorAll('.chart-selector').forEach(cb => cb.checked = false);
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

function loadAndProcess() {
    Core.togglePreloader(true, "Analizando Organizaciones...");
    setTimeout(() => {
        Papa.parse(Core.getData(), {
            header: true, skipEmptyLines: true,
            complete: (results) => {
                processOrganizationData(results.data, results.meta.fields);
                Core.togglePreloader(false);
            },
            error: (err) => { console.error(err); Core.togglePreloader(false); }
        });
    }, 100);
}

function processOrganizationData(data, headers) {
    let schema = (Core.getSchema && typeof Core.getSchema === 'function') ? Core.getSchema() : {};
    if ((!schema.org || !schema.date) && headers) {
        const h = headers.map(x => String(x).toLowerCase().trim());
        const find = (kw) => headers[h.findIndex(x => kw.some(k => x.includes(k)))];
        schema.org = find(['organiz', 'empresa', 'company']);
        schema.date = find(['fecha', 'date', 'creado']);
    }
    const colOrg = schema.org;
    const colDate = schema.date;
    if (!colOrg) { alert("No se encontró columna Organización."); return; }

    let filteredData = data;
    if (colDate) { filteredData = Core.applyDateFilter(data, colDate); }

    const counts = {};
    filteredData.forEach(row => {
        const orgName = row[colOrg];
        if (orgName && !orgName.toLowerCase().includes('total') && orgName.trim() !== "") {
            counts[orgName] = (counts[orgName] || 0) + 1;
        }
    });

    allData = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    updateUI();
    renderConfigPanel();
    renderChart(allData.slice(0, 10));
}

function updateUI() {
    const totalTickets = allData.reduce((a, b) => a + b.value, 0);
    const totalOrgs = allData.length;
    document.getElementById('totalTickets').innerText = totalTickets.toLocaleString();
    document.getElementById('totalOrgs').innerText = totalOrgs.toLocaleString();
    document.getElementById('avgTickets').innerText = totalOrgs > 0 ? (totalTickets / totalOrgs).toFixed(1) : 0;
    renderTable(allData);
}

function renderConfigPanel() {
    const container = document.getElementById('checkboxContainer');
    if(!container) return;
    container.innerHTML = '';
    const sortedList = [...allData].sort((a,b) => a.name.localeCompare(b.name));
    const frag = document.createDocumentFragment();
    sortedList.forEach(item => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const isTop = allData.indexOf(item) < 10;
        label.innerHTML = `<input type="checkbox" value="${item.name}" ${isTop ? 'checked' : ''} class="chart-selector"><span class="truncate" title="${item.name}">${item.name} (${item.value})</span>`;
        label.querySelector('input').addEventListener('change', handleSelectionChange);
        frag.appendChild(label);
    });
    container.appendChild(frag);
    updateSelectionCounter();
}

function handleSelectionChange(e) {
    const checked = document.querySelectorAll('.chart-selector:checked');
    if (checked.length > MAX_SELECTION) { e.target.checked = false; alert(`Máximo ${MAX_SELECTION} organizaciones permitidas.`); }
    updateSelectionCounter();
}

function updateSelectionCounter() {
    const count = document.querySelectorAll('.chart-selector:checked').length;
    const badge = document.getElementById('selectionCounter');
    if(badge) { badge.innerText = `${count}/${MAX_SELECTION}`; badge.classList.toggle('limit', count >= MAX_SELECTION); }
}

function updateChartFromSelection() {
    const checkboxes = document.querySelectorAll('.chart-selector:checked');
    const selectedNames = Array.from(checkboxes).map(c => c.value);
    if (selectedNames.length === 0) { alert("Selecciona al menos una organización."); return; }
    let subset = allData.filter(d => selectedNames.includes(d.name));
    const sortType = document.querySelector('input[name="sortOrder"]:checked').value;
    if (sortType === 'value') subset.sort((a,b) => b.value - a.value); else subset.sort((a,b) => a.name.localeCompare(b.name));
    renderChart(subset);
}

function renderChart(data) {
    const canvas = document.getElementById('orgChart');
    if (!canvas) return;
    if (chartInstance) chartInstance.destroy();
    const ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{ label: 'Tickets', data: data.map(d => d.value), backgroundColor: '#c92228', borderRadius: 4, barPercentage: 0.7 }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { padding: 12, cornerRadius: 8 } },
            scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById('dataTable');
    if (!tbody) return;
    const displayData = data.slice(0, 500);
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="2" class="text-center p-4 text-muted">No hay resultados</td></tr>'; return; }
    tbody.innerHTML = displayData.map(d => `<tr><td class="text-medium">${d.name}</td><td class="text-right text-bold" style="color: var(--mp-red)">${d.value.toLocaleString()}</td></tr>`).join('');
    if (data.length > 500) tbody.innerHTML += `<tr><td colspan="2" class="text-center text-muted">... Mostrando primeros 500 ...</td></tr>`;
}