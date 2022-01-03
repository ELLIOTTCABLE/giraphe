import Debug from "debug"
const debug = Debug("giraphe:tests")

// FIXME: Restore Babel / power-assert
import assert from "power-assert"
import sinon, { match } from "sinon"
const __ = match.any

import * as Giraphe from "../src/giraphe.ts"

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
describe.skip("The Walker() constructor", () => {
   it("exists", () => {
      assert.ok(Walker)
      assert(typeof Walker === "function")
   })

   it("accepts a node-class", () => {
      class Node {}
      assert.doesNotThrow(() => {
         new Walker(Node, "id")
      })
   })

   it("accepts an options-object", () => {
      class Node {}
      assert.doesNotThrow(() => {
         new Walker({ class: Node, key: "id" })
      })
   })

   it("takes a predicate as an alternative to a node-class", () => {
      assert.doesNotThrow(() => {
         new Walker({ predicate: new Function(), key: "id" })
      })
   })

   it("accepts a keyer-function", () => {
      class Node {}
      assert.doesNotThrow(() => {
         new Walker({ class: Node, keyer: () => {} })
      })
   })

   it("does not currently support unkeyed iteration", () => {
      class Node {}
      assert.throws(() => {
         new Walker({ class: Node })
      })
   })

   it("throws if given neither a predicate nor a node-class", () => {
      assert.throws(() => {
         new Walker({ key: "blah" })
      })
      assert.throws(() => {
         new Walker()
      })
   })

   it("accepts a description of edge-structure", () => {
      class Node {}
      class Edge {}
      assert.doesNotThrow(() => {
         new Walker({
            class: Node,
            key: "id",
            edge: { class: Edge, extract_path: "target" },
         })
      })
      assert.doesNotThrow(() => {
         new Walker({
            class: Node,
            key: "id",
            edge: { predicate: () => {}, extract_path: "target" },
         })
      })
      assert.doesNotThrow(() => {
         new Walker({
            class: Node,
            key: "id",
            edge: { class: Edge, extractor: () => {} },
         })
      })
   })

   it("throws if edge-structure is missing a component", () => {
      class Node {}
      class Edge {}
      assert.throws(() => {
         new Walker({ class: Node, key: "id", edge: { class: Edge } })
      })
      assert.throws(() => {
         new Walker({ class: Node, key: "id", edge: { predicate: () => {} } })
      })
      assert.throws(() => {
         new Walker({ class: Node, key: "id", edge: { extract_path: "target" } })
      })
      assert.throws(() => {
         new Walker({ class: Node, key: "id", edge: { extractor: () => {} } })
      })
   })
}) // The Walker() constructor

