import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'

const GLOBAL = (null,eval)('this')


const symbols = {
   abortIteration: Walker.abortIteration= Symbol('abortIteration') // API: abortive return-value

 , nodeAccepted:                          Symbol('nodeAccepted')   // Lib: tracks acceptance

 , doCaching:     Walker.doCaching      = Symbol('doCaching')      // API: enable caching
 , cachesKey:                             Symbol('caches')         // Lib: storage-key for caches
 , cachebackKey:  Walker.cachebackKey   = Symbol('cachebackKey')   // API: indicate cacheability
}

// TODO: Accept existing `walk()` function to copy options
// TODO: Accept a set of callbacks to prepend to all walks (to avoid `bind()` stomping on `this`)
function Walker(options, key) {

   if (_.isFunction(options))
      options = { class: options }
   if (null == options)
      options = {}

   if (null == options.key && null == options.keyer) {
      if (null == key)
         throw new TypeError(
`Walker() must be instantiated with an \`options\` object including either
   a \`key\` or \`keyer\` property.`)

      options.key = key
   }

   if (null == options.class && null == options.predicate)
      throw new TypeError(
`Walker() must be instantiated with an \`options\` object including either
   a \`predicate\` or \`class\` property.`)

   const edge = options.edge
   if (null != edge) {
      if (null == edge.class        && null == edge.predicate
       && null == edge.extract_path && null == edge.extractor)
         delete options.edge

      else if (null == edge.class && null == edge.predicate)
         throw new TypeError(
`If instantiated with \`edge\` options, Walker() construction requires
   either an \`edge.class\` or an \`edge.predicate\` sub-property.`)

      else if (null == edge.extract_path && null == edge.extractor)
         throw new TypeError(
`If instantiated with \`edge\` options, Walker() construction requires
   either an \`edge.extract_path\` or an \`edge.extractor\` sub-property.`)
   }

   delete options.callbacks // nnnno.
   return constructWalkFunction(options) }


// FIXME: Why ... why is any of th... whatever. okay.
const constructWalkFunction = function constructWalkFunction(options){                                   assert(null != options)
   const opts = _.assign(Object.create(null), options)

   return function invokeWalk(root, ...callbacks){
      // NYI: This should eventually support building/returning a Map, instead
      const SEEN = Object.create(null)

      // If method-invoked, `root.walk(...)`
      if (typeof this !== 'undefined' && this !== GLOBAL) {
         if (null != root)
            callbacks.unshift(root)

         root = this
      }

      // If invoked without a `root` (i.e. to partially-apply some callbacks)
      else if (_.isFunction(root)) {
         const is_node = null != opts.predicate
                       ? opts.predicate.call(root, root)
                       : root instanceof opts.class

         // FIXME: I really need to re-write this to use true partial-application, or recursion, or
         // something like that, to store state — that's going to become important when I actually
         // implement cacheing. Smeh.
         if (!is_node) {
            callbacks.unshift(root)
            debug(`currying walk([${ (opts.callbacks || []).length }])`)
            debug(`  (additional callbacks: [${ callbacks }])`)

            const options = _.assign(Object.create(null), opts)
            options.callbacks = _.concat(opts.callbacks || [], callbacks)

            return constructWalkFunction(options)
         }
      }

      if (!_.isEmpty(opts.callbacks))
         callbacks = _.concat(opts.callbacks, callbacks)

      if (_.isEmpty(callbacks))
         throw new TypeError("walk() may not be invoked without any `callbacks` arguments.")

      // FIXME: Instead of communicating by passing around the `SEEN` world-state, this should
      //        *properly* use return-values
      debug(`invoking walk([${ callbacks.length }]):`, root)
      debug(`  (callbacks: [${ callbacks }])`)
      const result = walk(opts, [root], null, [], callbacks, callbacks, SEEN)

      if (false === result) /* an `abortIteration` */ return false

      for (let key of Object.keys(SEEN)) {
         if (!SEEN[key][symbols.nodeAccepted]) delete SEEN[key]
         else delete SEEN[key][symbols.nodeAccepted] }

      return SEEN }}


