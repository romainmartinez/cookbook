#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname } from 'node:path';
import { PeleError, render } from 'pele';
import { chromium } from 'playwright-core';

const peleGlobal = createRequire(import.meta.url).resolve('pele/global');

// Render in the page so labels are measured with the font Chrome draws them in.
async function screenshot(source, path) {
  const browser = await chromium.launch({ channel: 'chrome', executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.addScriptTag({ path: peleGlobal });
    await page.evaluate((source) => {
      document.body.innerHTML = pele.render(source, { responsive: false }).svg;
    }, source);
    await page.locator('svg').screenshot({ path });
  } finally {
    await browser.close();
  }
}

const [input, output = ''] = process.argv.slice(2);
const format = extname(output);
if (!['.png', '.svg'].includes(format)) {
  console.error('Usage: render.mjs <in.mmd> <out.png|out.svg>');
  process.exit(2);
}

try {
  const source = await readFile(input, 'utf8');
  const { svg } = render(source, { responsive: false });
  await (format === '.svg' ? writeFile(output, svg) : screenshot(source, output));
  console.log(output);
} catch (error) {
  console.error(error instanceof PeleError ? error.message : error.message.split('\n')[0]);
  process.exitCode = 1;
}
