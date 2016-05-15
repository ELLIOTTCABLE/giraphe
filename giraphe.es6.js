/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe')

import _ from 'lodash'

type WalkerOptions<NodeClass> = {
   class:      Class<NodeClass>;
   predicate:  (a: /* FIXME */ any) => any
}

const Walker = class Walker<NodeClass> {

   constructor(options_or_class : Class<NodeClass> | WalkerOptions<NodeClass>){

      // FIXME: Why is Babel / Flow requiring the brackets around this?
      if (_.isFunction(options_or_class)) {
         const options = { class: options_or_class }
      } else {
         const options = options_or_class
      }

      return function walker(){
         // XXX
      } }}


export { Walker }
export default Walker
