// Read-only phone UX check: no confirm click, no tasting records are written.
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launchBrowser, until } from './lib/browser.mjs';
const directory=await mkdtemp(path.join(os.tmpdir(),'wine-scanner-screens-'));
const browser=await launchBrowser(directory);
try {
 const page=await browser.page();
 await page.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await page.navigate('http://localhost:3000/scan-v2.html?embedded=1&event=preview-only&ids=colours&wines=2&price=0&expectedPosition=A&expected=2');
 await until(()=>page.evaluate('window.__mapReady===true && !!window.scanWizard'),'wizard ready');
 const step=()=>page.evaluate('document.documentElement.dataset.scanStep');
 async function capture(name){
  assert.equal(await step(),name);
  assert.equal(await page.evaluate("[...document.querySelectorAll('[data-wizard-step]')].filter(panel=>!panel.hidden).length"),1);
  assert.equal(await page.evaluate("getComputedStyle(document.getElementById('legacyBar')).display"),'none');
  const size=await page.screenshot(path.join(directory,name+'.png'),390,844);
  assert.ok(size.scroll<=size.width+2,'screen must fit phone width');
 }
 await page.send('Page.setInterceptFileChooserDialog',{enabled:true});
 await capture('wine');
 assert.equal(await page.evaluate("document.getElementById('dstCanvas').checkVisibility()"),false,'no blank preview before scanning');
 await page.evaluate("document.getElementById('wizardStart').click()");await capture('capture');
 await page.evaluate("loadImage('/practice-cards/A-1.png')");
 await until(()=>page.evaluate('window.__cornersReady===true'),'photo ready');
 await until(()=>page.evaluate('!!window.__lastRun'),'card read');
 await capture('summary');
 const result=await page.evaluate('window.__lastRun');
 assert.equal(result.groups.find(group=>group.name==='Rating').value,'8');
 assert.equal(await page.evaluate("document.querySelectorAll('[data-wizard-step=summary] img').length"),1,'one original photo above the summary');
 assert.equal(await page.evaluate("document.getElementById('wizardSummaryPhoto').checkVisibility()"),true);
 assert.equal(await page.evaluate("document.getElementById('srcCanvas').checkVisibility() || document.getElementById('dstCanvas').checkVisibility()"),false,'no duplicate or processed photos');
 await page.evaluate("document.getElementById('retryCardBtn').click()");
 assert.equal(await step(),'capture');
 await page.evaluate("(()=>{const blank=document.createElement('canvas');blank.width=700;blank.height=1000;const ctx=blank.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,700,1000);loadImage(blank.toDataURL());})()");
 await until(()=>page.evaluate('window.__cornersReady===true'),'blank photo loaded');
 await until(()=>step().then(value=>value==='error'),'unreadable photo gets a simple retake screen');
 await capture('error');
 await page.evaluate("document.getElementById('wizardErrorRetake').click()");
 assert.equal(await step(),'capture');
 assert.equal(page.errors.length,0,'no browser exceptions');
 console.log('Camera-to-summary flow, one photo, no blank preview and retake verified with a real card. No card was saved. Screenshots: '+directory);
} finally {browser.close();}
