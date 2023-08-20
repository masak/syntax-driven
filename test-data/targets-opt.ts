import {
    Target,
} from "../src/target";
import {
    parse,
} from "../src/parse-target";

let expectedTargets = new Map<string, Target>([
    ["no", parse(`
        bcfn no [req: %0; reg: %0..%1]
            %1 ← (id %0 nil)
            return %1
    `)],

    ["atom", parse(`
        bcfn atom [req: %0; reg: %0..%3]
            %1 ← (type %0)
            %2 ← (id %1 'pair)
            %3 ← (id %2 nil)
            return %3
    `)],
]);

export default expectedTargets;

