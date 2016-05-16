/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe')
import assert from 'power-assert'

import _ from 'lodash'

type WalkerOptionsWithClass<Node> = { class: Class<Node> }
type WalkerOptionsWithPredicate = { predicate: (a: /* TYPEME */ any) => any }
type WalkerOptions<Node> = (WalkerOptionsWithClass<Node> | WalkerOptionsWithPredicate) & {
}

const Walker = class Walker<Node> {

   constructor(options_or_class : Class<Node> | WalkerOptions<Node>){
      var options
      if (_.isFunction(options_or_class))
         options = { class: options_or_class }
      else
         options = options_or_class

      if (options == null || (options.class == null && options.predicate == null))
         throw new TypeError("Walker() must be instantiated with either a 'predicate' or 'class' property.")

         // XXX
      } }}


export { Walker }
export default Walker
