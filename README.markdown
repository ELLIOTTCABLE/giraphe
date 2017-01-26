Giraphe
=======
This is an API stub for a generic graph-climbing library in JavaScript, extracted from (and
developed for) [Paws.js][]. It's intended to present the the same API for different use-cases, while
simultaneously optimizing for each use-case individually. (It does not currently do this.)

The primary purpose of Giraphe's `walk()` function is, given an arbitrary graph structure expressed
in JavaScript objects, to allow you to *explore* that graph in a static fashion — given a set of
callbacks, to walk through the graph, both 1. ‘discovering’ new subgraphs that need to be recursed
into, and 2. ‘collecting’ nodes according to some critereon.


Interface
---------

### The `Walker()` constructor

The default export, this must be called with an `options` argument, and it returns a `walk()`
function as described by those options.

```es6
import Walker from 'giraphe'
const walk = new Walker({ options... })
```

The passed `options`-object describes the structure of your graph to Giraphe. It must describe the
classes or objects participating in your graph, as follows:

1. It must include *exactly one* of the `keyer:` or `key:` properties:

    - **`key`** — the most basic mode of operation, this expresses that nodes beloning to your
      graph have unique `String`-ish identifiers, stored on the node-`Object` at the property with
      the given name.

      ```es6
      const walk = new Walker({ key: 'id', ... })
          , root = { id: 'foobar' }

      walk(root, ...)
      ```

    - **`keyer`** — for more flexibility, you may instead provide a function to generate a unique
      key for a given node. The function you provide as the `keyer` will be invoked with the object
      to be uniquely identified, and must return a `String` unique to that Object.

      ```es6
      const identify = node => /* generate key! */
          , walk = new Walker({ keyer: identify, ... })
          , root = new MyNodeType

      walk(root, ...)
      ```

2. It must include *exactly one* of the `class:` or `predicate:` properties:

    - **`class`** — again, this causes the simplest mode of operation; when passed a JavaScript
      `Function` (i.e. a “class”), this will cause the walking-function to use a simple `instanceof`
      check to determine whether a touched JavaScript object is a node in your graph or not.

      ```es6
      const walk = new Walker({ key: ..., class: MyNodeType })
          , root = new MyNodeType

      walk(root, ...)
      ```

    - **`predicate`** — when functioning across JavaScript contexts, or otherwise operating on a
      graph of noes of non-homogenous JavaScript type, you may instead provide a `predicate`
      function which will indicate to Giraphe whether a given JavaScript `Object` is a node in your
      graph or not.

      ```es6
      const isNode = node => /* verify nodey-ness! */
          , walk = new Walker({ key: ..., predicate: isNode })
          , root = new MyNodeType

      walk(root, ...)
      ```
3. If your graph includes annotated edges (that is, seperate objects ‘wrapping’ the nodes, when
   belonging to data-structures existing on other nodes), the `options` may also include an `edge:`
   property, itself with, again, either a `class:` or `predicate:` sub-property, *and* either a
   `extract_key:` or `extractor:` property:

    - **`edge.class`** — as with the root `class` option above, this should contain the javascript
      constructor for a ‘class’ used as edges. as with the node-`class` type, this will cause
      giraphe to test the return-type against the `edge.class` with `instanceof`.

      ```es6
      const walk = new Walker({
         key: ...,
         class: ...,
         edge: { class: MyEdgeType, ... }
      })
      const root = new MyNodeType

      walk(root, ...)
      ```

    - **`edge.predicate`** — again identical to the corresponding option to the root `predicate`
      option, above, this should contain a `Function` to be used as an alternative to the simple
      `instanceof` test that `edge.class` would produce.

      ```es6
      const walk = new Walker({
         key: ...,
         class: ...,
         edge: { predicate: isEdge, ... }
      })
          , root = new MyNodeType

      walk(root, ...)
      ```

    - **`edge.extract_path`** — if expressing edge-typing to Giraphe, then you may specify to Giraphe
      how to extract the node-object wrapped by a given edge-object, by indicating at which key on
      the edge-object the actual child-node is stored.

      ```es6
      const walk = new Walker({
         key: ...,
         class: ...,
         edge: { class: ..., extract_path: 'target' }
      })
          , root = new MyNodeType

      walk(root, ...)
      ```

    - **`edge.extractor`** — if extracting the final node from an edge-object is more complicated
      than simply accessing the value at a particular key, then you may instead pass an `extractor`-
      function. It should accept an edge-object, and return a node-object.

      ```es6
      const walk = new Walker({
         key: ...,
         class: ...,
         edge: { class: ..., extract_key: 'target' }
      })
          , root = new MyNodeType

      walk(root, ...)
      ```

   Of note, if your graph uses annotated edge-objects, those objects are expected to be *unique*.
   That is, in edgeless operation, Giraphe only visits a given child *once* for a particular parent
   (that is, if multiple supplybacks on a given parent produce a given child, that child will only
   be visited once; but if a child is supplied via *multiple* walk-paths, it has multiple
   opportunities to be accepted); but if navigating via edge-objects, Giraphe, will re-visit any
   given child once *for every edge-object* supplied during the parent's walk-step (that is, there
   may be several edges per parent-child pair.)


### The produced `walk()` function
Once configured, Giraphe will return to you a function-object, which is to be called with a `root`
node and a collection of various sorts of `callbacks`. The returned `walk()` function may be invoked
either function-style, or method-style:

```es6
const walk = new Walker({ ... })
walk(root, funcs...)

MyNodeClass.prototype.walk = walk
root.walk(funcs...)
```

(If invoked without any `root` whatsoever, i.e. only with `Function` objects, the `walk()` function
 effectively partially-applies those functions — the `walk()` function immediately returns a version
 of itself that prepends those functions to any others passed.)

