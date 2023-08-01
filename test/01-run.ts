import test from "ava";

import {
    run,
} from "../compiler-src/run";
import {
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
});

// > (bcfn!no \c)
// nil

// > (bcfn!no '(nil))
// nil

// > (bcfn!no '(a . b))
// nil

// > (bcfn!no no)
// nil

// > (bcfn!no bcfn!no)
// nil

// > (bcfn!no (bcfn!no bcfn!no))
// t
