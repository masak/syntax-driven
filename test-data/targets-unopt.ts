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
        bcfn all [req: %0..%1; reg: %0..%8]
            %2 ← (get-global "no")
            (args-start)
              (arg-one %1)
            (args-end)
            %3 ← (apply %2)
            jmp :if-branch-1 unless %3
            %8 ← (get-symbol "t")
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
            jmp :if-end-1
          :if-branch-2
            %8 ← (get-symbol "nil")
          :if-end-1
            return %8
    `)],

    ["some", parse(`
        bcfn some [req: %0..%1; reg: %0..%8]
            %2 ← (get-global "no")
            (args-start)
              (arg-one %1)
            (args-end)
            %3 ← (apply %2)
            jmp :if-branch-1 unless %3
            %8 ← (get-symbol "nil")
            jmp :if-end-1
          :if-branch-1
            %4 ← (car %1)
            (args-start)
              (arg-one %4)
            (args-end)
            %5 ← (apply %0)
            jmp :if-branch-2 unless %5
            %8 ← %1
            jmp :if-end-1
         :if-branch-2
            %6 ← (cdr %1)
            %7 ← (get-global "some")
            (args-start)
              (arg-one %0)
              (arg-one %6)
            (args-end)
            %8 ← (apply %7)
         :if-end-1
            return %8
    `)],
]);

export default expectedTargets;

