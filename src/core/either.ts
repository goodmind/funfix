/*
 * Copyright (c) 2017 by The Funfix Project Developers.
 * Some rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Exposes the {@link Either} data type for expressing results with two possible
 * outcome types (a disjoint union).
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Either } from "funfix/dist/core/either"
 * // ... or ...
 * import { Either } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module core/either
 */

/***/
import * as std from "./std"
import { NoSuchElementError } from "./errors"
import { Option } from "./option"

/**
 * Represents a value of one of two possible types (a disjoint union).
 *
 * A common use of Either is as an alternative to [[Option]] for dealing
 * with possible missing values. In this usage [[Option.none]] is replaced
 * with [[Either.left]] which can contain useful information and
 * [[Option.some]] is replaced with [[Either.right]].
 *
 * Convention dictates that `left` is used for failure and `right` is used
 * for success. Note that this `Either` type is right-biased, meaning that
 * operations such as `map`, `flatMap` and `filter` work on the `right` value
 * and if you want to work on the `left` value, then you need to do a `swap`.
 *
 * For example, you could use `Either<String, Int>` to detect whether an
 * input is a string or an number:
 *
 * ```typescript
 * function tryParseInt(str: string): Either<string, number> {
 *   const i = parseInt(value)
 *   return isNaN(i) ? Left(str) : Right(i)
 * }
 *
 * const result = tryParseInt("not an int")
 * if (result.isRight()) {
 *   console.log(`Increment: ${result.get}`)
 * } else {
 *   console.log(`ERROR: could not parse ${result.swap.get}`)
 * }
 * ```
 *
 * @final
 */
export class Either<L, R> implements std.IEquals<Either<L, R>> {
  private _isRight: boolean
  private _rightRef: R
  private _leftRef: L

  private constructor(_leftRef: L, _rightRef: R, _isRight: boolean) {
    this._isRight = _isRight
    if (_isRight) this._rightRef = _rightRef
    else this._leftRef = _leftRef
  }

  /**
   * Returns `true` if this is a `left`, `false` otherwise.
   *
   * ```typescript
   * Left("hello").isLeft() // true
   * Right(10).isLeft() // false
   * ```
   */
  isLeft(): boolean { return !this._isRight }

  /**
   * If the source is a `left` value, then returns it unchanged
   * and casted as a `Left`, otherwise throw exception.
   *
   * WARNING!
   *
   * This function is partial, the reference must be a `Left,
   * otherwise a runtime exception will get thrown. Use with care.
   *
   * @throws NoSuchElementError
   */
  left(): Either<L, never> {
    if (!this._isRight) return this as any
    throw new NoSuchElementError("either.left")
  }

  /**
   * Returns `true` if this is a `right`, `false` otherwise.
   *
   * ```typescript
   * Left("hello").isRight() // false
   * Right(10).isRight() // true
   * ```
   */
  isRight(): boolean { return this._isRight }

  /**
   * If the source is a `right` value, then returns it unchanged
   * and casted as a `Right`, otherwise throw exception.
   *
   * WARNING!
   *
   * This function is partial, the reference must be a `Right,
   * otherwise a runtime exception will get thrown. Use with care.
   *
   * @throws NoSuchElementError
   */
  right(): Either<never, R> {
    if (this._isRight) return this as any
    throw new NoSuchElementError("either.right")
  }

  /**
   * Returns true if this is a Right and its value is equal to `elem`
   * (as determined by the `equals` protocol), returns `false` otherwise.
   *
   * ```typescript
   * // True
   * Right("something").contains("something")
   *
   * // False because the values are different
   * Right("something").contains("anything") // false
   *
   * // False because the source is a `left`
   * Left("something").contains("something") // false
   * ```
   */
  contains(elem: R): boolean {
    return this._isRight && std.is(this._rightRef, elem)
  }

  /**
   * Returns `false` if the source is a `left`, or returns the result
   * of the application of the given predicate to the `right` value.
   *
   * ```typescript
   * // True, because it is a right and predicate holds
   * Right(20).exists(n => n > 10)
   *
   * // False, because the predicate returns false
   * Right(10).exists(n => n % 2 != 0)
   *
   * // False, because it is a left
   * Left(10).exists(n => n == 10)
   * ```
   */
  exists(p: (r: R) => boolean): boolean {
    return this._isRight && p(this._rightRef)
  }

