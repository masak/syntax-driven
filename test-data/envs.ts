import {
    Env,
} from "../compiler-src/env";

import sources from "./sources";

export const emptyEnv = new Env();

export const envAfterNo = emptyEnv
    .install(sources.get("no")!);

