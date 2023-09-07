import test from "ava";

import {
    Bytecode,
} from "../src/bytecode";
import {
    BcRuntime,
} from "../src/run-bytecode";
import {
    list,
    symbol,
    SYMBOL_NIL,
    SYMBOL_T,
} from "../src/val";

import {
    envAfterReduce,
} from "../test-data/envs";

test("running 'all'", (t) => {
    let bc = new Bytecode(envAfterReduce);
    let rt = new BcRuntime(bc);

    let r1 = rt.run("all", [
        rt.fn("atom"),
        list(symbol("a"), symbol("b"), symbol("c")),
    ]);
    t.deepEqual(r1, SYMBOL_T);

    let r2 = rt.run("all", [
        rt.fn("atom"),
        list(symbol("a"), list(symbol("b"), symbol("c")), symbol("d")),
    ]);
    t.deepEqual(r2, SYMBOL_NIL);

    let r3 = rt.run("all", [rt.fn("atom"), SYMBOL_NIL]);
    t.deepEqual(r3, SYMBOL_T);

    let r4 = rt.run("all", [
        rt.fn("no"),
        list(SYMBOL_NIL, SYMBOL_NIL, SYMBOL_NIL)],
    );
    t.deepEqual(r4, SYMBOL_T);
});

test("running 'some'", (t) => {
    let bc = new Bytecode(envAfterReduce);
    let rt = new BcRuntime(bc);

    let r1 = rt.run("some", [
        rt.fn("atom"),
        list(symbol("a"), symbol("b"), symbol("c")),
    ]);
    t.deepEqual(r1, list(symbol("a"), symbol("b"), symbol("c")));

    let r2 = rt.run("atom", [
        rt.fn("atom"),
        SYMBOL_NIL,
    ]);
    t.deepEqual(r2, SYMBOL_NIL);

    let r3 = rt.run("some", [
        rt.fn("no"),
        list(SYMBOL_T, SYMBOL_T, SYMBOL_NIL),
    ]);
    t.deepEqual(r3, list(SYMBOL_NIL));

    let r4 = rt.run("some", [
        rt.fn("no"),
        list(SYMBOL_T, SYMBOL_T),
    ]);
    t.deepEqual(r4, SYMBOL_NIL);
});

