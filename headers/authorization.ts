import {isDefined} from '@/utils/is-defined';

const AUTHORIZATION_PATTERN = /^\s*(\S+)(?:\s+(.*?))?\s*$/s;

export interface AuthorizationInit {
  credentials?: string;
  scheme?: string;
}

/**
 * [MDN `Authorization` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)
 *
 * [HTTP Semantics Specification](https://datatracker.ietf.org/doc/html/rfc9110#section-11.6.2)
 */
export class Authorization implements AuthorizationInit {
  credentials?: string;
  scheme?: string;

  constructor(init?: string | AuthorizationInit) {
    if (isDefined(init)) return Authorization.from(init);
  }

  /**
   * Auth schemes are case-insensitive, so `Bearer` and `bearer` both match.
   */
  hasScheme(scheme: string) {
    return this.scheme?.toLowerCase() === scheme.toLowerCase();
  }

  toString() {
    if (!isDefined(this.scheme)) {
      return '';
    }
    return isDefined(this.credentials)
      ? `${this.scheme} ${this.credentials}`
      : this.scheme;
  }

  static from(value: string | AuthorizationInit | null) {
    const authorization = new Authorization();

    if (isDefined(value)) {
      if (typeof value === 'string') {
        const match = AUTHORIZATION_PATTERN.exec(value);
        if (isDefined(match)) {
          authorization.scheme = match[1];
          authorization.credentials = match[2] || undefined;
        }
      } else {
        authorization.credentials = value.credentials;
        authorization.scheme = value.scheme;
      }
    }

    return authorization;
  }
}
