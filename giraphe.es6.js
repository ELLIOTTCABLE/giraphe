import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'

const GLOBAL = (null,eval)('this')


const symbols = {
   abortIteration: Walker.abortIteration= Symbol('abortIteration') // API: abortive return-value

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
   const opts = _.assign(new Object, options)

   return function invokeWalk(root, ...callbacks){
      const SEEN = new Object

      // If method-invoked, `root.walk(...)`
      if (typeof this !== 'undefined' && this !== (null,eval)('this')) {
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

            const options = _.assign(new Object, opts)
            options.callbacks = _.concat(opts.callbacks || [], callbacks)

            return constructWalkFunction(options)
         }
      }

      if (!_.isEmpty(opts.callbacks))
         callbacks = _.concat(opts.callbacks, callbacks)

      if (_.isEmpty(callbacks))
         throw new TypeError("walk() may not be invoked without any `callbacks` arguments.")

      debug(`invoking walk([${ callbacks.length }]):`, root)
      debug(`  (callbacks: [${ callbacks }])`)
      const result = walk(opts, [root], [], callbacks, callbacks, SEEN)

      if (false === result) /* an `abortIteration` */ return false

      for (let key of Object.keys(SEEN)) {
         if (!SEEN[key].accepted) delete SEEN[key]
         else SEEN[key] = SEEN[key].node
      }

      return SEEN }
}

function walk(opts, path, cachebacks, runbacks, allbacks, SEEN){                                         assert( null != path )
                                                                                                         assert( null != path[0] )
                                                                                                         assert( 0 !== allbacks.length )
   const current = path[0]
       , parent = path[1] || null
       , KEY = null != opts.keyer
             ? opts.keyer.call(current, current)
             : current[opts.key]
                                                                                                         assert( typeof KEY === 'string' && KEY !== '' )
   if  (SEEN[KEY] && SEEN[KEY].accepted) return null
   else SEEN[KEY] = { node: current, accepted: false }

   if (debug.enabled) {
      const path_bits = path.map(bit =>
         null != opts.keyer ? opts.keyer.call(bit, bit) : bit[opts.key])
      debug( 'walk(): ', path_bits.join('→') )                                                   }


   const DISCOVERED = new Object
   let   aborted = false
     ,   rejected = false

   rejected = ! _.every(runbacks, callback => {
      const returned = callback.call(current, current, parent, allbacks)

      // If it returns a boolean, or nothing at all, then it's a ‘filter-back’,
      if (false === returned)                                                       return false
      if (null == returned || true === returned)                                    return true

      // and ‘abort-backs’ are a special case,
      if (symbols.abortIteration === returned) {
         aborted = true;                                                            return false }

      // else, it's a ‘supply-back’! These return either,
      const is_node = null != opts.predicate
                    ? opts.predicate.call(returned, returned)
                    : returned instanceof opts.class

      if (is_node) {
         let key = null != opts.keyer
                 ? opts.keyer.call(returned, returned)
                 : returned[opts.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
                                                                     DISCOVERED[key] = returned }

      // 2. an `Array` of nodes,
      else if (_.isArray(returned)) {                                                                    assert( null != opts.predicate ? _.every(returned, node => opts.predicate.call(node, node))
                                                                                                                                        : _.every(returned, node => node instanceof opts.class) )
         const elements = _.reduce(returned, (elements, node) => {
            let key = null != opts.keyer
                    ? opts.keyer.call(node, node)
                    : key = node[opts.key]

            elements[key] = node
            return elements
         }, new Object)
                                                                 _.assign(DISCOVERED, elements) }

      // 3. or a generic Object, behaving as a map of keys-to-nodes.
      else {                                                                                             assert( null != opts.predicate ? _.every(returned, node => opts.predicate.call(node, node))
                                                                                                                                        : _.every(returned, node => node instanceof opts.class) )
                                                                 _.assign(DISCOVERED, returned) }

      return true                                                                                })

   if (aborted)  /* If walk() returns `false`, it immediately propagates upwards, */return false
   if (rejected) /* but if it was rejected, then merely add nothing on this step */ return {}

                 // ... else, the current node passed all filters, so we can mark this node as
                 // accepted, and recurse into discovered nodes
   SEEN[KEY].accepted = true

   // XXX: depth-first traversal? Should this be configurable?
   for (let key of Object.keys(DISCOVERED)) {
      const node = DISCOVERED[key]
          , sub_path = path.slice()
            sub_path.unshift(node)

      const result = walk(opts, sub_path, cachebacks, runbacks, allbacks, SEEN)

      if (false === result) /* The only non-Object result is an `abortIteration` */ return false }}


export { Walker }
export default Walker
