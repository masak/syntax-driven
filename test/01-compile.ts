import test from "ava";

import {
    compile,
} from "../src/compile";
import {
    stringifyTarget,
} from "../src/target";
import {
    OPT_ALL,
    OPT_NONE,
} from "../src/conf";

import sources from "../test-data/sources";
import targetsUnopt from "../test-data/targets-unopt";
import targetsOpt from "../test-data/targets-opt";
import {
    emptyEnv,
    envAfterNo,
} from "../test-data/envs";

test("compiling 'no'", (t) => {
    let source = sources.get("no")!;
    t.not(source, undefined);

    let target = targetsUnopt.get("no")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget = stringifyTarget(compile(source, emptyEnv));

    t.deepEqual(actualTarget, expectedTarget);
});

test("compiling 'atom' (unopt)", (t) => {
    let source = sources.get("atom")!;
    t.not(source, undefined);

    let expectedTarget = targetsUnopt.get("atom")!;
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

    let expectedTarget = targetsOpt.get("atom")!;
    t.not(expectedTarget, undefined);

    let actualTarget = compile(source, envAfterNo, OPT_ALL);

    t.deepEqual(
        stringifyTarget(actualTarget),
        stringifyTarget(expectedTarget),
    );
});

