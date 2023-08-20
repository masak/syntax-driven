import test from "ava";

import {
    compile,
} from "../src/compile";
import {
    stringifyTarget,
} from "../src/target";
import {
    OPT_NONE,
} from "../src/conf";

import sources from "../test-data/sources";
import targetsUnopt from "../test-data/targets-unopt";
import {
    envAfterAtom,
} from "../test-data/envs";

test("compiling 'all'", (t) => {
    let source = sources.get("all")!;
    t.not(source, undefined);

    let target = targetsUnopt.get("all")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget =
        stringifyTarget(compile(source, envAfterAtom, OPT_NONE));

    t.deepEqual(actualTarget, expectedTarget);
});

