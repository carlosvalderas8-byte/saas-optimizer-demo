let userData = null;
let currentSection = 'dashboard';

async function api(path, opts = {}) {
  try { const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts }); return await r.json(); }
  catch(e) { return { error: e.message }; }
}

async function loadUser() {
  const data = await api('/api/me');
  if (data.error) { window.location.href = '/login'; return; }
  userData = data;
  document.getElementById('userInfo').textContent = data.email + (data.name ? ' (' + data.name + ')' : '');
  const badge = document.getElementById('planBadge');
  badge.textContent = data.plan === 'full' ? '⭐ FULL' : data.daysLeft !== null && data.daysLeft <= 0 ? '⛔ VENCIDO' : '🔷 DEMO';
  badge.className = 'plan-badge ' + (data.plan === 'full' ? 'full' : 'demo');
}

function showSection(section) {
  currentSection = section;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + section).classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`.sidebar-nav a[data-section="${section}"]`).classList.add('active');
  
  switch(section) {
    case 'dashboard': loadDashboard(); break;
    case 'subscriptions': loadSubscriptions(); break;
    case 'discovery': break;
    case 'optimizer': checkFullFeature('optimizer'); break;
    case 'renewals': loadRenewals(); break;
    case 'analytics': checkFullFeature('analytics'); loadAnalytics(); break;
    case 'compliance': checkFullFeature('compliance'); break;
    case 'settings': loadSettings(); break;
  }
}

function checkFullFeature(section) {
  if (!userData || userData.plan !== 'full') {
    const container = document.getElementById(section === 'optimizer' ? 'optimizerResults' : section === 'analytics' ? 'analyticsCharts' : 'complianceReport');
    if (container) container.innerHTML = '<div class="info-msg">🔒 Esta función está disponible solo en la versión FULL. <a href="#" onclick="showSection(\'settings\')" style="color:#00d4ff">Actívala desde Ajustes</a></div>';
  }
}

// --- Dashboard ---
async function loadDashboard() {
  const data = await api('/api/subscriptions');
  if (!data || data.error) return;
  document.getElementById('dashTotal').textContent = data.subscriptions.length;
  document.getElementById('dashMonthly').textContent = '$' + data.totalMonthly.toFixed(2);
  document.getElementById('dashYearly').textContent = '$' + (data.totalYearly * 12).toFixed(2);
  
  const totalSavings = data.subscriptions.reduce((s, sub) => s + (sub.cost * 0.1), 0);
  document.getElementById('dashSavings').textContent = '$' + totalSavings.toFixed(2);
  
  // Category chart
  const cats = {};
  data.subscriptions.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.cost; });
  const chartDiv = document.getElementById('categoryChart');
  if (Object.keys(cats).length) {
    const maxVal = Math.max(...Object.values(cats));
    chartDiv.innerHTML = Object.entries(cats).map(([cat, val]) =>
      `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${cat}</span><span>$${val.toFixed(2)}/mes</span></div><div style="background:#1a1a35;height:20px;border-radius:10px;overflow:hidden"><div style="background:linear-gradient(90deg,#00d4ff,#7b2ff7);height:100%;width:${(val/maxVal*100)}%;border-radius:10px;transition:width .5s"></div></div></div>`
    ).join('');
  }
  
  // Recommendations
  const recs = await api('/api/recommendations');
  const recDiv = document.getElementById('dashRecommendations');
  if (recs && recs.length) {
    recDiv.innerHTML = recs.map(r => `<div style="padding:10px;border-bottom:1px solid #2a2a4a;font-size:13px"><strong>${r.title}</strong><br><span style="color:#888">${r.description}</span> <span style="color:#00d4ff;font-weight:600">- Ahorro: $${r.savings}/mes</span></div>`).join('');
  } else recDiv.innerHTML = '<p class="text-muted">Sin recomendaciones por ahora. Agrega suscripciones primero.</p>';
}

// --- Subscriptions ---
async function loadSubscriptions() {
  const data = await api('/api/subscriptions');
  const list = document.getElementById('subsList');
  if (!data || !data.subscriptions || !data.subscriptions.length) {
    list.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#555">Sin suscripciones. Agrega la primera.</td></tr>';
    return;
  }
  list.innerHTML = data.subscriptions.map(s => `<tr>
    <td><strong>${s.name}</strong>${s.url ? `<br><small style="color:#555">${s.url}</small>` : ''}</td>
    <td>${s.category}</td>
    <td><strong>$${s.cost.toFixed(2)}</strong></td>
    <td>${s.billing === 'monthly' ? 'Mensual' : 'Anual'}</td>
    <td>${s.nextBilling ? new Date(s.nextBilling + 'T00:00:00').toLocaleDateString() : '-'}</td>
    <td><span class="badge badge-active">${s.status}</span></td>
    <td>
      <button class="btn-outline" onclick="editSub(${s.id})" style="padding:4px 8px;font-size:11px">✏️</button>
      <button class="btn-danger" onclick="deleteSub(${s.id})" style="padding:4px 8px;font-size:11px">🗑️</button>
    </td>
  </tr>`).join('');
}

