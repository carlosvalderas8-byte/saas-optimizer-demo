// ─── SAAS OPTIMIZER v3.0 — USER APP ───────────────────
let APP = { user: null, currentPage: 'dashboard', charts: {} };

document.addEventListener('DOMContentLoaded', () => { initAuthTabs(); checkSession(); });


function toggleLicenseField() {
  const checked = document.getElementById("regHasLicense")?.checked;
  const nameGroup = document.getElementById("regNameGroup");
  const licGroup = document.getElementById("regLicGroup");
  if (nameGroup) nameGroup.style.display = checked ? "block" : "none";
  if (licGroup) licGroup.style.display = checked ? "block" : "none";
  const btn = document.querySelector("#registerForm .btn-primary");
  if (btn) btn.innerHTML = checked ? '<i class="fas fa-crown"></i> Activar Licencia' : '<i class="fas fa-rocket"></i> Comenzar Demo';
}

function showLoading(delay = 500) { setTimeout(() => document.getElementById('loadingScreen').classList.add('hidden'), delay); }

// ─── AUTH TABS ───
function initAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
      ['loginError','registerError','activateError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    });
  });
}

// ─── LOGIN ───
async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  if (!email) { errorEl.textContent = "Email requerido"; return; }
  try {
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (data.error) { errorEl.textContent = data.error; return; }
    APP.user = data.user;
    document.getElementById("planBadge").textContent = data.user.plan.toUpperCase();
    document.getElementById("planBadge").style.background = data.user.plan === "full" ? "var(--success)" : "var(--accent)";
    enterApp();
  } catch (e) { errorEl.textContent = "Error de conexion"; }
}
unction handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  try {
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (data.error) { errorEl.textContent = data.error; return; }
    APP.user = data.user;
    enterApp();
  } catch (e) { errorEl.textContent = 'Error de conexión'; }
}

async function handleRegister() {
  const email = document.getElementById("regEmail").value;
  const hasLicense = document.getElementById("regHasLicense")?.checked;
  const license_key = document.getElementById("regLicense")?.value.trim();
  const name = document.getElementById("regName")?.value.trim();
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";
  if (!email) { errorEl.textContent = "Email requerido"; return; }
  if (hasLicense) {
    if (!name) { errorEl.textContent = "Nombre requerido para activar licencia"; return; }
    if (!license_key) { errorEl.textContent = "Codigo de licencia requerido"; return; }
  }
  try {
    const body = { email };
    if (hasLicense) { body.name = name; body.license_key = license_key; }
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) { errorEl.textContent = data.error; return; }
    APP.user = data.user;
    showToast(data.message || "Bienvenido", data.activated ? "success" : "info");
    enterApp();
  } catch (e) { errorEl.textContent = "Error de conexion"; }
}
unction handleRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const company = document.getElementById('regCompany').value;
  const license_key = document.getElementById('regLicense').value.trim();
  const errorEl = document.getElementById('registerError');
  errorEl.textContent = '';
  if (!name || !email || !password) { errorEl.textContent = 'Completa todos los campos'; return; }
  if (password.length < 6) { errorEl.textContent = 'Mínimo 6 caracteres'; return; }
  try {
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, company, license_key: license_key || undefined }) });
    const data = await res.json();
    if (data.error) { errorEl.textContent = data.error; return; }
    APP.user = data.user;
    if (data.activated) showToast(data.message, 'success');
    else showToast(data.message, 'info');
    enterApp();
  } catch (e) { errorEl.textContent = 'Error de conexión'; }
}

async function handleActivateWithLogin() {
  const email = document.getElementById('actEmail').value;
  const password = document.getElementById('actPassword').value;
  const license_key = document.getElementById('actLicense').value.trim();
  const errorEl = document.getElementById('activateError');
  errorEl.textContent = '';
  if (!email || !password) { errorEl.textContent = 'Email y contraseña requeridos'; return; }
  if (!license_key) { errorEl.textContent = 'Código de licencia requerido'; return; }
  try {
    // Login first
    const loginRes = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const loginData = await loginRes.json();
    if (loginData.error) { errorEl.textContent = loginData.error; return; }
    APP.user = loginData.user;

    // Activate license
    const actRes = await fetch('/api/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ license_key }) });
    const actData = await actRes.json();
    if (actData.error) { errorEl.textContent = actData.error; return; }
    showToast(actData.message, 'success');
    APP.user.plan = 'full';
    enterApp();
  } catch (e) { errorEl.textContent = 'Error de conexión'; }
}

async function checkSession() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      APP.user = await res.json();
      enterApp();
    } else { showLoading(300); document.getElementById('loginPage').style.display = 'flex'; }
  } catch (e) { showLoading(300); document.getElementById('loginPage').style.display = 'flex'; }
}

function enterApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'block';
  const badge = document.getElementById('planBadge');
  badge.textContent = APP.user.plan.toUpperCase();
  badge.style.background = APP.user.plan === 'full' ? 'var(--success)' : 'var(--accent)';
  showLoading(400);
  initSidebar();
  navigateTo('dashboard');
}

function initSidebar() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
}

function handleLogout() {
  fetch('/api/logout', { method: 'POST' }).then(() => {
    APP.user = null;
    document.getElementById('appPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
  });
}

function navigateTo(page) {
  APP.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const content = document.getElementById('mainContent');
  switch (page) {
    case 'dashboard': renderDashboard(content); break;
    case 'subscriptions': renderSubscriptions(content); break;
    case 'discovery': renderDiscovery(content); break;
    case 'recommendations': renderRecommendations(content); break;
    case 'renewals': renderRenewals(content); break;
    case 'analytics': renderAnalytics(content); break;
    case 'compliance': renderCompliance(content); break;
    case 'settings': renderSettings(content); break;
  }
}

// ─── HELPERS ───
function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container') || (() => { const c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); return c; })();
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function formatCurrency(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }); }
function formatDate(d) { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }); }

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderDashboard(el) {
  el.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  try {
    const res = await fetch('/api/user/dashboard');
    const data = await res.json();
    const s = data.stats;
    const sub = data.subscription;

    // Renewal warning
    let warningHtml = '';
    if (sub.renewalWarning) {
      warningHtml = `
        <div style="padding:12px 16px;background:${sub.daysLeft <= 0 ? 'var(--danger-bg)' : 'var(--warning-bg)'};border:1px solid ${sub.daysLeft <= 0 ? 'var(--danger)' : 'var(--warning)'};border-radius:12px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
          <i class="fas ${sub.daysLeft <= 0 ? 'fa-exclamation-circle' : 'fa-clock'}" style="font-size:24px;color:${sub.daysLeft <= 0 ? 'var(--danger)' : 'var(--warning)'}"></i>
          <div><strong style="color:${sub.daysLeft <= 0 ? 'var(--danger)' : 'var(--warning)'}">${sub.renewalWarning.message}</strong></div>
        </div>`;
    }
    // Demo upgrade banner
    if (APP.user.plan === 'demo') {
      warningHtml += `
        <div style="padding:16px 20px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));border:1px solid var(--accent);border-radius:var(--radius);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="background:var(--accent);color:white;padding:2px 10px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase">DEMO</span>
              <strong>Version de prueba — Funciones completas bloqueadas</strong>
            </div>
            <p style="color:var(--text-secondary);font-size:13px;margin:0">Esta app ya tiene TODO el codigo FULL instalado. Solo necesitas un codigo de licencia para desbloquearla.</p>
          </div>
          <button class="btn btn-primary-action" onclick="navigateTo('settings')"><i class="fas fa-crown"></i> Activar FULL ahora</button>
        </div>`;
    }


    el.innerHTML = `
      ${warningHtml}
      <div class="page-header">
        <div><h1>Dashboard</h1><p>Panel de control · ${APP.user.company || APP.user.name}</p></div>
        <div class="header-actions">
          <button class="btn btn-sm" onclick="navigateTo('discovery')"><i class="fas fa-search"></i> AI Scan</button>
          ${APP.user.plan === 'full' ? `<button class="btn btn-sm" onclick="exportData('csv')"><i class="fas fa-download"></i> Exportar</button>` : ''}
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Gasto Mensual</span><div class="stat-card-icon purple"><i class="fas fa-dollar-sign"></i></div></div>
          <div class="stat-card-value">${formatCurrency(s.monthlySpend)}</div><div class="stat-card-change">${s.activeSubscriptions} suscripciones activas</div></div>
        <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Gasto Anual</span><div class="stat-card-icon blue"><i class="fas fa-calendar-alt"></i></div></div>
          <div class="stat-card-value">${formatCurrency(s.yearlySpend)}</div><div class="stat-card-change">Proyectado</div></div>
        <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Ahorro Potencial</span><div class="stat-card-icon green"><i class="fas fa-piggy-bank"></i></div></div>
          <div class="stat-card-value">${formatCurrency(s.potentialSavings)}</div><div class="stat-card-change">${s.pendingRecommendations} oportunidades</div></div>
        <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">ROI</span><div class="stat-card-icon yellow"><i class="fas fa-chart-line"></i></div></div>
          <div class="stat-card-value">${s.roiPercent}%</div><div class="stat-card-change">Potencial de ahorro</div></div>
      </div>
      ${APP.user.plan === 'full' && sub.daysLeft !== null ? `
      <div style="display:flex;gap:12px;margin-bottom:16px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;align-items:center">
        <i class="fas fa-crown" style="color:var(--success)"></i>
        <span><strong>Plan FULL</strong> · Tu suscripción expira en <strong style="color:${sub.daysLeft <= 3 ? 'var(--danger)' : 'var(--success)'}">${sub.daysLeft} días</strong> (${formatDate(sub.expires)})</span>
        ${sub.daysLeft <= 5 ? `<span class="badge badge-warning" style="margin-left:auto">Próximo a vencer</span>` : ''}
      </div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card"><div class="card-header"><span class="card-title">Gastos por Categoría</span></div>
          <div class="chart-container"><canvas id="dashCatChart"></canvas></div></div>
        <div class="card"><div class="card-header"><span class="card-title">Próximas Renovaciones</span></div>
          ${data.upcomingRenewals.length ? data.upcomingRenewals.map(r => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-primary);border-radius:8px;margin-bottom:4px">
              <div><strong>${r.name}</strong><br><span style="font-size:12px;color:var(--text-muted)">${formatDate(r.renewal_date)}</span></div>
              <span style="font-weight:600">${formatCurrency(r.price_monthly)}<span style="font-size:11px;color:var(--text-muted)">/mes</span></span>
            </div>`).join('') : '<p style="color:var(--text-muted);padding:20px;text-align:center">Sin renovaciones próximas</p>'}
        </div>
      </div>
    `;

    const ctx = document.getElementById('dashCatChart');
    if (ctx) {
      const colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#14b8a6'];
      new Chart(ctx, { type: 'doughnut',
        data: { labels: data.spendingByCategory.map(c => c.category), datasets: [{ data: data.spendingByCategory.map(c => c.total), backgroundColor: colors.slice(0, data.spendingByCategory.length), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } } } }
      });
    }
  } catch (e) { el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--danger)">Error: ${e.message}</div>`; }
}

