declare global {
    namespace NodeJS {
        interface Process {
            type?: string;
        }
    }
}
export declare function isBrowser(): boolean;
/**
 * Shuffle the specified string.
 *
 * @param str
 * @returns
 */
export declare function strShuffle(str: string): string;
export declare function assertString(value: unknown): asserts value is string;
/**
 * Determine if a value is a plain Object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a plain Object, otherwise false
 */
export declare function isPlainObject(val: any): boolean;
export declare function isIterableIterator<T>(value: any): value is IterableIterator<T>;
