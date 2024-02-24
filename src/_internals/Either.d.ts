/**
 * Represents the Left side of an Either type, holding a value of type L.
 *
 * @class Left
 * @template L - Type of the left value
 * @template A - Type of the right value
 */
export declare class Left<L, A> {
    /**
     * Readonly property holding the left value.
     */
    readonly value: L;
    /**
     * Constructor for the Left class.
     *
     * @param value The value to be stored on the left side.
     */
    constructor(value: L);
    /**
     * Checks if the instance is of type Left.
     *
     * @returns {boolean} True if the instance is Left, false otherwise.
     */
    isLeft(): this is Left<L, A>;
    /**
     * Checks if the instance is of type Right.
     *
     * @returns {boolean} False since this instance is of type Left.
     */
    isRight(): this is Right<L, A>;
}
/**
 * Represents the Right side of an Either type, holding a value of type A.
 *
 * @class Right
 * @template L - Type of the left value
 * @template A - Type of the right value
 */
export declare class Right<L, A> {
    /**
     * Readonly property holding the right value.
     */
    readonly value: A;
    /**
     * Constructor for the Right class.
     *
     * @param value The value to be stored on the right side.
     */
    constructor(value: A);
    /**
     * Checks if the instance is of type Left.
     *
     * @returns {boolean} False since this instance is of type Right.
     */
    isLeft(): this is Left<L, A>;
    /**
     * Checks if the instance is of type Right.
     *
     * @returns {boolean} True if the instance is Right, false otherwise.
     */
    isRight(): this is Right<L, A>;
}
/**
 * Either type representing either a Left or Right instance.
 *
 * @template L - Type of the left value
 * @template A - Type of the right value
 */
export type Either<L, A> = Left<L, A> | Right<L, A>;
/**
 * Creates a Left instance with the specified left value.
 *
 * @function left
 * @param {L} l - The left value to be stored in the Left instance.
 * @returns {Either<L, A>} Left instance containing the provided left value.
 */
export declare const left: <L, A>(l: L) => Either<L, A>;
/**
 * Creates a Right instance with the specified right value.
 *
 * @function right
 * @param {A} a - The right value to be stored in the Right instance.
 * @returns {Either<L, A>} Right instance containing the provided right value.
 */
export declare const right: <L, A>(a: A) => Either<L, A>;
