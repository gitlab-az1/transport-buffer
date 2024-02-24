import { Either } from './Either';
/**
 * Safely parse JSON data
 *
 * @param {string} data A JSON string
 * @returns {*} The parsed data or null if an error occurred
 */
export declare function jsonSafeParser<T>(data: string): Either<Error, T>;
/**
 * Safely stringify JSON data
 *
 * @param {*} data The data to stringify
 * @returns {string} A JSON string or null if an error occurred
 */
export declare function jsonSafeStringify<T>(data: T): string | null;
/**
 * Safely stringify JSON data
 *
 * @param {*} data The data to stringify
 * @returns {string} A JSON string or null if an error occurred
 */
export declare function jsonSafeStringify<T>(data: T, replacer: ((this: any, key: string, value: any) => any), space?: string | number): string | null;
/**
 * Safely stringify JSON data
 *
 * @param {*} data The data to stringify
 * @returns {string} A JSON string or null if an error occurred
 */
export declare function jsonSafeStringify<T>(data: T, replacer?: (string | number)[] | null, space?: string | number): string | null;
declare const _default_1: Readonly<{
    readonly safeParse: typeof jsonSafeParser;
    readonly safeStringify: typeof jsonSafeStringify;
}>;
export default _default_1;
