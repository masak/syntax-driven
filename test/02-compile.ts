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
import targetsOpt from "../test-data/targets-opt";
import targetsUnopt from "../test-data/targets-unopt";
import {
    envAfterAtom,
} from "../test-data/envs";

test("compiling 'all' (unopt)", (t) => {
    let source = sources.get("all")!;
    t.not(source, undefined);

    let target = targetsUnopt.get("all")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget =
        stringifyTarget(compile(source, envAfterAtom, OPT_NONE));

    t.deepEqual(actualTarget, expectedTarget);
});

test("compiling 'all' (opt)", (t) => {
    let source = sources.get("all")!;
    t.not(source, undefined);

    let target = targetsOpt.get("all")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget =
        stringifyTarget(compile(source, envAfterAtom, OPT_ALL));

    t.deepEqual(actualTarget, expectedTarget);
});

test("compiling 'some' (unopt)", (t) => {
    let source = sources.get("some")!;
    t.not(source, undefined);

    let target = targetsUnopt.get("some")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget =
        stringifyTarget(compile(source, envAfterAtom, OPT_NONE));

    t.deepEqual(actualTarget, expectedTarget);
});

test("compiling 'some' (opt)", (t) => {
    let source = sources.get("some")!;
    t.not(source, undefined);

    let target = targetsOpt.get("some")!;
    t.not(target, undefined);

    let expectedTarget = stringifyTarget(target);
    let actualTarget =
        stringifyTarget(compile(source, envAfterAtom, OPT_ALL));

    t.deepEqual(actualTarget, expectedTarget);
});

