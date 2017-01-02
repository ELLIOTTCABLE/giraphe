import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'


// TODO: Accept existing `walk()` function to copy options
// TODO: Accept a set of callbacks to prepend to all walks (to avoid `bind()` stomping on `this`)
const Walker = function Walker(options, key) {

   if (_.isFunction(options))
      options = { class: options }
   if (null == options)
      options = {}

   if (null == options.key && null == options.keyer) {
      if (null == key)
         throw new TypeError("Walker() must be instantiated with "
                           + "a string-ish 'key' property, or an invokable 'keyer' property.")
      options.key = key
   }
   if (null != options.keyer) {
      options.has_keyer = true
   }

   if (null == options.class && null == options.predicate)
      throw new TypeError("Walker() must be instantiated with "
                        + "either a 'predicate' or 'class' property.")
   if (null != options.predicate) {
      options.has_predicate = true
   }

 //if (null != options.cache) {
 //   options.has_cache = true
 //}

   return constructWalkFunction(options) }

// FIXME: Make proper Symbols. :P
const symbols = {
   abortIteration: Walker.abortIteration  = 'abortIteration'
 , walkCache:      Walker.walkCache       = '::walk__do_cache'
 , cachesKey:      Walker.cachesKey       = '::walk__caches'
 , cachebackKey:   Walker.cachebackKey    = '::walk__cachingKey'
}

const constructWalkFunction = function(options){
   assert(null != options)

   return function invokeWalk(root, ...callbacks){
      const SEEN = new Object

      // If method-invoked, `root.walk(...)`
      if (typeof this !== 'undefined' && this !== (null,eval)('this')) {
         callbacks.unshift(root)
         root = this
      }

      debug(`invoking walk([${ callbacks.length }]):`, root)
      const result = walk(options, [root], [], callbacks, callbacks, SEEN)

      if (false === result) /* an `abortIteration` */ return false

      for (let key of Object.keys(SEEN)) {
         if (!SEEN[key].accepted) delete SEEN[key]
         else SEEN[key] = SEEN[key].node
      }

      return SEEN }
}

const walk = function walk($, path, cachebacks, runbacks, allbacks, SEEN){                               assert( null != path )
                                                                                                         assert( null != path[0] )
                                                                                                         assert( 0 !== allbacks.length )
   const current = path[0]
       , parent = path[1] || null
       , KEY = $.has_keyer
             ? $.keyer.call(current, current)
             : current[$.key]
                                                                                                         assert( typeof KEY === 'string' && KEY !== '' )
   if  (SEEN[KEY] && SEEN[KEY].accepted) return null
   else SEEN[KEY] = { node: current, accepted: false }

   if (debug.enabled) {
      const path_bits = path.map(bit => $.has_keyer ? $.keyer.call(bit, bit) : bit[$.key])
      debug( 'walk(): ', path_bits.join('→') )                                                   }


   const DISCOVERED = new Object
   let   aborted = false
     ,   rejected = false

   rejected = ! _.every(runbacks, callback => {
      const returned = callback.call(current, current, parent, DISCOVERED, SEEN, allbacks)

      // If it returns a boolean, or nothing at all, then it's a ‘filter-back’,
      if (false === returned)                                                       return false
      if (null == returned || true === returned)                                    return true

      // and ‘abort-backs’ are a special case,
      if (symbols.abortIteration === returned) {
         aborted = true;                                                            return false }

      // else, it's a ‘supply-back’! These return either,
      const is_node = $.has_predicate
                    ? $.predicate.call(returned, returned)
                    : returned instanceof $.class

      if (is_node) {
         let key = $.has_keyer
                 ? $.keyer.call(returned, returned)
                 : returned[$.key]
                                                                                                         assert( typeof key === 'string' && key !== '' )
                                                                     DISCOVERED[key] = returned }

      // 2. an `Array` of nodes,
      else if (_.isArray(returned)) {                                                                    assert( $.has_predicate ? _.every(returned, node => $.predicate.call(node, node))
                                                                                                                                 : _.every(returned, node => node instanceof $.class) )
         const elements = _.reduce(returned, (elements, node) => {
            let key = $.has_keyer
                    ? $.keyer.call(node, node)
                    : key = node[$.key]

            elements[key] = node
            return elements
         }, new Object)
                                                                 _.assign(DISCOVERED, elements) }

      // 3. or a generic Object, behaving as a map of keys-to-nodes.
      else {                                                                                             assert( $.has_predicate ? _.every(returned, node => $.predicate.call(node, node))
                                                                                                                                 : _.every(returned, node => node instanceof $.class) )
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

      const result = walk($, sub_path, cachebacks, runbacks, allbacks, SEEN)

      if (false === result) /* The only non-Object result is an `abortIteration` */ return false }}


export { Walker }
export default Walker