permuteTests(function ($) {
   debug($("Adding permuted tests"))

   describe($("A walk() function"), () => {
      it("instantiates", () => {
         var walk = new $.Walker($())
         assert(typeof walk === "function")
      })

      it("fails if given no callbacks", () => {
         const root = $.new()
         $.key(root)
         var walk = new $.Walker($())

         assert.throws(() => walk(root))
      })

      //if (!$.testing_map)
      it("returns an object representing a mapping", () => {
         const root = $.new()
         $.key(root)
         var walk = new $.Walker($())

         var result = walk(root, new Function())
         assert.ok(result)
         assert(result instanceof Map)
      })

      if ($.testing_class)
         it("returns a mapping of keys to the given class", () => {
            const root = $.new(),
               root_key = $.key(root)
            var walk = new $.Walker($())

            var result = walk(root, new Function())
            assert.ok(result)
            assert(result instanceof Map)
            assert.ok(result.get(root_key))
            assert(result.get(root_key) instanceof $.Node)
         })

      it("collects the root node, if it's not rejected", () => {
         const root = $.new(),
            key = $.key(root)
         var walk = new $.Walker($())

         var result = walk(root, () => undefined)
         assert(result.get(key) === root)
      })

      it("collects nodes returned by a callback (‘a supplyback’)", () => {
         const A = $.new(),
            B = $.new(),
            A_key = $.key(A),
            B_key = $.key(B)
         const supplyback = () => B
         var walk = new $.Walker($())

         var result = walk(A, supplyback)
         assert(result.get(A_key) === A)
         assert(result.get(B_key) === B)
      })

      it("returns the collected nodes", () => {
         const root = $.new(),
            A = $.new(),
            B = $.new(),
            root_key = $.key(root),
            A_key = $.key(A),
            B_key = $.key(B)

         const first = () => A,
            second = () => B

         var walk = new $.Walker($())
         var rv = walk(root, first, second)

         assert.ok(rv)
         assert(rv.size === 3)
         assert(rv.get(root_key) === root)
         assert(rv.get(A_key) === A)
         assert(rv.get(B_key) === B)
      })

      it("does not return rejected nodes", () => {
         const root = $.new(),
            A = $.new(),
            B = $.new(),
            root_key = $.key(root),
            A_key = $.key(A),
            B_key = $.key(B)

         const supplier = () => [A, B],
            filter = function () {
               if (this === A) return false
            }

         var walk = new $.Walker($())
         var rv = walk(root, supplier, filter)

         assert(rv.size === 2)
         assert(rv.get(root_key) === root)
         assert(rv.get(B_key) === B)

         assert(!(A_key in rv))
      })

      it("is capable of returning an empty set if all nodes are rejected", () => {
         const root = $.new(),
            root_key = $.key(root)

         const filter = () => false

         var walk = new $.Walker($())
         var rv = walk(root, filter)

         assert(rv.size === 0)
      })

      if ($.testing_edge)
         it("returns collected nodes themselves, even when callbacks supply edges", () => {
            const root = $.new(),
               A = $.new(),
               B = $.new(),
               root_key = $.key(root),
               A_key = $.key(A),
               B_key = $.key(B),
               root_to_A = $.edge_to(A),
               A_to_B = $.edge_to(B)

            const cb = function () {
               if (this === root) return root_to_A
               if (this === A) return A_to_B
            }

            var walk = new $.Walker($())
            var rv = walk(root, cb)

            assert.ok(rv)
            assert(rv.size === 3)
            assert(rv.get(root_key) === root)
            assert(rv.get(A_key) === A)
            assert(rv.get(B_key) === B)
         })

      it("can be short-circuited by returning the abortIteration sentinel", () => {
         const root = $.new(),
            A = $.new(),
            B = $.new(),
            root_key = $.key(root),
            A_key = $.key(A),
            B_key = $.key(B)

         const supplier = () => [A, B],
            aborter = function () {
               if (this === A) return Giraphe.abortIteration
            }

         var walk = new $.Walker($())
         var rv = walk(root, supplier, aborter)

         assert(rv === false)
      })

      it("will re-visit a previously-rejected node via a different path", () => {
         const root = $.new(),
            foo = $.new(),
            bar = $.new(),
            foo_key = $.key(foo)

         $.key(root), $.key(bar)

         const first = function () {
               if (this === root) return [foo, bar]
            },
            second = function () {
               if (this === bar) return foo
            },
            filter = function (_current, parent) {
               if (parent === root && this === foo) return false
            }

         const spy = sinon.spy()

         var walk = new $.Walker($())
         var rv = walk(root, first, second, filter, spy)

         // TODO:This can probably be done better with Sinon's matchers, etc ... somehow.
         let calledOnFooViaRoot, calledOnFooViaBar
         for (let call of spy.getCalls()) {
            if (call.calledOn(foo)) {
               if (call.calledWith(__, root)) calledOnFooViaRoot = true
               if (call.calledWith(__, bar)) calledOnFooViaBar = true
            }
         }
         assert(!calledOnFooViaRoot)
         assert(calledOnFooViaBar)

         assert(rv.get(foo_key) === foo)
      })

      if ($.testing_edge)
         it("will re-visit a previously-rejected node via a different edge", () => {
            const root = $.new(),
               root_key = $.key(root),
               foo = $.new(),
               bar = $.new(),
               foo_key = $.key(foo),
               bar_key = $.key(bar),
               root_to_foo = $.edge_to(foo),
               root_to_bar = $.edge_to(bar),
               bar_to_foo = $.edge_to(foo)

            const first = function () {
                  if (this === root) return [root_to_foo, root_to_bar]
               },
               second = function () {
                  if (this === bar) return bar_to_foo
               },
               filter = function (edge) {
                  if (edge === root_to_foo) return false
               }

            const spy = sinon.spy()

            var walk = new $.Walker($())
            var rv = walk(root, first, second, filter, spy)

            assert(spy.neverCalledWith(sinon.match.same(root_to_foo)))
            assert(spy.calledOn(foo))
            assert(spy.calledWith(bar_to_foo))

            assert(rv.get(foo_key) === foo)
         })

      it.skip("does not throw when partially-applied", () => {
         var walk = new $.Walker($())

         assert.doesNotThrow(() => walk(() => {}))
      })

      it.skip("can be invoked without an additional immediate callback once partially-applied", () => {
         const root = $.new()
         $.key(root)
         var walk = new $.Walker($())

         walk = walk(() => {})

         assert.doesNotThrow(() => walk(root))
         assert.doesNotThrow(() => walk.call(root))
      })

      it.skip("can be partially-applied with callbacks", () => {
         const root = $.new()
         $.key(root)
         const spy = sinon.spy()
         var walk = new $.Walker($())

         walk = walk(spy)
         assert(!spy.called)
         assert(typeof walk === "function")

         walk(root)
         assert(spy.called)
      })

      it.skip("partially-applies only to *further copies* of itself", () => {
         const root = $.new()
         $.key(root)
         const spy = sinon.spy(),
            original_walk = new $.Walker($())

         const new_walk = original_walk(spy)

         original_walk(root, () => {})
         assert(!spy.called)

         new_walk(root)
         assert(spy.called)
      })

      it.skip("applies partially-applied callbacks in the order they are provided", () => {
         const root = $.new()
         $.key(root)
         const first = sinon.spy(() => assert(!second.called)),
            second = sinon.spy(() => assert(!third.called)),
            third = sinon.spy()
         var walk = new $.Walker($())

         walk = walk(first)
         assert(!first.called)
         assert(typeof walk === "function")
         walk = walk(second)
         assert(!first.called)
         assert(!second.called)
         assert(typeof walk === "function")

         walk(root, third)
         assert(first.called)
         assert(second.called)
         assert(third.called)
      })

      // TODO: Need an integration-level test of partial-application with the *actual
      //       supplyback/filterback functionality*.

      describe("~ callbacks", () => {
         const they = it

         they("get called on the passed initial node", () => {
            const root = $.new()
            $.key(root)
            const cb = sinon.spy()
            var walk = new $.Walker($())

            walk(root, cb)
            assert(cb.calledOnce)
         })

         they("are severally called", () => {
            const root = $.new()
            $.key(root)
            const first = sinon.spy(),
               second = sinon.spy()
            var walk = new $.Walker($())

            walk(root, first, second)
            assert(first.calledOnce)
            assert(second.calledOnce)
         })

         they("are invoked with the current node as `this`", () => {
            const root = $.new()
            $.key(root)
            const cb = sinon.spy()
            var walk = new $.Walker($())

            walk(root, cb)
            assert(cb.calledOn(root))
         })

         if ($.testing_edge)
            they("receive undefined if there is no edge for the first argument", () => {
               const root = $.new()
               $.key(root)
               const cb = sinon.spy()
               var walk = new $.Walker($())

               walk(root, cb)
               assert(cb.calledWith(undefined))
            })

         if ($.testing_edge)
            they("receive the current edge as the first argument", () => {
               const root = $.new(),
                  foo = $.new(),
                  root_to_foo = $.edge_to(foo)

               $.key(root), $.key(foo)

               const supplier = function () {
                  if (this === root) return root_to_foo
               }

               const spy = sinon.spy()

               var walk = new $.Walker($())
               walk(root, supplier, spy)

               assert(spy.calledWith(root_to_foo))
            })
         else
            they("receive the current node as the first argument", () => {
               const root = $.new()
               $.key(root)
               const cb = sinon.spy()
               var walk = new $.Walker($())

               walk(root, cb)
               assert(cb.calledWith(root))
            })

         they(
            "receive `undefined` instead of a ‘parent’ when processing the root node",
            () => {
               const root = $.new()
               $.key(root)
               const cb = sinon.spy()
               var walk = new $.Walker($())

               walk(root, cb)
               assert(cb.calledWith(__, undefined))
            },
         )

         they(
            "receive the parent (discovered-through) node as the second argument",
            () => {
               const parent = $.new()
               $.key(parent)
               const child = $.new()
               $.key(child)
               const supplier = () => child,
                  spy = sinon.spy()
               var walk = new $.Walker($())

               walk(parent, supplier, spy)
               assert(spy.calledWith(__, parent))
            },
         )

         they("receive callbacks passed to the walk() call as the final arugment", () => {
            const root = $.new()
            $.key(root)

            const first = new Function(),
               second = new Function(),
               third = new Function()

            const spy = sinon.spy(function (_node_or_edge, _, allbacks) {
               assert(allbacks.indexOf(spy) === 0)
               assert(allbacks.indexOf(first) === 1)
               assert(allbacks.indexOf(second) === 2)
               assert(allbacks.indexOf(third) === 3)
            })

            var walk = new $.Walker($())
            walk(root, spy, first, second, third)

            assert(spy.called)
         })

         they("may pass the current node by returning `true`", () => {
            const root = $.new(),
               root_key = $.key(root)

            const filter = () => true

            var walk = new $.Walker($())
            var rv = walk(root, filter)

            assert(rv.get(root_key) === root)
         })

         they("may pass the current node by returning nothing", () => {
            const root = $.new(),
               root_key = $.key(root)

            const filter = () => undefined

            var walk = new $.Walker($())
            var rv = walk(root, filter)

            assert(rv.get(root_key) === root)
         })

         they("may reject the current node by explicitly returning `false`", () => {
            const root = $.new(),
               root_key = $.key(root)

            const filter = () => false

            var walk = new $.Walker($())
            var rv = walk(root, filter)

            assert(!(root_key in rv))
         })

         they("may collect an individual node by returning it directly", () => {
            const root = $.new(),
               root_key = $.key(root),
               other = $.new(),
               other_key = $.key(other)

            const supplier = () => other

            var walk = new $.Walker($())
            var rv = walk(root, supplier)

            assert(rv.get(other_key) === other)
         })

         if ($.testing_edge)
            they(
               "may collect an individual node by returning an edge pointing to it",
               () => {
                  const root = $.new(),
                     other = $.new(),
                     root_key = $.key(root),
                     other_key = $.key(other),
                     root_to_other = $.edge_to(other)

                  const supplier = () => root_to_other

                  var walk = new $.Walker($())
                  var rv = walk(root, supplier)

                  assert(rv.get(other_key) === other)
               },
            )

         they("may collect nodes by returning them in an Array", () => {
            const root = $.new(),
               A = $.new(),
               B = $.new(),
               C = $.new(),
               root_key = $.key(root),
               A_key = $.key(A),
               B_key = $.key(B),
               C_key = $.key(C)

            const supplier = () => [A, B, C]

            var walk = new $.Walker($())
            var rv = walk(root, supplier)

            assert(rv.get(A_key) === A)
            assert(rv.get(B_key) === B)
            assert(rv.get(C_key) === C)
         })

         they("may include empty values in the returned node-Array", () => {
            const root = $.new(),
               A = $.new(),
               B = $.new(),
               root_key = $.key(root),
               A_key = $.key(A),
               B_key = $.key(B)

            const supplier = () => {
               const arr = new Array()
               arr[0] = A
               arr[5] = B
               return arr
            }

            var walk = new $.Walker($())
            var rv = walk(root, supplier)

            assert(rv.size === 3)
            assert(rv.get(A_key) === A)
            assert(rv.get(B_key) === B)
         })

         if ($.testing_edge)
            they("may collect nodes by returning edges to them in an Array", () => {
               const root = $.new(),
                  A = $.new(),
                  B = $.new(),
                  root_key = $.key(root),
                  A_key = $.key(A),
                  B_key = $.key(B),
                  root_to_A = $.edge_to(A),
                  root_to_B = $.edge_to(B)

               const supplier = () => {
                  const arr = new Array()
                  arr[0] = root_to_A
                  arr[5] = root_to_B
                  return arr
               }

               var walk = new $.Walker($())
               var rv = walk(root, supplier)

               assert(rv.get(A_key) === A)
               assert(rv.get(B_key) === B)
            })

         if ($.testing_edge)
            they("may collect nodes by returning edges to them in an Array", () => {
               const root = $.new(),
                  A = $.new(),
                  B = $.new(),
                  root_key = $.key(root),
                  A_key = $.key(A),
                  B_key = $.key(B),
                  root_to_A = $.edge_to(A),
                  root_to_B = $.edge_to(B)

               const supplier = () => [root_to_A, root_to_B]

               var walk = new $.Walker($())
               var rv = walk(root, supplier)

               assert(rv.get(A_key) === A)
               assert(rv.get(B_key) === B)
            })

         they("may collect nodes by returning them in an object-mapping", () => {
            const root = $.new(),
               A = $.new(),
               B = $.new(),
               C = $.new(),
               root_key = $.key(root),
               A_key = $.key(A),
               B_key = $.key(B),
               C_key = $.key(C),
               map = new Map()

            map.set(A_key, A)
            map.set(B_key, B)
            map.set(C_key, C)

            const supplier = () => map

            var walk = new $.Walker($())
            var rv = walk(root, supplier)

            assert(rv.get(A_key) === A)
            assert(rv.get(B_key) === B)
            assert(rv.get(C_key) === C)
         })

         they(
            "are not invoked on a walk-step if a prior filter `rejects` the current node",
            () => {
               const root = $.new(),
                  foo = $.new(),
                  bar = $.new()

               $.key(root), $.key(foo), $.key(bar)

               const supplier = () => [foo, bar],
                  filter = function () {
                     if (this === foo) return false
                  }

               const spy = sinon.spy()

               var walk = new $.Walker($())
               walk(root, supplier, filter, spy)

               assert(spy.calledOn(bar))
               assert(!spy.calledOn(foo))
            },
         )

         they("are not invoked at all after a walk is aborted", () => {
            const root = $.new(),
               foo = $.new(),
               bar = $.new()

            $.key(root), $.key(foo), $.key(bar)

            const supplier = () => [foo, bar],
               aborter = function () {
                  if (this === foo) return Giraphe.abortIteration
               }

            const spy = sinon.spy()

            var walk = new $.Walker($())
            walk(root, supplier, aborter, spy)

            assert(spy.calledOn(root))
            assert(spy.calledOn(foo) === false)
            assert(spy.calledOn(bar) === false)
         })
      }) // ~ callbacks
   }) // A walk() function
}) // permuteTests

