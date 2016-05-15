/* @flow */
import Debug from 'debug'
const debug = Debug('giraphe:tests')

import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

const should  = chai.should()
                chai.use(sinonChai)


import { Walker } from '../giraphe.es6.js'

describe("giraphe ~ ", function(){
   describe("Walker", function(){

      it("exists", function(){
         should.exist(Walker)
         Walker.should.be.a('function')
      })

      it("doesn't throw", function(){
         class Something{}
         ~function(){ new Walker(Something) }.should.not.throw()
      })

   })
})

