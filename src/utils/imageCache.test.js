// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const memoryStore = new Map();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key) => memoryStore.get(key)),
  set: vi.fn(async (key, val) => memoryStore.set(key, val)),
  del: vi.fn(async (key) => memoryStore.delete(key)),
  keys: vi.fn(async () => Array.from(memoryStore.keys())),
  clear: vi.fn(async () => memoryStore.clear())
}));

import {
  cacheImage,
  getCachedImage,
  clearImageCache,
  saveStoredImagesBatch,
  loadAllStoredImagesMap,
  clearStoredMobileImages,
  getCacheStats
} from './imageCache';

describe('imageCache utility', () => {
  beforeEach(async () => {
    memoryStore.clear();
    await clearImageCache();
    await clearStoredMobileImages();
  });

  it('should cache and retrieve temporary image blob', async () => {
    const fakeBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
    await cacheImage('12345.jpg', fakeBlob);

    const retrieved = await getCachedImage('12345.jpg');
    expect(retrieved).toBeDefined();
    expect(retrieved instanceof Blob).toBe(true);
  });

  it('should save and restore mobile stored images batch across multiple customers', async () => {
    // 顧客Aの画像
    const fileA = new File(['image-content-A'], '44884A.jpg', { type: 'image/jpeg' });
    const fileA2 = new File(['image-content-A2'], '44884B.jpg', { type: 'image/jpeg' });
    
    await saveStoredImagesBatch([fileA, fileA2], '16152_トーベイ（株）.xlsx');

    // 顧客Bの画像
    const fileB = new File(['image-content-B'], '60209C.jpg', { type: 'image/jpeg' });
    await saveStoredImagesBatch([fileB], '27099_（株）みどりフーズ.xlsx');

    // 全画像のマップを復元
    const storedMap = await loadAllStoredImagesMap();
    expect(storedMap.size).toBeGreaterThan(0);

    // 顧客Aの画像が引けること
    expect(storedMap.has('44884a.jpg')).toBe(true);
    expect(storedMap.has('16152/44884a.jpg')).toBe(true);

    // 顧客Bの画像も引けること（上書きされず蓄積されていること）
    expect(storedMap.has('60209c.jpg')).toBe(true);
    expect(storedMap.has('27099/60209c.jpg')).toBe(true);

    // 統計情報の確認
    const stats = await getCacheStats();
    expect(stats.storedCount).toBeGreaterThan(0);
    expect(stats.storedCustomers.length).toBe(2);
  });

  it('should clear stored images properly', async () => {
    const file = new File(['test'], '10001A.jpg', { type: 'image/jpeg' });
    await saveStoredImagesBatch([file], '10001_テスト会社.xlsx');

    let map = await loadAllStoredImagesMap();
    expect(map.size).toBeGreaterThan(0);

    await clearStoredMobileImages();

    map = await loadAllStoredImagesMap();
    expect(map.size).toBe(0);
  });
});
