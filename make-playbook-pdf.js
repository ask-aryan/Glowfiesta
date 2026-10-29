const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  const filePath = 'file:///' + path.resolve(__dirname, 'glowfiesta-playbook.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.pdf({
    path: path.join(__dirname, 'GlowFiesta-EventOwners-Playbook.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '0.6cm', bottom: '0.6cm', left: '0.8cm', right: '0.8cm' }
  });
  await browser.close();
  console.log('PDF created: GlowFiesta-EventOwners-Playbook.pdf');
})();
