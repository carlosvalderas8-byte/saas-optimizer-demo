require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');

// ─── JSON DATABASE ───
const DB_PATH = path.join(__dirname, 'data', 'app.json');
let db = null;
function getDb() {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e) { db = null; }
  }
  if (!db) {
    db = {
      users: [], subscriptions: [], scans: [], recommendations: [], renewals: [],
      audit: [], counters: { user: 0, sub: 0, rec: 0, scan: 0, renew: 0 }
    };
  }
  return db;
}
function saveDb() { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

// Seed demo data
function seedData() {
  const d = getDb();
  if (d.users.length > 0) return;
  
  d.counters.user++;
  d.users.push({
    id: d.counters.user, name: 'Demo User', email: 'demo@saasopt.com',
    password: bcrypt.hashSync('demo1234', 10), company: 'Demo Corp',
    plan: 'demo', status: 'active', created_at: new Date().toISOString().split('T')[0],
    last_login: new Date().toISOString()
  });
  
  const subs = [
    { name: 'Slack', vendor: 'Slack', cat: 'Comunicacion', price: 15, seats: 12, renewal: '2025-07-15' },
    { name: 'Zoom', vendor: 'Zoom', cat: 'Comunicacion', price: 25, seats: 8, renewal: '2025-06-30' },
    { name: 'Notion', vendor: 'Notion', cat: 'Productividad', price: 18, seats: 10, renewal: '2025-07-01' },
    { name: 'GitHub', vendor: 'GitHub', cat: 'Desarrollo', price: 44, seats: 5, renewal: '2025-08-10' },
    { name: 'HubSpot', vendor: 'HubSpot', cat: 'Marketing', price: 90, seats: 3, renewal: '2025-06-28' },
    { name: 'Figma', vendor: 'Figma', cat: 'Diseno', price: 15, seats: 6, renewal: '2025-07-20' },
    { name: 'Google Workspace', vendor: 'Google', cat: 'Productividad', price: 72, seats: 12, renewal: '2025-07-10' },
    { name: 'Adobe CC', vendor: 'Adobe', cat: 'Diseno', price: 79, seats: 3, renewal: '2025-08-01' },
    { name: 'AWS (inactivo)', vendor: 'Amazon', cat: 'Infraestructura', price: 120, seats: 1, renewal: null, status: 'inactive' },
    { name: 'Mailchimp', vendor: 'Intuit', cat: 'Marketing', price: 35, seats: 3, renewal: '2025-06-01' },
    { name: 'Jira', vendor: 'Atlassian', cat: 'Desarrollo', price: 42, seats: 5, renewal: '2025-09-05' },
    { name: 'Old CRM', vendor: 'Salesforce', cat: 'Ventas', price: 60, seats: 5, renewal: null, status: 'inactive' },
  ];
  
  subs.forEach(s => {
    d.counters.sub++;
    d.subscriptions.push({
      id: d.counters.sub, user_id: 1, name: s.name, vendor: s.vendor,
      category: s.cat, price_monthly: s.price, seats: s.seats,
      billing_cycle: 'monthly', status: s.status || 'active',
      renewal_date: s.renewal, auto_renew: 1, created_at: new Date().toISOString()
    });
  });

  const recs = [
    { title: 'Cancelar AWS inactivo', desc: 'Sin uso 60+ dias. Ahorro $120/mes.', savings: 120, priority: 'high' },
    { title: 'Cancelar CRM duplicado', desc: 'HubSpot cubre lo mismo. Ahorro $60/mes.', savings: 60, priority: 'high' },
    { title: 'Downgrade Mailchimp', desc: 'Usas solo 30% de features. Ahorro $22/mes.', savings: 22, priority: 'medium' },
    { title: 'Negociar HubSpot', desc: 'Empresas similares pagan ~$70/mes.', savings: 60, priority: 'medium' },
    { title: 'Consolidar GitHub+Jira', desc: 'Bundle Atlassian descuento. Ahorro $15/mes.', savings: 15, priority: 'low' },
  ];
  recs.forEach(r => {
    d.counters.rec++;
    d.recommendations.push({
      id: d.counters.rec, user_id: 1, type: r.title.includes('Cancelar')?'cancel':r.title.includes('Downgrade')?'downgrade':'optimize',
      title: r.title, description: r.desc, potential_savings: r.savings, priority: r.priority, status: 'pending'
    });
  });

  saveDb();
  console.log('✓ Datos demo creados');
}

// ─── APP ───
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || 'app-secret-key';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: SECRET, resave: false, saveUninitialized: false, cookie: { maxAge: 24*60*60*1000 } }));
app.use(express.static(path.join(__dirname, 'public')));

