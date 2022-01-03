export type KeysMatching<A, B> = { [K in keyof A]: A[K] extends B ? K : never }[keyof A]
export type OptionalKeysMatching<A, B> = {
   [K in keyof A]: A[K] extends B | undefined ? K : never
}[keyof A]

export type EdgelessSupplyback<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
> = (
   this: N,
   current: N,
   parent: N | undefined,
   callbacks: EdgelessUnknownCallback<N, IK>[],
) => undefined | N | (N | undefined)[] | Map<IK, N> | typeof abortIteration

export type EdgelessFilterback<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
> = (
   this: N,
   current: N,
   parent: N | undefined,
   callbacks: EdgelessUnknownCallback<N, IK>[],
) => boolean | typeof abortIteration

export type EdgelessUnknownCallback<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
> = (
   this: N,
   current: N,
   parent: N | undefined,
   callbacks: EdgelessUnknownCallback<N, IK>[],
) => undefined | boolean | N | (N | undefined)[] | Map<IK, N> | typeof abortIteration

export type Supplyback<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
   E,
   EK extends OptionalKeysMatching<E, N>,
> = (
   this: N,
   via: E | undefined,
   parent: N | undefined,
   callbacks: UnknownCallback<N, IK, E, EK>[],
) =>
   | undefined
   | E
   | (E | undefined)[]
   | N
   | (N | undefined)[]
   | Map<IK, N>
   | typeof abortIteration

export type Filterback<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
   E,
   EK extends OptionalKeysMatching<E, N>,
> = (
   this: N,
   via: E | undefined,
   parent: N | undefined,
   callbacks: UnknownCallback<N, IK, E, EK>[],
) => boolean | typeof abortIteration

export type UnknownCallback<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
   E,
   EK extends OptionalKeysMatching<E, N>,
> = (
   this: N,
   via: E | undefined,
   parent: N | undefined,
   callbacks: UnknownCallback<N, IK, E, EK>[],
) =>
   | undefined
   | boolean
   | E
   | (E | undefined)[]
   | N
   | (N | undefined)[]
   | Map<IK, N>
   | typeof abortIteration

export type Keyer<N, IK extends KeysMatching<N, string | number | symbol>> = (
   node: N,
) => IK
export type Predicate<N> = (arg: N) => boolean

export type EdgelessOptions<N, IK extends KeysMatching<N, string | number | symbol>> = {
   class: new (...args: never) => N
   key: IK
   callbacks?: EdgelessUnknownCallback<N, IK>[]
   inspector?: (node: N) => string
}

export type EdgelessOptionsWithPredicate<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
> = {
   predicate: Predicate<N>
   key: IK
}

export type EdgelessOptionsWithKeyer<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
> = {
   class: new (...args: never) => N
   keyer: Keyer<N, IK>
}

export type EdgelessOptionsWithPredicateAndKeyer<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
> = {
   predicate: Predicate<N>
   keyer: Keyer<N, IK>
}

export type Options<
   N,
   IK extends KeysMatching<N, string | number | symbol>,
   E,
   EK extends OptionalKeysMatching<E, N>,
> = {
   class: new (...args: never) => N
   key: IK
   edge: {
      class: new (...args: never) => E
      extract_path: EK
   }
   callbacks?: UnknownCallback<N, IK, E, EK>[]
   inspector?: (node: N) => string
}

export function isMap(val: unknown): val is Map<unknown, unknown> {
   return !!val && Object.prototype.toString.call(val) === "[object Map]"
}

export const abortIteration = Symbol("abortIteration") // API = abortive return-value

export const nodeAccepted = Symbol("nodeAccepted") // Lib = tracks acceptance

export const doCaching = Symbol("doCaching") // API = enable caching
export const cachesKey = Symbol("caches") // Lib = storage-key for caches
export const cachebackKey = Symbol("cachebackKey") // API = indicate cacheability
