import {
    Env,
} from "../src/env";

import sources from "./sources";

export const emptyEnv = new Env();

export const envAfterNo = emptyEnv
    .install(sources.get("no")!);

export const envAfterAtom = envAfterNo
    .install(sources.get("atom")!);

export const envAfterReduce = envAfterAtom
    .install(sources.get("all")!)
    .install(sources.get("some")!)
    .install(sources.get("reduce")!);

