import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedFile,
  isMediaUrl,
  isVideoUrl,
  isImageUrl,
  imageMimeType,
  videoMimeType,
  MEDIA_ACCEPT,
} from '../utils/mediaUpload';

const file = (name: string, type: string): File =>
  new File([''], name, { type });

describe('mediaUpload', () => {
  it('acepta extensiones de foto y vídeo permitidas', () => {
    assert.strictEqual(isAllowedFile(file('foto.jpg', 'image/jpeg')), true);
    assert.strictEqual(isAllowedFile(file('foto.jpeg', 'image/jpg')), true);
    assert.strictEqual(isAllowedFile(file('foto.png', 'image/png')), true);
    assert.strictEqual(isAllowedFile(file('anim.gif', 'image/gif')), true);
    assert.strictEqual(isAllowedFile(file('clip.mp4', 'video/mp4')), true);
    assert.strictEqual(isAllowedFile(file('documento.pdf', 'application/pdf')), false);
    assert.strictEqual(isAllowedFile(file('archivo.txt', 'text/plain')), false);
  });

  it('MEDIA_ACCEPT incluye foto y vídeo', () => {
    assert.ok(MEDIA_ACCEPT.includes('.jpg'));
    assert.ok(MEDIA_ACCEPT.includes('.jpeg'));
    assert.ok(MEDIA_ACCEPT.includes('.png'));
    assert.ok(MEDIA_ACCEPT.includes('.gif'));
    assert.ok(MEDIA_ACCEPT.includes('.mp4'));
    assert.ok(MEDIA_ACCEPT.includes('image/jpeg'));
    assert.ok(MEDIA_ACCEPT.includes('image/png'));
    assert.ok(MEDIA_ACCEPT.includes('image/gif'));
    assert.ok(MEDIA_ACCEPT.includes('video/mp4'));
    assert.ok(!MEDIA_ACCEPT.includes('image/*'));
  });

  it('isMediaUrl detecta data URLs y http(s)', () => {
    assert.strictEqual(isMediaUrl('data:image/png;base64,abc'), true);
    assert.strictEqual(isMediaUrl('data:video/webm;base64,abc'), true);
    assert.strictEqual(isMediaUrl('https://example.com/foto.jpg'), true);
    assert.strictEqual(isMediaUrl('http://example.com/foto.jpg'), true);
    assert.strictEqual(isMediaUrl(''), false);
    assert.strictEqual(isMediaUrl('not-a-url'), false);
    assert.strictEqual(isMediaUrl(undefined as unknown as string), false);
  });

  it('isVideoUrl detecta data:video y extensiones de vídeo', () => {
    assert.strictEqual(isVideoUrl('data:video/webm;base64,abc'), true);
    assert.strictEqual(isVideoUrl('data:video/mp4;base64,abc'), true);
    assert.strictEqual(isVideoUrl('https://example.com/clip.mp4'), true);
    assert.strictEqual(isVideoUrl('https://example.com/clip.webm'), true);
    assert.strictEqual(isVideoUrl('data:image/png;base64,abc'), false);
    assert.strictEqual(isVideoUrl('https://example.com/foto.jpg'), false);
    assert.strictEqual(isVideoUrl(''), false);
  });

  it('isImageUrl detecta data:image y extensiones de imagen', () => {
    assert.strictEqual(isImageUrl('data:image/png;base64,abc'), true);
    assert.strictEqual(isImageUrl('data:image/jpeg;base64,abc'), true);
    assert.strictEqual(isImageUrl('data:image/gif;base64,abc'), true);
    assert.strictEqual(isImageUrl('https://example.com/foto.jpg'), true);
    assert.strictEqual(isImageUrl('https://example.com/foto.jpeg'), true);
    assert.strictEqual(isImageUrl('https://example.com/foto.png'), true);
    assert.strictEqual(isImageUrl('https://example.com/anim.gif'), true);
    assert.strictEqual(isImageUrl('data:video/webm;base64,abc'), false);
    assert.strictEqual(isImageUrl('https://example.com/clip.mp4'), false);
    assert.strictEqual(isImageUrl(''), false);
  });

  it('imageMimeType usa la extensión del archivo', () => {
    assert.strictEqual(imageMimeType(file('foto.JPG', '')), 'image/jpeg');
    assert.strictEqual(imageMimeType(file('foto.jpeg', '')), 'image/jpeg');
    assert.strictEqual(imageMimeType(file('foto.PNG', '')), 'image/png');
    assert.strictEqual(imageMimeType(file('anim.GIF', '')), 'image/gif');
    assert.strictEqual(imageMimeType(file('foto.webp', 'image/webp')), 'image/webp');
  });

  it('videoMimeType usa la extensión del archivo', () => {
    assert.strictEqual(videoMimeType(file('clip.MP4', '')), 'video/mp4');
    assert.strictEqual(videoMimeType(file('clip.webm', '')), 'video/webm');
    assert.strictEqual(videoMimeType(file('clip.avi', 'video/avi')), 'video/avi');
  });
});