function generatePermutations() {
   // FIXME: This is pending a fix to [sinon#1002][1], which [looks like][2] it should land a little
   //        later this year. For the moment, I'm using a pre-release Sinon. Yikes.
   //
   //        [1]: <https://github.com/sinonjs/sinon/issues/1002#issuecomment-266903866>
   //        [2]: <https://github.com/sinonjs/sinon/issues/966#issuecomment-274249586>
   //const id = Symbol('id')
   const sym = "::this-is-an-id-i-guess-idk",
      target_sym = "::you-can-find-the-target-here?-i-guess?",
      Node = class {},
      Edge = class {},
      isNode = (it) => it.isNode,
      isEdge = (it) => it.isEdge,
      permutables = []

   // Matched pairs; the first element being keys to add to the constructed `options` argument, and
   // the second being methods / keys to add to the options-constructor as context (i.e. the first
   // sets `$().class`, the second sets `$.new()`.)
   //
   // The first option is the default, when ‘PERMUTATE’ isn't set.
   // Each option to iterate over has a `name` (printed during the evaluation of the tests), some
   // keys in `options` to add to the options-object passed to the `Walker()` constructor, and some
   // `helpers`-values to expose on `$` for examination or calling during tests.
   const klass = {
      name: "Class",
      options: { class: Node },
      helpers: {
         testing_class: true,
         Node: Node,
         new: () => {
            return new Node()
         },
      },
   }

   const predicate = {
      name: "Predicate",
      options: { predicate: (it) => it.isNode },
      helpers: {
         testing_predicate: true,
         isNode: isNode,
         new: () => {
            return { isNode: true }
         },
      },
   }

   const key = {
      name: "Key",
      options: { key: "id" },
      helpers: {
         testing_key: true,
         key: (it) => (it["id"] = rand()),
      },
   }

   const keyer = {
      name: "Keyer",
      options: { keyer: (it) => it[sym] },
      helpers: {
         testing_keyer: true,
         key: (it) => (it[sym] = rand()),
      },
   }

   // FIXME: Ugh, these aren't fully-permuted. w/e.
   const edgeless = { name: "Edgeless", options: {} }

   const edge_basic = {
      name: "Edge",
      options: { edge: { class: Edge, extract_path: "target" } },
      helpers: {
         testing_edge: true,
         testing_edge_class: true,
         testing_edge_path: true,
         Edge: Edge,
         edge_to: (node) => {
            const it = new Edge()
            it.target = node
            return it
         },
      },
   }

   const edge_predicate = {
      name: "Edgeicate",
      options: { edge: { predicate: (it) => it.isEdge, extract_path: "target" } },
      helpers: {
         testing_edge: true,
         testing_edge_predicate: true,
         testing_edge_path: true,
         isEdge: isEdge,
         edge_to: (node) => ({ isEdge: true, target: node }),
      },
   }

   const edge_extractor = {
      name: "Edgetractor",
      options: { edge: { class: Edge, extractor: (it) => it[target_sym] } },
      helpers: {
         testing_edge: true,
         testing_edge_class: true,
         testing_edge_extractor: true,
         Edge: Edge,
         edge_to: (node) => {
            const it = new Edge()
            it[target_sym] = node
            return it
         },
      },
   }

   // NYI: Caching!
   //const cache = ...

   // FIXME: Hm. `key` (whether function or string) is obviously only meaningful for Object-map
   // interfaces; this will need to be tweaked not to permutate over other combinations.
   //, [[ { something_to_do_with_sets: true } ], [ { something_to_do_with_maps: false } ]]

   permutables.push([edgeless, edge_basic /* , edge_predicate, edge_extractor */])
   permutables.push([klass /* , predicate */])
   permutables.push([key /* , keyer */])

   const omit_names = ["Edge", "Class", "Key"]

   const PERMUTATE = process.env["PERMUTATE"] && process.env["PERMUTATE"] !== "no"
   if (PERMUTATE) {
      debug("Generating full set of permutations")

      // If the `PERMUTATE=yes` ENV variable is set at test-time, then we run *every* combination of
      // settings for most / all tests. This function recursively generates a set of possible
      // permutations. It's not cached or anything, so it's slow as fuck; but it's a one-time setup
      // cost, so meh.
      function permutate(permutables) {
         const results = new Array(),
            rest = permutables.slice(),
            possibilities = rest.shift()

         debug("Generating permutations for `permutables[-" + permutables.length + "]`")

         for (const possibility of possibilities) {
            if (0 === rest.length) {
               const permutation = { labels: [], options: {}, helpers: {} }
               Object.assign(permutation.options, possibility.options)
               Object.assign(permutation.helpers, possibility.helpers)
               permutation.labels.push(possibility.name)
               permutation.name =
                  permutation.labels.filter((n) => !omit_names.includes(n)).join("") +
                  "Walker"
               debug(`Generated (0 === rest.length): ${permutation.name}`)

               results.push(permutation)
            } else
               for (const sub of permutate(rest)) {
                  const permutation = { labels: [], options: {}, helpers: {} }
                  Object.assign(permutation.options, possibility.options, sub.options)
                  Object.assign(permutation.helpers, possibility.helpers, sub.helpers)
                  permutation.labels.push(possibility.name, ...sub.labels)
                  permutation.name =
                     permutation.labels.filter((n) => !omit_names.includes(n)).join("") +
                     "Walker"
                  debug(`Generated (0 !== rest.length): ${permutation.name}`)

                  results.push(permutation)
               }
         }

         return results
      }

      return permutate(permutables)
   } else {
      debug(
         "Generating limited set of options-combinations, instead of full permutations",
      )

      // If the `PERMUTATE=yes` ENV variable is *not* set, we're only going to try the *default*
      // settings with each individual setting-under-test (i.e. we'll test the optional `predicate:`
      // configuration-option, but only with the defaults of `cache: false` and `key: id`.) This
      // will result in a linear, instead of exponential, number of tests to evaluate. :P
      function combine(permutables) {
         const results = new Array()

         let defaults_seen
         for (let i = 0; i < permutables.length; i++) {
            const possibilities = permutables[i].slice()

            if (defaults_seen) possibilities.shift()
            defaults_seen = true

            debug(
               "Generating combinations for `permutables[" +
                  i +
                  "] (" +
                  possibilities.length +
                  "x)`",
            )

            for (const possibility of possibilities) {
               const permutation = { labels: [], options: {}, helpers: {} }

               for (let k = 0; k < permutables.length; k++) {
                  if (k === i) {
                     Object.assign(permutation.options, possibility.options)
                     Object.assign(permutation.helpers, possibility.helpers)
                     permutation.labels.push(possibility.name)
                     permutation.name =
                        permutation.labels
                           .filter((n) => !omit_names.includes(n))
                           .join("") + "Walker"
                     debug(`Generated (k === i): ${permutation.name}`)
                  } else {
                     const normal_case = permutables[k][0]

                     Object.assign(permutation.options, normal_case.options)
                     Object.assign(permutation.helpers, normal_case.helpers)
                     permutation.labels.push(normal_case.name)
                     permutation.name =
                        permutation.labels
                           .filter((n) => !omit_names.includes(n))
                           .join("") + "Walker"
                     debug(`Generated (k !== i): ${permutation.name}`)
                  }
               }

               results.push(permutation)
            }
         }

         return results
      }

      return combine(permutables)
   }
}

function permuteTests(body) {
   debug("Permutating " + permutations.length + " test-permutations")

   for (const p of permutations) {
      const $ = function (given_arg) {
         if (typeof given_arg == "string") {
            return `${given_arg} (${p.name})`
         }

         let options
         if (null != given_arg) options = given_arg
         else options = new Object()

         Object.assign(options, p.options)
         return options
      }

      Object.assign($, p.helpers)

      assert.ok(Giraphe[p.name + "Function"], `\`${p.name}Function\` should exist`)
      $.Walker = Giraphe[p.name + "Function"]

      body.call(null, $)
   }
}

function rand() {
   return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()
}
