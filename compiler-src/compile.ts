import {
    Source,
} from "./source";
import {
    Env,
} from "./env";
import {
    Target,
} from "./target";

export function compile(source: Source, env: Env): Target {
    return new Target(
        "well, this ain't right at all!",
        { req: "wrong", reg: "also wrong" },
        "the instructions have been fired",
    );
}

