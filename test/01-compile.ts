import test from "ava";

import {
    compile,
} from "../compiler-src/compile";
import {
    stringifyTarget,
} from "../compiler-src/target";

import sources from "../test-data/sources";
import targets from "../test-data/targets";
import {
    emptyEnv,
    envAfterNo,
} from "../test-data/environments";

test("compiling 'no'", (t) => {
    let source = sources.get("no")!;
    t.not(source, undefined);

    let target = targets.get("no")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget = stringifyTarget(compile(source, emptyEnv));

    t.deepEqual(actualTarget, expectedTarget);
});

test("compiling 'atom'", (t) => {
    let source = sources.get("atom")!;
    t.not(source, undefined);

    let target = targets.get("atom")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);

    let actualTarget = stringifyTarget(compile(source, envAfterNo));

    t.deepEqual(actualTarget, expectedTarget);
});
