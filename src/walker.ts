import createDebug from "debug"

import * as common from "./common.js"

// FIXME: Drop this with `unassert`
let debug = createDebug("giraphe")

export type WalkerFunction<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
   E,
   EK extends common.KeysMatching<E, N>,
> = (
   root: N,
   ...callbacks: (common.Supplyback<N, IK, E, EK> | common.Filterback<N, IK, E, EK>)[]
) => false | Map<IK, N>

export type WalkerMethod<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
   E,
   EK extends common.KeysMatching<E, N>,
> = (
   this: N,
   ...callbacks: (common.Supplyback<N, IK, E, EK> | common.Filterback<N, IK, E, EK>)[]
) => false | Map<IK, N>

export default function WalkerFunction<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
   E,
   EK extends common.KeysMatching<E, N>,
>(options: common.Options<N, IK, E, EK>): WalkerFunction<N, IK, E, EK> {
   const opts: common.Options<N, IK, E, EK> = Object.assign(
      Object.create(null),
      {
         callbacks: [],
      },
      options,
   )

   return function invokeWalker(
      root: N,
      ...callbacks: common.UnknownCallback<N, IK, E, EK>[]
   ): Map<IK, N> | false {
      if (opts.callbacks && 0 !== opts.callbacks.length) callbacks.push(...opts.callbacks)

      console.assert(root instanceof opts.class)

      if (0 === callbacks.length)
         throw new TypeError(
            "walker may not be invoked without any `callbacks` arguments.",
         )

      debug(`invoking walk([${callbacks.length}]):`, root)
      debug(`  (callbacks: [${callbacks}])`)

      const SEEN = new Map<IK, N>()
      const ACCEPTED = new Map<IK, N>()
      const result = walk<N, IK, E, EK>(
         opts,
         [root],
         undefined,
         [],
         callbacks,
         callbacks,
         SEEN,
         ACCEPTED,
      )

      if (common.abortIteration === result) return false

      return ACCEPTED
   }
}

export function WalkerMethod<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
   E,
   EK extends common.KeysMatching<E, N>,
>(options: common.Options<N, IK, E, EK>): WalkerMethod<N, IK, E, EK> {
   const opts: common.Options<N, IK, E, EK> = Object.assign(
      Object.create(null),
      {
         callbacks: [],
      },
      options,
   )

   return function invokeWalker(
      this: N,
      ...callbacks: common.UnknownCallback<N, IK, E, EK>[]
   ): Map<IK, N> | false {
      if (opts.callbacks && 0 !== opts.callbacks.length) callbacks.push(...opts.callbacks)

      console.assert(this instanceof opts.class)

      if (0 === callbacks.length)
         throw new TypeError(
            "walker may not be invoked without any `callbacks` arguments.",
         )

      debug(`invoking walk([${callbacks.length}]):`, this)
      debug(`  (callbacks: [${callbacks}])`)

      const SEEN = new Map<IK, N>()
      const ACCEPTED = new Map<IK, N>()
      const result = walk<N, IK, E, EK>(
         opts,
         [this],
         undefined,
         [],
         callbacks,
         callbacks,
         SEEN,
         ACCEPTED,
      )

      if (common.abortIteration === result) return false

      return ACCEPTED
   }
}

function walk<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
   E,
   EK extends common.KeysMatching<E, N>,