function walk(opts, path, via, cachebacks, runbacks, allbacks, SEEN){                                    assert( null != path )
                                                                                                         assert( null != path[0] )
                                                                                                         assert( 0 !== allbacks.length )
   const current = path[0]
       , parent  = path[1] || null

   const KEY = null != opts.keyer
             ? opts.keyer.call(current, current)
             : current[opts.key]
                                                                                                         assert( typeof KEY === 'string' && KEY !== '' )
   if  (SEEN[KEY] && SEEN[KEY][symbols.nodeAccepted])                               return null
   else SEEN[KEY] = current

   if (debug.enabled) {
      const path_bits = path.slice().reverse().map(bit =>
         null != opts.keyer ? opts.keyer.call(bit, bit) : bit[opts.key])
      debug( 'walk(): ', path_bits.join('→') )                                                   }


   const DISCOVERED = Object.create(null)
   let   aborted = false
     ,   rejected = false

   rejected = ! _.every(runbacks, callback => {
      const returned = callback.call(current, via || current, parent, allbacks)

      // If it returns a boolean, or nothing at all, then it's a ‘filter-back’,
      if (false === returned)                                                       return false
      if (null == returned || true === returned)                                    return true

      // and ‘abort-backs’ are a special case,
      if (symbols.abortIteration === returned) {
         aborted = true;                                                            return false }

      // else, it's a ‘supply-back’! These return either,
      // 1. a direct node (or edge),
      const is_node = null != opts.predicate
                            ? opts.predicate.call(returned, returned)
                            : returned instanceof opts.class

          , is_edge = null != opts.edge &&
                     (null != opts.edge.predicate
                            ? opts.edge.predicate.call(returned, returned)
                            : returned instanceof opts.edge.class)

      if (is_edge) {
         const node = null != opts.edge.extractor
                            ? opts.edge.extractor.call(returned, returned)
                            : returned[opts.edge.extract_path]
             , key  = null != opts.keyer
                            ? opts.keyer.call(node, node)
                            : node[opts.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
         if (null == DISCOVERED[key])
            DISCOVERED[key] = { node: node, edges: [] }

         DISCOVERED[key].edges.push(returned) }

      else if (is_node) {
         const key = null != opts.keyer
                           ? opts.keyer.call(returned, returned)
                           : returned[opts.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
         if (null == DISCOVERED[key])
            DISCOVERED[key] = { node: returned, edges: [] } }

      // 2. an `Array` of nodes / edges,
      // FIXME: This is doing some unnecessary runtime-effort, pending power-assert#76:
      //        <https://github.com/power-assert-js/power-assert/issues/76>
      else if (_.isArray(returned)) {
         for (let element of returned) {
            const is_node = null != opts.predicate
                                  ? opts.predicate.call(element, element)
                                  : element instanceof opts.class

                , is_edge = null != opts.edge &&
                           (null != opts.edge.predicate
                                  ? opts.edge.predicate.call(element, element)
                                  : element instanceof opts.edge.class)
                                                                                                         assert( null != element && is_node || is_edge )
            if (is_edge) {
               const node = null != opts.edge.extractor
                                  ? opts.edge.extractor.call(element, element)
                                  : element[opts.edge.extract_path]
                   , key  = null != opts.keyer
                                  ? opts.keyer.call(node, node)
                                  : node[opts.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
               if (null == DISCOVERED[key])
                  DISCOVERED[key] = { node: node, edges: [] }

               DISCOVERED[key].edges.push(element)
            } else {
               const key = null != opts.keyer
                                 ? opts.keyer.call(element, element)
                                 : element[opts.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
               if (null == DISCOVERED[key])
                  DISCOVERED[key] = { node: element, edges: [] }
            } } }

      // 3. or a generic Object, behaving as a map of keys-to-nodes.
      else
         for (var their_key in returned) { if (returned.hasOwnProperty(their_key)) {
            const node = returned[their_key]                                                           ; assert( null != opts.predicate ? opts.predicate.call(node, node) : node instanceof opts.class )
            const key  = null != opts.keyer
                               ? opts.keyer.call(node, node)
                               : node[opts.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
            if (null == DISCOVERED[key])
               DISCOVERED[key] = { node: node, edges: [] }
         }}

      return true                                                                                })

   if (aborted)  /* so `false` immediately propagates upwards, */                   return false
   if (rejected) /* but an empty object merely adds nothing on this step */         return {}

   current[symbols.nodeAccepted] = true

   // XXX: depth-first traversal? Should this be configurable?
   for (let key of Object.keys(DISCOVERED)) {
      const discovered = DISCOVERED[key]
          , sub_path = path.slice()
            sub_path.unshift(discovered.node)

      if (_.isEmpty(discovered.edges))
         discovered.edges.push(null)

      for (let edge of discovered.edges) {
         const result = walk(opts, sub_path, edge, cachebacks, runbacks, allbacks, SEEN)

         if (false === result)
            return false
      }} }



export { Walker }
export default Walker
