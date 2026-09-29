const { chromium } = require('playwright-core');
const EXE = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const FILE = 'file:///' + encodeURI('D:/素材存储/moon-base/index.html');

(async () => {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader',
           '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on('pageerror', e => logs.push('[PAGEERROR] ' + e.message));
  page.on('console', m => { if (m.type() === 'error') logs.push('[err] ' + m.text()); });

  await page.goto(FILE, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction('window.__ready === true', null, { timeout: 180000 });
  await page.waitForTimeout(3000);

  const pt = await page.evaluate(`(() => {
    const T = window.__three;
    const v = new T.THREE.Vector3(0, 18, -30).project(T.camera);
    return { x: (v.x*0.5+0.5)*innerWidth, y: (-v.y*0.5+0.5)*innerHeight };
  })()`);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(2000);
  console.log('CLICK-TOWER:', await page.evaluate(`JSON.stringify({
    shown: document.getElementById('inspect').classList.contains('show'),
    name: document.getElementById('insName').textContent })`));
  console.log(logs.length ? logs.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
