import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'
import Mustache from 'mustache'
import require_eval from 'eval'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// XXX: Does this need to be instantiated?
Mustache.escape = function(s){ return s }

const walkTemplatePath = resolve(__dirname, 'walk.js')

let walkTemplate = readFileSync(walkTemplatePath+'.mustache', 'utf8')
assert(typeof walkTemplate === 'string' && 0 !== walkTemplate.length)
process.nextTick(()=> Mustache.parse(walkTemplate))


var Walker = function(options, key) {

   if (_.isFunction(options))
      options = { class: options }
   if (null == options)
      options = {}

   if (null == options._description)
               options._description = new Array

   if (null == options.key) {
      if (null == key)
         throw new TypeError("Walker() must be instantiated with "
                           + "a string-ish (or invokable) 'key' property.")
      options.key = key
   }
   if (typeof options.key === 'function') {
      options.keyer = options.key
               delete options.key

      options['keyer?'] = true
      options._description.push('keyer')
   }

   if (options.class == null && options.predicate == null)
      throw new TypeError("Walker() must be instantiated with "
                        + "either a 'predicate' or 'class' property.")
   if (null != options.predicate) {
      options['predicate?'] = true
      options._description.push('predicate')
   }

 //if (null != options.cache) {
 //   options['cache?'] = true
 //   options._description.push['cache']
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
   const body = Mustache.render(walkTemplate, options)
       , desc = options._description.join('+')
       , path = walkTemplatePath + (desc ? '.'+desc : '')
   assert(typeof body === 'string' && 0 !== body.length)

   const wrap = require_eval(body, path, {}, true).default
   assert(typeof wrap === 'function')

   const func = wrap(symbols, options)

   return function invokeWalk(root, ...callbacks){

      // If method-invoked, `root.walk(...)`
      if (typeof this !== 'undefined' && this !== (null,eval)('this')) {
         callbacks.unshift(root)
         root = this
      }

      debug(`invoking walk([${ callbacks.length }]):`, root)
      return func(root, null, [], callbacks, callbacks)
   }
}


export { Walker }
export default Walker
