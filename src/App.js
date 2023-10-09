import React from 'react';
import './App.css';
import BytecodeDump from './components/BytecodeDump';
import SourceListing from './components/SourceListing';
import Translation from './components/Translation';
import * as v01 from './snapshots/v01';
import {
    bcDump as v01Dump,
} from "./bc-dumps/v01";

const App = (props) => (
  <main>
    <h1>syntax-driven compilation</h1>

    <p>
        a good compiler can be created from a bad compiler,
        which is better than no compiler.
        that is the premise of this project, which uses&nbsp;
        <em>syntax-driven compilation</em> as its basis.
    </p>

    <p>
        what does it mean for syntax to drive the
        compilation? it means each type of ast node has its own bit
        of translation logic. we traverse the tree and run
        translation logic based on the nodes that we
        find during the traversal. it's fairly simple.
    </p>

    <Translation
      source={`
        (def no (x)
          (id x nil))
      `}

      target={`
        bcfn no [req %0; reg %0..%1]
            %1 ← (id %0 nil)
            return %1
      `}
    />

    <p>
        let me say a few things about the target language on the
        right. it's an assembly view of a bytecode language for a
        runtime. each instruction fits comfortably into 4 bytes
        (32 bits); one byte for the opcode, three for
        opcode-specific operands. there's another 4 bytes for the
        header; the name is included for clarity but it's not
        actually part of the compiled code itself. so you're
        looking at a 12-byte compiled function above.
    </p>

    <p>
        here is the instruction set.
    </p>

    <pre><code>00 tr r1 sy     tr ← (id r1 symbol) { "\n" }
01 tr r1 --     tr ← (id r1 nil)             { "\n" }
02 r1 -- --     tr ← (type r1)               { "\n" }
10 -- -- --     (start of arguments)         { "\n" }
11 -- r1 --       add a single argument      { "\n" }
18 -- -- --     (end of arguments)           { "\n" }
19 tr r1 --     tr ← (apply r1 &lt;args&gt;) { "\n" }
30 -- r1 --     return r1</code></pre>

    <p>
        we don't actually need the function to use 2 registers;
        it could work equally well with just 1.
        a bytecode function could use up to
        256 different registers, but of course there is a lot of
        sense in using as few as we can. we'll come back to this
        issue a bit later, as we will soon have bigger fish to
        fry.
    </p>

    <p>
        let's look at the translation of the next function,
        { " " } <code>atom</code>.
    </p>

    <Translation
      source={`
        (def atom (x)
          (no (id (type x) 'pair)))
      `}

      target={`
        bcfn atom [req: %0; reg: %0..%4]
            %1 ← (type %0)
            %2 ← (id %1 'pair)
            %3 ← (get-global "no")
            (args-start)
              (arg-one %2)
            (args-end)
            %4 ← (apply %3)
            return %4
      `}
    />

    <p>
        notice how we spend 4 instructions on calling the
        { " " } <code>no</code> function? not only that, but
        we're paying for all the overhead of argument/parameter
        handling between the two functions, as well as
        handling the return value. transfer between functions
        is (somewhat) expensive... and we're doing it all for
        the benefit of a single instruction in the { " " }
        <code>no</code> function.
    </p>

    <p>
        it's time we introduce a very important compiler
        optimization: inlining. this one is so important that
        we do it eagerly, emitting the inlined code directly
        rather than the call. we get this result:
    </p>

    <Translation
      source={`
        (def atom (x)
          (no (id (type x) 'pair)))
      `}

      target={`
        bcfn atom [req %0; reg %0..%3]
            %1 ← (type %0)
            %2 ← (id %1 'pair)
            %3 ← (id %2 nil)
            return %3
      `}
    />

    <p>
        much better. but how does that work? how can we get only
        the juicy contents of the { " " } <code>no</code>
        { " " } function, delivered straight into the { " " }
        <code>atom</code> function?
    </p>

    <p>
        the answer is that we symbolically evaluate calling
        the { " " } <code>no</code> function. the { " " }
        <code>parms</code> instruction becomes populated with the
        arguments built up before the call, and further
        destructuring juggles around with these,
        canceling out arguments against parameter
        destructuring. in the { " " } <code>no</code> bytecode
        function body itself, only the second-last instruction is
        actually "run", which means we emit it into the { " " }
        <code>atom</code> function. the final { " " }
        <code>return</code> instruction is also silently absorbed;
        since inlining is about the { " " } <code>no</code>
        function losing its identity as it gets absorbed into
        { " " } <code>atom</code>, there's no longer anything to
        return from.
    </p>

    <p>
        this whole inlining thing is a space-vs-time trade-off.
        all things considered, i'm willing to pay a fair bit of
        space (extra instructions) to shave off some time during
        execution. that's the whole reason i'm compiling instead
        of interpreting.
    </p>

    <p>
        it's time to snapshot v01 of the compiler, as well as of
        the bytecode container:
    </p>

    <BytecodeDump dump={v01Dump} />

    <SourceListing fileName="bytecode.ts" sourceText={v01.bytecodeTs} />
    <SourceListing fileName="compile.ts" sourceText={v01.compileTs} />
    <SourceListing fileName="conf.ts" sourceText={v01.confTs} />
    <SourceListing fileName="env.ts" sourceText={v01.envTs} />
    <SourceListing fileName="inline.ts" sourceText={v01.inlineTs} />
    <SourceListing fileName="parse-source.ts" sourceText={v01.parseSourceTs} />
    <SourceListing fileName="parse-target.ts" sourceText={v01.parseTargetTs} />
    <SourceListing fileName="run-bytecode.ts" sourceText={v01.runBytecodeTs} />
    <SourceListing fileName="source.ts" sourceText={v01.sourceTs} />
    <SourceListing fileName="target.ts" sourceText={v01.targetTs} />
    <SourceListing fileName="val.ts" sourceText={v01.valTs} />

    <p>
        with that out of the way, let's tackle { " " } <code>all</code>:
    </p>

    <Translation
      source={`
        (def all (f xs)
          (if (no xs)      t
              (f (car xs)) (all f (cdr xs))
                           nil))
      `}

      target={`
        bcfn all [req: %0..%1; reg: %0..%7]
            %2 ← (id %1 nil)
            jmp :if-branch-1 unless %2
            %7 ← (get-symbol "t")
            jmp :if-end-1
          :if-branch-1
            %3 ← (car %1)
            (args-start)
              (arg-one %3)
            (args-end)
            %4 ← (apply %0)
            jmp :if-branch-2 unless %4
            %5 ← (cdr %1)
            %6 ← (get-global "all")
            (args-start)
              (arg-one %0)
              (arg-one %5)
            (args-end)
            %7 ← (apply %6)
            jmp :if-end-1
          :if-branch-2
            %7 ← (get-symbol "nil")
          :if-end-1
            return %7
      `}
    />

    <p>
        suddenly, the target code is quite a lot longer than the source
        code. this shows, i dunno, either the compact power of { " " }
        <code>if</code>, or the exacting fine-grainedness of target
        instructions.
    </p>

    <p>
        but i don't want to talk about that. see that recursive call?
        as it so happens, it's a <em>tail</em>-recursive call, meaning
        that this call is the last thing that happens in this function.
    </p>

    <p>
        this also means we can perform a tail-recursion elimination.
        the recursive call turns into a jump. in fact, we can do it on the
        fly, and just generate the target code directly with the
        recursive call eliminated:
    </p>

    <Translation
      source={`
        (def all (f xs)
          (if (no xs)      t
              (f (car xs)) (all f (cdr xs))
                           nil))
      `}

      target={`
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
      `}
    />

    <p>
        the same trick works on { " " } <code>some</code>:
    </p>

    <Translation
      source={`
        (def some (f xs)
          (if (no xs)      nil
              (f (car xs)) xs
                           (some f (cdr xs))))
      `}

      target={`
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
      `}
    />

    <p>
        but then we get to { " " } <code>reduce</code>, which is
        { " " } <em>not</em> tail-recursive, and the same optimization
        does not apply:
    </p>

    <Translation
      source={`
        (def reduce (f xs)
          (if (no (cdr xs))
              (car xs)
              (f (car xs) (reduce f (cdr xs)))))
      `}

      target={`
        bcfn reduce [req: %0..%1; reg: %0..%8]
            %2 ← (cdr %1)
            %3 ← (id %2 nil)
            jmp :if-branch-1 unless %3
            %8 ← (car %1)
            jmp :if-end-1
         :if-branch-1
            %4 ← (car %1)
            %5 ← (cdr %1)
            %6 ← (get-global "reduce")
            (args-start)
              (arg-one %0)
              (arg-one %5)
            (args-end)
            %7 ← (apply %6)
            (args-start)
              (arg-one %4)
              (arg-one %7)
            (args-end)
            %8 ← (apply %0)
         :if-end-1
            return %8
      `}
    />

    <p>
        the above is with optimizations switched on. not how we're
        still seeing a recursive call in the compiled output &mdash;
        because this recursive call was not a tail call, the
        tail-recursive elimination didn't do a thing.
    </p>

    <p>
        we could give up here, and call this good enough. maybe some
        recursions were not meant to be eliminated. but will we give
        up? of course not!
    </p>

    <p>
        we can make a more subtle and more difficult transformation.
        with tail-call elimination, we're morally justified in making
        the transformation by the fact that there's "nothing more to
        do" in the function; there is no code running after the
        recursive call, and therefore no need to return to the
        function again before handing back the result. (it's a
        "getting rid of the middleman", the current function, when
        returning after the recursive call.) but what if there was
        some code after the recursive call, and (by happy coincidence)
        exactly one datum we need to remember in that code? we can
        push that datum on an explicit stack, turn the recursive call
        into a jump (just like with the tail-call elimination), and
        then "unspool" the stack at the end of the function; that is,
        run the required number of iterations handling the
        post-recursive-call code based on the data pushed on the
        stack. it's a <em>stack</em> because we handle the things
        pushed on it in last-in-first-out order, reflecting how the
        post-recursive-call code would run.
    </p>

    <p>
        ... here will go some more talk about this optimization ...
    </p>

    <p>
        some dreaming about things further down the line:
    </p>

    <ul>
        <li>
            <strong>an interpreter</strong> so that we can do some
            benchmarking between the compiled target code and interpreting
            source code
        </li>

        <li>
            <strong>partial evaluation</strong> for when we compile
            { " " } <code>cons</code>
        </li>

        <li>
            <strong>error reporting</strong> that knows where in the
            source code the failure is located when it happens in the
            { " " } <em>compiled</em> code
        </li>
    </ul>
  </main>
);

export default App;
