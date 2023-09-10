import {
    Bytecode,
} from "./bytecode";

import {
    envAfterAtom,
} from "../test-data/envs";

let bc = new Bytecode(envAfterAtom);
let bcDump = bc.dump();
console.log(JSON.stringify(bcDump, null, 4));

