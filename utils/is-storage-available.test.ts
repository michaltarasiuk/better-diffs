// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';

import type {StorageType} from './is-storage-available';

const STORAGE_TYPES = [
  'localStorage',
  'sessionStorage',
] as const satisfies StorageType[];

async function importIsStorageAvailable() {
  const {isStorageAvailable} = await import('./is-storage-available');
  return isStorageAvailable;
}

function countProbes(setItem: MockInstance<Storage['setItem']>) {
  return setItem.mock.calls.filter(([key]) => key === '__storage_test__')
    .length;
}

function securityError() {
  return new DOMException('The operation is insecure.', 'SecurityError');
}

function quotaExceeded() {
  return new DOMException('Quota exceeded', 'QuotaExceededError');
}

function changeVisibility(visibilityState: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibilityState);
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
});

describe('isStorageAvailable', () => {
  it.each(STORAGE_TYPES)(
    'reports %s as available when read/write succeeds',
    async (type) => {
      const isStorageAvailable = await importIsStorageAvailable();

      expect(isStorageAvailable(type)).toBe(true);
    },
  );

  it.each(STORAGE_TYPES)(
    'reports %s as unavailable when setItem throws',
    async (type) => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw securityError();
      });
      const isStorageAvailable = await importIsStorageAvailable();

      expect(isStorageAvailable(type)).toBe(false);
    },
  );

  it.each(STORAGE_TYPES)(
    'reports %s as unavailable when quota is exceeded and storage is empty',
    async (type) => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaExceeded();
      });
      const isStorageAvailable = await importIsStorageAvailable();

      expect(isStorageAvailable(type)).toBe(false);
    },
  );

  it.each(STORAGE_TYPES)(
    'reports %s as available when quota is exceeded but storage already has items',
    async (type) => {
      window[type].setItem('existing', 'value');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaExceeded();
      });
      const isStorageAvailable = await importIsStorageAvailable();

      expect(isStorageAvailable(type)).toBe(true);
    },
  );

  it('caches availability separately for each storage type', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const isStorageAvailable = await importIsStorageAvailable();

    isStorageAvailable('localStorage');
    isStorageAvailable('sessionStorage');
    isStorageAvailable('localStorage');
    isStorageAvailable('sessionStorage');

    expect(countProbes(setItem)).toBe(2);
  });

  it('clears the availability cache when the tab becomes visible', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const isStorageAvailable = await importIsStorageAvailable();
    expect(isStorageAvailable('localStorage')).toBe(true);

    setItem.mockImplementation(() => {
      throw securityError();
    });
    expect(isStorageAvailable('localStorage')).toBe(true);

    changeVisibility('visible');

    expect(isStorageAvailable('localStorage')).toBe(false);
    expect(countProbes(setItem)).toBe(2);
  });

  it('keeps the availability cache when the tab is hidden', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const isStorageAvailable = await importIsStorageAvailable();
    expect(isStorageAvailable('localStorage')).toBe(true);

    setItem.mockImplementation(() => {
      throw securityError();
    });
    changeVisibility('hidden');

    expect(isStorageAvailable('localStorage')).toBe(true);
    expect(countProbes(setItem)).toBe(1);
  });
});