function showAddSub() {
  showModal('Nueva Suscripción', `
    <div class="form-group"><label>Nombre</label><input type="text" id="subName" placeholder="Ej: Netflix" required></div>
    <div class="form-group"><label>Categoría</label><select id="subCategory"><option>Entretenimiento</option><option>Música</option><option>Productividad</option><option>Compras</option><option>Almacenamiento</option><option>Comunicaciones</option><option>Salud</option><option>Otros</option></select></div>
    <div class="form-group"><label>Costo ($)</label><input type="number" id="subCost" step="0.01" placeholder="9.99" required></div>
    <div class="form-group"><label>Facturación</label><select id="subBilling"><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></div>
    <div class="form-group"><label>Próximo Pago</label><input type="date" id="subNextBilling"></div>
    <div class="form-group"><label>Notas</label><input type="text" id="subNotes" placeholder="Notas opcionales"></div>
    <div class="form-group"><label>URL</label><input type="text" id="subUrl" placeholder="https://..."></div>
  `, `<button class="btn-primary" onclick="addSub()">Guardar</button>`);
  document.getElementById('subNextBilling').valueAsDate = new Date(Date.now() + 30*86400000);
}

async function addSub() {
  const result = await api('/api/subscriptions', { method:'POST', body:JSON.stringify({
    name: document.getElementById('subName').value,
    category: document.getElementById('subCategory').value,
    cost: document.getElementById('subCost').value,
    billing: document.getElementById('subBilling').value,
    nextBilling: document.getElementById('subNextBilling').value,
    notes: document.getElementById('subNotes').value,
    url: document.getElementById('subUrl').value
  })});
  if (result.success) { closeModal(); loadSubscriptions(); loadDashboard(); }
  else if (result.limitReached) {
    closeModal();
    alert(result.error);
  } else alert(result.error || 'Error');
}

async function deleteSub(id) {
  if (!confirm('¿Eliminar esta suscripción?')) return;
  await api('/api/subscriptions/' + id, { method:'DELETE' });
  loadSubscriptions();
  loadDashboard();
}

function editSub(id) { alert('Editar: función disponible en versión FULL'); }

// --- Discovery ---
async function runDiscovery() {
  const btn = document.getElementById('discoveryBtn');
  btn.disabled = true; btn.textContent = 'Analizando...';
  const div = document.getElementById('discoveryResults');
  
  const data = await api('/api/subscriptions');
  if (!data || !data.subscriptions.length) {
    div.innerHTML = '<div class="info-msg">Agrega al menos una suscripción para comenzar el análisis.</div>';
    btn.disabled = false; btn.textContent = '🔍 Ejecutar Análisis';
    return;
  }
  
  setTimeout(() => {
    const subs = data.subscriptions;
    let results = [];
    
    // Find duplicates by category
    const catCount = {};
    subs.forEach(s => { catCount[s.category] = (catCount[s.category] || 0) + 1; });
    Object.entries(catCount).filter(([c, n]) => n > 1).forEach(([cat, n]) => {
      const catSubs = subs.filter(s => s.category === cat);
      const savings = catSubs.reduce((t, s) => t + s.cost * 0.15, 0);
      results.push({ type: 'duplicate', title: `⚠️ Múltiples servicios en ${cat}`, description: `Tienes ${n} suscripciones en ${cat}. Revisa si todas son necesarias.`, savings });
    });
    
    // Find expensive subs
    subs.filter(s => s.cost > 30).forEach(s => {
      results.push({ type: 'optimization', title: `💡 ${s.name} es costoso`, description: `$${s.cost.toFixed(2)}/mes. Busca planes más económicos o comparte cuenta.`, savings: s.cost * 0.3 });
    });
    
    // General recommendation
    if (subs.length >= 3) {
      const total = subs.reduce((t, s) => t + s.cost, 0);
      results.push({ type: 'summary', title: '📊 Resumen General', description: `Gastas $${total.toFixed(2)}/mes en ${subs.length} suscripciones. Podrías ahorrar hasta $${(total * 0.25).toFixed(2)}/mes optimizando.`, savings: total * 0.25 });
    }
    
    if (!results.length) results.push({ type: 'info', title: '✅ Sin novedades', description: 'Tus suscripciones están bien optimizadas.', savings: 0 });
    
    div.innerHTML = results.map(r => `<div class="card" style="padding:15px"><strong>${r.title}</strong><p style="color:#888;font-size:13px;margin-top:5px">${r.description}</p>${r.savings > 0 ? `<span style="color:#00d4ff;font-weight:600;font-size:13px">Ahorro potencial: $${r.savings.toFixed(2)}/mes</span>` : ''}</div>`).join('');
    btn.disabled = false; btn.textContent = '🔍 Ejecutar Análisis';
  }, 1000);
}

