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
    Core.togglePreloader(true, "Calculando Estadísticas...");
    setTimeout(() => {
        Papa.parse(Core.getData(), {
            header: true, skipEmptyLines: true,
            complete: (results) => processStats(results.data, results.meta.fields),
            error: (err) => { console.error(err); Core.togglePreloader(false); }
        });
    }, 100);
}

function processStats(rows, headers) {
    let schema = (Core.getSchema && typeof Core.getSchema === 'function') ? Core.getSchema() : {};
    
    if (!schema.date && headers) {
        const h = headers.map(x => String(x).toLowerCase());
        const find = (k) => headers[h.findIndex(x => k.some(w => x.includes(w)))];
        schema.date = find(['fecha', 'date', 'creado']);
        schema.agent = find(['agente', 'tecnico', 'asignado']);
        schema.time = find(['tiempo', 'time', 'duracion']);
    }

    const { date: colDate, agent: colAgent, time: colTime } = schema;

    // --- FILTRO DE FECHAS ---
    let filteredRows = rows;
    if (colDate) {
        filteredRows = Core.applyDateFilter(rows, colDate);
    }

    const stats = {
        timeline: {}, // "YYYY-MM": count
        agents: {},   // "Name": { count: 0, totalTime: 0 }
        buckets: {    
            "Rápido (< 30m)": 0, "Medio (30m - 2h)": 0, "Largo (2h - 8h)": 0, "Muy Largo (> 8h)": 0
        }
    };

    filteredRows.forEach(row => {
        // 1. TIMELINE
        if (colDate && row[colDate]) {
            try {
                const dateStr = String(row[colDate]);
                let dateObj = Core.parseDate(dateStr); // Usar parser robusto del Core
                if (dateObj) {
                    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                    stats.timeline[key] = (stats.timeline[key] || 0) + 1;
                }
            } catch (e) { }
        }

        // 2. TIEMPOS
        let timeVal = 0;
        if (colTime && row[colTime]) {
            const valStr = String(row[colTime]).replace(',', '.').trim();
            timeVal = parseFloat(valStr) || 0;
            if (timeVal <= 30) stats.buckets["Rápido (< 30m)"]++;
            else if (timeVal <= 120) stats.buckets["Medio (30m - 2h)"]++;
            else if (timeVal <= 480) stats.buckets["Largo (2h - 8h)"]++;
            else stats.buckets["Muy Largo (> 8h)"]++;
        }

        // 3. AGENTES
        if (colAgent && row[colAgent]) {
            const agent = row[colAgent].trim();
            if (agent && agent.toLowerCase() !== 'sin asignar') {
                if (!stats.agents[agent]) stats.agents[agent] = { count: 0, totalTime: 0 };
                stats.agents[agent].count++;
                stats.agents[agent].totalTime += timeVal;
            }
        }
    });

    renderCharts(stats);
    Core.togglePreloader(false);
}

function renderCharts(stats) {
    // 1. TIMELINE CHART
    const timeKeys = Object.keys(stats.timeline).sort();
    const timeCtx = document.getElementById('timeChart');
    if (timeCtx && timeKeys.length > 0) {
        new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: timeKeys,
                datasets: [{
                    label: 'Tickets',
                    data: timeKeys.map(k => stats.timeline[k]),
                    borderColor: '#c92228',
                    backgroundColor: 'rgba(201, 34, 40, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // 2. AGENTS CHART
    const agentData = Object.entries(stats.agents)
        .map(([name, data]) => ({
            name,
            count: data.count,
            avgTime: data.count > 0 ? (data.totalTime / data.count).toFixed(1) : 0
        }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);

    const agentCtx = document.getElementById('agentChart');
    if (agentCtx && agentData.length > 0) {
        new Chart(agentCtx, {
            type: 'bar',
            data: {
                labels: agentData.map(d => d.name),
                datasets: [
                    {
                        label: 'Tickets',
                        data: agentData.map(d => d.count),
                        backgroundColor: '#1e293b',
                        borderRadius: 4,
                        order: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Promedio (min)',
                        data: agentData.map(d => d.avgTime),
                        type: 'line',
                        borderColor: '#c92228',
                        backgroundColor: '#c92228',
                        borderWidth: 2,
                        pointRadius: 4,
                        order: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { type: 'linear', display: true, position: 'left', title: {display:true, text:'Volumen'} },
                    y1: { type: 'linear', display: true, position: 'right', grid: {drawOnChartArea:false}, title: {display:true, text:'Mins'} }
                }
            }
        });
    }

    // 3. HISTOGRAM CHART
    const bucketValues = Object.values(stats.buckets);
    if (bucketValues.some(v => v > 0)) {
        const histCtx = document.getElementById('histogramChart');
        if (histCtx) {
            new Chart(histCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.buckets),
                    datasets: [{
                        data: bucketValues,
                        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } },
                    cutout: '65%'
                }
            });
        }
    }
}