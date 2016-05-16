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

   }) // ~ The Walker constructor
}) // giraphe
