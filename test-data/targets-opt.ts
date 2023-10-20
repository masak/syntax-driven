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
        bcfn all [req: %0..%1; reg: %0..%5]
          :top
            %2 ← (id %1 nil)
            jmp :if-branch-1 unless %2
            %5 ← (get-symbol "t")
            jmp :if-end-1
          :if-branch-1
            %3 ← (car %1)
            (args-start)
              (arg-one %3)
            (args-end)
            %4 ← (apply %0)
            jmp :if-branch-2 unless %4
            %1 ← (cdr %1)
            jmp :top
          :if-branch-2
            %5 ← (get-symbol "nil")
          :if-end-1
            return %5
    `)],

    ["some", parse(`
        bcfn some [req: %0..%1; reg: %0..%5]
          :top
            %2 ← (id %1 nil)
            jmp :if-branch-1 unless %2
            %5 ← (get-symbol "nil")
            jmp :if-end-1
          :if-branch-1
            %3 ← (car %1)
            (args-start)
              (arg-one %3)
            (args-end)
            %4 ← (apply %0)
            jmp :if-branch-2 unless %4
            %5 ← %1
            jmp :if-end-1
         :if-branch-2
            %1 ← (cdr %1)
            jmp :top
         :if-end-1
            return %5
    `)],

    ["reduce", parse(`
        bcfn reduce [req: %0..%1; reg: %0..%9]
            %2 ← (make-stack)
         :top
            %3 ← (cdr %1)
            %4 ← (id %3 nil)
            jmp :if-branch-1 unless %4
            %9 ← (car %1)
            jmp :if-end-1
         :if-branch-1
            %5 ← (car %1)
            %6 ← (cdr %1)
            %1 ← %6
            (%2!push %5)
            jmp :top
         :if-end-1
         :unspool
            %5 ← (stack-empty? %2)
            jmp :unspool-done if %5
            %5 ← (%2!pop)
            (args-start)
              (arg-one %5)
              (arg-one %9)
            (args-end)
            %9 ← (apply %0)
         :unspool-done
            return %9
    `)],
]);

export default expectedTargets;
