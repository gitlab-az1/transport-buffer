import hash from 'cryptx-sdk/hash';
import XBuffer from 'cryptx-sdk/buffer';
import { deepCompare } from 'cryptx-sdk/core';
import { AES, SymmetricKey } from 'cryptx-sdk/symmetric';

import { unmask } from './_internals/buffer';
import { Exception } from './_internals/errors';
import { jsonSafeParser } from './_internals/safe-json';


export interface Parsed<T> {
  readonly payload: T;
  readonly signature: string;
  readonly ttl?: Date;
  readonly timestamp: Date;
  readonly algorithm: string;
  readonly length: number;
}

export class BodyDecoder {
  readonly #key: SymmetricKey;
  readonly #cipherName: 'aes-256-cbc' = 'aes-256-cbc' as const;

  #hasBufferUtilVar: boolean = false;

  constructor(key?: SymmetricKey) {
    if(!!key && key instanceof SymmetricKey) {
      this.#key = key;
    } else {
      if(!process.env.T_BUFFER_KEY && !process.env.NEXT_PUBLIC_T_BUFFER_KEY) {
        throw new Exception('Missing encryption key for transport-buffer, you can use a environment variable `T_BUFFER_KEY`');
      }
  
      const keyArr = XBuffer.fromString((process.env.T_BUFFER_KEY ?? process.env.NEXT_PUBLIC_T_BUFFER_KEY) as string).buffer;

      this.#key = new SymmetricKey(keyArr, {
        algorithm: this.#cipherName,
        usages: ['encrypt', 'decrypt', 'sign', 'verify'],
      });
    }

    if(!this.#key.hmacKey) {
      throw new Exception('The provided key is too short');
    }

    if(!process.env.CLIB_NO_BUFFER_UTIL && process.env.NEXT_PUBLIC_CLIB_NO_BUFFER_UTIL !== '0') {
      process.env.CLIB_NO_BUFFER_UTIL = '1';
    } else {
      this.#hasBufferUtilVar = true;
    }
  }

  async #readContent<T>(content: Uint8Array): Promise<Parsed<T>> {
    const mask = process.env.T_BUFFER_MASK ?? process.env.NEXT_PUBLIC_T_BUFFER_MASK;

    // eslint-disable-next-line no-extra-boolean-cast
    if(!!mask) {
      const m = XBuffer.fromString(mask.trim().replace(/\s+/g, ''),
        { encoding: 'hex' });

      unmask(content as Buffer, m.buffer as Buffer);
    }
    
    const c = new AES(this.#key, this.#cipherName);

    const d = await c.decrypt<{
      payload: string;
      length: number;
      signature: string;
      algorithm: string;
      ttl?: number;
    }>(content);

    const sign = await hash.hmac(XBuffer.fromString(d.payload.payload).buffer,
      this.#key.hmacKey!, 'sha512', 'buffer');

    if(!deepCompare(sign.buffer,
      XBuffer.fromString(d.payload.signature, { encoding: 'base64' }).buffer)) {
      throw new Exception('Faield to verify signature of this content');
    }

    if(d.payload.ttl && Date.now() > d.payload.ttl) {
      throw new Exception('Payload life time was expired');
    }

    const v = d.payload.payload === '[null]' ? null : jsonSafeParser(d.payload.payload);

    if(v && v.isLeft()) {
      throw new Exception('Failed to parse content payload');
    }

    return Object.freeze({
      payload: v === null ? (<T>null) : v.value as T,
      algorithm: d.payload.algorithm,
      length: d.payload.length,
      signature: d.payload.signature,
      timestamp: new Date(d.timestamp),
      ttl: d.payload.ttl ? new Date(d.payload.ttl) : undefined,
    } satisfies Parsed<T>);
  }

  /**
   * Read and parse encrypted content
   * 
   * @param content Encrypted content to be decrypted and parsed 
   */
  public read<T>(content: Uint8Array): Promise<Parsed<T>> {
    return this.#readContent<T>(content);
  }

  public [Symbol.dispose]() {
    if(!this.#hasBufferUtilVar) {
      delete process.env['CLIB_NO_BUFFER_UTIL'];
    }
  }

  public [Symbol.toStringTag]() {
    return '[object BodyDecoder]';
  }
}

export default BodyDecoder;
