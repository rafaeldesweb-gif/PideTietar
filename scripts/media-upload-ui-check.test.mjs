import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

test('procesamiento de MP4 conserva formato, recorta y libera recursos', { timeout: 60000 }, async t => {
  const vite = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'pagina-prueba-medios', configureServer(server) {
      server.middlewares.use('/prueba-medios', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<html><body>Prueba de medios</body></html>'); });
    },
  }] });
  await vite.listen();
  t.after(() => vite.close());
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/prueba-medios`);
  await page.evaluate(async () => {
    window.media = await import('/src/utils/mediaUpload.ts');
    window.makeMp4 = async seconds => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff4e00'; ctx.fillRect(0,0,640,360); const stream = canvas.captureStream(30);
      const mimeType = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('El navegador de pruebas necesita codificación MP4');
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 300000 }); const chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      const done = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start(100); let i = 0;
      const timer = setInterval(() => { ctx.fillStyle = i++ % 2 ? '#ff4e00' : '#f5bb00'; ctx.fillRect(0,0,640,360); }, 33);
      await new Promise(resolve => setTimeout(resolve, seconds * 1000)); recorder.stop(); await done;
      clearInterval(timer); stream.getTracks().forEach(track => track.stop());
      return new File(chunks, 'prueba.mp4', { type: 'video/mp4' });
    };
    window.longMp4 = await window.makeMp4(3);
    window.shortMp4 = await window.makeMp4(1.5);
    window.inspectMp4 = async result => {
      const blob = await (await fetch(result.dataUrl)).blob(); const bytes = new Uint8Array(await blob.arrayBuffer());
      const video = document.createElement('video'); video.src = result.dataUrl;
      await new Promise((resolve,reject) => { video.onloadedmetadata = resolve; video.onerror = reject; });
      const info = { mime: result.mimeType, header: result.dataUrl.split(',')[0], container: new TextDecoder().decode(bytes.slice(4,8)), duration: video.duration, width: video.videoWidth };
      video.removeAttribute('src'); video.load(); return info;
    };
  });
  await t.test('un MP4 corto se conserva aunque MediaRecorder no esté disponible', async () => {
    const result = await page.evaluate(async () => {
      const recorder = window.MediaRecorder;
      try { window.MediaRecorder = undefined; return await window.inspectMp4(await window.media.processMediaFile(window.shortMp4)); }
      finally { window.MediaRecorder = recorder; }
    });
    assert.equal(result.mime, 'video/mp4'); assert.equal(result.container, 'ftyp'); assert.match(result.header, /^data:video\/mp4;/); assert.ok(result.duration <= 2);
  });
  await t.test('un MP4 largo se recorta a 2 segundos y sigue siendo MP4 reproducible', async () => {
    const result = await page.evaluate(async () => window.inspectMp4(await window.media.processMediaFile(window.longMp4)));
    assert.equal(result.mime, 'video/mp4'); assert.equal(result.container, 'ftyp'); assert.match(result.header, /^data:video\/mp4;/);
    assert.ok(result.duration > 0 && result.duration <= 2.15, `Duración: ${result.duration}`); assert.equal(result.width, 480);
  });
  await t.test('las URL de MP4 conservan el tipo y las URL firmadas se detectan', async () => {
    const result = await page.evaluate(async () => ({
      info: await window.inspectMp4(await window.media.processMediaUrl(await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(window.shortMp4); }))),
      signed: window.media.isVideoUrl('https://ejemplo.es/video.mp4?token=prueba'),
    }));
    assert.equal(result.info.mime, 'video/mp4'); assert.equal(result.signed, true);
  });
  await t.test('sin soporte de codificación MP4 informa del límite sin generar WebM', async () => {
    const message = await page.evaluate(async () => {
      const original = MediaRecorder.isTypeSupported;
      try { MediaRecorder.isTypeSupported = () => false; await window.media.processMediaFile(window.longMp4); }
      catch (error) { return error.message; }
      finally { MediaRecorder.isTypeSupported = original; }
    });
    assert.match(message, /no puede convertir.*MP4/);
  });
});
