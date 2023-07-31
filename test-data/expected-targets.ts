import {
    Target,
} from "../compiler-src/target";
import {
    parse,
} from "../compiler-src/parse-target";

let expectedTargets = new Map<string, Target>([
    ["no", parse(`
        bcfn no [req: %0; reg: %0..%1]
            %1 ← (id %0 nil)
            return %1
    `)],

    ["atom", parse(`
        bcfn atom [req: %0; reg: %0..%4]
            %1 ← (get-global "no")
            %2 ← (type %0)
            %3 ← (id %2 'pair)
            (args-start)
              (arg-one %3)
            (args-end)
            %4 ← (apply %1)
            return %4
    `)],
]);

export default expectedTargets;

