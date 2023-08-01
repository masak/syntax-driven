import test from "ava";

import {
    run,
} from "../compiler-src/run";
import {
    SYMBOL_NIL,
    SYMBOL_T,
} from "../compiler-src/val";

import targets from "../test-data/targets";

test("running 'no'", (t) => {
    let bcfnNo = targets.get("no")!;
    t.not(bcfnNo, undefined);

    let returnValue = run(bcfnNo, [SYMBOL_NIL]);
    t.deepEqual(returnValue, SYMBOL_T);
});

// > (bcfn!no 'nil)
// t

// > (bcfn!no '())
// t

// > (bcfn!no t)
// nil

// > (bcfn!no 'x)
// nil

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
