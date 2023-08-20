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

    ["all", parse(`
        bcfn all [req: %0..%1; reg: %0..%11]
            %2 ← (get-global "no")
            (args-start)
              (arg-one %1)
            (args-end)
            %3 ← (apply %2)
            jmp :if-branch-1 unless %3
            %4 ← (get-symbol "t")
            %11 ← %4
            jmp :if-end-1
          :if-branch-1
            %5 ← (car %1)
            (args-start)
              (arg-one %5)
            (args-end)
            %6 ← (apply %0)
            jmp :if-branch-2 unless %6
            %7 ← (cdr %1)
            %8 ← (get-global "all")
            (args-start)
              (arg-one %0)
              (arg-one %7)
            (args-end)
            %9 ← (apply %8)
            %11 ← %9
            jmp :if-end-1
          :if-branch-2
            %10 ← (get-symbol "nil")
            %11 ← %10
          :if-end-1
            return %11
    `)],
]);

export default expectedTargets;

