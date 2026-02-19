let rawData = [];

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('appSidebar');
    if(toggleBtn && sidebar) toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = rawData.filter(d => 
                d.name.toLowerCase().includes(term) || 
                d.users.some(u => u.name.toLowerCase().includes(term))
            );
            renderTable(filtered);
        });
    }

    // --- CONTENEDOR BOTONES EXPORTAR ---
    const card = document.querySelector('.card');
    if (card) {
        const btnContainer = document.createElement('div');
        Object.assign(btnContainer.style, {
            display: 'flex', gap: '8px', alignSelf: 'flex-end', marginBottom: '10px'
        });

        const btnStyle = {
            padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: 'white',
            borderRadius: '4px', cursor: 'pointer', color: '#1e293b', fontWeight: '600'
        };

        const btnCsv = document.createElement('button');
        btnCsv.innerText = '📥 CSV';
        Object.assign(btnCsv.style, btnStyle);
        btnCsv.onclick = () => exportDesglose('csv');

        const btnExcel = document.createElement('button');
        btnExcel.innerText = '📊 Excel';
        Object.assign(btnExcel.style, btnStyle);
        btnExcel.style.borderColor = '#22c55e';
        btnExcel.style.color = '#15803d';
        btnExcel.onclick = () => exportDesglose('excel');

        btnContainer.appendChild(btnCsv);
        btnContainer.appendChild(btnExcel);
        card.insertBefore(btnContainer, searchInput);
    }
});

window.addEventListener('load', () => {
    if (!Core.hasData()) { window.location.href = 'index.html'; return; }
    Papa.parse(Core.getData(), {
        header: true, skipEmptyLines: true,
        complete: (results) => processData(results.data, results.meta.fields),
        error: () => Core.togglePreloader(false)
    });
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
        // Prioridad: Buscar 'organiz' o 'empresa' o 'cliente'
        org: find(['organiz', 'empresa', 'company', 'cliente']),
        // Prioridad: Buscar 'solicitante' o 'requester', EXCLUYENDO 'organiz'/'empresa' para no confundirse
        user: find(['solicitante', 'requester', 'nombre', 'user'], ['organiz', 'empresa', 'cliente'])
    };
}

function processData(rows, headers) {
    let schema = (Core.getSchema && typeof Core.getSchema === 'function') ? Core.getSchema() : {};
    
    // Forzamos detección local si falta algo o si son iguales (error común)
    if (!schema.org || !schema.user || !schema.date || schema.org === schema.user) {
        const local = localDetectSchema(headers);
        schema.org = local.org || schema.org;
        schema.user = local.user || schema.user;
        // schema.date no es crítico aquí, pero lo mantenemos si existe
    }

    const { org: colOrg, user: colUser, date: colDate } = schema;

    if (!colOrg) { alert("No se pudo identificar la columna Organización."); Core.togglePreloader(false); return; }

    let filteredRows = rows;
    if (colDate) { filteredRows = Core.applyDateFilter(rows, colDate); }

    const tree = {};
    
    filteredRows.forEach(row => {
        const orgName = row[colOrg];
        // Validación estricta del nombre de la organización
        if(!orgName || String(orgName).toLowerCase().includes('total') || orgName.trim() === '') return;
        
        // Obtener solicitante. Si no hay columna, usar placeholder.
        let userName = colUser ? row[colUser] : "Sin Identificar";
        if (!userName || userName.trim() === "") userName = "General";
        
        // Estructura: { "Nombre Org": { total: 0, reqs: { "Nombre User": count } } }
        if(!tree[orgName]) tree[orgName] = { total: 0, reqs: {} };
        
        tree[orgName].total += 1;
        tree[orgName].reqs[userName] = (tree[orgName].reqs[userName] || 0) + 1;
    });

    // Convertir objeto a array ordenado para renderizar
    rawData = Object.entries(tree).map(([name, data]) => ({
        name,
        total: data.total,
        users: Object.entries(data.reqs)
            .map(([r, c]) => ({ name: r, count: c }))
            .sort((a,b) => b.count - a.count)
    })).sort((a,b) => b.total - a.total);

    renderTable(rawData);
    Core.togglePreloader(false);
}

function renderTable(data) {
    const tbody = document.getElementById('dataTable');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">No hay datos disponibles para mostrar</td></tr>';
        return;
    }

    data.forEach((org, idx) => {
        // Fila Padre (Organización)
        const tr = document.createElement('tr');
        tr.className = 'row-parent';
        tr.onclick = () => toggleRow(tr, `detail-${idx}`);
        tr.innerHTML = `
            <td><span class="toggle-icon">▶</span></td>
            <td class="text-bold">${org.name}</td>
            <td>${org.users.length}</td>
            <td class="text-right text-bold">${org.total}</td>
        `;
        tbody.appendChild(tr);

        // Fila Hija (Tabla anidada de solicitantes)
        const trChild = document.createElement('tr');
        trChild.id = `detail-${idx}`;
        trChild.className = 'row-child';
        
        const innerRows = org.users.map(u => `
            <tr>
                <td style="padding-left: 2rem;">${u.name}</td>
                <td class="text-right">${u.count}</td>
            </tr>
        `).join('');

        trChild.innerHTML = `
            <td colspan="4" class="p-0">
                <div class="p-2 bg-slate-50">
                    <table class="nested-table">
                        <thead>
                            <tr>
                                <th style="padding-left: 2rem;">Solicitante</th>
                                <th class="text-right">Tickets</th>
                            </tr>
                        </thead>
                        <tbody>${innerRows}</tbody>
                    </table>
                </div>
            </td>
        `;
        tbody.appendChild(trChild);
    });
}

function toggleRow(tr, childId) {
    tr.classList.toggle('expanded');
    const child = document.getElementById(childId);
    if(child) child.classList.toggle('show');
}

function exportDesglose(type) {
    const flatData = [];
    rawData.forEach(org => {
        org.users.forEach(user => {
            flatData.push({ 
                "Organización": org.name, 
                "Solicitante": user.name, 
                "Tickets": user.count 
            });
        });
    });
    
    if (type === 'excel') Core.downloadExcel(flatData, 'desglose_jerarquico', 'Desglose');
    else Core.downloadCSV(flatData, 'desglose_jerarquico.csv');
}