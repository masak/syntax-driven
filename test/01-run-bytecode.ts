import test from "ava";

import {
    Bytecode,
} from "../compiler-src/bytecode";
import {
    BcRuntime,
} from "../compiler-src/run-bytecode";
import {
    char,
    list,
    pair,
    symbol,
    SYMBOL_NIL,
    SYMBOL_T,
} from "../compiler-src/val";

import {
    envAfterNo,
    envAfterAtom,
} from "../test-data/envs";

test("running 'no'", (t) => {
    let bc = new Bytecode(envAfterNo);
    let rt = new BcRuntime(bc);

    let r1 = rt.run("no", [SYMBOL_NIL]);
    t.deepEqual(r1, SYMBOL_T);

    let r2 = rt.run("no", [SYMBOL_T]);
    t.deepEqual(r2, SYMBOL_NIL);

    let r3 = rt.run("no", [symbol("x")]);
    t.deepEqual(r3, SYMBOL_NIL);

    let r4 = rt.run("no", [char("c")]);
    t.deepEqual(r4, SYMBOL_NIL);

    let r5 = rt.run("no", [list(SYMBOL_NIL)]);
    t.deepEqual(r5, SYMBOL_NIL);

    let r6 = rt.run("no", [pair(symbol("a"), symbol("b"))]);
    t.deepEqual(r6, SYMBOL_NIL);

    let r7 = rt.run("no", [rt.fn("no")]);
    t.deepEqual(r7, SYMBOL_NIL);
});

test("running 'atom'", (t) => {
    let bc = new Bytecode(envAfterAtom);
    let rt = new BcRuntime(bc);

    let r1 = rt.run("atom", [char("a")]);
    t.deepEqual(r1, SYMBOL_T);

    let r2 = rt.run("atom", [SYMBOL_T]);
    t.deepEqual(r2, SYMBOL_T);

    let r3 = rt.run("atom", [symbol("a")]);
    t.deepEqual(r3, SYMBOL_T);

    let r4 = rt.run("atom", [list(symbol("a"))]);
    t.deepEqual(r4, SYMBOL_NIL);
});