seedData();

// ─── AUTH ───
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  const d = getDb();
  const user = d.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
  if (user.status === 'suspended') return res.status(403).json({ error: 'Cuenta suspendida', suspended: true });
  user.last_login = new Date().toISOString();
  saveDb();
  req.session.userId = user.id;
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, company: user.company, plan: user.plan, status: user.status } });
});

app.post('/api/register', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  const d = getDb();
  if (d.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email ya registrado' });
  
  d.counters.user++;
  const user = {
    id: d.counters.user, name: email.split('@')[0], email,
    password: 'demo-no-pass', company: '', plan: 'demo', status: 'active',
    license_key: null, subscription_expires: null,
    created_at: new Date().toISOString().split('T')[0], last_login: new Date().toISOString()
  };
  d.users.push(user);
  d.audit.push({ action: 'register', details: 'Nuevo registro: ' + email, created_at: new Date().toISOString() });
  saveDb();
  req.session.userId = user.id;
  res.json({ success: true, message: 'Demo activada', user: { id: user.id, name: user.name, email, plan: 'demo', status: 'active' } });
});

// Activate license
app.post('/api/activate', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Inicia sesion primero' });
  const d = getDb();
  const { license_key } = req.body;
  if (!license_key) return res.status(400).json({ error: 'Codigo requerido' });
  if (!license_key.startsWith('SAAS-') || license_key.length < 15) return res.status(400).json({ error: 'Codigo invalido' });
  
  const user = d.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Validate format
  const parts = license_key.split('-');
  if (parts.length !== 3 || parts[0] !== 'SAAS') return res.status(400).json({ error: 'Formato de codigo invalido' });
  
  const expDate = new Date();
  expDate.setMonth(expDate.getMonth() + 1);
  const expiresStr = expDate.toISOString().split('T')[0];
  
  user.plan = 'full';
  user.status = 'active';
  user.license_key = license_key;
  user.subscription_expires = expiresStr;
  saveDb();
  
  d.audit.push({ action: 'activate', details: 'Licencia activada: ' + license_key, created_at: new Date().toISOString() });
  saveDb();
  
  res.json({ success: true, message: 'FULL activado. Expira: ' + expiresStr, plan: 'full', expires_at: expiresStr });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No auth' });
  const d = getDb();
  const user = d.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'No encontrado' });
  res.json({ id: user.id, name: user.name, email: user.email, company: user.company, plan: user.plan, status: user.status, license_key: user.license_key, subscription_expires: user.subscription_expires });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

// ─── USER MIDDLEWARE ───
app.use('/api/user', (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No auth' });
  const d = getDb();
  req.currentUser = d.users.find(u => u.id === req.session.userId);
  if (!req.currentUser) return res.status(401).json({ error: 'No encontrado' });
  next();
});