// --- Optimizer ---
async function runOptimizer() {
  if (!userData || userData.plan !== 'full') {
    document.getElementById('optimizerResults').innerHTML = '<div class="error-msg">🔒 Función solo disponible en versión FULL. <a href="#" onclick="showSection(\'settings\')" style="color:#00d4ff">Actívala desde Ajustes</a></div>';
    return;
  }
  const btn = document.getElementById('optimizerBtn');
  btn.disabled = true; btn.textContent = 'Optimizando...';
  
  const data = await api('/api/subscriptions');
  setTimeout(() => {
    const subs = data.subscriptions || [];
    let html = '<div class="success-msg">✅ Optimización completada</div>';
    
    // Suggest billing change
    subs.filter(s => s.billing === 'monthly' && s.cost * 12 > 50).forEach(s => {
      const yearly = s.cost * 12 * 0.85;
      html += `<div class="card" style="padding:15px"><strong>💡 ${s.name}</strong><p style="color:#888;font-size:13px;margin-top:5px">Cambiar a facturación anual te ahorraría <strong style="color:#00d4ff">$${(s.cost * 12 * 0.15).toFixed(2)}/año</strong> ($${yearly.toFixed(2)}/año vs $${(s.cost * 12).toFixed(2)}/año)</p></div>`;
    });
    
    // Suggest to remove duplicates
    const seen = {};
    subs.forEach(s => {
      if (seen[s.category]) {
        html += `<div class="card" style="padding:15px;border-color:#ffaa0044"><strong>⚠️ Duplicidad en ${s.category}</strong><p style="color:#888;font-size:13px;margin-top:5px">Tienes múltiples servicios en ${s.category}. Considera cancelar los que menos uses.</p></div>`;
      }
      seen[s.category] = true;
    });
    
    if (!html.includes('card')) html += '<p class="text-muted">No se encontraron oportunidades de optimización significativas.</p>';
    
    document.getElementById('optimizerResults').innerHTML = html;
    btn.disabled = false; btn.textContent = '⚡ Ejecutar Optimizador';
  }, 1500);
}

// --- Renewals ---
async function loadRenewals() {
  const data = await api('/api/subscriptions');
  const div = document.getElementById('renewalsTimeline');
  if (!data || !data.subscriptions || !data.subscriptions.length) {
    div.innerHTML = '<p class="text-muted">Sin suscripciones para mostrar</p>';
    return;
  }
  
  const sorted = [...data.subscriptions].sort((a, b) => new Date(a.nextBilling) - new Date(b.nextBilling));
  div.innerHTML = sorted.map(s => {
    const d = new Date(s.nextBilling + 'T00:00:00');
    const daysLeft = Math.ceil((d - new Date()) / 86400000);
    return `<div class="timeline-item">
      <div class="timeline-date">${d.toLocaleDateString()}</div>
      <div class="timeline-info"><strong>${s.name}</strong><br><span style="color:#888;font-size:12px">${daysLeft > 0 ? daysLeft + ' días' : daysLeft === 0 ? 'Hoy' : 'Vencido'}</span></div>
      <div class="timeline-cost">$${s.cost.toFixed(2)}</div>
    </div>`;
  }).join('');
}

