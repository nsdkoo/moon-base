const { chromium } = require('playwright-core');
const EXE = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const OUT = 'D:/素材存储/moon-base/shots';
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
  await page.waitForTimeout(2500);

  // 冻结相机，对准地球方向（0.55,0.5,-0.6 归一化 ×520）
  await page.evaluate(`window.__freeze = true`);
  await page.evaluate(`(() => {
    const T = window.__three;
    const d = new T.THREE.Vector3(0.55,0.5,-0.6).normalize();
    T.camera.position.set(0, 26, 40);
    T.camera.lookAt(d.x*520, d.y*520, d.z*520);
  })()`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '/7-earth.png' });

  // 夜晚地照
  await page.evaluate('window.__setTime(0.85)');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + '/8-earth-night.png' });

  console.log(logs.length ? logs.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
