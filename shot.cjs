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
  page.on('console', m => { if (m.type() === 'error') logs.push('[err] ' + m.text()); });
  page.on('pageerror', e => logs.push('[PAGEERROR] ' + e.message));
  page.on('requestfailed', r => logs.push('[REQFAIL] ' + r.url()));

  await page.goto(FILE, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction('window.__ready === true', null, { timeout: 180000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: OUT + '/1-default.png' });

  // 房间全景（9）
  await page.keyboard.press('9');
  await page.waitForTimeout(2800);
  await page.screenshot({ path: OUT + '/2-room.png' });

  // 俯视（0）
  await page.keyboard.press('0');
  await page.waitForTimeout(2800);
  await page.screenshot({ path: OUT + '/3-top.png' });

  // 夜晚
  await page.evaluate('window.__setTime(0.85)');
  await page.keyboard.press('1');
  await page.waitForTimeout(2800);
  await page.screenshot({ path: OUT + '/4-night.png' });

  // 白天 + 发射
  await page.evaluate('window.__setTime(0.4)');
  await page.click('#bLaunch');
  await page.waitForTimeout(4500);
  await page.screenshot({ path: OUT + '/5-launch.png' });

  const dbg = await page.evaluate('window.__dbg()');
  console.log('DBG:', JSON.stringify(dbg));
  console.log(logs.length ? logs.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
