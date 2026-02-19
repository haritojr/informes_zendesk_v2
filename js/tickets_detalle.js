let fullData = {};
let allTicketsFlat = [];

window.addEventListener('load', () => {
    if (!Core || !Core.hasData()) { window.location.href = 'index.html'; return; }
    if (typeof Papa === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
        script.onload = () => initParse();
        document.head.appendChild(script);
    } else { initParse(); }
});

function initParse() {
    Core.togglePreloader(true, "Cargando Auditoría...");
    setTimeout(() => {
        Papa.parse(Core.getData(), {
            header: true, skipEmptyLines: true, worker: false,
            complete: (results) => processData(results.data, results.meta.fields),
            error: (err) => { console.error(err); Core.togglePreloader(false); }
        });
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    const orgSearch = document.getElementById('orgSearch');
    if(orgSearch) {
        orgSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.org-list-item').forEach(item => {
                item.style.display = item.innerText.toLowerCase().includes(term) ? 'block' : 'none';
            });
        });
    }

    const btnCollapse = document.getElementById('btnCollapseList');
    const btnExpand = document.getElementById('btnExpandList');
    const listPane = document.getElementById('listPane');
    if(btnCollapse && btnExpand && listPane) {
        btnCollapse.addEventListener('click', () => { listPane.classList.add('hidden-pane'); btnExpand.classList.remove('hidden'); });
        btnExpand.addEventListener('click', () => { listPane.classList.remove('hidden-pane'); btnExpand.classList.add('hidden'); });
    }

    // --- CONTENEDOR BOTONES EXPORTAR ---
    const detailContainer = document.getElementById('detailContainer');
    if (detailContainer) {
        const btnContainer = document.createElement('div');
        Object.assign(btnContainer.style, {
            position: 'absolute', top: '10px', right: '20px', display: 'flex', gap: '8px'
        });

        const btnStyle = {
            padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: 'white',
            borderRadius: '4px', cursor: 'pointer', color: '#1e293b', fontWeight: '600'
        };

        const btnCsv = document.createElement('button');
        btnCsv.innerText = '📥 CSV';
        Object.assign(btnCsv.style, btnStyle);
        btnCsv.onclick = () => exportCurrentView('csv');

        const btnExcel = document.createElement('button');
        btnExcel.innerText = '📊 Excel';
        Object.assign(btnExcel.style, btnStyle);
        btnExcel.style.borderColor = '#22c55e';
        btnExcel.style.color = '#15803d';
        btnExcel.onclick = () => exportCurrentView('excel');

        btnContainer.appendChild(btnCsv);
        btnContainer.appendChild(btnExcel);
        detailContainer.appendChild(btnContainer);
    }
});

function localDetectSchema(headers) {
    if (!headers || !headers.length) return {};
    const h = headers.map(x => String(x).toLowerCase().trim());
    const findContains = (kw) => headers[h.findIndex(x => kw.some(k => x.includes(k)))];
    const findIdLike = () => {
        const idKeywords = ['id', 'ticket', 'nº', 'no.', 'ref', 'código', 'incidencia'];
        let idx = h.findIndex(x => x === 'id' || x === 'ticket' || x.startsWith('id '));
        if (idx === -1) idx = h.findIndex(x => idKeywords.some(k => x.includes(k)));
        return idx !== -1 ? headers[idx] : null;
    };
    return {
        org: findContains(['organiz', 'empresa', 'company']),
        user: findContains(['solicitante', 'requester', 'nombre', 'user']),
        agent: findContains(['agente', 'tecnico', 'asignado']),
        dateCreated: findContains(['creado', 'created', 'fecha']), 
        dateResolved: findContains(['resuelto', 'resolved', 'cierre']),
        time: findContains(['tiempo', 'time', 'minutos']),
        ticketId: findIdLike()
    };
}

