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
        source.name,
        { req: "wrong", reg: "also wrong" },
        "the instructions have been fired",
    );
}

