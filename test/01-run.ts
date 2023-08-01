import test from "ava";

import {
    run,
} from "../compiler-src/run";
import {
    char,
    list,
    pair,
    symbol,
    SYMBOL_NIL,
    SYMBOL_T,
} from "../compiler-src/val";

import targets from "../test-data/targets";

test("running 'no'", (t) => {
    let bcfnNo = targets.get("no")!;
    t.not(bcfnNo, undefined);

    let r1 = run(bcfnNo, [SYMBOL_NIL]);
    t.deepEqual(r1, SYMBOL_T);

    let r2 = run(bcfnNo, [SYMBOL_T]);
    t.deepEqual(r2, SYMBOL_NIL);

    let r3 = run(bcfnNo, [symbol("x")]);
    t.deepEqual(r3, SYMBOL_NIL);

    let r4 = run(bcfnNo, [char("c")]);
    t.deepEqual(r4, SYMBOL_NIL);

    let r5 = run(bcfnNo, [list(SYMBOL_NIL)]);
    t.deepEqual(r5, SYMBOL_NIL);

    let r6 = run(bcfnNo, [pair(symbol("a"), symbol("b"))]);
    t.deepEqual(r6, SYMBOL_NIL);
});

// > (bcfn!no no)
// nil

// > (bcfn!no bcfn!no)
// nil

// > (bcfn!no (bcfn!no bcfn!no))
// t

