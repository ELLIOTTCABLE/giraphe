/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'
import Mustache from 'mustache'

type WalkerOptions<Node> = {
   whee?: string
}
type WalkerOptionsWithClass<Node> = WalkerOptions & { class: Class<Node> }
type WalkerOptionsWithPredicate   = WalkerOptions & { predicate: (a: /* TYPEME */ any) => any }

// FIXME: Flow, at the moment, doesn't handle returning Functions very well.
type WalkFunction<Node> = {
   (root?: Node, ...callbacks: /* TYPEME */ Function[]): WalkResult<Node>
}

type WalkResult<Node> = Node[] | { [key: string]: Node }

const Walker = function<Node>(options
      : Class<Node> | WalkerOptionsWithPredicate | WalkerOptionsWithClass<Node>) : WalkFunction {

   // FIXME: This typecasting monstrosity. No. Ygggg
   // FIXME: Hell, this entire approach to importing options, with defaults, is so fucking un-
   //        JavaScript, that it makes me a little sick.
   const o = { }
   if (_.isFunction(options))
      options = { class: ((options:any):Class<Node>) }
   if (null == options)
      options = (({}:any):WalkerOptionsWithPredicate)

   if (null != options.class)     o.class     = options.class
   if (null != options.predicate) o.predicate = options.predicate
   if (null != options.key) {
      if (typeof options.key === 'function')
                                  o.keyer = options.key
                             else o.key   = options.key }

   if (options.class == null && options.predicate == null)
      throw new TypeError("Walker() must be instantiated with "
                        + "either a 'predicate' or 'class' property.")

   return constructWalkFunction(options)
}

const constructWalkFunction = function(options) : WalkFunction {
   const body = undefined // XXX
       , func = (null,eval)(body)

   return function walk(root?: Node, ...callbacks: /* TYPEME */ Function[]) : WalkResult {
      if (this === (null,eval)('this'))
         return func.apply(root, callbacks) // If function-invoked, `walk(root, ...)`
      else
         return func.apply(this, arguments) // If method-invoked, `root.walk(...)`
   }
}


export { Walker }
export default Walker
