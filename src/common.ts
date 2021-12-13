import type createDebug from "debug"

export type KeysMatching<A, B> = { [K in keyof A]: A[K] extends B ? K : never }[keyof A]
export type SelfReferentialKeys<A> = KeysMatching<A, A>

export type EdgelessSupplyback<N, K extends SelfReferentialKeys<N>> = (
   this: N,
   via: N,
   parent: N | undefined,
   callbacks: EdgelessUnknownCallback<N, K>[],
) => N | N[] | Map<K, N> | typeof abortIteration

export type EdgelessFilterback<N, K extends SelfReferentialKeys<N>> = (
   this: N,
   via: N,
   parent: N | undefined,
   callbacks: EdgelessUnknownCallback<N, K>[],
) => boolean | typeof abortIteration

export type EdgelessUnknownCallback<N, K extends SelfReferentialKeys<N>> = (
   this: N,
   via: N,
   parent: N | undefined,
   callbacks: EdgelessUnknownCallback<N, K>[],
) => boolean | N | N[] | Map<K, N> | typeof abortIteration

export type Keyer<N, K extends SelfReferentialKeys<N>> = (node: N) => K
export type Predicate<N> = (arg: N) => boolean

export type EdgelessOptions<N, K extends SelfReferentialKeys<N>> = {
   class: new (...args: never) => N
   key: K
   callbacks?: EdgelessUnknownCallback<N, K>[]
   inspector?: (node: N) => string
}

export type EdgelessOptionsWithPredicate<N, K extends SelfReferentialKeys<N>> = {
   predicate: Predicate<N>
   key: K
}

export type EdgelessOptionsWithKeyer<N, K extends SelfReferentialKeys<N>> = {
   class: new (...args: never) => N
   keyer: Keyer<N, K>
}

export type EdgelessOptionsWithPredicateAndKeyer<N, K extends SelfReferentialKeys<N>> = {
   predicate: Predicate<N>
   keyer: Keyer<N, K>
}

export function isMap(val: unknown): val is Map<any, any> {
   return !!val && Object.prototype.toString.call(val) === "[object Map]"
}

export const abortIteration = Symbol("abortIteration") // API = abortive return-value

export const nodeAccepted = Symbol("nodeAccepted") // Lib = tracks acceptance

export const doCaching = Symbol("doCaching") // API = enable caching
export const cachesKey = Symbol("caches") // Lib = storage-key for caches
export const cachebackKey = Symbol("cachebackKey") // API = indicate cacheability