// --- Analytics ---
function loadAnalytics() {
  if (!userData || userData.plan !== 'full') return;
  api('/api/subscriptions').then(data => {
    const div = document.getElementById('analyticsCharts');
    if (!data || !data.subscriptions.length) {
      div.innerHTML = '<p class="text-muted">Agrega suscripciones para ver analytics</p>';
      return;
    }
    
    const monthlyTotal = data.subscriptions.filter(s => s.billing === 'monthly').reduce((t, s) => t + s.cost, 0);
    const yearlyMonthly = data.subscriptions.filter(s => s.billing === 'yearly').reduce((t, s) => t + s.cost / 12, 0);
    const total = monthlyTotal + yearlyMonthly;
    
    div.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:1fr 1fr">
        <div class="stat-card"><div class="stat-value">$${total.toFixed(2)}</div><div class="stat-label">Gasto Total/Mes</div></div>
        <div class="stat-card"><div class="stat-value">$${(total * 12).toFixed(2)}</div><div class="stat-label">Gasto Total/Año</div></div>
      </div>
      <div style="margin-top:15px">
        <h3>Distribución de Gastos</h3>
        <div style="margin-top:10px">
          <div style="display:flex;height:30px;border-radius:8px;overflow:hidden">
            <div style="background:#00d4ff;flex:${monthlyTotal/total*100};display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff">Mensual ${(monthlyTotal/total*100).toFixed(0)}%</div>
            <div style="background:#7b2ff7;flex:${yearlyMonthly/total*100};display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff">Anual ${(yearlyMonthly/total*100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
      <div style="margin-top:15px">
        <h3>Gastos por Categoría</h3>
        ${Object.entries(data.subscriptions.reduce((cats, s) => {
          cats[s.category] = (cats[s.category] || 0) + s.cost;
          return cats;
        }, {})).sort((a,b) => b[1]-a[1]).map(([cat, cost]) =>
          `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2a2a4a;font-size:13px"><span>${cat}</span><span style="color:#00d4ff;font-weight:600">$${cost.toFixed(2)}</span></div>`
        ).join('')}
      </div>`;
  });
}

// --- Compliance ---
function checkFullFeature(section) {
  if (!userData || userData.plan !== 'full') {
    const map = { optimizer:'optimizerResults', analytics:'analyticsCharts', compliance:'complianceReport' };
    const el = document.getElementById(map[section]);
    if (el) el.innerHTML = '<div class="info-msg">🔒 Función disponible solo en versión FULL. <a href="#" onclick="showSection(\'settings\')" style="color:#00d4ff">Actívala desde Ajustes</a></div>';
    return false;
  }
  return true;
}

// --- Settings ---
async function loadSettings() {
  const div = document.getElementById('activationStatus');
  const form = document.getElementById('activationForm');
  
  if (userData.plan === 'full') {
    div.innerHTML = `<div class="success-msg">✅ Versión FULL activada${userData.expiresAt ? ' - Válida hasta: ' + new Date(userData.expiresAt).toLocaleDateString() : ''}${userData.daysLeft !== null ? ' (' + userData.daysLeft + ' días restantes)' : ''}</div>`;
    form.style.display = 'none';
  } else {
    div.innerHTML = '<div class="info-msg">🔷 Modo DEMO - ' + userData.daysLeft !== null && userData.daysLeft <= 0 ? 'Suscripción vencida' : 'Disfruta de las funciones básicas. Activa FULL para acceso ilimitado.' + '</div>';
    
    // Check if already activated on admin server
    const status = await api('/api/check-activation');
    if (status.valid && status.plan === 'full') {
      location.reload();
    }
  }
  
  document.getElementById('accountInfo').innerHTML = `
    <strong>Email:</strong> ${userData.email}<br>
    <strong>Nombre:</strong> ${userData.name || '—'}<br>
    <strong>Plan:</strong> ${userData.plan === 'full' ? '⭐ FULL' : '🔷 DEMO'}<br>
    <strong>Registrado:</strong> ${new Date(userData.registeredAt).toLocaleDateString()}<br>
    ${userData.plan === 'full' && userData.expiresAt ? '<strong>Vence:</strong> ' + new Date(userData.expiresAt).toLocaleDateString() + '<br>' : ''}
    ${userData.plan === 'full' && userData.daysLeft !== null ? '<strong>Días restantes:</strong> ' + userData.daysLeft + '<br>' : ''}
  `;
}

async function activateLicense() {
  const code = document.getElementById('licenseCode').value.trim();
  if (!code) { alert('Introduce un código de licencia'); return; }
  
  const btn = event.target;
  btn.disabled = true; btn.textContent = 'Activando...';
  
  const result = await api('/api/activate', { method:'POST', body:JSON.stringify({ code }) });
  if (result.success) {
    document.getElementById('activationStatus').innerHTML = `<div class="success-msg">${result.message}</div>`;
    document.getElementById('activationForm').style.display = 'none';
    userData.plan = 'full';
    const badge = document.getElementById('planBadge');
    badge.textContent = '⭐ FULL';
    badge.className = 'plan-badge full';
    setTimeout(() => location.reload(), 2000);
  } else {
    document.getElementById('activationStatus').innerHTML = `<div class="error-msg">${result.error}</div>`;
    btn.disabled = false; btn.textContent = 'Activar Versión FULL';
  }
}

async function exportCSV() {
  if (!userData || userData.plan !== 'full') {
    alert('🔒 Exportar CSV está disponible solo en versión FULL. Actívala desde Ajustes.');
    return;
  }
  const r = await fetch('/api/export', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({format:'csv'}) });
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'suscripciones.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Modal
function showModal(title, body, footer) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer || '';
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

// Init
(async function() {
  await loadUser();
  loadDashboard();
})();
