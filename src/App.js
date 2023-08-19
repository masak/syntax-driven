import React from 'react';
import './App.css';
import Translation from './components/Translation';
import SourceListing from './components/SourceListing';
import * as v01 from './snapshots/v01';

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

    <pre><code>24 tr r1 sy     %tr ← (id %r1 symbol) { "\n" }
28 tr r1 --     %tr ← (type %r1)      { "\n" }
50 -- -- --     (start of arguments)       { "\n" }
51 -- r1 --       add a single argument    { "\n" }
53 -- -- --     (end of arguments)         { "\n" }
61 tr r1 --     %tr ← (apply %r1 &lt;args&gt;) { "\n" }
F0 -- r1 --     return %r1</code></pre>

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
        bcfn atom [req %0; reg %0..%3]:
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

    <p>
        <em>&lt;some statistics here, as well as the full source
        code&gt;</em>
    </p>

    <SourceListing sourceText={v01.confTs} />
    <SourceListing sourceText={v01.sourceTs} />
    <SourceListing sourceText={v01.envTs} />
    <SourceListing sourceText={v01.inlineTs} />
    <SourceListing sourceText={v01.valTs} />
    <SourceListing sourceText={v01.targetTs} />
    <SourceListing sourceText={v01.parseTargetTs} />
    <SourceListing sourceText={v01.parseSourceTs} />
    <SourceListing sourceText={v01.runBytecodeTs} />
    <SourceListing sourceText={v01.compileTs} />
    <SourceListing sourceText={v01.bytecodeTs} />
  </main>
);

export default App;