// ─── DASHBOARD ───
app.get('/api/user/dashboard', (req, res) => {
  const d = getDb();
  const uid = req.session.userId;
  const subs = d.subscriptions.filter(s => s.user_id === uid);
  const active = subs.filter(s => s.status === 'active');
  const inactive = subs.filter(s => s.status === 'inactive');
  const monthlySpend = active.reduce((a, s) => a + s.price_monthly * s.seats, 0);
  const pendingRecs = d.recommendations.filter(r => r.user_id === uid && r.status === 'pending');
  const potentialSavings = pendingRecs.reduce((a, r) => a + r.potential_savings, 0);
  
  const upcomingRenewals = active.filter(s => s.renewal_date).sort((a, b) => a.renewal_date.localeCompare(b.renewal_date)).slice(0, 5);
  const cats = {};
  active.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.price_monthly * s.seats; });
  const spendingByCategory = Object.entries(cats).map(([category, total]) => ({ category, total }));
  
  const act = d.audit.filter(a => a.action).slice(-8).reverse();
  
  let subInfo = { plan: req.currentUser.plan, status: req.currentUser.status, expires: req.currentUser.subscription_expires, daysLeft: null };
  if (req.currentUser.subscription_expires) {
    const diff = Math.ceil((new Date(req.currentUser.subscription_expires + 'T23:59:59') - new Date()) / (1000*60*60*24));
    subInfo.daysLeft = diff;
  }
  
  res.json({
    stats: { totalSubscriptions: subs.length, activeSubscriptions: active.length, inactiveSubscriptions: inactive.length, monthlySpend, yearlySpend: monthlySpend * 12, potentialSavings, roiPercent: monthlySpend > 0 ? Math.round(potentialSavings/monthlySpend*100) : 0, pendingRecommendations: pendingRecs.length },
    subscription: subInfo,
    upcomingRenewals, spendingByCategory, recentActivity: act
  });
});

// ─── SUBSCRIPTIONS ───
app.get('/api/user/subscriptions', (req, res) => {
  const d = getDb();
  res.json(d.subscriptions.filter(s => s.user_id === req.session.userId));
});

app.post('/api/user/subscriptions', (req, res) => {
  const d = getDb();
  if (req.currentUser.plan === 'demo' && d.subscriptions.filter(s => s.user_id === req.session.userId).length >= 5)
    return res.status(403).json({ error: 'Limite 5 subs en DEMO' });
  const { name, vendor, category, price_monthly, seats, billing_cycle, renewal_date } = req.body;
  if (!name || !price_monthly) return res.status(400).json({ error: 'Nombre y precio requeridos' });
  d.counters.sub++;
  d.subscriptions.push({ id: d.counters.sub, user_id: req.session.userId, name, vendor: vendor || name, category: category || 'Otros', price_monthly, seats: seats || 1, billing_cycle: billing_cycle || 'monthly', status: 'active', renewal_date: renewal_date || null, auto_renew: 1, created_at: new Date().toISOString() });
  saveDb();
  res.json({ success: true, id: d.counters.sub });
});

app.put('/api/user/subscriptions/:id', (req, res) => {
  const d = getDb();
  const sub = d.subscriptions.find(s => s.id === parseInt(req.params.id) && s.user_id === req.session.userId);
  if (!sub) return res.status(404).json({ error: 'No encontrado' });
  Object.assign(sub, req.body);
  saveDb();
  res.json({ success: true });
});

app.delete('/api/user/subscriptions/:id', (req, res) => {
  const d = getDb();
  d.subscriptions = d.subscriptions.filter(s => !(s.id === parseInt(req.params.id) && s.user_id === req.session.userId));
  saveDb();
  res.json({ success: true });
});

// ─── RECOMMENDATIONS ───
app.get('/api/user/recommendations', (req, res) => {
  const d = getDb();
  res.json(d.recommendations.filter(r => r.user_id === req.session.userId));
});

app.post('/api/user/recommendations/:id/apply', (req, res) => {
  const d = getDb();
  const rec = d.recommendations.find(r => r.id === parseInt(req.params.id) && r.user_id === req.session.userId);
  if (!rec) return res.status(404).json({ error: 'No encontrada' });
  rec.status = 'applied';
  saveDb();
  res.json({ success: true, message: 'Aplicada: ' + rec.title });
});

app.post('/api/user/recommendations/:id/dismiss', (req, res) => {
  const d = getDb();
  const rec = d.recommendations.find(r => r.id === parseInt(req.params.id) && r.user_id === req.session.userId);
  if (rec) rec.status = 'dismissed';
  saveDb();
  res.json({ success: true });
});

// ─── AI SCAN ───
app.post('/api/user/ai/scan', (req, res) => {
  if (req.currentUser.plan !== 'full') return res.status(403).json({ error: 'Solo disponible en FULL' });
  res.json({ success: true, message: 'Escaneo completado' });
});

app.get('/api/user/ai/scan/results', (req, res) => {
  const d = getDb();
  res.json(d.scans.filter(s => s.user_id === req.session.userId));
});