// ═══════════════════════════════════════════════════════
//  SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════
async function renderSubscriptions(el) {
  el.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  try {
    const res = await fetch('/api/user/subscriptions');
    const subs = await res.json();
    el.innerHTML = `
      <div class="page-header">
        <div><h1>Suscripciones</h1><p>${subs.length} registradas</p></div>
        <div class="header-actions">
          <div class="search-box"><i class="fas fa-search"></i><input type="text" placeholder="Buscar..." oninput="filterSubs(this.value)"></div>
          <button class="btn btn-primary-action" onclick="showAddSub()"><i class="fas fa-plus"></i>Añadir</button>
        </div>
      </div>
      ${APP.user.plan === 'demo' ? `<div style="padding:10px 14px;background:var(--info-bg);border-radius:8px;margin-bottom:12px;font-size:13px;color:var(--text-secondary)"><i class="fas fa-info-circle" style="color:var(--info)"></i> Demo: Máximo 5 suscripciones. ${subs.length}/5 usadas.</div>` : ''}
      <div class="card">
        <div class="table-container">
          <table><thead><tr><th>Nombre</th><th>Vendor</th><th>Categoría</th><th>Precio/mes</th><th>Seats</th><th>Total</th><th>Estado</th><th>Próx. Pago</th><th></th></tr></thead>
          <tbody>${subs.map(s => `
            <tr data-status="${s.status}">
              <td><strong>${s.name}</strong></td>
              <td style="color:var(--text-secondary)">${s.vendor}</td>
              <td><span class="badge badge-info">${s.category}</span></td>
              <td><strong>${formatCurrency(s.price_monthly)}</strong></td>
              <td>${s.seats}</td>
              <td><strong>${formatCurrency(s.price_monthly * s.seats)}</strong></td>
              <td><span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}">${s.status === 'active' ? 'Activa' : 'Inactiva'}</span></td>
              <td style="color:var(--text-muted)">${formatDate(s.renewal_date)}</td>
              <td><button class="btn btn-sm" onclick="editSub(${s.id})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger-action" onclick="deleteSub(${s.id})"><i class="fas fa-trash"></i></button></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) { el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--danger)">Error</div>`; }
}

