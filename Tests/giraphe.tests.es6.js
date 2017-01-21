import Debug from 'debug'
import _     from 'lodash'
const  debug = Debug('giraphe:tests')

import assert from 'power-assert'
import sinon, { match } from 'sinon'
const __ = match.any

import { Walker } from '../giraphe.es6.js'


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


   }) // ~ The Walker constructor

   permuteTests(function($){
      debug($("Adding permuted tests"))

      describe($("~ a walk function"), function(){

         it("instantiates", function(){
            var walk = new Walker( $() )
            assert(typeof walk === 'function')
         })

       //if (!$.has_map)
         it("returns an object representing a mapping", function(){
            const root = $.new(); $.key(root)
            var walk = new Walker( $() )

            var result = walk(root, new Function)
            assert(null != result && typeof result === 'object')
         })

         if ($.has_class)
         it("returns a mapping of the given class", function(){
            const root = $.new(); $.key(root)
            var walk = new Walker( $() )

            var result = walk(root, new Function)
            assert(null != result && typeof result === 'object')
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

         it("can be partially-applied with callbacks", function(){
            const root = $.new(); $.key(root)
            const spy = sinon.spy()
            var walk = new Walker( $() )

            walk = walk(spy)
            assert(!spy.called)
            assert(typeof walk === 'function')

            walk(root, function(){})
            assert(spy.called)
         })

         it("partially-applies only to *further copies* of itself", function(){
            const root = $.new(); $.key(root)
            const spy = sinon.spy()
                , original_walk = new Walker( $() )

            const new_walk = original_walk(spy)

            original_walk(root, function(){})
            assert(!spy.called)

            new_walk(root, function(){})
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

            // FIXME: Clean this mess up (chanted to the tune of ‘Smack My Bitch Up’ — Prodigy)
            they("receive the peer-nodes discovered by prior callbacks on the same node", function(){
               const root = $.new(),         A = $.new(),      B = $.new()
                   , root_key = $.key(root), A_key = $.key(A), B_key = $.key(B)

               const first = ()=>A, second = ()=>B
                   , spy = sinon.spy(function(_, __, supplied){
                              assert(supplied[A_key] === A)
                              assert(supplied[B_key] === undefined)
                           })

               var walk = new Walker( $() )
               walk(root, first, spy, second)

               assert(spy.called)
            })

            they("do *not* include nodes supplied by previous walk-steps", function(){
               const root = $.new(), root_key = $.key(root)
                   , foo  = $.new(), foo_key  = $.key(foo)

                   , bar = $.new(),        baz = $.new()
                   , bar_key = $.key(bar), baz_key = $.key(baz)

               const supplier = sinon.stub()
                     supplier.withArgs(root).returns(foo)
                     supplier.withArgs(foo).returns([bar, baz])

               const spy = sinon.spy(function(node, _, supplied){
                     if (node === foo) {
                        assert(supplied[bar_key] === bar)
                        assert(supplied[baz_key] === baz)
                        assert(supplied[root_key] === undefined)
                     }
                  })

               var walk = new Walker( $() )
               walk(root, supplier, spy)

               assert(spy.calledWith(root))
               assert(spy.calledWith(foo))
               assert(spy.calledWith(bar))
               assert(spy.calledWith(baz))
            })

            they("receive a set of all nodes seen thus far", function(){
               const root = $.new(), root_key = $.key(root)
                   , foo  = $.new()       , bar = $.new(),        baz = $.new()
                   , foo_key  = $.key(foo), bar_key = $.key(bar), baz_key = $.key(baz)

               const supplier = sinon.stub()
                     supplier.withArgs(root).returns(foo)
                     supplier.withArgs(foo).returns(bar)
                     supplier.withArgs(bar).returns(baz)

               const spy = sinon.spy(function(node, _, __, seen){
                     if (node === bar) {
                        assert(seen[root_key] && seen[root_key].node === root)
                        assert(seen[foo_key]  && seen[foo_key] .node === foo)
                        assert(seen[bar_key]  && seen[bar_key] .node === bar)
                        assert(seen[baz_key] === undefined)
                     }
                  })

               var walk = new Walker( $() )
               walk(root, supplier, spy)

               assert(spy.calledWith(bar))
            })

            they("see rejected nodes in the `seen` argument", function(){
               const root = $.new(), root_key = $.key(root)
                   , foo  = $.new()       , bar = $.new()
                   , foo_key  = $.key(foo), bar_key = $.key(bar)

               const supplier = sinon.stub()
                     supplier.withArgs(root).returns([foo, bar])

               const filter = sinon.stub()
                     filter.returns(true)
                     filter.withArgs(foo).returns(false)

               const spy = sinon.spy(function(node, _, __, seen){
                     if (node === bar) {
                        assert(seen[root_key] && seen[root_key].node === root)
                        assert(seen[foo_key]  && seen[foo_key] .node === foo)
                        assert(seen[bar_key]  && seen[bar_key] .node === bar)
                     }
                  })

               var walk = new Walker( $() )
               walk(root, supplier, filter, spy)

               assert(spy.neverCalledWith(foo))
               assert(spy.calledWith(bar))
            })

            they("receive callbacks passed to the walk() call as the final arugment", function(){
               const root = $.new(); $.key(root)

               const first = new Function()
                   , second = new Function()
                   , third = new Function()

               const spy = sinon.spy(function(node, _, __, ___, allbacks){
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
   // FIXME: This is pending a fix to sinon#1002:
   //        <https://github.com/sinonjs/sinon/issues/1002#issuecomment-266903866>
   //const id = Symbol('id')
   const id = '--this-is-an-id-i-guess-idk'
       , Node = class {}
   const permutables = [
      // Matched pairs; the first element being keys to add to the constructed `options` argument,
      // and the second being methods / keys to add to the options-constructor as context (i.e. the
      // first sets `$().class`, the second sets `$.new()`.)
      //
      // The first option is the default, when ‘PERMUTATE’ isn't set.
      [  {  desc: 'class', opts: { class: Node }
         ,  helpers: {  has_class: true
                     ,  new: function(){ return new Node }                                      }}
      ,  {  desc: 'pred',  opts: { predicate: (it)=> it.isNode  }
         ,  helpers: {  has_predicate: true
                     ,  new: function(){ return { isNode: true } }                              }}]

    , [  {  desc: 'key',   opts: { key: 'id' }
         ,  helpers: {  has_key: true
                     ,  key: it => it['id'] = rand()                                            }}
      ,  {  desc: 'keyer', opts: { keyer: it => it[id] }
         ,  helpers: {  has_keyer: true,
                        key: it => it[id] = rand()                                              }}]

    , [  { desc: null,    opts: {} }
      ,  { desc: 'cache', opts: {cache: true} }                                                 ]
   ]

   // FIXME: Hm. `key` (whether function or string) is obviously only meaningful for Object-map
   // interfaces; this will need to be tweaked not to permutate over other combinations.
   //, [[ { something_to_do_with_sets: true } ], [ { something_to_do_with_maps: false } ]]

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
               _.assign(permutation.options, possibility.opts)
               _.assign(permutation.helpers, possibility.helpers)
               permutation.labels.push(possibility.desc)

               results.push(permutation) }

            else for (const sub of permutate(rest)) {
               const    permutation = { labels: [], options: {}, helpers: {} }
               _.assign(permutation.options, possibility.opts,    sub.options)
               _.assign(permutation.helpers, possibility.helpers, sub.helpers)
               permutation.labels.push(possibility.desc, ...sub.labels)

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
            const possibilities = permutables[i]

            if (defaults_seen) possibilities.shift()
            defaults_seen = true

            debug('Generating combinations for `permutables['+i+'] ('+possibilities.length+'x)`')

            for (const possibility of possibilities) {
               const permutation  = { labels: [], options: {}, helpers: {} }

               for (let k = 0; k < permutables.length; k++) {
                  if (k == i) continue;
                  const normal_case = permutables[k][0]

                  _.assign(permutation.options, normal_case.opts)
                  _.assign(permutation.helpers, normal_case.helpers) }

               _.assign(permutation.options, possibility.opts)
               _.assign(permutation.helpers, possibility.helpers)

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
