import {parseParams, quote} from './param-values';
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
export class ContentType implements ContentTypeInit {
  boundary?: string;
  charset?: string;
  mediaType?: string;

  constructor(init?: string | ContentTypeInit) {
    if (isDefined(init)) return ContentType.from(init);
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

  static from(value: string | ContentTypeInit | null) {
    const header = new ContentType();

    if (isDefined(value)) {
      if (typeof value === 'string') {
        const params = parseParams(value);
        const first = params[0];
        if (isDefined(first)) {
          header.mediaType = first[0];
          for (const [name, val] of params.slice(1)) {
            if (name === 'boundary') {
              header.boundary = val;
            } else if (name === 'charset') {
              header.charset = val;
            }
          }
        }
      } else {
        header.boundary = value.boundary;
        header.charset = value.charset;
        header.mediaType = value.mediaType;
      }
    }

    return header;
  }
}