  /**
   * Filters `right` values with the given predicate, returning
   * the value generated by `zero` in case the source is a `right`
   * value and the predicate doesn't hold.
   *
   * Possible outcomes:
   *
   *  - Returns the existing value of `right` if this is a `right` value and the
   *    given predicate `p` holds for it
   *  - Returns `Left(zero())` if this is a `right` value
   *    and the given predicate `p` does not hold
   *  - Returns the current "left" value, if the source is a `Left`
   *
   * ```typescript
   * Right(12).filterOrElse(x => x > 10, () => -1) // Right(12)
   * Right(7).filterOrElse(x => x > 10, () => -1)  // Left(-1)
   * Left(7).filterOrElse(x => false, () => -1)    // Left(7)
   * ```
   */
  filterOrElse(p: (r: R) => boolean, zero: () => L): Either<L, R> {
    return this._isRight
      ? (p(this._rightRef) ? this.right() : Left(zero()))
      : this.left()
  }

  /**
   * Binds the given function across `right` values.
   *
   * This operation is the monadic "bind" operation.
   * It can be used to *chain* multiple `Either` references.
   */
  flatMap<S>(f: (r: R) => Either<L, S>): Either<L, S> {
    return this._isRight ? f(this._rightRef) : this.left()
  }

  /**
   * Applies the `left` function to [[Left]] values, and the
   * `right` function to [[Right]] values and returns the result.
   *
   * ```typescript
   * const maybeNum: Either<string, number> =
   *   tryParseInt("not a number")
   *
   * const result: string =
   *   maybeNum.fold(
   *     str => `Could not parse string: ${str}`,
   *     num => `Success: ${num}`
   *   )
   * ```
   */
  fold<S>(left: (l: L) => S, right: (r: R) => S): S {
    return this._isRight ? right(this._rightRef) : left(this._leftRef)
  }

  /**
   * Returns true if the source is a `left` or returns
   * the result of the application of the given predicate to the
   * `right` value.
   *
   * ```typescript
   * // True, because it is a `left`
   * Left("hello").forAll(x => x > 10)
   *
   * // True, because the predicate holds
   * Right(20).forAll(x => x > 10)
   *
   * // False, it's a right and the predicate doesn't hold
   * Right(7).forAll(x => x > 10)
   * ```
   */
  forAll(p: (r: R) => boolean): boolean {
    return !this._isRight || p(this._rightRef)
  }

  /**
   * Returns the `Right` value, if the source has one,
   * otherwise throws an exception.
   *
   * WARNING!
   *
   * This function is partial, the `Either` must be a `Right`, otherwise
   * a runtime exception will get thrown. Use with care.
   *
   * @throws [[NoSuchElementError]] in case the the `Either` is a `Left`
   */
  get(): R {
    if (this._isRight) return this._rightRef
    throw new NoSuchElementError("left.get()")
  }

  /**
   * Returns the value from this `right` or the given `fallback`
   * value if this is a `left`.
   *
   * ```typescript
   * Right(10).getOrElse(27) // 10
   * Left(10).getOrElse(27)  // 27
   * ```
   */
  getOrElse(fallback: R): R {
    return this._isRight ? this._rightRef : fallback
  }

  /**
   * Returns the value from this `right` or a value generated
   * by the given `thunk` if this is a `left`.
   *
   * ```typescript
   * Right(10).getOrElseL(() => 27) // 10
   * Left(10).getOrElseL(() => 27)  // 27
   * ```
   */
  getOrElseL(thunk: () => R): R {
    return this._isRight ? this._rightRef : thunk()
  }

  /**
   * Transform the source if it is a `right` with the given
   * mapping function.
   *
   * ```typescript
   * Right(10).map(x => x + 17) // right(27)
   * Left(10).map(x => x + 17)  // left(10)
   * ```
   */
  map<C>(f: (r: R) => C): Either<L, C> {
    return this._isRight
      ? Right(f(this._rightRef))
      : this.left()
  }

  /**
   * Executes the given side-effecting function if the
   * source is a `right` value.
   *
   * ```typescript
   * Right(12).forAll(console.log) // prints 12
   * Left(10).forAll(console.log)  // silent
   * ```
   */
  forEach(cb: (r: R) => void): void {
    if (this._isRight) cb(this._rightRef)
  }

