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
        bcfn all [req: %0..%1; reg: %0..%10]
            %2 ← (id %1 nil)
            jmp :if-branch-1 unless %2
            %3 ← (get-symbol "t")
            %10 ← %3
            jmp :if-end-1
          :if-branch-1
            %4 ← (car %1)
            (args-start)
              (arg-one %4)
            (args-end)
            %5 ← (apply %0)
            jmp :if-branch-2 unless %5
            %6 ← (cdr %1)
            %7 ← (get-global "all")
            (args-start)
              (arg-one %0)
              (arg-one %6)
            (args-end)
            %8 ← (apply %7)
            %10 ← %8
            jmp :if-end-1
          :if-branch-2
            %9 ← (get-symbol "nil")
            %10 ← %9
          :if-end-1
            return %10
    `)],
]);

export default expectedTargets;