>(
   opts: common.Options<N, IK, E, EK>,
   path: N[],
   via: E | undefined,
   cachebacks: common.UnknownCallback<N, IK, E, EK>[],
   runbacks: common.UnknownCallback<N, IK, E, EK>[],
   allbacks: common.UnknownCallback<N, IK, E, EK>[],
   SEEN: Map<IK, N>,
   ACCEPTED: Map<IK, N>,
): boolean | typeof common.abortIteration {
   const current = path[0],
      parent = path[1]

   // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
   const ID = current[opts.key] as unknown as IK

   if (ACCEPTED.has(ID)) return true
   else SEEN.set(ID, current)

   debug(`walk(${ID}):`, inspectPath(opts, path))

   const DISCOVERED = new Map<IK, { node: N; edges: (E | undefined)[] }>()
   let rejected = false

   for (let [idx, callback] of runbacks.entries()) {
      const returned = callback.call(current, via, parent, allbacks)
      debug(`walk(${ID}): callback ${idx} returned: `, returned)

      // If it returns a boolean, or nothing at all, then it's a ‘filter-back’,
      if (false === returned) {
         rejected = true
         break
      }
      if (null == returned || true === returned) {
         rejected = false
         continue
      }

      // and ‘abort-backs’ are a special case, that immediately terminates the loop
      if (common.abortIteration === returned) {
         debug(`walk(${ID}): iteration aborted`)
         return common.abortIteration
      }

      // else, it's a ‘supply-back’! These return either,
      // 1. a direct node (or edge),
      else if (returned instanceof opts.edge.class) {
         // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
         const node = returned[opts.edge.extract_path] as unknown as N,
            id = node[opts.key] as unknown as IK

         const entry = DISCOVERED.get(id)
         if (null == entry) DISCOVERED.set(id, { node: node, edges: [returned] })
         else entry.edges.push(returned)
      } else if (returned instanceof opts.class) {
         // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
         const id = returned[opts.key] as unknown as IK

         if (!DISCOVERED.has(id)) DISCOVERED.set(id, { node: returned, edges: [] })
      }

      // 2. an `Array` of nodes / edges,
      else if (Array.isArray(returned)) {
         for (let element of returned) {
            if (element instanceof opts.edge.class) {
               // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
               const node = element[opts.edge.extract_path] as unknown as N,
                  id = node[opts.key] as unknown as IK

               const entry = DISCOVERED.get(id)
               if (null == entry) DISCOVERED.set(id, { node: node, edges: [element] })
               else entry.edges.push(element)
            } else if (element instanceof opts.class) {
               // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
               const id = element[opts.key] as unknown as IK

               if (!DISCOVERED.has(id)) DISCOVERED.set(id, { node: element, edges: [] })
            } else
               throw new TypeError(
                  "Supplyback return-array contains illegal value; expecting Node or Edge.",
               )
         }
      }
      // 3. or a Map of keys-to-nodes.
      else if (common.isMap(returned))
         for (let [key, node] of returned) {
            // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
            console.assert((node[opts.key] as unknown as IK) === key)

            if (!DISCOVERED.has(key)) DISCOVERED.set(key, { node: node, edges: [] })
         }
      else
         throw new TypeError(
            "Supplyback returned illegal value: " +
               "expecting Node, Edge, Node[], Edge[], or Map<K, Node>.",
         )
   }

   // If one of the filter-backs rejected the *current* node, we simply return now ...
   if (rejected) return false

   // ... else, we at least are accepting the current node,
   ACCEPTED.set(ID, current)

   // and then we traverse!
   for (let [_key, { node, edges }] of DISCOVERED) {
      const sub_path = path.slice()
      sub_path.unshift(node)

      if (edges.length === 0) edges.push(undefined)

      for (let edge of edges) {
         const result = walk<N, IK, E, EK>(
            opts,
            sub_path,
            edge,
            cachebacks,
            runbacks,
            allbacks,
            SEEN,
            ACCEPTED,
         )

         if (common.abortIteration === result) return common.abortIteration
      }
   }

   return false
}

function inspectPath<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
   E,
   EK extends common.KeysMatching<E, N>,
>(opts: common.Options<N, IK, E, EK>, path: N[]): string {
   const path_bits = path
      .slice()
      .reverse()
      .map((bit) =>
         null != opts.inspector ? opts.inspector.call(bit, bit) : bit[opts.key],
      )

   return path_bits.join(" → ")
}
