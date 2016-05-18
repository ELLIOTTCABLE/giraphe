/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'
import Mustache from 'mustache'


// ## Types

type WalkerOptions<node> = { key?: string }
type WalkerOptionsWithClass<node> = WalkerOptions & { class: Class<node> }
type WalkerOptionsWithPredicate   = WalkerOptions & { predicate: (a: /* TYPEME */ any) => any }

type WalkFilterback<node,collection> = (
   current: node, parent: node
 , supplied: collection, visited: collection
 , callbacks: WalkCallback<node,collection>[]
) => boolean | void

type WalkSupplyback<node,collection> = (
   current: node, parent: node
 , supplied: collection, visited: collection
 , callbacks: WalkCallback<node,collection>[]
) => collection

type WalkCallback<node,collection> =
      WalkFilterback<node,collection> |
      WalkSupplyback<node,collection>

type Map<t> = { [key: string]: t }
type List<t> = t[]

// FIXME: Flow, at the moment, doesn't handle returning Functions very well.
type WalkFunction<node,collection> = {
   (root?: node, ...callbacks: WalkCallback<node,collection>[]): collection
}


// ## Implementation

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

const constructWalkFunction = function<node, collection: Map<node> | List<node>>(
         options: any // TYPEME
      ) : WalkFunction<node,collection> {

   const body = undefined // XXX ...
       , func = (null,eval)(body)

   return function walk<node, collection>(
            root?: node, ...callbacks: WalkCallback<node,collection>[]
         ) : collection {
      if (this === (null,eval)('this'))
         return func.apply(root, callbacks) // If function-invoked, `walk(root, ...)`
      else
         return func.apply(this, arguments) // If method-invoked, `root.walk(...)`
   }
}


export { Walker }
export default Walker
