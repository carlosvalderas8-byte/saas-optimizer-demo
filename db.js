const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');
let data = null;

function getDb() {
  if (data) return data;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    try { data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
    catch(e) { data = null; }
  }
  if (!data) {
    data = {
      users: [],
      subscriptions: [],
      integration_scans: [],
      recommendations: [],
      renewal_alerts: [],
      audit_log: [],
      counters: { user: 0, sub: 0, rec: 0 }
    };
  }
  return data;
}

function save() { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

module.exports = { getDb, save };
