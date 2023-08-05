import test from "ava";

import {
    compile,
} from "../compiler-src/compile";
import {
    stringifyTarget,
} from "../compiler-src/target";
import {
    OPT_ALL,
    OPT_NONE,
} from "../compiler-src/conf";

import sources from "../test-data/sources";
import targets from "../test-data/targets";
import {
    emptyEnv,
    envAfterNo,
} from "../test-data/envs";

test("compiling 'no'", (t) => {
    let source = sources.get("no")!;
    t.not(source, undefined);

    let target = targets.get("no")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget = stringifyTarget(compile(source, emptyEnv));

    t.deepEqual(actualTarget, expectedTarget);
});

test("compiling 'atom' (unopt)", (t) => {
    let source = sources.get("atom")!;
    t.not(source, undefined);

    let expectedTarget = targets.get("atom")!;
    t.not(expectedTarget, undefined);

    let actualTarget = compile(source, envAfterNo, OPT_NONE);

    t.deepEqual(
        stringifyTarget(actualTarget),
        stringifyTarget(expectedTarget),
    );
});

test("compiling 'atom' (opt)", (t) => {
    let source = sources.get("atom")!;
    t.not(source, undefined);

    let expectedTarget = targets.get("atom")!;
    t.not(expectedTarget, undefined);

    let actualTarget = compile(source, envAfterNo, OPT_ALL);

    t.deepEqual(
        stringifyTarget(actualTarget),
        stringifyTarget(expectedTarget),
    );
});

