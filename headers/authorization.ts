import {isDefined} from '@/utils/is-defined';

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
        const trimmed = value.trim();
        if (trimmed !== '') {
          const spaceIndex = trimmed.indexOf(' ');
          if (spaceIndex === -1) {
            authorization.scheme = trimmed;
          } else {
            authorization.scheme = trimmed.slice(0, spaceIndex);
            authorization.credentials = trimmed.slice(spaceIndex + 1).trim();
          }
        }
      } else {
        authorization.credentials = value.credentials;
        authorization.scheme = value.scheme;
      }
    }

    return authorization;
  }
}
