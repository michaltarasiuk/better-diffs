// @vitest-environment jsdom

import {beforeEach, describe, expect, it, type MockInstance, vi} from 'vitest';

import type {StorageType} from './storage-available';

async function importStorageAvailable() {
  const {storageAvailable} = await import('./storage-available');
  return storageAvailable;
}

function countProbes(setItem: MockInstance<Storage['setItem']>) {
  return setItem.mock.calls.filter(([key]) => key === '__storage_test__')
    .length;
}

function quotaExceeded() {
  return new DOMException('Quota exceeded', 'QuotaExceededError');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
});

describe('storageAvailable', () => {
  it.each(['localStorage', 'sessionStorage'] as const satisfies StorageType[])(
    'reports %s as available when read/write succeeds',
    async (type) => {
      const storageAvailable = await importStorageAvailable();

      expect(storageAvailable(type)).toBe(true);
    },
  );

  it('caches availability separately for each storage type', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const storageAvailable = await importStorageAvailable();

    storageAvailable('localStorage');
    storageAvailable('sessionStorage');
    storageAvailable('localStorage');
    storageAvailable('sessionStorage');

    expect(countProbes(setItem)).toBe(2);
  });

  it.each(['localStorage', 'sessionStorage'] as const satisfies StorageType[])(
    'reports %s as unavailable when setItem throws',
    async (type) => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });
      const storageAvailable = await importStorageAvailable();

      expect(storageAvailable(type)).toBe(false);
    },
  );

  it.each(['localStorage', 'sessionStorage'] as const satisfies StorageType[])(
    'reports %s as unavailable when quota is exceeded and storage is empty',
    async (type) => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaExceeded();
      });
      const storageAvailable = await importStorageAvailable();

      expect(storageAvailable(type)).toBe(false);
    },
  );

  it.each(['localStorage', 'sessionStorage'] as const satisfies StorageType[])(
    'reports %s as available when quota is exceeded but storage already has items',
    async (type) => {
      window[type].setItem('existing', 'value');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaExceeded();
      });
      const storageAvailable = await importStorageAvailable();

      expect(storageAvailable(type)).toBe(true);
    },
  );

  it('clears the availability cache when the tab becomes visible', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const storageAvailable = await importStorageAvailable();

    expect(storageAvailable('localStorage')).toBe(true);
    expect(countProbes(setItem)).toBe(1);

    setItem.mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(storageAvailable('localStorage')).toBe(true);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(storageAvailable('localStorage')).toBe(false);
    expect(countProbes(setItem)).toBe(2);
  });

  it('keeps the availability cache when the tab is hidden', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const storageAvailable = await importStorageAvailable();

    expect(storageAvailable('localStorage')).toBe(true);
    expect(countProbes(setItem)).toBe(1);

    setItem.mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(storageAvailable('localStorage')).toBe(true);
    expect(countProbes(setItem)).toBe(1);
  });
});
