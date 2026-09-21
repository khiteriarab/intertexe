import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const OUT = '/tmp/cursor/artifacts/follow-record-sticky-test';
const URL = 'https://www.intertexe.com/brands/demo#journey';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  // Fresh tab
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Hard refresh
  console.log('Hard refresh...');
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);

  // Find Follow the Record / journey section
  const sectionInfo = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,section,[id]'));
    const hits = [];
    for (const el of candidates) {
      const text = (el.textContent || '').trim().slice(0, 80);
      if (/follow the record|journey|SOURCE|lifecycle/i.test(text) || /journey|follow/i.test(el.id || '')) {
        const r = el.getBoundingClientRect();
        hits.push({
          tag: el.tagName,
          id: el.id,
          className: String(el.className).slice(0, 120),
          text,
          top: r.top + window.scrollY,
          height: r.height,
        });
      }
    }
    return { hits, scrollY: window.scrollY, innerHeight: window.innerHeight, bodyH: document.body.scrollHeight };
  });
  console.log('Section hits:', JSON.stringify(sectionInfo, null, 2));

  // Scroll to Follow the Record heading
  const scrolledTo = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,div'));
    const follow = headings.find(el => /^Follow the Record$/i.test((el.textContent || '').trim()) ||
      /Follow the Record/i.test((el.textContent || '').trim()) && (el.textContent || '').trim().length < 40);
    if (follow) {
      follow.scrollIntoView({ block: 'start', behavior: 'instant' });
      return { found: true, text: follow.textContent.trim(), y: window.scrollY };
    }
    // fallback: #journey
    const j = document.querySelector('#journey');
    if (j) {
      j.scrollIntoView({ block: 'start', behavior: 'instant' });
      return { found: true, via: '#journey', y: window.scrollY };
    }
    return { found: false, y: window.scrollY };
  });
  console.log('Scrolled to Follow the Record:', scrolledTo);
  await sleep(800);

  // Inspect sticky-related structure without modifying CSS
  const structure = await page.evaluate(() => {
    const follow = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find(el =>
      /Follow the Record/i.test((el.textContent || '').trim()));
    let root = follow;
    // climb to a likely section wrapper
    for (let i = 0; i < 8 && root; i++) {
      const stickyKids = root.querySelectorAll('*');
      let stickyCount = 0;
      for (const k of stickyKids) {
        const pos = getComputedStyle(k).position;
        if (pos === 'sticky' || pos === 'fixed') stickyCount++;
      }
      if (stickyCount > 0 || root.tagName === 'SECTION' || (root.id && /journey|follow|record/i.test(root.id))) {
        break;
      }
      root = root.parentElement;
    }

    // Find all sticky elements near follow section
    const all = Array.from(document.querySelectorAll('*'));
    const sticky = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.position === 'sticky' || cs.position === 'fixed') {
        const r = el.getBoundingClientRect();
        // only those near follow section vertically
        sticky.push({
          tag: el.tagName,
          id: el.id,
          className: String(el.className).slice(0, 160),
          position: cs.position,
          top: cs.top,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
          rectTop: Math.round(r.top),
          rectLeft: Math.round(r.left),
          rectW: Math.round(r.width),
          rectH: Math.round(r.height),
          text: (el.innerText || '').slice(0, 60).replace(/\s+/g, ' '),
        });
      }
    }

    // Check ancestors for overflow that breaks sticky
    const overflowBreakers = [];
    if (follow) {
      let p = follow.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (['auto', 'scroll', 'hidden', 'overlay'].includes(cs.overflow) ||
            ['auto', 'scroll', 'hidden', 'overlay'].includes(cs.overflowX) ||
            ['auto', 'scroll', 'hidden', 'overlay'].includes(cs.overflowY)) {
          overflowBreakers.push({
            tag: p.tagName,
            id: p.id,
            className: String(p.className).slice(0, 120),
            overflow: cs.overflow,
            overflowX: cs.overflowX,
            overflowY: cs.overflowY,
          });
        }
        p = p.parentElement;
      }
    }

    // Stage labels
    const stages = Array.from(document.querySelectorAll('*')).filter(el => {
      const t = (el.textContent || '').trim();
      return /^(SOURCE|CONNECT|NORMALIZE|VALIDATE|PUBLISH|MEASURE)$/i.test(t) && el.children.length === 0;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), top: Math.round(r.top), left: Math.round(r.left), active: el.className };
    });

    return {
      sticky,
      overflowBreakers,
      stages: stages.slice(0, 30),
      scrollY: window.scrollY,
      activeStageHint: document.body.innerText.match(/SOURCE|CONNECT|NORMALIZE|VALIDATE|PUBLISH|MEASURE/g)?.slice(0, 20),
    };
  });
  console.log('Structure sticky count:', structure.sticky.length);
  console.log(JSON.stringify(structure, null, 2));

  // Helper to get sticky strip metrics
  async function captureState(label) {
    const metrics = await page.evaluate(() => {
      const stickyEls = Array.from(document.querySelectorAll('*')).filter(el => {
        const cs = getComputedStyle(el);
        return cs.position === 'sticky';
      }).map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          className: String(el.className).slice(0, 120),
          topCss: cs.top,
          rectTop: Math.round(r.top),
          rectBottom: Math.round(r.bottom),
          rectLeft: Math.round(r.left),
          rectH: Math.round(r.height),
          inViewport: r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0,
          text: (el.innerText || '').slice(0, 80).replace(/\s+/g, ' '),
        };
      });

      // Detect active stage from aria/current/selected classes or strong highlight
      const stageWords = ['SOURCE', 'CONNECT', 'NORMALIZE', 'VALIDATE', 'PUBLISH', 'MEASURE'];
      let active = null;
      for (const w of stageWords) {
        const els = Array.from(document.querySelectorAll('*')).filter(el => {
          const t = (el.textContent || '').trim();
          return t === w || t.toUpperCase() === w;
        });
        for (const el of els) {
          const cs = getComputedStyle(el);
          const fw = parseInt(cs.fontWeight, 10) || 400;
          const opacity = parseFloat(cs.opacity);
          const aria = el.getAttribute('aria-current') || el.parentElement?.getAttribute('aria-current');
          const cls = String(el.className) + ' ' + String(el.parentElement?.className || '');
          if (aria === 'true' || aria === 'step' || /active|current|selected|is-active/i.test(cls) || fw >= 600) {
            // prefer visible ones
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              active = { stage: w, fw, opacity, cls: cls.slice(0, 80), top: Math.round(r.top) };
            }
          }
        }
      }

      // Also check for data-active or highlighted stage text near follow section
      const followH = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find(el =>
        /Follow the Record/i.test((el.textContent || '').trim()));
      let followTop = followH ? followH.getBoundingClientRect().top : null;

      return {
        scrollY: Math.round(window.scrollY),
        stickyEls,
        active,
        followTop: followTop != null ? Math.round(followTop) : null,
        viewportH: window.innerHeight,
      };
    });

    const file = path.join(OUT, `${label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`\n=== ${label} ===`);
    console.log('metrics:', JSON.stringify(metrics, null, 2));
    console.log('screenshot:', file);
    return { label, file, metrics };
  }

  // Bring Follow the Record into view more carefully - scroll so section title is near top
  await page.evaluate(() => {
    const follow = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find(el =>
      /Follow the Record/i.test((el.textContent || '').trim()));
    if (follow) {
      const y = follow.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await sleep(600);

  // Try to activate SOURCE by scrolling to start of sticky track
  const sourceShot = await captureState('01_source');

  // Slowly scroll through stages, capturing state periodically
  const samples = [sourceShot];
  const step = 120;
  let publishOrMeasure = null;

  for (let i = 0; i < 80; i++) {
    await page.evaluate((s) => window.scrollBy(0, s), step);
    await sleep(180);

    const state = await page.evaluate(() => {
      const stageWords = ['SOURCE', 'CONNECT', 'NORMALIZE', 'VALIDATE', 'PUBLISH', 'MEASURE'];
      // Look for visible stage indicators that appear "active"
      let found = [];
      for (const w of stageWords) {
        const nodes = Array.from(document.querySelectorAll('button,li,a,span,div,p,h1,h2,h3,h4')).filter(el => {
          const t = (el.childNodes.length && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim() === w))
            || (el.children.length === 0 && (el.textContent || '').trim().toUpperCase() === w);
          return t;
        });
        for (const el of nodes) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cs = getComputedStyle(el);
          const cls = `${el.className} ${el.parentElement?.className || ''} ${el.getAttribute('data-state') || ''}`;
          const aria = el.getAttribute('aria-current') || el.parentElement?.getAttribute('aria-current') || '';
          found.push({
            stage: w,
            top: Math.round(r.top),
            opacity: cs.opacity,
            color: cs.color,
            fw: cs.fontWeight,
            cls: cls.slice(0, 100),
            aria,
          });
        }
      }

      const stickyEls = Array.from(document.querySelectorAll('*')).filter(el => getComputedStyle(el).position === 'sticky')
        .map(el => {
          const r = el.getBoundingClientRect();
          return {
            className: String(el.className).slice(0, 80),
            rectTop: Math.round(r.top),
            inViewport: r.bottom > 0 && r.top < window.innerHeight,
            text: (el.innerText || '').slice(0, 50).replace(/\s+/g, ' '),
          };
        });

      // Heuristic: big stage title in canvas area
      const bigTitles = Array.from(document.querySelectorAll('h1,h2,h3,h4,p')).filter(el => {
        const t = (el.textContent || '').trim().toUpperCase();
        return stageWords.includes(t);
      }).map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { t: el.textContent.trim().toUpperCase(), top: Math.round(r.top), fontSize: cs.fontSize, opacity: cs.opacity, inView: r.top > 0 && r.top < window.innerHeight };
      });

      return { scrollY: Math.round(window.scrollY), stickyEls, found, bigTitles };
    });

    const activeBig = state.bigTitles.filter(b => b.inView && parseFloat(b.opacity) > 0.5);
    const stageNow = activeBig.map(b => b.t).join(',') || '';
    if (i % 5 === 0) {
      console.log(`scroll i=${i} y=${state.scrollY} stages=${stageNow} stickyInView=${state.stickyEls.filter(s => s.inViewport).length}/${state.stickyEls.length}`);
    }

    if (!publishOrMeasure && /PUBLISH|MEASURE/.test(stageNow)) {
      const shot = await captureState(stageNow.includes('MEASURE') ? '02_measure' : '02_publish');
      publishOrMeasure = shot;
      samples.push(shot);
      // continue a bit more if PUBLISH to try MEASURE
      if (stageNow.includes('MEASURE')) break;
    }
  }

  if (!publishOrMeasure) {
    // Force capture current late state
    publishOrMeasure = await captureState('02_late_stage');
    samples.push(publishOrMeasure);
  }

  // Also one more mid scroll capture if we only have source
  if (samples.length < 2) {
    samples.push(await captureState('02_after_scroll'));
  }

  // Verdict: sticky WORKING if sticky elements stay in viewport with roughly constant rectTop while scrollY increases and stages change
  const s1 = samples[0].metrics;
  const s2 = samples[samples.length - 1].metrics;
  const sticky1 = (s1.stickyEls || []).filter(e => e.inViewport);
  const sticky2 = (s2.stickyEls || []).filter(e => e.inViewport);

  let verdict = 'UNKNOWN';
  let reason = '';

  if (sticky1.length === 0 && sticky2.length === 0) {
    verdict = 'BROKEN';
    reason = 'No sticky elements stayed in viewport (or none found). Strip likely scrolled away.';
  } else if (sticky2.length === 0 && sticky1.length > 0) {
    verdict = 'BROKEN';
    reason = 'Sticky elements were in viewport at SOURCE but left viewport after scrolling to later stage.';
  } else if (sticky1.length > 0 && sticky2.length > 0) {
    // Compare tops - if sticky is working, tops should stay near the CSS top value while scroll advances
    const avgTop1 = sticky1.reduce((a, b) => a + b.rectTop, 0) / sticky1.length;
    const avgTop2 = sticky2.reduce((a, b) => a + b.rectTop, 0) / sticky2.length;
    const scrollDelta = s2.scrollY - s1.scrollY;
    const topDelta = Math.abs(avgTop2 - avgTop1);
    if (scrollDelta > 200 && topDelta < 80) {
      verdict = 'WORKING';
      reason = `Sticky elements remained in viewport; avg rectTop changed by ${topDelta.toFixed(0)}px while scroll advanced ${scrollDelta}px.`;
    } else if (scrollDelta > 200 && topDelta > 200) {
      verdict = 'BROKEN';
      reason = `Sticky elements moved with scroll (avg top delta ${topDelta.toFixed(0)}px over ${scrollDelta}px scroll) — not pinning.`;
    } else {
      verdict = sticky2.every(e => e.inViewport) ? 'WORKING' : 'BROKEN';
      reason = `scrollDelta=${scrollDelta}, topDelta=${topDelta.toFixed(0)}; sticky still in viewport=${sticky2.length > 0}`;
    }
  }

  const report = {
    verdict,
    reason,
    screenshots: samples.map(s => s.file),
    sourceScrollY: s1.scrollY,
    laterScrollY: s2.scrollY,
    sourceStickyInView: sticky1,
    laterStickyInView: sticky2,
    overflowBreakers: structure.overflowBreakers,
  };

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n===== FINAL REPORT =====');
  console.log(JSON.stringify(report, null, 2));

  // Keep tab open for visual confirmation - also take a window screenshot via page
  // Don't close browser (connected)
  await page.close();
  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
