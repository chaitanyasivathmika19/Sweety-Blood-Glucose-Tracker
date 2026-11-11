const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../server/node_modules/puppeteer-core'));
const http = require('http');
const fs = require('fs');
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));

const DIST_DIR = path.resolve(__dirname, '../client/dist');
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  // SPA fallback
  const indexPath = path.join(DIST_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(indexPath).pipe(res);
});

const PORT = 4173;
server.listen(PORT, async () => {
  console.log(`Preview server running on http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  // Generate demo tokens for screenshot session
  const JWT_SECRET = 'sweety_dev_secret_key_12345';
  const patientToken = jwt.sign(
    { id: 1, name: 'Chaitanya Sivathmika', email: 'patient@sweety.com', role: 'patient' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  const doctorToken = jwt.sign(
    { id: 2, name: 'Dr. Ananya Rao', email: 'doctor@sweety.com', role: 'doctor' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: edgePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const captures = [
      { name: '01_login.png', path: '/login', auth: null },
      { name: '02_register.png', path: '/register', auth: null },
      { name: '03_patient_dashboard.png', path: '/', auth: patientToken },
      { name: '04_glucose_tracking.png', path: '/tracking', auth: patientToken },
      { name: '05_tracking_calendar.png', path: '/calendar', auth: patientToken },
      { name: '06_analytics_charts.png', path: '/analytics', auth: patientToken },
      { name: '07_reports_export.png', path: '/reports', auth: patientToken },
      { name: '08_doctor_discovery.png', path: '/doctors', auth: patientToken },
      { name: '09_subscriptions_payment.png', path: '/subscriptions', auth: patientToken },
      { name: '10_consultation_chat.png', path: '/chat', auth: patientToken },
      { name: '11_notifications.png', path: '/notifications', auth: patientToken },
      { name: '12_doctor_dashboard.png', path: '/doctor', auth: doctorToken },
      { name: '13_doctor_patients.png', path: '/doctor/patients', auth: doctorToken },
      { name: '14_doctor_payment_requests.png', path: '/doctor/requests', auth: doctorToken },
      { name: '15_mobile_layout.png', path: '/', auth: patientToken, mobile: true }
    ];

    for (const c of captures) {
      if (c.mobile) {
        await page.setViewport({ width: 390, height: 844, isMobile: true });
      } else {
        await page.setViewport({ width: 1280, height: 820 });
      }

      await page.goto(`http://localhost:${PORT}${c.path}`, { waitUntil: 'domcontentloaded' });

      if (c.auth) {
        await page.evaluate((tok) => {
          localStorage.setItem('sweety_token', tok);
        }, c.auth);
        await page.goto(`http://localhost:${PORT}${c.path}`, { waitUntil: 'domcontentloaded' });
      } else {
        await page.evaluate(() => {
          localStorage.removeItem('sweety_token');
        });
        await page.goto(`http://localhost:${PORT}${c.path}`, { waitUntil: 'domcontentloaded' });
      }

      // Small delay to ensure renders are settled
      await new Promise(r => setTimeout(r, 600));

      const outPath = path.join(SCREENSHOT_DIR, c.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Captured ${c.name}`);
    }

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Screenshot error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
