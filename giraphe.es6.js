/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'

type WalkerOptions<Node> = {
   whee?: string
}
type WalkerOptionsWithClass<Node> = WalkerOptions & { class: Class<Node> }
type WalkerOptionsWithPredicate   = WalkerOptions & { predicate: (a: /* TYPEME */ any) => any }

type walk = {
   (x: any): any
}

const Walker = function<Node>(options
      : Class<Node> | WalkerOptionsWithPredicate | WalkerOptionsWithClass<Node>) : walk {

   // FIXME: This typecasting monstrosity. No. Ygggg
   const o = { }
   if (_.isFunction(options))
      options = { class: ((options:any):Class<Node>) }
   if (null == options)
      options = (({}:any):WalkerOptionsWithPredicate)

   if (null != options.class)     o.class     = options.class
   if (null != options.predicate) o.predicate = options.predicate

   if (options.class == null && options.predicate == null)
      throw new TypeError("Walker() must be instantiated with either a 'predicate' or 'class' property.")

   return function walk(root: Node, ...callbacks: /* TYPEME */ Function[]){
      if (options.class) assert(root instanceof options.class)

      // XXX
   }
}


export { Walker }
export default Walker
