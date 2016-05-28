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
         assert.doesNotThrow(function(){ new Walker(Node, 'id') })
      })

      it("accepts an options-object", function(){
         class Node {}
         assert.doesNotThrow(function(){ new Walker({ class: Node, key: 'id' }) })
      })

      it("takes a predicate as an alternative to a node-class", function(){
         assert.doesNotThrow(function(){ new Walker({ predicate: new Function, key: 'id' }) })
      })

      it("accepts a key-function", function(){
         class Node {}
         assert.doesNotThrow(function(){ new Walker({ class: Node, key: function(){} }) })
      })

      it("does not currently support unkeyed iteration", function(){
         class Node {}
         assert.throws(function(){ new Walker({ class: Node }) })
      })

      it("throws if given neither a predicate nor a node-class", function(){
         assert.throws(function(){ new Walker({ key: 'blah' }) })
         assert.throws(function(){ new Walker(   ) })
      })

      describe(" ~ a walk function", function(){

         it("instantiates with a node-class", function(){
            class Node {}
            var walk = new Walker({ class: Node, key: 'id' })
            assert(typeof walk === 'function')
         })

         it("instantiates with a predicate", function(){
            var walk = new Walker({ predicate: new Function, key: 'id' })
            assert(typeof walk === 'function')
         })

         describe(" ~ callbacks", function(){
            it("calls a passed call-back on the root", function(){
               const Node = class {}, root = new Node, cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledOnce)
            })

            it("calls multiple passed call-backs", function(){
               const Node = class {}, root = new Node
                   , first = sinon.spy(), second = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, first, second)
               assert(first .calledOnce)
               assert(second.calledOnce)
            })
         })

      }) // ~ a Walker instance

   }) // ~ The Walker constructor
}) // giraphe