function filterSubs(q) {
  document.querySelectorAll('#subscriptionsTable tbody tr').forEach(r => {
    r.style.display = q ? (r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none') : '';
  });
}

async function showAddSub() {
  const ov = document.createElement('div'); ov.className = 'modal-overlay active';
  ov.innerHTML = `<div class="modal"><div class="modal-header"><h2>Nueva Suscripción</h2><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group" style="grid-column:1/-1"><label>Nombre *</label><input id="subName"></div>
      <div class="form-group"><label>Vendor</label><input id="subVendor"></div>
      <div class="form-group"><label>Categoría</label><select id="subCategory" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary)">${['Comunicación','Productividad','Desarrollo','Diseño','Marketing','Ventas','Infraestructura','Otros'].map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="form-group"><label>Precio/mes *</label><input id="subPrice" type="number" step="0.01"></div>
      <div class="form-group"><label>Seats</label><input id="subSeats" type="number" value="1"></div>
      <div class="form-group"><label>Ciclo</label><select id="subCycle" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary)"><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></div>
      <div class="form-group" style="grid-column:1/-1"><label>Próx. renovación</label><input id="subRenewal" type="date"></div>
    </div>
    <button class="btn-primary" onclick="saveSub()" style="margin-top:12px"><i class="fas fa-save"></i> Guardar</button></div>`;
  document.body.appendChild(ov);
}

async function saveSub(){
  const name=document.getElementById('subName').value; if(!name){showToast('Nombre requerido','error');return;}
  const data={name,vendor:document.getElementById('subVendor').value||name,category:document.getElementById('subCategory').value,price_monthly:parseFloat(document.getElementById('subPrice').value||0),seats:parseInt(document.getElementById('subSeats').value||1),billing_cycle:document.getElementById('subCycle').value,renewal_date:document.getElementById('subRenewal').value||null};
  try{
    const res=await fetch('/api/user/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const r=await res.json();
    if(r.error){showToast(r.error,'error');return;}
    showToast('Añadida','success');
    document.querySelector('.modal-overlay.active')?.remove();
    navigateTo('subscriptions');
  }catch(e){showToast('Error','error');}
}

async function editSub(id){
  const res=await fetch('/api/user/subscriptions');const subs=await res.json();const s=subs.find(x=>x.id===id);if(!s)return;
  const ov=document.createElement('div');ov.className='modal-overlay active';
  ov.innerHTML=`<div class="modal"><div class="modal-header"><h2>Editar</h2><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group" style="grid-column:1/-1"><label>Nombre</label><input id="esubName" value="${s.name}"></div>
      <div class="form-group"><label>Vendor</label><input id="esubVendor" value="${s.vendor}"></div>
      <div class="form-group"><label>Categoría</label><select id="esubCategory" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary)">${['Comunicación','Productividad','Desarrollo','Diseño','Marketing','Ventas','Infraestructura','Otros'].map(c => `<option ${s.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="form-group"><label>Precio/mes</label><input id="esubPrice" type="number" step="0.01" value="${s.price_monthly}"></div>
      <div class="form-group"><label>Seats</label><input id="esubSeats" type="number" value="${s.seats}"></div>
      <div class="form-group"><label>Estado</label><select id="esubStatus" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary)"><option value="active" ${s.status==='active'?'selected':''}>Activa</option><option value="inactive" ${s.status==='inactive'?'selected':''}>Inactiva</option></select></div>
      <div class="form-group" style="grid-column:1/-1"><label>Próx. renovación</label><input id="esubRenewal" type="date" value="${s.renewal_date||''}"></div>
    </div>
    <button class="btn-primary" onclick="updateSub(${id})" style="margin-top:12px"><i class="fas fa-save"></i> Actualizar</button></div>`;
  document.body.appendChild(ov);
}

async function updateSub(id){
  const data={name:document.getElementById('esubName').value,vendor:document.getElementById('esubVendor').value,category:document.getElementById('esubCategory').value,price_monthly:parseFloat(document.getElementById('esubPrice').value||0),seats:parseInt(document.getElementById('esubSeats').value||1),billing_cycle:'monthly',status:document.getElementById('esubStatus').value,renewal_date:document.getElementById('esubRenewal').value||null};
  await fetch(`/api/user/subscriptions/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  showToast('Actualizada','success');document.querySelector('.modal-overlay.active')?.remove();navigateTo('subscriptions');
}

async function deleteSub(id){if(!confirm('¿Eliminar?'))return;await fetch(`/api/user/subscriptions/${id}`,{method:'DELETE'});showToast('Eliminada','info');navigateTo('subscriptions');}

// ═══════════════════════════════════════════════════════
//  DISCOVERY
// ═══════════════════════════════════════════════════════
async function renderDiscovery(el) {
  const isFull = APP.user.plan === 'full';
  el.innerHTML = `
    <div class="page-header">
      <div><h1><i class="fas fa-search" style="color:var(--accent)"></i> AI Discovery</h1><p>Escanea y descubre Shadow IT</p></div>
      <div class="header-actions"><button class="btn btn-primary-action" onclick="runScan()"><i class="fas fa-rocket"></i> Escanear</button></div>
    </div>
    ${!isFull ? `<div style="padding:12px;background:var(--info-bg);border-radius:8px;margin-bottom:12px;font-size:13px"><i class="fas fa-info-circle" style="color:var(--info)"></i> AI Scan completo disponible en versión <strong>FULL</strong>. <button class="btn btn-sm" onclick="navigateTo('settings')" style="margin-left:8px">Activar</button></div>` : ''}
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Fuentes</span><div class="stat-card-icon purple"><i class="fas fa-database"></i></div></div><div class="stat-card-value" id="scanSrc">0</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Detectadas</span><div class="stat-card-icon green"><i class="fas fa-bullseye"></i></div></div><div class="stat-card-value" id="scanDet">0</div></div>
      <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Ahorro Potencial</span><div class="stat-card-icon yellow"><i class="fas fa-piggy-bank"></i></div></div><div class="stat-card-value" id="scanSav">$0</div></div>
    </div>
    <div id="scanResults"><p style="color:var(--text-muted);text-align:center;padding:20px">Inicia un escaneo para descubrir suscripciones ocultas</p></div>`;
  try {
    const res = await fetch('/api/user/ai/scan/results');
    if (res.ok) { const scans = await res.json(); if (scans.length) renderScanResults(scans); }
  } catch(e){}
}

async function runScan(){
  if(APP.user.plan!=='full'){showToast('AI Scan solo disponible en versión FULL','error');return;}
  const btn=document.querySelector('.btn-primary-action');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Escaneando...';
  try{
    const res=await fetch('/api/user/ai/scan',{method:'POST'});const data=await res.json();
    if(data.error){showToast(data.error,'error');btn.disabled=false;btn.innerHTML='<i class="fas fa-rocket"></i> Escanear';return;}
    showToast(data.message,'success');navigateTo('discovery');
  }catch(e){showToast('Error','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-rocket"></i> Escanear';}
}

function renderScanResults(scans) {
  const el=document.getElementById('scanResults');if(!el)return;
  document.getElementById('scanSrc').textContent=scans.length;
  el.innerHTML=`<h3 style="margin-bottom:12px">Fuentes Analizadas</h3><div class="discovery-grid">${scans.map(s => {
    const d=s.data||{};const icons={'Email':'fa-envelope','Google':'fa-google','Stripe':'fa-credit-card','Slack':'fa-slack'};
    const icon=Object.entries(icons).find(([k])=>s.source.includes(k))?.[1]||'fa-link';
    const bc=s.source.includes('Google')?'#4285F4':s.source.includes('Slack')?'#4A154B':s.source.includes('Stripe')?'#6772E5':s.source.includes('Email')?'#EA4335':'var(--accent)';
    return `<div class="discovery-source"><div class="discovery-source-header"><div class="discovery-source-icon" style="background:${bc}20;color:${bc}"><i class="fas ${icon}"></i></div><div><h4>${s.source}</h4></div></div>
      ${d.vendors?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">${d.vendors.map(v=>`<span class="badge badge-info">${v}</span>`).join('')}</div>`:''}
      ${d.detected_subs?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">${d.detected_subs.map(v=>`<span class="badge badge-warning">${v}</span>`).join('')}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════
//  RECOMMENDATIONS
// ═══════════════════════════════════════════════════════
async function renderRecommendations(el) {
  el.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  try {
    const res = await fetch('/api/user/recommendations');
    const recs = await res.json();
    const pending = recs.filter(r => r.status === 'pending');
    el.innerHTML = `<div class="page-header"><div><h1><i class="fas fa-robot" style="color:var(--accent)"></i> AI Optimizer</h1><p>${pending.length} recomendaciones pendientes</p></div></div>
      ${pending.length===0?`<div class="card" style="text-align:center;padding:40px"><i class="fas fa-check-circle" style="font-size:48px;color:var(--success)"></i><h3>Todo optimizado</h3></div>`
      :`<div style="display:flex;flex-direction:column;gap:8px">${pending.map(r=>`
        <div class="rec-card ${r.priority}">
          <div class="rec-card-header"><div><div style="display:flex;gap:4px;margin-bottom:4px"><span class="badge badge-info">${r.type.toUpperCase()}</span><span class="badge ${r.priority==='high'?'badge-success':r.priority==='medium'?'badge-warning':'badge-info'}">${r.priority==='high'?'Alta':r.priority==='medium'?'Media':'Baja'}</span></div>
            <h4>${r.title}</h4><p>${r.description}</p></div>
            <div style="text-align:right"><div class="rec-savings">+${formatCurrency(r.potential_savings)}</div><div style="font-size:11px;color:var(--text-muted)">ahorro/mes</div></div></div>
          <div class="rec-actions"><button class="btn btn-sm btn-success-action" onclick="applyRec(${r.id})"><i class="fas fa-check"></i> Aplicar</button>
            <button class="btn btn-sm" onclick="dismissRec(${r.id})"><i class="fas fa-times"></i> Descartar</button></div>
        </div>`).join('')}</div>`}`;
  } catch(e){el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--danger)">Error</div>`;}
}

async function applyRec(id){const r=await(await fetch(`/api/user/recommendations/${id}/apply`,{method:'POST'})).json();showToast(r.message||'Aplicada','success');navigateTo('recommendations');}
async function dismissRec(id){await fetch(`/api/user/recommendations/${id}/dismiss`,{method:'POST'});showToast('Descartada','info');navigateTo('recommendations');}

// ═══════════════════════════════════════════════════════
//  RENEWALS
// ═══════════════════════════════════════════════════════
async function renderRenewals(el) {
  el.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  try {
    const res = await fetch('/api/user/renewals');
    const renewals = await res.json();
    const urgent = renewals.filter(r => r.days_remaining <= 7);
    el.innerHTML = `
      <div class="page-header"><div><h1><i class="fas fa-calendar" style="color:var(--warning)"></i> Renovaciones</h1><p>${renewals.length} próximas</p></div></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Urgentes (7d)</span><div class="stat-card-icon red"><i class="fas fa-exclamation"></i></div></div><div class="stat-card-value">${urgent.length}</div></div>
        <div class="stat-card"><div class="stat-card-header"><span class="stat-card-label">Totales</span><div class="stat-card-icon blue"><i class="fas fa-calendar"></i></div></div><div class="stat-card-value">${renewals.length}</div></div>
      </div>
      <div class="card">
        <div class="table-container"><table><thead><tr><th>Suscripción</th><th>Precio/mes</th><th>Renovación</th><th>Días</th><th>Auto</th><th></th></tr></thead>
          <tbody>${renewals.map(r => `<tr><td><strong>${r.name}</strong></td><td>${formatCurrency(r.price_monthly)}</td><td>${formatDate(r.renewal_date)}</td>
            <td><span class="badge ${r.days_remaining<=7?'badge-danger':r.days_remaining<=30?'badge-warning':'badge-info'}">${r.days_remaining} días</span></td>
            <td><span class="badge ${r.auto_renew?'badge-success':'badge-danger'}">${r.auto_renew?'Auto Sí':'Auto No'}</span></td>
            <td><button class="btn btn-sm" onclick="toggleAR(${r.id},${r.auto_renew?0:1})">${r.auto_renew?'❌ Desactivar':'✅ Activar'} Auto</button></td></tr>`).join('')}</tbody></table></div>
      </div>`;
  } catch(e){el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--danger)">Error</div>`;}
}
async function toggleAR(id,v){await fetch(`/api/user/renewals/${id}/auto-renew`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({auto_renew:v})});showToast(v?'Auto-Renovación activada':'Desactivada','info');navigateTo('renewals');}

// ═══════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════
async function renderAnalytics(el) {
  el.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  try {
    const [catRes, vendRes] = await Promise.all([fetch('/api/user/analytics/category-breakdown'), fetch('/api/user/analytics/vendor-analysis')]);
    const categories = await catRes.json();
    const vendors = await vendRes.json();
    el.innerHTML = `<div class="page-header"><div><h1><i class="fas fa-chart-bar" style="color:var(--accent)"></i> Analytics</h1></div>
      ${APP.user.plan==='full'?`<div class="header-actions"><button class="btn btn-sm" onclick="exportData('csv')"><i class="fas fa-download"></i> CSV</button><button class="btn btn-sm" onclick="exportData('pdf')"><i class="fas fa-file-pdf"></i> PDF</button></div>`:''}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card"><div class="card-header"><span class="card-title">Por Categoría</span></div><div class="chart-container"><canvas id="analyticsCatChart"></canvas></div></div>
        <div class="card"><div class="card-header"><span class="card-title">Por Vendor</span></div><div class="chart-container"><canvas id="analyticsVenChart"></canvas></div></div>
      </div>`;
    const colors=['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#14b8a6'];
    const ctx1=document.getElementById('analyticsCatChart');
    if(ctx1) new Chart(ctx1,{type:'bar',data:{labels:categories.map(c=>c.category),datasets:[{label:'Gasto/mes',data:categories.map(c=>c.total),backgroundColor:colors.slice(0,categories.length),borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#2a3040'},ticks:{color:'#64748b'}},x:{grid:{display:false},ticks:{color:'#94a3b8'}}}}});
    const ctx2=document.getElementById('analyticsVenChart');
    if(ctx2) new Chart(ctx2,{type:'polarArea',data:{labels:vendors.map(v=>v.vendor),datasets:[{data:vendors.map(v=>v.total_spend),backgroundColor:['#6366f180','#22c55e80','#f59e0b80','#ef444480','#3b82f680','#a855f780','#ec489980','#14b8a680'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:10}}}}}});
  } catch(e){el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--danger)">Error</div>`;}
}

// ═══════════════════════════════════════════════════════
//  COMPLIANCE
// ═══════════════════════════════════════════════════════
async function renderCompliance(el) {
  el.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  try {
    if(APP.user.plan!=='full'){el.innerHTML=`<div class="page-header"><div><h1><i class="fas fa-shield" style="color:var(--accent)"></i> Compliance</h1></div></div><div class="card" style="text-align:center;padding:40px"><i class="fas fa-lock" style="font-size:48px;color:var(--warning)"></i><h3>Disponible en versión FULL</h3><p style="color:var(--text-secondary)">Activa tu licencia para acceder a reportes GDPR/SOC2 y auditoría de seguridad.</p><button class="btn btn-primary-action" onclick="navigateTo('settings')" style="margin-top:12px"><i class="fas fa-crown"></i> Activar FULL</button></div>`;return;}
    const res = await fetch('/api/user/compliance');
    const report = await res.json();
    el.innerHTML = `<div class="page-header"><div><h1><i class="fas fa-shield" style="color:var(--accent)"></i> Compliance</h1></div><div class="header-actions"><span class="badge badge-success">Puntuación: ${report.security_score}/100</span></div></div>
      <div class="card"><div class="card-header"><span class="card-title">Estado</span></div>
        ${Object.entries(report.data_processing||{}).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span>${k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span><span class="badge badge-success">${v}</span></div>`).join('')}</div>`;
  } catch(e){el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--danger)">Error</div>`;}
}

// ═══════════════════════════════════════════════════════
//  SETTINGS (with license activation)
// ═══════════════════════════════════════════════════════
async function renderSettings(el) {
  // Get subscription status
  let subStatus = { plan: APP.user.plan, daysLeft: null, expires: null, payments: [] };
  try {
    const res = await fetch('/api/user/subscription-status');
    if (res.ok) subStatus = await res.json();
  } catch(e){}

  el.innerHTML = `
    <div class="page-header"><div><h1><i class="fas fa-cog"></i> Ajustes</h1><p>Tu cuenta y suscripción</p></div></div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div>
        <div class="card">
          <div class="card-header"><span class="card-title">Perfil</span></div>
          <div style="display:flex;gap:16px;align-items:center;margin-bottom:16px">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${APP.user.name[0]}</div>
            <div><h3>${APP.user.name}</h3><p style="color:var(--text-secondary);font-size:13px">${APP.user.email}</p></div>
          </div>
          <div class="form-group"><label>Empresa</label><input id="settingsCompany" value="${APP.user.company||''}"></div>
          <button class="btn btn-primary-action" onclick="showToast('Guardado','success')"><i class="fas fa-save"></i> Guardar</button>
        </div>
        ${APP.user.plan === 'demo' ? `
        <div class="card" style="border-color:var(--accent)">
          <div class="card-header"><span class="card-title"><i class="fas fa-crown" style="color:var(--accent)"></i> Activar Versión FULL</span></div>
          <p style="color:var(--text-secondary);margin-bottom:16px">Ingresa tu código de licencia para desbloquear todas las funciones.</p>
          <div style="display:flex;gap:8px">
            <input type="text" id="activateKey" placeholder="SAAS-XXXXXXXX-XXXX" style="flex:1;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:monospace;letter-spacing:1px">
            <button class="btn btn-primary-action" onclick="activateLicense()"><i class="fas fa-crown"></i> Activar</button>
          </div>
          <p id="activateMsg" style="margin-top:8px;font-size:13px;min-height:20px"></p>
        </div>` : `
        <div class="card" style="border-color:var(--success)">
          <div class="card-header"><span class="card-title"><i class="fas fa-crown" style="color:var(--success)"></i> Plan FULL</span></div>
          <p style="color:var(--text-secondary)">Disfrutas de todas las funciones premium.</p>
          <div style="margin-top:12px;padding:12px;background:var(--bg-primary);border-radius:8px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Estado:</span><span class="badge badge-success">${subStatus.status || 'Activo'}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Expira:</span><span>${formatDate(subStatus.expires)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Días restantes:</span><span style="color:${subStatus.daysLeft !== null && subStatus.daysLeft <= 3 ? 'var(--danger)' : 'var(--success)'};font-weight:600">${subStatus.daysLeft !== null ? subStatus.daysLeft + ' días' : '—'}</span></div>
            <div style="display:flex;justify-content:space-between"><span>Cuota mensual:</span><span>${formatCurrency(subStatus.monthlyFee)}</span></div>
          </div>
          ${subStatus.daysLeft !== null && subStatus.daysLeft <= 5 ? `<div style="margin-top:12px;padding:10px;background:var(--warning-bg);border-radius:8px;font-size:13px;color:var(--warning)"><i class="fas fa-clock"></i> Contacta al administrador para renovar tu suscripción.</div>` : ''}
        </div>`}
      </div>
      <div>
        <div class="card">
          <div class="card-header"><span class="card-title">Plan</span></div>
          <div style="text-align:center;padding:12px 0">
            <div style="font-size:48px;color:${APP.user.plan === 'full' ? 'var(--success)' : 'var(--accent)'};margin-bottom:8px"><i class="fas ${APP.user.plan === 'full' ? 'fa-crown' : 'fa-flask'}"></i></div>
            <h3 style="text-transform:uppercase">${APP.user.plan}</h3>
            <div style="margin-top:12px;font-size:13px;color:var(--text-secondary)">${APP.user.plan === 'full' ? '✅ Todas las funciones desbloqueadas' : '🔒 5 suscripciones · Funciones limitadas'}</div>
          </div>
        </div>
        ${subStatus.payments && subStatus.payments.length ? `
        <div class="card">
          <div class="card-header"><span class="card-title">Historial de Pagos</span></div>
          ${subStatus.payments.slice(0,5).map(p => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span>${formatCurrency(p.amount)} <span style="color:var(--text-muted)">- ${p.method}</span></span>
              <span style="color:var(--text-muted)">${formatDate(p.paid_at || p.created_at)}</span>
            </div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
}

async function activateLicense() {
  const key = document.getElementById('activateKey').value.trim();
  const msg = document.getElementById('activateMsg');
  if (!key) { msg.textContent = 'Introduce un código de licencia'; msg.style.color = 'var(--danger)'; return; }
  try {
    const res = await fetch('/api/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ license_key: key }) });
    const data = await res.json();
    if (data.error) { msg.textContent = data.error; msg.style.color = 'var(--danger)'; return; }
    msg.textContent = data.message; msg.style.color = 'var(--success)';
    showToast('✅ ¡FULL ACTIVADO!', 'success');
    APP.user.plan = 'full';
    document.getElementById('planBadge').textContent = 'FULL';
    document.getElementById('planBadge').style.background = 'var(--success)';
    navigateTo('settings');
  } catch (e) { msg.textContent = 'Error de conexión'; msg.style.color = 'var(--danger)'; }
}

function exportData(format) {
  if (APP.user.plan !== 'full') { showToast('Exportación solo disponible en versión FULL', 'error'); return; }
  window.open(`/api/user/export/${format}`, '_blank');
  showToast(`Exportando ${format.toUpperCase()}`, 'info');
}
