import test from "ava";

import {
    Runtime,
} from "../compiler-src/run";
import {
    char,
    list,
    pair,
    symbol,
    SYMBOL_NIL,
    SYMBOL_T,
} from "../compiler-src/val";

import targetsOpt from "../test-data/targets-opt";
import {
    envAfterNo,
    envAfterAtom,
} from "../test-data/envs";

test("running 'no'", (t) => {
    let rt = new Runtime(envAfterNo);

    let bcfnNo = targetsOpt.get("no")!;
    t.not(bcfnNo, undefined);

    let r1 = rt.run(bcfnNo, [SYMBOL_NIL]);
    t.deepEqual(r1, SYMBOL_T);

    let r2 = rt.run(bcfnNo, [SYMBOL_T]);
    t.deepEqual(r2, SYMBOL_NIL);

    let r3 = rt.run(bcfnNo, [symbol("x")]);
    t.deepEqual(r3, SYMBOL_NIL);

    let r4 = rt.run(bcfnNo, [char("c")]);
    t.deepEqual(r4, SYMBOL_NIL);

    let r5 = rt.run(bcfnNo, [list(SYMBOL_NIL)]);
    t.deepEqual(r5, SYMBOL_NIL);

    let r6 = rt.run(bcfnNo, [pair(symbol("a"), symbol("b"))]);
    t.deepEqual(r6, SYMBOL_NIL);

    let r7 = rt.run(bcfnNo, [rt.fn("no")]);
    t.deepEqual(r7, SYMBOL_NIL);
});

test("running 'atom'", (t) => {
    let rt = new Runtime(envAfterAtom);

    let bcfnAtom = targetsOpt.get("atom")!;
    t.not(bcfnAtom, undefined);

    let r1 = rt.run(bcfnAtom, [char("a")]);
    t.deepEqual(r1, SYMBOL_T);

    let r2 = rt.run(bcfnAtom, [SYMBOL_T]);
    t.deepEqual(r2, SYMBOL_T);

    let r3 = rt.run(bcfnAtom, [symbol("a")]);
    t.deepEqual(r3, SYMBOL_T);

    let r4 = rt.run(bcfnAtom, [list(symbol("a"))]);
    t.deepEqual(r4, SYMBOL_NIL);
});

