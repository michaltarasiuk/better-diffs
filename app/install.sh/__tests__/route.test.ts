import {execFileSync} from 'node:child_process';

import {describe, expect, it} from 'vitest';

import {env} from '@/env';

import {GET} from '../route';

describe('GET', () => {
  it('serves a shell script', () => {
    const response = GET();

    expect(response.headers.get('Content-Type')).toBe(
      'text/x-shellscript; charset=utf-8',
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('is valid POSIX shell', async () => {
    const script = await GET().text();

    expect(script.startsWith('#!/bin/sh\n')).toBe(true);
    expect(() => execFileSync('sh', ['-n'], {input: script})).not.toThrow();
  });

  it('points the CLI at this deployment', async () => {
    const script = await GET().text();

    expect(script).toContain(`BASE_URL='${env.BASE_URL}'`);
    expect(script).toContain('echo "url=$BASE_URL" >"$CONFIG_DIR/config"');
  });
});
