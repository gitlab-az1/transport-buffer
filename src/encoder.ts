import hash from 'cryptx-sdk/hash';
import XBuffer from 'cryptx-sdk/buffer';
import { mask } from 'cryptx-sdk/node-buffer';
import { SymmetricKey, AES } from 'cryptx-sdk/symmetric';

import { Exception } from './_internals/errors';
import { jsonSafeStringify } from './_internals/safe-json';
import { assertString, isPlainObject } from './_internals/utils';
import type { CommonHttpHeaders, Dict, HttpHeaders, ResponseLike } from './_internals/types';


/** Options for the BodyEncoder class. */
export type BodyEncoderOptions = {

  /** Optional HTTP headers for the response */
  headers?: HttpHeaders;

  /** Optional cookies for the response */
  cookies?: readonly string[];

  /** Status code for the response */
  statusCode: number;

  /** Optional time-to-live for the response in milliseconds */
  ttl?: number;
};

export class BodyEncoder<T = any> {
  readonly #raw: T;
  readonly #byteArray: Uint8Array;
  readonly #cipherName: 'aes-256-cbc' = 'aes-256-cbc' as const;
  #key?: SymmetricKey;
  #h: HttpHeaders;
  #c: Map<string, string> = new Map();
  #o: BodyEncoderOptions;

  /**
   * Constructor for the BodyEncoder class.
   * 
   * @param body The body to encode
   * @param options Options for encoding
   */
  constructor(body: T, options: BodyEncoderOptions) {
    this.#h = options.headers ?? {};

    delete options.headers;
    this.#o = options;

    if(typeof body === 'object' &&
      !isPlainObject(body)) {
      throw new Exception(`body cannot be a instance of '${body?.constructor.name ?? '[undefined]'}'`);
    }

    try {
      JSON.stringify(body);
    } catch {
      throw new Exception('body must be an serializable object');
    }

    const contentStr = jsonSafeStringify(body) ?? '[null]';
    this.#byteArray = XBuffer.fromString(contentStr).buffer;
  }

  /**
   * Returns the raw body data.
   */
  public get raw(): T {
    return this.#raw;
  }

  /**
   * Returns the byte array representation of the body.
   */
  public get byteArray(): Uint8Array {
    return this.#byteArray;
  }

  /**
   * Sets the encryption key for the body.
   * 
   * @param key The encryption key
   */
  public setKey(key: SymmetricKey): void {
    if(!(key instanceof SymmetricKey)) {
      throw new Exception('argument key must be instance of `SymmetricKey`');
    }

    this.#key = key;
  }

  /**
   * Sets a response header.
   * 
   * @param name The name of the header
   * @param value The value of the header
   */
  public setResponseHeader<K extends keyof CommonHttpHeaders>(name: K | Omit<string, K>, value: string): void {
    assertString(name);
    this.#h[name.toLowerCase()] = value;
  }

  /**
   * Checks if a header exists.
   * 
   * @param name The name of the header
   * @returns True if the header exists, false otherwise
   */
  public hasHeader<K extends keyof CommonHttpHeaders>(name: K | Omit<string, K>): boolean {
    assertString(name);
    return Object.prototype.hasOwnProperty.call(this.#h, name.toLowerCase());
  }

  /**
   * Deletes a header.
   * 
   * @param name The name of the header to delete
   */
  public deleteHeader<K extends keyof CommonHttpHeaders>(name: K | Omit<string, K>): void {
    assertString(name);
    delete this.#h[name.toLowerCase()];
  }

  /**
   * Sets a cookie.
   * 
   * @param name The name of the cookie
   * @param value The value of the cookie
   */
  public setCookie(name: string, value: string): void {
    this.#c.set(name, value);    
  }

  /**
   * Checks if a cookie exists.
   * 
   * @param name The name of the cookie
   * @returns True if the cookie exists, false otherwise
   */
  public hasCookie(name: string): boolean {
    return this.#c.has(name);
  }

  /**
   * Deletes a cookie.
   * 
   * @param name The name of the cookie to delete
   */
  public deleteCookie(name: string): void {
    this.#c.delete(name);
  }

  async #dispatchBody(res: ResponseLike): Promise<void> {
    const k = this.#retrieveKey();

    if(!k.hmacKey) {
      throw new Exception('The provided key is too short');
    }

    const c = new AES(k, this.#cipherName);
    const s = await hash.hmac(this.#byteArray, k.hmacKey!, 'sha512', 'buffer');

    const cipherHash = await hash.hash(this.#cipherName, 'sha256', 'hex');

    const payload = {
      payload: XBuffer.fromUint8Array(this.#byteArray).toString('utf-8'),
      length: this.#byteArray.byteLength,
      signature: s.toString('base64'),
      algorithm: cipherHash.slice(0, 8),
    } as Dict<any>;

    if(this.#o.ttl && this.#o.ttl > 0) {
      const d = new Date();
      d.setMilliseconds(d.getMilliseconds() + this.#o.ttl);

      payload.ttl = d.toISOString();
    }

    const e = await c.encrypt(payload);
    let o: Uint8Array = Buffer.alloc(e.length);

    // eslint-disable-next-line no-extra-boolean-cast
    if(!!process.env.T_BUFFER_MASK) {
      const m = Buffer.from(process.env.T_BUFFER_MASK.trim().replace(/\s+/g, ''), 'hex');
      mask(Buffer.from(e.buffer), m, o as Buffer, 0, e.length);
    } else {
      o = e.buffer;
    }
    
    this.deleteHeader('content-type');
    this.deleteHeader('content-length');

    for(const [name, value] of Object.entries(this.#h)) {
      if(!value) continue;
      res.setHeader(name, value);
    }

    if(res.cookie && typeof res.cookie === 'function') {
      for(const [name, value] of Object.entries(this.#c)) {
        res.cookie(name, value);
      }
    } else if(res.setCookie && typeof res.setCookie === 'function') {
      for(const [name, value] of Object.entries(this.#c)) {
        res.setCookie(name, value);
      }
    } else {
      const values = Object.entries(this.#c).map(([key, value]) => {
        return `${key}=${value}`;
      });

      res.setHeader('Set-Cookie', values.join(';'));
    }

    // eslint-disable-next-line no-extra-boolean-cast
    res.setHeader('Content-Type', !!process.env.T_BUFFER_MASK ? 'text/plain' : 'application/json; charset=UTF-8');
    res.setHeader('Content-Length', o.byteLength.toString());

    res.send(Buffer.isBuffer(o) ? o : Buffer.from(o));
    res.end();

    return Promise.resolve();
  }

  /**
   * Dispatches the body to a response object.
   * 
   * @param responseObject The response object to dispatch to
   * @returns A Promise that resolves when the dispatch is complete
   */
  public dispatch(responseObject: ResponseLike): Promise<void> {
    return this.#dispatchBody(responseObject);
  }

  #retrieveKey(): SymmetricKey {
    if(!!this.#key && this.#key instanceof SymmetricKey) return this.#key;

    if(!process.env.T_BUFFER_KEY) {
      throw new Exception('Missing encryption key for transport-buffer, you can use a environment variable `T_BUFFER_KEY`');
    }

    const keyArr = XBuffer.fromString(process.env.T_BUFFER_KEY).buffer;
    return new SymmetricKey(keyArr, {
      algorithm: this.#cipherName,
      usages: ['encrypt', 'decrypt', 'sign', 'verify'],
    });
  }
}

export default BodyEncoder;
