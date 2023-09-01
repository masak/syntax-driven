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

    ["all", parse(`
        bcfn all [req: %0..%1; reg: %0..%8]
          :top
            %2 ← (id %1 nil)
            jmp :if-branch-1 unless %2
            %3 ← (get-symbol "t")
            %8 ← %3
            jmp :if-end-1
          :if-branch-1
            %4 ← (car %1)
            (args-start)
              (arg-one %4)
            (args-end)
            %5 ← (apply %0)
            jmp :if-branch-2 unless %5
            %6 ← (cdr %1)
            %1 ← %6
            jmp :top
          :if-branch-2
            %7 ← (get-symbol "nil")
            %8 ← %7
          :if-end-1
            return %8
    `)],
]);

export default expectedTargets;