```es6
const walk = new Walker({ ... })
MyNodeClass.prototype.walk = walk(funcs...)
root.walk(more_funcs...)
```

Otherwise, the first argument to `walk()` (or alternatively the object upon which it is invoked, if
it is invoked method-style) must be an object of the `class` passed to the `Walker` constructor (or
one satisfying the `predicate`, if such was passed instead — henceforth, I'll just call such an
object “a node.”). That node will be the first walked, that is, the root of the subgraph that
`walk()` will process.

All other arguments must be functions; these behave as callbacks manipulating the behaviour of the
recursive `walk()` process. Such callbacks must behave in one of two ways: as a so-called
‘supplier’, or as a ‘filter.’

All callbacks are invoked with the same arguments (which must not be modified during the callback's
evaluation):

 - Either the `current_node` being visited, or if annotated, the `current_edge` whence it's reached,
 - the `parent` node that was being visited when a supplier-callback yielded the current node,
 - and the complete list of `callbacks` with which the current `walk()` is operating.

Each callback is invoked with the current node being visited as `this`. (If the graph being walked
has annotated edge-objects, this may differ from the value of the first argument!)

When all discovered nodes in the graph have been exhausted, `walk()` produces a final object-mapping
of nodes; the properties of which are the unique-keys of all collected nodes, each with the
corresponding node-object as the value.

#### ‘Supplier’ callbacks
Suppliers are how `walk()` recurses into your graph-structure. At each node, additional nodes may
be ‘discovered’ by your supplier-callback; these'll be added to the set of nodes pending visitation.

Suppliers may indicate further nodes for visitation by,

 - returning a node directly:

   ```es6
   root.walk(function(){ return this.child })
   ```

 - returning an `Array` of nodes:

   ```es6
   root.walk(function(){ return [this.left, this.right] })
   ```

 - returning an object-mapping of nodes (such as that returned from another `walk()` process):

   ```es6
   root.walk(function(){ return this.walk_children() })
   ```

If edge-structure was provided to `walk()`'s constructor, the `node` may optionally be replaced with
an `edge`, instead, in the first and second styles. (Edges may not be returned in a mapping — key-
value maps may only contain the node directly associated with each key.)

(Note that, although returning `undefined` technically makes a callback a ‘filter’, it counts as a
 pass; so it's equivalent to a supplier that adds nothing. However, filter-vs-supplier behaviour may
 change in future releases, especially w.r.t. caching!)

#### ‘Filter’ callbacks
If suppliers are how you find new nodes to visit, filters are how you select which of those nodes
contribute to the overall result of the `walk()`. Where suppliers operate on descendants of the
`current` node being visited, filters operate on that `current` node itself.

Any callback returning a boolean value is treated as a filter.

The default behaviour of a filter (i.e. if it returns `undefined`), is to *pass* the `current` node
— i.e. as a noop, simply let it, and any nodes `supplied` by other callbacks, through into the final
output of `walk()`.

```es6
root.walk(function(){ return this.is_blue || this.is_green })
```

However, if a callback explicitly returns boolean `false`, then it's considered to *reject* the
`current` node — despite having been ‘supplied’ by a previous callback, this node will not be
included in the results of the `walk()`; and any *newly*-`supplied` nodes from the current walk-step
will be discarded as well.

```es6
root.walk(function(){ return false if this.age >= 12 })
```

This rejection is short-circuiting — the current walk-step is aborted, no further callbacks (of
either type) are evaluated, any nodes collected via the rejected `current` node during this step for
future walking will be discarded, so on and so forth.

That said, however, rejection is *not permanent* — rejection by a callback only implies it was not
valid for collection *as a child of the parent through which it was discovered*. The same node can
be discovered through multiple `parent` nodes; and for each such re-discovery, the callbacks will be
re-evaluated / the node will be given another chance to be included in the output. Correspondingly,
acceptance *is* permanent — if every single filterback on a given step *accepts* a node, then that
node will be included in the results of `walk()` (and will not be walked again.)

If the `walk()` is configured for annotated graphs, then rejection is evaluated per-edge: if
multiple edges to the same child were discovered via a given parent, then that child must be
separately rejected via each edge on subsequent walk-steps.


### Examples

```es6
const MyNode = function(){
   this._children = new Array
   this.id = MyNode.max = (MyNode.max || 0) + 1 }

const walk = new Walker({ key: 'id', class: MyNode })

MyNode.prototype.walk = walk
MyNode.prototype.children = function(){ return this._children }
MyNode.prototype.descendants = walk(node => node._children())
```


Why?
----
This exists because I got tired of writing *almost* the same graph-walking function, over and over,
for Paws.js; while each function was slightly different from the previous one, and yet occured in a
‘hot’ enough location to preclude using a truly generic `walk()` function for each situation.

The *intention*, unfulfilled, was to pre-‘compile’ optimized graph-walking functions for each
situation, based on the `options` passed to the `Walker` constructor; this would allow me to
centralize testing efforts and interface design (the API) to this single library. My first attempt
at that task was laughable (it involved mustache templates. [Seriously][horrible mess].); and thus,
for now, this library is simply going to be an external API, with a generic (slow) `walk()`
implementation satisfying *all* of my needs; however, I still hope to eventually extract the
necessary optimizations into this library.


   [Paws.js]: <https://github.com/ELLIOTTCABLE/Paws.js#readme> "The Paws programming language"
   [horrible mess]: <https://github.com/ELLIOTTCABLE/giraphe/blob/horrible-mess+/walk.es6.js.mustache#L10-L127>
      "My last attempt at a pre-compiled walk() function, in the git history"
