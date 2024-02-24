import type { Dict } from './types';
export declare class Exception extends Error {
    [key: string]: any;
    readonly message: string;
    readonly name: string;
    constructor(message?: string, contextObject?: Dict<unknown>);
}
