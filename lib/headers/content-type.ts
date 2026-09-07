import {parseParams, quote, type HeaderValue} from '@/lib/headers/utils';
import {isDefined} from '@/lib/utils/defined';

export interface ContentTypeInit {
  boundary?: string;
  charset?: string;
  mediaType?: string;
}

/**
 * The value of a `Content-Type` HTTP header.
 *
 * [MDN `Content-Type` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)
 *
 * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-3.1.1.5)
 */
export class ContentType implements HeaderValue, ContentTypeInit {
  boundary?: string;
  charset?: string;
  mediaType?: string;

  constructor(init?: string | ContentTypeInit) {
    if (isDefined(init)) {
      if (typeof init === 'string') {
        const params = parseParams(init);
        const first = params[0];
        if (isDefined(first)) {
          this.mediaType = first[0];
          for (const [name, value] of params.slice(1)) {
            if (name === 'boundary') {
              this.boundary = value;
            } else if (name === 'charset') {
              this.charset = value;
            }
          }
        }
      } else {
        this.boundary = init.boundary;
        this.charset = init.charset;
        this.mediaType = init.mediaType;
      }
    }
  }

  toString() {
    if (!isDefined(this.mediaType)) {
      return '';
    }

    const parts = [this.mediaType];

    if (isDefined(this.charset)) {
      parts.push(`charset=${quote(this.charset)}`);
    }
    if (isDefined(this.boundary)) {
      parts.push(`boundary=${quote(this.boundary)}`);
    }

    return parts.join('; ');
  }
}
