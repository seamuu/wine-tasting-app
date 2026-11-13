import assert from 'node:assert/strict';
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launchBrowser, until } from './lib/browser.mjs';
const output=path.resolve('public/practice-cards');await mkdir(output,{recursive:true});
const temp=await mkdtemp(path.join(os.tmpdir(),'practice-cards-'));
const browser=await launchBrowser(temp);
try {
 const page=await browser.page();await page.navigate('http://localhost:3000/sample-cards.html');
 await until(()=>page.evaluate('window.samplesReady===true'),'filled cards rendered');
 await page.evaluate('document.fonts.ready.then(()=>true)');
 const answers=await page.evaluate('window.sampleAnswers');assert.equal(answers.length,4);
 for(const answer of answers){
  const clip=await page.evaluate(`(()=>{const r=document.querySelector('[data-sample="${answer.position}-${answer.file[2]}"]').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:2};})()`);
  const shot=await page.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
  await writeFile(path.join(output,answer.file),Buffer.from(shot.data,'base64'));
 }
 const pdf=await page.send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
 await writeFile(path.join(output,'filled-cards-one-per-page.pdf'),Buffer.from(pdf.data,'base64'));
 for(const answer of answers){
  await page.evaluate(`document.querySelectorAll('.sample-pair').forEach(pair=>pair.classList.toggle('print-excluded',!pair.querySelector('[data-sample="${answer.position}-${answer.file[2]}"]')))`);
  const single=await page.send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
  await writeFile(path.join(output,answer.file.replace('.png','.pdf')),Buffer.from(single.data,'base64'));
 }
 await page.evaluate("document.querySelectorAll('.print-excluded').forEach(pair=>pair.classList.remove('print-excluded'))");
 for(const answer of answers){
  const scanner=await browser.page();await scanner.navigate('http://localhost:3000/scan-v2.html?ids=colours&wines=2&price=0');
  await scanner.send('Page.bringToFront');
  await until(()=>scanner.evaluate('window.__mapReady===true'),'scanner ruler ready');await scanner.send('DOM.enable');
  await scanner.evaluate('window.__lastRun=null');
  const {root}=await scanner.send('DOM.getDocument');
  const {nodeId}=await scanner.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#file'});
  await scanner.send('DOM.setFileInputFiles',{nodeId,files:[path.join(output,answer.file)]});
  await until(()=>scanner.evaluate('window.__cornersReady===true'),'card corners');
  await scanner.evaluate("document.getElementById('readBtn').click()");
  await until(()=>scanner.evaluate('!!window.__lastRun'),'scan finished').catch(async error=>{console.log(JSON.stringify({errors:scanner.errors,text:await scanner.evaluate('document.body.innerText')}).slice(0,4000));throw error;});
  const result=await scanner.evaluate('window.__lastRun');assert.ok(!result.error,`${answer.file}: ${result.error}`);
  assert.equal(result.side,answer.side);
  const identities=result.groups.filter(g=>g.name.toLowerCase()==='you are');
  assert.equal(identities[0].value,answer.idA);assert.equal(identities[1].value,answer.idB);
  for(const attr of ['body','acidity','tannin','sweetness','alcohol','rating'])assert.equal(Number(result.groups.find(g=>g.name.toLowerCase()===attr).value),answer[attr],`${answer.file}: ${attr}`);
  assert.equal(result.groups.find(g=>g.name.toLowerCase()==='wine').value,answer.position);
  const aromas=result.groups.filter(g=>g.kind==='many').flatMap(g=>(g.value??[]).map(v=>g.name+'|'+v));
  assert.deepEqual(aromas.sort(),[...answer.flavours].sort());
  assert.equal(await scanner.evaluate("document.getElementById('results').innerText.includes('Price guess')"),false,'no price question on tasting-only cards');
  await scanner.send('Network.enable');
  let unexpectedSaves=0;
  scanner.socket.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(message.method==='Network.requestWillBeSent' && /\/(api\/scan|_capture)$/.test(new URL(message.params.request.url).pathname))unexpectedSaves++;
  });
  await scanner.send('Page.reload');
  await until(()=>scanner.evaluate('!!window.__lastRun'),'previous read restored after reload');
  assert.deepEqual(await scanner.evaluate('window.__lastRun.groups'),result.groups,'restore exact readings');
  assert.equal(await scanner.evaluate("document.getElementById('stage').classList.contains('on')"),true);
  assert.equal(unexpectedSaves,0,'restoring a read must not file or capture it again');
  if(answer.file==='A-1.png'){
   await scanner.navigate('http://localhost:3000/scan-v2.html?ids=colours&wines=2&price=0&expectedPosition=B');
   await until(()=>scanner.evaluate('window.__mapReady===true'),'other wine ruler ready');
   assert.equal(await scanner.evaluate('!!window.__lastRun'),false,'another wine must not inherit a saved read');
  }
  console.log(`Verified ${answer.file}: ${answer.idA} ${answer.idB}, wine ${answer.position}, rating ${answer.rating}`);
 }
 await writeFile(path.join(output,'expected-answers.json'),JSON.stringify(answers,null,2));
 await writeFile(path.join(output,'scan-verification.json'),JSON.stringify({passed:true,cards:answers.length,ids:'colours',wines:2,price:false,sides:'WR',priceRowHidden:true,reloadRestoresExactRead:true,restoreDoesNotResubmit:true,restoreScopedToWine:true},null,2));
 console.log('Four PNGs, four single-card PDFs and a four-page PDF generated and verified. No tasting data was written.');
}finally{browser.close();}
