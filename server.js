require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'app.json');
const ADMIN_API = process.env.ADMIN_API_URL || 'http://localhost:3456';

// --- Code Protection ---
(function() {
  const protectCode = () => {
    // Check for .git
    if (fs.existsSync(path.join(__dirname, '.git'))) {
      console.error('⚠️ [PROTECCIÓN] Clonación detectada (.git). Saliendo...');
      process.exit(1);
    }
    // Check original filename
    const expectedName = "saas-optimizer-app";
  const allowedDirs = ["saas-optimizer-app", "saas-optimizer-test", "app", "test", "saas-optimizer-github"];
    const dirName = path.basename(path.resolve(__dirname));
    if (!allowedDirs.includes(dirName) && !dirName.includes(expectedName)) {
      console.error('⚠️ [PROTECCIÓN] Modificación detectada. Saliendo...');
      process.exit(1);
    }
    // Integrity check of this file
    try {
      const content = fs.readFileSync(__filename, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      if (hash.length < 10) process.exit(1); // basic integrity
    } catch(e) { process.exit(1); }
  };
  try { protectCode(); } catch(e) { process.exit(1); }
})();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- Database ---
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { users: [], subscriptions: [], recommendations: [] }; }
}
function saveDB(db) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getDemoLimit() { return 5; }

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// --- Auth Routes ---
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/register', (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.json({ success: false, error: 'Email requerido' });
  const db = loadDB();
  if (db.users.find(u => u.email === email)) return res.json({ success: false, error: 'Email ya registrado. Inicia sesión.' });
  
  const newUser = {
    id: db.users.length + 1,
    email, name: name || email.split('@')[0],
    password: '',
    plan: 'demo',
    registeredAt: new Date().toISOString(),
    settings: { theme: 'dark', currency: 'USD' }
  };
  db.users.push(newUser);
  saveDB(db);
  
  req.session.userId = newUser.id;
  req.session.userEmail = email;
  req.session.plan = 'demo';
  res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: 'Email requerido' });
  const db = loadDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return res.json({ success: false, error: 'Usuario no encontrado. Regístrate primero.' });
  
  req.session.userId = user.id;
  req.session.userEmail = email;
  req.session.plan = user.plan;
  res.json({ success: true, user, plan: user.plan });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/api/me', requireAuth, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.json({ error: 'Usuario no encontrado' });
  // Check expiration
  if (user.plan === 'full' && user.expiresAt && new Date(user.expiresAt) < new Date()) {
    user.plan = 'demo';
    saveDB(db);
  }
  
  let daysLeft = null;
  if (user.expiresAt) daysLeft = Math.ceil((new Date(user.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  
  res.json({ ...user, daysLeft, demoLimit: getDemoLimit() });
});

// --- Subscriptions CRUD ---
app.get('/api/subscriptions', requireAuth, (req, res) => {
  const db = loadDB();
  const subs = db.subscriptions.filter(s => s.userId === req.session.userId);
  const user = db.users.find(u => u.id === req.session.userId);
  
  const totalMonthly = subs.filter(s => s.billing === 'monthly').reduce((t, s) => t + s.cost, 0);
  const totalYearly = subs.filter(s => s.billing === 'yearly').reduce((t, s) => t + s.cost / 12, 0);
  const totalCost = totalMonthly + totalYearly;
  
  res.json({ subscriptions: subs, totalMonthly: Math.round(totalMonthly * 100) / 100, totalYearly: Math.round(totalYearly * 100) / 100, totalCost: Math.round(totalCost * 100) / 100 });
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  const userSubs = db.subscriptions.filter(s => s.userId === req.session.userId);
  
  if (user.plan === 'demo' && userSubs.length >= getDemoLimit()) {
    return res.json({ success: false, error: `Límite de ${getDemoLimit()} suscripciones en modo DEMO. Activa la versión FULL para más.`, limitReached: true });
  }
  
  const { name, category, cost, billing, nextBilling, notes, url } = req.body;
  if (!name || !cost) return res.json({ success: false, error: 'Nombre y costo requeridos' });
  
  const sub = {
    id: db.subscriptions.length + 1,
    userId: req.session.userId,
    name, category: category || 'Otros',
    cost: parseFloat(cost),
    billing: billing || 'monthly',
    nextBilling: nextBilling || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    status: 'active',
    notes: notes || '',
    url: url || '',
    createdAt: new Date().toISOString()
  };
  db.subscriptions.push(sub);
  saveDB(db);
  res.json({ success: true, subscription: sub });
});

app.put('/api/subscriptions/:id', requireAuth, (req, res) => {
  const db = loadDB();
  const idx = db.subscriptions.findIndex(s => s.id === parseInt(req.params.id) && s.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  Object.assign(db.subscriptions[idx], req.body);
  saveDB(db);
  res.json({ success: true, subscription: db.subscriptions[idx] });
});

app.delete('/api/subscriptions/:id', requireAuth, (req, res) => {
  const db = loadDB();
  const idx = db.subscriptions.findIndex(s => s.id === parseInt(req.params.id) && s.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  db.subscriptions.splice(idx, 1);
  saveDB(db);
  res.json({ success: true });
});

// --- Recommendations ---
app.get('/api/recommendations', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.recommendations.filter(r => r.userId === req.session.userId));
});

// --- License Activation ---
app.post('/api/activate', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.json({ success: false, error: 'Código de licencia requerido' });
  if (!code.startsWith('SAAS-') || code.length < 20) return res.json({ success: false, error: 'Código de licencia inválido' });
  
  try {
    const https = require('http');
    const result = await new Promise((resolve) => {
      const data = JSON.stringify({ code, email: req.session.userEmail });
      const reqHttp = https.request(ADMIN_API + '/api/verify-license', {
        method:'POST', headers: { 'Content-Type':'application/json', 'Content-Length': data.length }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      reqHttp.on('error', () => resolve({ valid: false, error: 'Error de conexión con servidor de licencias' }));
      reqHttp.write(data);
      reqHttp.end();
    });
    
    if (result.valid) {
      const db = loadDB();
      const user = db.users.find(u => u.id === req.session.userId);
      if (user) {
        user.plan = 'full';
        user.expiresAt = result.expiresAt;
        user.licenseCode = code;
        saveDB(db);
        req.session.plan = 'full';
      }
      res.json({ success: true, plan: 'full', expiresAt: result.expiresAt, daysLeft: result.daysLeft, message: '✅ ¡Activación exitosa! Disfruta de todas las funciones.' });
    } else {
      res.json({ success: false, error: result.error || 'Código inválido' });
    }
  } catch(e) {
    res.json({ success: false, error: 'Error de conexión. Verifica que el servidor de administración esté activo.' });
  }
});

app.post('/api/check-activation', requireAuth, async (req, res) => {
  try {
    const https = require('http');
    const result = await new Promise((resolve) => {
      const data = JSON.stringify({ email: req.session.userEmail });
      const reqHttp = https.request(ADMIN_API + '/api/check-license', {
        method:'POST', headers: { 'Content-Type':'application/json', 'Content-Length': data.length }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      reqHttp.on('error', () => resolve({ valid: false, plan: 'demo' }));
      reqHttp.write(data);
      reqHttp.end();
    });
    
    if (result.valid && result.plan === 'full') {
      const db = loadDB();
      const user = db.users.find(u => u.id === req.session.userId);
      if (user && user.plan !== 'full') {
        user.plan = 'full';
        user.expiresAt = result.expiresAt;
        saveDB(db);
        req.session.plan = 'full';
      }
    } else if ((!result.valid || result.plan !== 'full') && req.session.plan === 'full') {
      const db = loadDB();
      const user = db.users.find(u => u.id === req.session.userId);
      if (user) { user.plan = 'demo'; saveDB(db); }
      req.session.plan = 'demo';
    }
    res.json(result);
  } catch(e) {
    res.json({ valid: false, plan: req.session.plan || 'demo' });
  }
});

// --- Export ---
app.post('/api/export', requireAuth, (req, res) => {
  const { format } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (user.plan !== 'full') return res.status(403).json({ error: 'Solo disponible en versión FULL' });
  
  const subs = db.subscriptions.filter(s => s.userId === req.session.userId);
  if (format === 'csv') {
    let csv = 'Nombre,Categoría,Costo,Facturación,Próximo Pago,Estado\n';
    subs.forEach(s => { csv += `"${s.name}","${s.category}",${s.cost},"${s.billing}","${s.nextBilling}","${s.status}"\n`; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=suscripciones.csv');
    res.send(csv);
  } else res.json({ error: 'Formato no soportado' });
});

// --- Serve app ---
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SaaS Optimizer App iniciado en http://localhost:${PORT}`);
});
