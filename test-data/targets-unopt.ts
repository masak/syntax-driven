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
            %1 ← (type %0)
            %2 ← (id %1 'pair)
            %3 ← (get-global "no")
            (args-start)
              (arg-one %2)
            (args-end)
            %4 ← (apply %3)
            return %4
    `)],
]);

export default expectedTargets;

