import createDebug from "debug"

import * as common from "./common.js"

// FIXME: Drop this with `unassert`
let debug = createDebug("giraphe")

export type EdgelessWalkerFunction<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
> = (
   root: N,
   ...callbacks: (common.EdgelessSupplyback<N, IK> | common.EdgelessFilterback<N, IK>)[]
) => false | Map<IK, N>

export type EdgelessWalkerMethod<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
> = (
   this: N,
   ...callbacks: (common.EdgelessSupplyback<N, IK> | common.EdgelessFilterback<N, IK>)[]
) => false | Map<IK, N>

export default function EdgelessWalkerFunction<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
>(options: common.EdgelessOptions<N, IK>): EdgelessWalkerFunction<N, IK> {
   const opts: common.EdgelessOptions<N, IK> = Object.assign(
      Object.create(null),
      {
         callbacks: [],
      },
      options,
   )

   return function invokeWalker(
      root: N,
      ...callbacks: common.EdgelessUnknownCallback<N, IK>[]
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
      const result = walk<N, IK>(opts, [root], [], callbacks, callbacks, SEEN, ACCEPTED)

      if (common.abortIteration === result) return false

      return ACCEPTED
   }
}

export function EdgelessWalkerMethod<
   N,
   IK extends common.KeysMatching<N, string | number | symbol>,
>(options: common.EdgelessOptions<N, IK>): EdgelessWalkerMethod<N, IK> {
   const opts: common.EdgelessOptions<N, IK> = Object.assign(
      Object.create(null),
      {
         callbacks: [],
      },
      options,
   )

   return function invokeWalker(
      this: N,
      ...callbacks: common.EdgelessUnknownCallback<N, IK>[]
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
      const result = walk<N, IK>(opts, [this], [], callbacks, callbacks, SEEN, ACCEPTED)

      if (common.abortIteration === result) return false

      return ACCEPTED
   }
}

function walk<N, IK extends common.KeysMatching<N, string | number | symbol>>(
   opts: common.EdgelessOptions<N, IK>,
   path: N[],
   cachebacks: common.EdgelessUnknownCallback<N, IK>[],
   runbacks: common.EdgelessUnknownCallback<N, IK>[],
   allbacks: common.EdgelessUnknownCallback<N, IK>[],
   SEEN: Map<IK, N>,
   ACCEPTED: Map<IK, N>,
): boolean | typeof common.abortIteration {
   const current = path[0],
      parent = path[1]

   if (null == current) return false

   // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
   const ID = current[opts.key] as unknown as IK

   if (ACCEPTED.has(ID)) return true
   else SEEN.set(ID, current)

   debug(`walk(${ID}):`, inspectPath(opts, path))

   const DISCOVERED = new Map<IK, N>()
   let rejected = false

   for (let [idx, callback] of runbacks.entries()) {
      const returned = callback.call(current, current, parent, allbacks)
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
      else if (returned instanceof opts.class) {
         // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
         const id = returned[opts.key] as unknown as IK

         if (!DISCOVERED.has(id)) DISCOVERED.set(id, returned)
      }

      // 2. an `Array` of nodes / edges,
      else if (Array.isArray(returned))
         for (let element of returned) {
            if (null == element) continue
            else if (element instanceof opts.class) {
               // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
               const id = element[opts.key] as unknown as IK

               if (!DISCOVERED.has(id)) DISCOVERED.set(id, element)
            }
         }
      // 3. or a Map of keys-to-nodes.
      else if (common.isMap(returned))
         for (let [key, node] of returned) {
            // TYPEME: Figure out how to repair typescript(2322) here; dump the coercion.
            console.assert((node[opts.key] as unknown as IK) === key)

            if (!DISCOVERED.has(key)) DISCOVERED.set(key, node)
         }
      else {
         throw new TypeError(
            "Supplyback returned illegal value: expecting Node, Node[], or Map<IK, Node>.",
         )
      }
   }

   // If one of the filter-backs rejected the *current* node, we simply return now ...
   if (rejected) return false

   // ... else, we at least are accepting the current node,
   ACCEPTED.set(ID, current)

   // and then we traverse!
   for (let [_key, node] of DISCOVERED) {
      const sub_path = path.slice()
      sub_path.unshift(node)

      const result = walk<N, IK>(
         opts,
         sub_path,
         cachebacks,
         runbacks,
         allbacks,
         SEEN,
         ACCEPTED,
      )
      if (common.abortIteration === result) return common.abortIteration
   }

   return false
}

function inspectPath<N, IK extends common.KeysMatching<N, string | number | symbol>>(
   opts: common.EdgelessOptions<N, IK>,
   path: N[],
): string {
   const path_bits = path
      .slice()
      .reverse()
      .map((bit) =>
         null != opts.inspector ? opts.inspector.call(bit, bit) : bit[opts.key],
      )

   return path_bits.join(" → ")
}
