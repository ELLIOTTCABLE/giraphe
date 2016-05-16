/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe:tests')

import assert from 'power-assert'
import sinon from 'sinon'


import { Walker } from '../giraphe.es6.js'

describe("giraphe", function(){
   describe("~ The Walker constructor", function(){

      it("exists", function(){
         assert.ok(Walker)
         assert(typeof Walker === 'function')
      })

      it("accepts a node-class", function(){
         class Node {}
         assert.doesNotThrow(function(){ new Walker(Node) })
      })

      it("accepts an options-object", function(){
         class Node {}
         assert.doesNotThrow(function(){ new Walker({ class: Node }) })
      })

      it("takes a predicate as an alternative to a node-class", function(){
         assert.doesNotThrow(function(){ new Walker({ predicate: new Function }) })
      })

      it("throws if given neither a predicate nor a node-class", function(){
         // flow-disable-next-line
         assert.throws(function(){ new Walker({ }) })
         // flow-disable-next-line
         assert.throws(function(){ new Walker(   ) })
      })

      describe(" ~ a Walker instance", function(){

         it("instantiates with a node-class", function(){
            class Node {}
            var walker = new Walker({ class: Node })
            assert(typeof walker === 'function')
         })

         it("instantiates with a predicate", function(){
            class Node {}
            var walker = new Walker({ predicate: new Function })
            assert(typeof walker === 'function')
         })

         it("accepts a node-class", function(){

         })
      })

   }) // ~ The Walker constructor
}) // giraphe