function processData(rows, headers) {
    let schema = (Core.getSchema && typeof Core.getSchema === 'function') ? Core.getSchema() : {};
    const local = localDetectSchema(headers);
    schema.dateCreated = local.dateCreated || schema.date;
    schema.dateResolved = local.dateResolved;
    schema.ticketId = local.ticketId || schema.ticketId;
    if (!schema.org) schema.org = local.org;
    if (!schema.ticketId && headers.length > 0) schema.ticketId = headers[0];

    const { org: colOrg, user: colUser, agent: colAgent, dateCreated: colCreated, dateResolved: colResolved, time: colTime, ticketId: colId } = schema;
    if (!colOrg) { alert("No se pudo identificar la columna 'Organización'."); Core.togglePreloader(false); return; }

    let filteredRows = rows;
    if (colCreated) { filteredRows = Core.applyDateFilter(rows, colCreated); }

    fullData = {};
    allTicketsFlat = [];
    
    filteredRows.forEach(row => {
        const org = row[colOrg];
        if(org && !String(org).toLowerCase().includes('total')) {
            if(!fullData[org]) fullData[org] = [];
            let timeVal = 0;
            if (colTime && row[colTime]) {
                const valStr = String(row[colTime]).replace(',', '.').trim();
                timeVal = parseFloat(valStr) || 0;
            }
            let rawId = colId ? (row[colId] || '-') : '-';
            if (rawId.length > 20) rawId = '#';

            const ticket = {
                id: rawId,
                req: colUser ? (row[colUser] || 'Desc.') : 'Desc.',
                agent: colAgent ? (row[colAgent] || 'Sin Asignar') : 'Sin Asignar',
                created: colCreated ? (row[colCreated] || '-') : '-',
                resolved: colResolved ? (row[colResolved] || '-') : '-',
                time: timeVal
            };
            
            fullData[org].push(ticket);
            allTicketsFlat.push({ ...ticket, Organizacion: org });
        }
    });

    renderList(Object.keys(fullData).sort());
    Core.togglePreloader(false);
}

function renderList(orgs) {
    const list = document.getElementById('orgList');
    if(!list) return;
    list.innerHTML = '';
    if(orgs.length === 0) { list.innerHTML = '<div class="p-4 text-center text-muted text-sm">Sin datos disponibles</div>'; return; }
    const fragment = document.createDocumentFragment();
    orgs.forEach(org => {
        const div = document.createElement('div');
        div.className = 'org-list-item';
        div.innerText = org;
        div.onclick = function() { showDetail(org, this); };
        fragment.appendChild(div);
    });
    list.appendChild(fragment);
}

function showDetail(org, el) {
    document.querySelectorAll('.org-list-item').forEach(d => d.classList.remove('active'));
    if(el) el.classList.add('active');
    document.getElementById('selectPrompt').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');

    const tickets = fullData[org] || [];
    document.getElementById('detailTitle').innerText = org;
    document.getElementById('detailTotal').innerText = tickets.length;
    const sumTime = tickets.reduce((a,b) => a + b.time, 0);
    document.getElementById('detailTimeTotal').innerText = sumTime.toFixed(1);
    document.getElementById('detailAvg').innerText = tickets.length ? (sumTime / tickets.length).toFixed(1) : '0';

    const tbody = document.getElementById('detailTableBody');
    if(tbody) {
        const renderData = tickets.slice(0, 500);
        tbody.innerHTML = renderData.map(t => `
            <tr>
                <td class="text-mono text-bold" style="color:var(--mp-dark); font-size:0.85rem;">${t.id}</td>
                <td>${t.req}</td>
                <td class="text-muted italic text-sm">${t.agent}</td>
                <td class="date-cell">${t.created.split(' ')[0]}</td>
                <td class="date-cell text-muted">${t.resolved.split(' ')[0]}</td>
                <td class="text-right text-bold">${t.time}</td>
            </tr>
        `).join('');
        if (tickets.length > 500) tbody.innerHTML += `<tr><td colspan="6" class="text-center text-muted p-2">... Mostrando 500 de ${tickets.length} ...</td></tr>`;
    }
}

function exportCurrentView(type) {
    const activeItem = document.querySelector('.org-list-item.active');
    let data = [];
    let filename = 'auditoria';

    if (activeItem) {
        const orgName = activeItem.innerText;
        data = fullData[orgName].map(t => ({
            "ID": t.id, "Organización": orgName, "Solicitante": t.req, "Agente": t.agent,
            "Creado": t.created, "Resuelto": t.resolved, "Tiempo (min)": t.time
        }));
        filename = `auditoria_${orgName.replace(/\s+/g, '_')}`;
    } else {
        if(allTicketsFlat.length === 0) { alert("No hay datos para exportar."); return; }
        if(!confirm(`¿Exportar todo (${allTicketsFlat.length} tickets)?`)) return;
        data = allTicketsFlat;
        filename = 'auditoria_completa';
    }

    if (type === 'excel') Core.downloadExcel(data, filename, 'Tickets');
    else Core.downloadCSV(data, filename + '.csv');
}