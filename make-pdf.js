const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();

  const filePath = 'file:///' + path.resolve(__dirname, 'glowfiesta-quiz-plan.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for Google Fonts to load
  await new Promise(r => setTimeout(r, 2000));

  await page.pdf({
    path: path.join(__dirname, 'GlowFiesta-Quiz2-Plan.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', bottom: '1cm', left: '1.2cm', right: '1.2cm' }
  });

  await browser.close();
  console.log('PDF created: GlowFiesta-Quiz2-Plan.pdf');
})();