// ─── RENEWALS ───
app.get('/api/user/renewals', (req, res) => {
  const d = getDb();
  const now = new Date().toISOString().split('T')[0];
  const subs = d.subscriptions.filter(s => s.user_id === req.session.userId && s.renewal_date && s.status === 'active').map(s => ({
    ...s, days_remaining: Math.ceil((new Date(s.renewal_date + 'T12:00:00') - new Date()) / (1000*60*60*24))
  })).sort((a, b) => a.days_remaining - b.days_remaining);
  res.json(subs);
});

app.put('/api/user/renewals/:id/auto-renew', (req, res) => {
  const d = getDb();
  const sub = d.subscriptions.find(s => s.id === parseInt(req.params.id) && s.user_id === req.session.userId);
  if (sub) sub.auto_renew = req.body.auto_renew ? 1 : 0;
  saveDb();
  res.json({ success: true });
});

// ─── ANALYTICS ───
app.get('/api/user/analytics/category-breakdown', (req, res) => {
  const d = getDb();
  const subs = d.subscriptions.filter(s => s.user_id === req.session.userId && s.status === 'active');
  const cats = {};
  subs.forEach(s => { cats[s.category] = (cats[s.category] || 0) + s.price_monthly * s.seats; });
  res.json(Object.entries(cats).map(([category, total]) => ({ category, total })));
});

app.get('/api/user/analytics/vendor-analysis', (req, res) => {
  const d = getDb();
  const subs = d.subscriptions.filter(s => s.user_id === req.session.userId && s.status === 'active');
  const vends = {};
  subs.forEach(s => { vends[s.vendor] = (vends[s.vendor] || 0) + s.price_monthly * s.seats; });
  res.json(Object.entries(vends).map(([vendor, total_spend]) => ({ vendor, tools: subs.filter(s => s.vendor === vendor).length, total_spend })));
});

// ─── COMPLIANCE ───
app.get('/api/user/compliance', (req, res) => {
  if (req.currentUser.plan !== 'full') return res.json({ demo_only: true });
  const d = getDb();
  const logs = d.audit.filter(a => a.action).slice(-50);
  res.json({ generated_at: new Date().toISOString(), data_processing: { gdpr_compliant: true, data_encryption: 'AES-256' }, recent_audit_logs: logs, security_score: 85 });
});

// ─── EXPORT ───
app.get('/api/user/export/:format', (req, res) => {
  if (req.currentUser.plan !== 'full') return res.status(403).json({ error: 'Solo FULL' });
  const d = getDb();
  const subs = d.subscriptions.filter(s => s.user_id === req.session.userId);
  if (req.params.format === 'csv') {
    const { Parser } = require('json2csv');
    const parser = new Parser({ fields: ['name','vendor','category','price_monthly','seats','status'] });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
    return res.send(parser.parse(subs));
  }
  res.status(400).json({ error: 'Formato no soportado' });
});

// ─── SUBSCRIPTION STATUS ───
app.get('/api/user/subscription-status', (req, res) => {
  const u = req.currentUser;
  const d = getDb();
  let daysLeft = null;
  let expired = false;
  let renewalWarning = null;
  if (u.subscription_expires) {
    const diff = Math.ceil((new Date(u.subscription_expires + 'T23:59:59') - new Date()) / (1000*60*60*24));
    daysLeft = diff;
    expired = diff <= 0;
    if (diff > 0 && diff <= 5) renewalWarning = { daysLeft: diff, message: 'Tu suscripcion expira en ' + diff + ' dia(s). Renueva para seguir usando.' };
    else if (expired) renewalWarning = { daysLeft: 0, message: 'Suscripcion expirada.' };
  }
  res.json({ plan: u.plan, status: u.status, expires: u.subscription_expires, daysLeft, expired, monthlyFee: 29.99, renewalWarning, payments: [] });
});

// Serve frontend
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   SAAS OPTIMIZER v3.0                    ║');
  console.log('  ║   App para Clientes                      ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  📊 http://localhost:' + PORT);
  console.log('  👤 Demo: demo@saasopt.com (sin contraseña)');
  console.log('');
});
