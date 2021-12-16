import * as common from './common.js'
import EdgelessWalker from "./edgeless-walker.js"

export type {
   KeysMatching,
   SelfReferentialKeys
} from './common'

export const abortIteration = common.abortIteration
export const doCaching = common.doCaching
export const cachebackKey = common.cachebackKey

export {
   EdgelessWalker,
}
