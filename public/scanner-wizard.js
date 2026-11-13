/* One task per screen. The existing scanner remains the image-reading engine. */
(() => {
  const query = new URLSearchParams(location.search);
  if (query.get('diagnostic') === '1' || !(query.get('wizard') === '1' || query.get('embedded') === '1' && query.get('event'))) return;
  const position = /^[A-H]$/.test(query.get('expectedPosition') || '') ? query.get('expectedPosition') : 'A';
  let expected = Number(query.get('expected')) || 0;
  let autoReadRequested = false;
  savedCount = Math.max(savedCount, Number(query.get('collected')) || 0);
  setForcedSide('', false);
  setNoMarks(query.get('nomarks') === '1', false);
  const shell = document.createElement('div');
  shell.className = 'wizard-shell';
  shell.innerHTML = `
    <header class="wizard-header"><span class="wizard-wine">Wine ${position}</span><span id="wizardStepLabel"></span></header>
    <section data-wizard-step="wine" hidden>
      <h1 tabindex="-1">Wine ${position}</h1>
      <p id="wizardWineCount"></p>
      <button class="btn btn-primary" id="wizardStart" type="button">Scan a card</button>
    </section>
    <section data-wizard-step="capture" hidden>
      <h1 tabindex="-1">Scan a card</h1>
      <p>One card in the photo. Keep all four black corners visible.</p>
      <button class="btn btn-primary" id="wizardPhoto" type="button">Take or choose a photo</button>
      <button class="wizard-back" id="wizardBack" type="button">Back</button>
    </section>
    <section data-wizard-step="read" hidden>
      <h1 tabindex="-1">Read this card</h1>
      <div id="wizardPhotoPreview"></div>
      <p class="wizard-muted" id="wizardReadHint">Preparing the reader…</p>
      <div class="wizard-actions" id="wizardReadActions"></div>
      <details class="wizard-more" id="wizardAdjust"><summary>Adjust photo</summary><div id="wizardAdvanced"></div></details>
    </section>
    <section data-wizard-step="reading" hidden>
      <h1 tabindex="-1">Reading card…</h1><p>This takes a moment.</p>
    </section>
    <section data-wizard-step="summary" hidden>
      <h1 tabindex="-1">Check this card</h1><img id="wizardSummaryPhoto" alt="The card you photographed" /><div id="wizardSummary"></div>
    </section>
    <section data-wizard-step="saved" hidden>
      <h1 tabindex="-1" id="wizardSavedTitle">Card saved</h1>
      <p id="wizardSavedWho"></p><p class="wizard-complete" id="wizardSavedCount"></p>
      <div class="wizard-actions" id="wizardSavedActions"></div>
    </section>
    <section data-wizard-step="error" hidden>
      <h1 tabindex="-1">Try another photo</h1>
      <p id="wizardErrorMessage">Could not line up the card. Include all four black corners and keep the camera straight.</p>
      <button class="btn btn-primary" id="wizardErrorRetake" type="button">Retake</button>
      <button class="wizard-back" id="wizardErrorAdjust" type="button">Adjust this photo</button>
    </section>`;
  document.querySelector('.wrap').prepend(shell);
  const find = id => document.getElementById(id);
  find('wizardPhotoPreview').append(find('stage'));
  find('readBtn').classList.add('btn-primary');
  find('wizardReadActions').append(find('readBtn'));
  const readRetake = document.createElement('button');
  readRetake.type = 'button'; readRetake.className = 'btn'; readRetake.textContent = 'Retake';
  find('wizardReadActions').append(readRetake);
  find('wizardSummary').append(find('results'));
  find('wizardAdvanced').append(find('nomarks').closest('label'), find('sideSel').closest('label'), find('status'));
  const done = document.createElement('button');
  done.type = 'button'; done.className = 'btn btn-primary'; done.textContent = 'Done';
  let step;
  function show(next) {
    step = next;
    document.documentElement.dataset.scanStep = next;
    shell.querySelectorAll('[data-wizard-step]').forEach(panel => { panel.hidden = panel.dataset.wizardStep !== next; });
    find('wizardStepLabel').textContent = expected > 0 ? `${savedCount}/${expected} saved` : `${savedCount} saved`;
    window.scrollTo(0, 0);
    shell.querySelector(`[data-wizard-step="${next}"] h1`)?.focus({preventScroll:true});
  }
  function updateCounts() {
    if (Number.isFinite(window.__scanExpected)) expected = window.__scanExpected;
    find('wizardStepLabel').textContent = expected > 0 ? `${savedCount}/${expected} saved` : `${savedCount} saved`;
    const complete = expected > 0 && savedCount >= expected;
    const count = expected > 0 ? `${savedCount}/${expected} cards saved` : `${savedCount} cards saved`;
    find('wizardWineCount').textContent = complete ? '✓ All cards scanned. You can close this screen.' : `${count}. You can continue on the host screen at any time.`;
    find('wizardStart').textContent = complete ? 'Scan another card' : 'Scan a card';
    find('wizardSavedTitle').textContent = complete ? 'All cards scanned' : 'Card saved';
    find('wizardSavedWho').textContent = find('filed')?.textContent || '';
    find('wizardSavedCount').textContent = `${count}. You can finish scanning and continue on the host screen now.`;
    const next = find('nextCardBtn');
    if (next) { next.className = complete ? 'btn' : 'btn btn-primary'; next.textContent = complete ? 'Scan another card' : 'Scan next card'; }
    done.hidden = false;
  }
  function startNext() {
    if (reviewState === 'saving') return;
    forgetRead(); window.__lastRun = null; reviewState = 'empty'; corners = null;
    find('file').value = ''; find('file').disabled = false;
    find('results').replaceChildren(); find('stage').classList.remove('on', 'wizard-adjusting');
    find('wizardAdjust').open = false;
    find('readBtn').disabled = true;
    updateCounts(); show('capture');
  }
  function openCamera() { startNext(); find('file').click(); }
  function readWhenReady() {
    if (autoReadRequested || !MAP || !corners) return;
    autoReadRequested = true;
    find('readBtn').disabled = false;
    find('readBtn').click();
  }
  find('wizardStart').onclick = openCamera;
  find('wizardPhoto').onclick = () => find('file').click();
  find('wizardBack').onclick = () => { updateCounts(); show('wine'); };
  readRetake.onclick = openCamera;
  find('wizardErrorRetake').onclick = openCamera;
  find('wizardErrorAdjust').onclick = () => { show('read'); find('wizardAdjust').open = true; find('stage').classList.add('wizard-adjusting'); find('readBtn').disabled = !MAP || !corners; };
  find('wizardAdjust').ontoggle = () => find('stage').classList.toggle('wizard-adjusting', find('wizardAdjust').open);
  done.onclick = () => { startNext(); show('wine'); };
  window.scanWizard = {
    photoLoading() { autoReadRequested = false; find('stage').classList.remove('on'); show('reading'); },
    photoReady() { readWhenReady(); },
    layoutReady() { if (step === 'reading') readWhenReady(); },
    reading() { find('readBtn').disabled = true; show('reading'); },
    error(message) { find('wizardErrorMessage').textContent = message || 'Could not line up the card. Include all four black corners and keep the camera straight.'; show('error'); },
    summary() {
      const next = find('results').querySelector('#nextCardBtn');
      if (next) { find('wizardSavedActions').replaceChildren(next, done); next.onclick = openCamera; }
      const retake = find('retryCardBtn');
      if (retake) { retake.textContent = 'Retake'; retake.onclick = openCamera; }
      find('wizardSummaryPhoto').src = srcCanvas.toDataURL('image/jpeg',0.9);
      updateCounts(); show('summary');
    },
    reviewState(state) {
      if (state === 'saved') { updateCounts(); show('saved'); }
      else if (state === 'review' || state === 'saving') {
        const help = find('reviewHelp');
        if (help) help.textContent = state === 'saving' ? 'Saving…' : 'Nothing is saved until you confirm.';
        if (step !== 'summary') show('summary');
      }
    },
  };
  find('wizardSummaryPhoto').onclick = () => find('wizardSummaryPhoto').classList.toggle('expanded');
  const countBefore = savedCount;
  if(query.get('event')) fetch(`/api/scan?eventId=${encodeURIComponent(query.get('event'))}&position=${position}`, {cache:'no-store'})
    .then(response => response.ok ? response.json() : null).then(collection => {
      if(!collection || savedCount !== countBefore) return;
      expected = collection.expected; savedCount = collection.count; updateCounts();
    }).catch(()=>{});
  if (window.__lastRun && !window.__lastRun.error) { window.scanWizard.summary(); setReviewState(reviewState); }
  else { updateCounts(); show('wine'); }
})();