  /**
   * If this is a `left`, then return the left value as a `right`
   * or vice versa.
   *
   * ```typescript
   * Right(10).swap() // left(10)
   * Left(20).swap()  // right(20)
   * ```
   */
  swap(): Either<R, L> {
    return this._isRight
      ? Left(this._rightRef)
      : Right(this._leftRef)
  }

  /**
   * Returns an `Option.some(right)` if the source is a `right` value,
   * or `Option.none` in case the source is a `left` value.
   */
  toOption(): Option<R> {
    return this._isRight
      ? Option.some(this._rightRef)
      : Option.none()
  }

  // Implemented from IEquals
  equals(other: Either<L, R>): boolean {
    // tslint:disable-next-line:strict-type-predicates
    if (other == null) return false
    if (this._isRight) return std.is(this._rightRef, other._rightRef)
    return std.is(this._leftRef, other._leftRef)
  }

  // Implemented from IEquals
  hashCode(): number {
    return this._isRight
      ? std.hashCode(this._rightRef) << 2
      : std.hashCode(this._leftRef) << 3
  }

  static left<L, R>(value: L): Either<L, R> {
    return Left(value)
  }

  static right<L, R>(value: R): Either<L, R> {
    return Right(value)
  }

  /**
   * Maps 2 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if both `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(3)
   * Try.map2(Right(1), Right(2),
   *   (a, b) => a + b
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map2(Right(1), Left("error"),
   *   (a, b) => a + b
   * )
   * ```
   *
   * This operation is the `Applicative.map2`.
   */
  static map2<A1,A2,L,R>(fa1: Either<L,A1>, fa2: Either<L,A2>,
    f: (a1: A1, a2: A2) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef))
  }

  /**
   * Maps 3 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 3 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(6)
   * Try.map3(Right(1), Right(2), Right(3),
   *   (a, b, c) => a + b + c
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map3(Right(1), Left("error"), Right(3),
   *   (a, b, c) => a + b + c
   * )
   * ```
   */
  static map3<A1,A2,A3,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>,
    f: (a1: A1, a2: A2, a3: A3) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef))
  }

  /**
   * Maps 4 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 4 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(10)
   * Try.map4(Right(1), Right(2), Right(3), Right(4),
   *   (a, b, c, d) => a + b + c + d
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map4(Right(1), Left("error"), Right(3), Right(4),
   *   (a, b, c, d) => a + b + c + d
   * )
   * ```
   */
  static map4<A1,A2,A3,A4,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>, fa4: Either<L,A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    if (fa4.isLeft()) return ((fa4 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef, fa4._rightRef))
  }

  /**
   * Maps 5 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 5 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(15)
   * Try.map5(Right(1), Right(2), Right(3), Right(4), Right(5),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map5(Right(1), Left("error"), Right(3), Right(4), Right(5),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   * ```
   */
  static map5<A1,A2,A3,A4,A5,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>, fa4: Either<L,A4>, fa5: Either<L,A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    if (fa4.isLeft()) return ((fa4 as any) as Either<L, R>)
    if (fa5.isLeft()) return ((fa5 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef, fa4._rightRef, fa5._rightRef))
  }

  /**
   * Maps 6 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 6 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(21)
   * Try.map5(Right(1), Right(2), Right(3), Right(4), Right(5), Right(6),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map5(Right(1), Left("error"), Right(3), Right(4), Right(5), Right(6),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   * ```
   */
  static map6<A1,A2,A3,A4,A5,A6,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>, fa4: Either<L,A4>, fa5: Either<L,A5>, fa6: Either<L,A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    if (fa4.isLeft()) return ((fa4 as any) as Either<L, R>)
    if (fa5.isLeft()) return ((fa5 as any) as Either<L, R>)
    if (fa6.isLeft()) return ((fa6 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef, fa4._rightRef, fa5._rightRef, fa6._rightRef))
  }
}

/**
 * The `Left` data constructor represents the left side of the
 * [[Either]] disjoint union, as opposed to the [[Right]] side.
 */
export function Left<L>(value: L): Either<L, never> {
  return new (Either as any)(value, null as never, false)
}

/**
 * The `Right` data constructor represents the right side of the
 * [[Either]] disjoint union, as opposed to the [[Left]] side.
 */
export function Right<R>(value: R): Either<never, R> {
  return new (Either as any)(null as never, value, true)
}
