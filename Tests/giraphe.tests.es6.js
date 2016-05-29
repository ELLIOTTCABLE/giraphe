import Debug from 'debug'
const debug = Debug('giraphe:tests')

import assert from 'power-assert'
import sinon, { match } from 'sinon'


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

         it("returns a node-mapping", function(){
            const Node = class {}, root = new Node; root.id = '123'
            var walk = new Walker({ class: Node, key: 'id' })

            var result = walk(root, new Function)
            assert(null != result && typeof result === 'object')
         })

         it("collects the root node, if it's not rejected", function(){
            const Node = class {}, root = new Node; root.id = '123'
            var walk = new Walker({ class: Node, key: 'id' })

            var result = walk(root, new Function)
            assert(result[root.id] === root)
         })

         it.skip("returns the collected nodes")

         describe(" ~ callbacks", function(){ const they = it
            they("get called on the passed initial node", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledOnce)
            })

            they("are severally called", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const first = sinon.spy(), second = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, first, second)
               assert(first .calledOnce)
               assert(second.calledOnce)
            })

            they("are invoked with the current node as `this`", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledOn(root))
            })

            they("also receive the current node as the first argument", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledWith(root))
            })

            they.skip("receive the parent (discovered-through) node as the second argument", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledWith(match.any, null))
            })

            they("receive `null` as the second argument when processing the initial node", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledWith(match.any, null))
             //assert(cb.calledWith(match(), null, match({}), match({}), match([cb])))
            })

            // FIXME: More robust test.
            they.skip("receive the peer-nodes discovered thus far", function(){
               const Node = class {}, root = new Node; root.id = '123'
               const cb = sinon.spy()
               var walk = new Walker({ class: Node, key: 'id' })

               walk(root, cb)
               assert(cb.calledWith(match.any, null))
             //assert(cb.calledWith(match(), null, match({}), match({}), match([cb])))
            })
         })

      }) // ~ a Walker instance

   }) // ~ The Walker constructor
}) // giraphe
