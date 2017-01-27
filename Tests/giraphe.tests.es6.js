import Debug from 'debug'
import _     from 'lodash'
const  debug = Debug('giraphe:tests')

import assert from 'power-assert'
import sinon, { match } from 'sinon'
const __ = match.any

import { Walker } from '../giraphe.es6.js'


debugger

// I produce tests generatively, iterating over the possible forms of invocation. (Some tests
// are made exclusive to a particular form via a conditional, or by being left out of the
// iteration.)
let permutations = generatePermutations()

// Each invocation of the `body` passed to `permuteTests`, presuambly full of test-cases, receives
// an argument `$` that behaves as follows:
//
// 1. When called directly `$()`, constructs a new `options` object as permuted across the above
//    `permutables` (i.e. something like `{ class: <blah>, key: 'id', ... }`),
// 3. but when called with a `String`, i.e. `$("Hello")`, it suffixes that string with a description
// 2. and exposes all of the helpers from the above permutations, i.e. `$.new()` or `$.key()`.
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

      it("accepts a keyer-function", function(){
         class Node {}
         assert.doesNotThrow(function(){ new Walker({ class: Node, keyer: function(){} }) })
      })

      it("does not currently support unkeyed iteration", function(){
         class Node {}
         assert.throws(function(){ new Walker({ class: Node }) })
      })

      it("throws if given neither a predicate nor a node-class", function(){
         assert.throws(function(){ new Walker({ key: 'blah' }) })
         assert.throws(function(){ new Walker(   ) })
      })

      it("accepts a description of edge-structure", function(){
         class Node {}; class Edge {}
         assert.doesNotThrow(function(){
            new Walker({ class: Node, key: 'id',
                         edge: { class: Edge, extract_path: 'target' } }) })
         assert.doesNotThrow(function(){
            new Walker({ class: Node, key: 'id',
                         edge: { predicate: function(){}, extract_path: 'target' } }) })
         assert.doesNotThrow(function(){
            new Walker({ class: Node, key: 'id',
                         edge: { class: Edge, extractor: function(){} } }) })
      })

      it("throws if edge-structure is missing a component", function(){
         class Node {}; class Edge {}
         assert.throws(function(){ new Walker({ class: Node, key: 'id',
            edge: { class: Edge } }) })
         assert.throws(function(){ new Walker({ class: Node, key: 'id',
            edge: { predicate: function(){} } }) })
         assert.throws(function(){ new Walker({ class: Node, key: 'id',
            edge: { extract_path: 'target' } }) })
         assert.throws(function(){ new Walker({ class: Node, key: 'id',
            edge: { extractor: function(){} } }) })
      })


   }) // ~ The Walker constructor

   permuteTests(function($){
      debug($("Adding permuted tests"))

      describe($("~ a walk function"), function(){

         it("instantiates", function(){
            var walk = new Walker( $() )
            assert(typeof walk === 'function')
         })

         it("fails if given no callbacks", function(){
            const root = $.new(); $.key(root)
            var walk = new Walker( $() )

            assert.throws(()=> walk(root) )
         })

       //if (!$.testing_map)
         it("returns an object representing a mapping", function(){
            const root = $.new(); $.key(root)
            var walk = new Walker( $() )

            var result = walk(root, new Function)
            assert(null != result && typeof result === 'object')
         })

         if ($.testing_class)
         it("returns a mapping of keys to the given class", function(){
            const root = $.new(), root_key = $.key(root)
            var walk = new Walker( $() )

            var result = walk(root, new Function)
            assert(null != result    && typeof result === 'object')
            assert(null != result[root_key] && result[root_key] instanceof $.Node)
         })

         it("collects the root node, if it's not rejected", function(){
            const root = $.new(), key = $.key(root)
            var walk = new Walker( $() )

            var result = walk(root, function(){ return undefined })
            assert(result[key] === root)
         })

         it("collects nodes returned by a callback (‘a supplyback’)", function(){
            const A = $.new(), B = $.new(), A_key = $.key(A), B_key = $.key(B)
            const supplyback = ()=>B
            var walk = new Walker( $() )

            var result = walk(A, supplyback)
            assert(result[A_key] === A)
            assert(result[B_key] === B)
         })

         it("returns the collected nodes", function(){
            const root = $.new(),         A = $.new(),      B = $.new()
                , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B)

            const first = ()=> A
                , second = ()=> B

            var walk = new Walker( $() )
            var rv = walk(root, first, second)

            assert.ok(rv)
            assert(Object.keys(rv).length === 3)
            assert(rv[root_key] === root)
            assert(rv[A_key] === A)
            assert(rv[B_key] === B)
         })

         it("does not return rejected nodes", function(){
            const root = $.new(),         A = $.new(),      B = $.new()
                , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B)

            const supplier = node => [A, B]
                , filter = node => { if (node === A) return false }

            var walk = new Walker( $() )
            var rv = walk(root, supplier, filter)

            assert(rv[root_key] === root)
            assert(rv[B_key] === B)

            assert(!(A_key in rv))
         })

         it("is capable of returning an empty set if all nodes are rejected", function(){
            const root = $.new(), root_key = $.key(root)

            const filter = ()=>{ return false }

            var walk = new Walker( $() )
            var rv = walk(root, filter)

            assert(Object.keys(rv).length === 0)
         })

         if ($.testing_edge)
         it ("returns collected nodes themselves, even when callbacks supply edges", function(){
            const root = $.new(),         A = $.new(),      B = $.new()
                , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B)
                , root_to_A = $.edge_to(A), A_to_B = $.edge_to(B)

            const cb = node => {
               if (node === root) return root_to_A
               if (node === A)    return A_to_B
            }

            var walk = new Walker( $() )
            var rv = walk(root, cb)

            assert.ok(rv)
            assert(Object.keys(rv).length === 3)
            assert(rv[root_key] === root)
            assert(rv[A_key] === A)
            assert(rv[B_key] === B)
         })


         it("can be short-circuited by returning the abortIteration sentinel", function(){
            const root = $.new(),         A = $.new(),      B = $.new()
                , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B)

            const supplier = node => [A, B]
                , aborter = node => { if (node === A) return Walker.abortIteration }

            var walk = new Walker( $() )
            var rv = walk(root, supplier, aborter)

            assert(rv === false)
         })

         it("will re-discover a previously-rejected node via a different path",
         function(){
            const root = $.new(), root_key = $.key(root)
                , foo  = $.new()       , bar = $.new()
                , foo_key  = $.key(foo), bar_key = $.key(bar)

            const first = node => { if (node === root) return [foo, bar] }
                , second = node => { if (node === bar) return foo }
                , filter = (node, parent) => {
                     if (parent === root && node === foo) return false }

            const spy = sinon.spy()

            var walk = new Walker( $() )
            var rv = walk(root, first, second, filter, spy)

            assert(spy.neverCalledWith(foo, root))
            assert(spy.calledWith(foo, bar))
         })

         it("does not throw when partially-applied", function(){
            var walk = new Walker( $() )

            assert.doesNotThrow(()=> walk(function(){}) )
         })

         it("can be invoked without an additional immediate callback once partially-applied",
            function(){
               const root = $.new(); $.key(root)
               var walk = new Walker( $() )

               walk = walk(function(){})

               assert.doesNotThrow(()=> walk(root) )
         })

         it("can be partially-applied with callbacks", function(){
            const root = $.new(); $.key(root)
            const spy = sinon.spy()
            var walk = new Walker( $() )

            walk = walk(spy)
            assert(!spy.called)
            assert(typeof walk === 'function')

            walk(root)
            assert(spy.called)
         })

         it("partially-applies only to *further copies* of itself", function(){
            const root = $.new(); $.key(root)
            const spy = sinon.spy()
                , original_walk = new Walker( $() )

            const new_walk = original_walk(spy)

            original_walk(root, function(){})
            assert(!spy.called)

            new_walk(root)
            assert(spy.called)
         })

         it("applies partially-applied callbacks in the order they are provided", function(){
            const root = $.new(); $.key(root)
            const first  = sinon.spy(()=> assert(!second.called))
                , second = sinon.spy(()=> assert(!third.called))
                , third  = sinon.spy()
            var walk = new Walker( $() )

            walk = walk(first)
            assert(!first.called)
            assert(typeof walk === 'function')
            walk = walk(second)
            assert(!first.called)
            assert(!second.called)
            assert(typeof walk === 'function')

            walk(root, third)
            assert(first.called)
            assert(second.called)
            assert(third.called)
         })

         // TODO: Need an integration-level test of partial-application with the *actual
         //       supplyback/filterback functionality*.


         describe("~ callbacks", function(){ const they = it
            they("get called on the passed initial node", function(){
               const root = $.new(); $.key(root)
               const cb = sinon.spy()
               var walk = new Walker( $() )

               walk(root, cb)
               assert(cb.calledOnce)
            })

            they("are severally called", function(){
               const root = $.new(); $.key(root)
               const first = sinon.spy(), second = sinon.spy()
               var walk = new Walker( $() )

               walk(root, first, second)
               assert(first .calledOnce)
               assert(second.calledOnce)
            })

            they("are invoked with the current node as `this`", function(){
               const root = $.new(); $.key(root)
               const cb = sinon.spy()
               var walk = new Walker( $() )

               walk(root, cb)
               assert(cb.calledOn(root))
            })

            they("also receive the current node as the first argument", function(){
               const root = $.new(); $.key(root)
               const cb = sinon.spy()
               var walk = new Walker( $() )

               walk(root, cb)
               assert(cb.calledWith(root))
            })

            they("receive `null` instead of a ‘parent’ when processing the root node", function(){
               const root = $.new(); $.key(root)
               const cb = sinon.spy()
               var walk = new Walker( $() )

               walk(root, cb)
               assert(cb.calledWith(__, null))
            })

            they("receive the parent (discovered-through) node as the second argument", function(){
               const parent = $.new(); $.key(parent)
               const child  = $.new(); $.key(child)
               const supplier = ()=>child, spy = sinon.spy()
               var walk = new Walker( $() )

               walk(parent, supplier, spy)
               assert(spy.calledWith(__, parent))
            })

            they("receive callbacks passed to the walk() call as the final arugment", function(){
               const root = $.new(); $.key(root)

               const first = new Function()
                   , second = new Function()
                   , third = new Function()

               const spy = sinon.spy(function(node, _, allbacks){
                  assert(allbacks.indexOf(spy) === 0)
                  assert(allbacks.indexOf(first) === 1)
                  assert(allbacks.indexOf(second) === 2)
                  assert(allbacks.indexOf(third) === 3)
               })

               var walk = new Walker( $() )
               walk(root, spy, first, second, third)

               assert(spy.called)
            })

            they("may pass the current node by returning `true`", function(){
               const root = $.new(), root_key = $.key(root)

               const filter = ()=>{ return true }

               var walk = new Walker( $() )
               var rv = walk(root, filter)

               assert(rv[root_key] === root)
            })

            they("may pass the current node by returning nothing", function(){
               const root = $.new(), root_key = $.key(root)

               const filter = ()=>{}

               var walk = new Walker( $() )
               var rv = walk(root, filter)

               assert(rv[root_key] === root)
            })

            they("may reject the current node by explicitly returning `false`", function(){
               const root = $.new(), root_key = $.key(root)

               const filter = ()=>{ return false }

               var walk = new Walker( $() )
               var rv = walk(root, filter)

               assert(!(root_key in rv))
            })

            they("may collect an individual node by returning it directly", function(){
               const root = $.new(), root_key = $.key(root)
                   , other = $.new(), other_key = $.key(other)

               const supplier = ()=>{ return other }

               var walk = new Walker( $() )
               var rv = walk(root, supplier)

               assert(rv[other_key] === other)
            })

            they("may collect nodes by returning them in an Array", function(){
               const root = $.new(),         A = $.new(),      B = $.new(),      C = $.new()
                   , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B), C_key = $.key(C)

               const supplier = ()=>{ return [A, B, C] }

               var walk = new Walker( $() )
               var rv = walk(root, supplier)

               assert(rv[A_key] === A)
               assert(rv[B_key] === B)
               assert(rv[C_key] === C)
            })

            they("may collect nodes by returning them in an object-mapping", function(){
               const root = $.new(),         A = $.new(),      B = $.new(),      C = $.new()
                   , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B), C_key = $.key(C)

               const supplier = ()=>{ return {
                  [A_key]: A
                , [B_key]: B
                , [C_key]: C
               } }

               var walk = new Walker( $() )
               var rv = walk(root, supplier)

               assert(rv[A_key] === A)
               assert(rv[B_key] === B)
               assert(rv[C_key] === C)
            })

            they("are not invoked on a walk-step if a prior filter `rejects` the current node",
            function(){
               const root = $.new(), root_key = $.key(root)
                   , foo  = $.new()       , bar = $.new()
                   , foo_key  = $.key(foo), bar_key = $.key(bar)

               const supplier = node => [foo, bar]
                   , filter = node => { if (node === foo) return false }

               const spy = sinon.spy()

               var walk = new Walker( $() )
               walk(root, supplier, filter, spy)

               assert(spy.calledWith(bar))
               assert(spy.neverCalledWith(foo))
            })

            they("are not invoked at all after a walk is aborted", function(){
               const root = $.new(), root_key = $.key(root)
                   , foo  = $.new()       , bar = $.new()
                   , foo_key  = $.key(foo), bar_key = $.key(bar)

               const supplier = node => [foo, bar]
                   , aborter = node => { if (node === foo) return Walker.abortIteration }

               const spy = sinon.spy()

               var walk = new Walker( $() )
               walk(root, supplier, aborter, spy)

               assert(spy.calledWith(root))
               assert(spy.neverCalledWith(foo))
               assert(spy.neverCalledWith(bar))
            })

         }) // ~ callbacks

      }) // ~ a walk function
   }) // permuteTests

}) // giraphe



