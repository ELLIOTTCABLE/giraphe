/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'
import Mustache from 'mustache'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// XXX: Does this need to be instantiated?
Mustache.escape = function(s){ return s }

const walkTemplate = readFileSync(resolve(__dirname, 'walk.js.mustache'), 'utf8')
Mustache.parse(walkTemplate)


var Walker = function(options) {

   if (_.isFunction(options))
      options = { class: options }
   if (null == options)
      options = {}

   if (typeof options.key === 'function')
      options.keyer, options.key = options.key, null

   if (options.class == null && options.predicate == null)
      throw new TypeError("Walker() must be instantiated with "
                        + "either a 'predicate' or 'class' property.")

   return constructWalkFunction(options) }

const symbols = {
   abortIteration: Walker.abortIteration  = 'abortIteration'
 , walkCache:      Walker.walkCache       = '::walk__do_cache'
 , cachesKey:      Walker.cachesKey       = '::walk__caches'
 , cachebackKey:   Walker.cachebackKey    = '::walk__cachingKey'
}


const constructWalkFunction = function(options){
   assert(null != options)
   const body = Mustache.render(walkTemplate, options)
       , func = (null,eval)(body)(debug, assert, _, symbols)

   return function invokeWalk(root, ...callbacks){
      // If method-invoked, `root.walk(...)`
      if (this !== (null,eval)('this')) {
         callbacks.unshift(root)
         root = this
      }

      return func(root, null, callbacks)
   }
}


export { Walker }
export default Walker