function generatePermutations(){
   // FIXME: This is pending a fix to [sinon#1002][1], which [looks like][2] it should land a little
   //        later this year. For the moment, I'm using a pre-release Sinon. Yikes.
   //
   //        [1]: <https://github.com/sinonjs/sinon/issues/1002#issuecomment-266903866>
   //        [2]: <https://github.com/sinonjs/sinon/issues/966#issuecomment-274249586>
 //const id = Symbol('id')
   const sym = '::this-is-an-id-i-guess-idk'
       , Node = class {},              Edge = class {}
       , isNode = (it => it.isNode), isEdge = (it => it.isEdge)
       , permutables = []

   // Matched pairs; the first element being keys to add to the constructed `options` argument, and
   // the second being methods / keys to add to the options-constructor as context (i.e. the first
   // sets `$().class`, the second sets `$.new()`.)
   //
   // The first option is the default, when ‘PERMUTATE’ isn't set.
   // Each option to iterate over has a `name` (printed during the evaluation of the tests), some
   // keys in `options` to add to the options-object passed to the `Walker()` constructor, and some
   // `helpers`-values to expose on `$` for examination or calling during tests.
   const klass = {
      name: 'class'
    , options: { class: Node }
    , helpers: {
         testing_class: true
       , Node: Node
       , new: function(){ return new Node }
      }
   }

   const predicate = {
      name: 'pred'
    , options: { predicate: it => it.isNode  }
    , helpers: {
         testing_predicate: true
       , isNode: isNode
       , new: function(){ return { isNode: true } }
      }
   }

   const key = {
      name: 'key'
    , options: { key: 'id' }
    , helpers: {
         testing_key: true
       , key: it => it['id'] = rand()
      }
   }

   const keyer = {
      name: 'keyer'
    , options: { keyer: it => it[sym] }
    , helpers: {
         testing_keyer: true
       , key: it => it[sym] = rand()
      }
   }

   // FIXME: Ugh, these aren't fully-permuted. w/e.
   const edgeless = { name: 'edgeless', options: {} }

   const edge_basic = {
      name: 'edge'
    , options: { edge: {class: Edge, extract_path: 'target'} }
    , helpers: {
         testing_edge: true
       , testing_edge_class: true
       , testing_edge_path: true
       , Edge: Edge
       , edge_to: node => {
            const it = new Edge()
            it.target = node
            return it
         }
      }
   }

   const edge_predicate = {
      name: 'edge-pred'
    , options: { edge: {predicate: (it => it.isEdge), extract_path: 'target'} }
    , helpers: {
         testing_edge: true
       , testing_edge_predicate: true
       , testing_edge_path: true
       , isEdge: isEdge
       , edge_to: node => ({ isEdge: true, target: node })
      }
   }

   const edge_extractor = {
      name: 'edge-extractor'
    , options: { edge: {class: Edge, extractor: it => it[target_sym] } }
    , helpers: {
         testing_edge: true
       , testing_edge_class: true
       , testing_edge_extractor: true
       , Edge: Edge
       , edge_to: node => {
            const it = new Edge()
            it[target_sym] = node
            return it
         }
      }
   }

   // NYI: Caching!
 //const cache = ...

   // FIXME: Hm. `key` (whether function or string) is obviously only meaningful for Object-map
   // interfaces; this will need to be tweaked not to permutate over other combinations.
 //, [[ { something_to_do_with_sets: true } ], [ { something_to_do_with_maps: false } ]]

   permutables.push([klass, predicate])
   permutables.push([key, keyer])
   permutables.push([edgeless, edge_basic, edge_predicate, edge_extractor])


   const PERMUTATE = process.env['PERMUTATE'] && process.env['PERMUTATE'] !== 'no'
   if   (PERMUTATE) {
      debug("Generating full set of permutations")

      // If the `PERMUTATE=yes` ENV variable is set at test-time, then we run *every* combination of
      // settings for most / all tests. This function recursively generates a set of possible
      // permutations. It's not cached or anything, so it's slow as fuck; but it's a one-time setup
      // cost, so meh.
      function permutate(permutables){
         const results        = new Array
             , rest           = permutables.slice()
             , possibilities  = rest.shift()

         debug('Generating permutations for `permutables[-'+permutables.length+']`')

         for (const possibility of possibilities) {
            if (0 === rest.length) {
               const    permutation = { labels: [], options: {}, helpers: {} }
               _.assign(permutation.options, possibility.options)
               _.assign(permutation.helpers, possibility.helpers)
               permutation.labels.push(possibility.name)

               results.push(permutation) }

            else for (const sub of permutate(rest)) {
               const    permutation = { labels: [], options: {}, helpers: {} }
               _.assign(permutation.options, possibility.options, sub.options)
               _.assign(permutation.helpers, possibility.helpers, sub.helpers)
               permutation.labels.push(possibility.name, ...sub.labels)

               results.push(permutation) }
         }

         return results }

      return permutate(permutables) }

   else {
      debug("Generating limited set of options-combinations, instead of full permutations")

      // If the `PERMUTATE=yes` ENV variable is *not* set, we're only going to try the *default*
      // settings with each individual setting-under-test (i.e. we'll test the optional `predicate:`
      // configuration-option, but only with the defaults of `cache: false` and `key: id`.) This
      // will result in a linear, instead of exponential, number of tests to evaluate. :P
      function combine(permutables){
         const results = new Array

         let defaults_seen;
         for (let i = 0; i < permutables.length; i++) {
            const possibilities = permutables[i].slice()

            if (defaults_seen) possibilities.shift()
            defaults_seen = true

            debug('Generating combinations for `permutables['+i+'] ('+possibilities.length+'x)`')

            for (const possibility of possibilities) {
               const permutation  = { labels: [], options: {}, helpers: {} }

               for (let k = 0; k < permutables.length; k++) {
                  if (k === i) {
                     _.assign(permutation.options, possibility.options)
                     _.assign(permutation.helpers, possibility.helpers)
                     permutation.labels.push(possibility.name)
                  } else {
                     const normal_case = permutables[k][0]

                     _.assign(permutation.options, normal_case.options)
                     _.assign(permutation.helpers, normal_case.helpers)
                     permutation.labels.push(normal_case.name)
                  }
               }

               results.push(permutation) }
         }

         return results }

      return combine(permutables) }
}

function permuteTests(body){
   debug('Permutating '+permutations.length+' test-permutations')

   for (const p of permutations) {
      const $ = function(given_arg){
         if (typeof given_arg == 'string') {
            const name = _.compact(p.labels).join('/')
            return `${given_arg} (${name})` }

         let options
         if (null != given_arg)
             options = given_arg
         else
             options = new Object

         _.assign(options, p.options)
         return options }

      _.assign($, p.helpers)
      body.call(null, $)
   }

}

function rand(){
   return _.random(0, Number.MAX_SAFE_INTEGER).toString()
}
