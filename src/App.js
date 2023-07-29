import React from 'react';
import './App.css';
import Translation from './components/Translation';

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
        %0 ← params
        err 'underargs if %0 == nil
        %1 ← (cdr %0)
        err 'overargs if %1 != nil
        %2 ← (car %0)
        %3 ← (id %2 nil)
        return %3
      `}
    />

    <p>
        let me say a few things about the target language on the
        right. it's an assembly view of a bytecode language for a
        runtime. each instruction fits comfortably into 4 bytes
        (32 bits); one byte for the opcode, three for
        opcode-specific operands.
    </p>

    <p>
        here is the instruction set. i've greyed out the parts
        we're not using yet.
    </p>

    <pre><code>01 tr -- --     %tr ← params          { "\n" }
22 tr r1 --     %tr ← (car %r1)       { "\n" }
23 tr r1 --     %tr ← (cdr %r1)       { "\n" }
24 tr r1 sy     %tr ← (id %r1 symbol) { "\n" }
<span class="less-important">25 tr -- --     %tr ← (join nil nil)  { "\n" }
26 tr r1 --     %tr ← (join %r1 nil)  { "\n" }
27 tr r1 r2     %tr ← (join %r1 %r2)  { "\n" }
28 tr r1 --     %tr ← (type %r1)      { "\n" }
30 tr r1 --     %tr ← %r1             { "\n" }
31 tr s1 --     %tr ← symbol          { "\n" }
40 lb -- --     jmp label                  { "\n" }
41 lb r1 --     jmp label if %r1 != nil    { "\n" }
42 lb r1 --     jmp label if %r1 == nil    { "\n" }
50 -- -- --     (start of arguments)       { "\n" }
51 -- r1 --       add a single argument    { "\n" }
52 -- r1 --       add list of arguments    { "\n" }
53 -- -- --     (end of arguments)         { "\n" }
60 -- r1 --     (apply %r1 &lt;args&gt;)   { "\n" }
61 tr r1 --     %tr ← (apply %r1 &lt;args&gt;) { "\n" }</span>
E0 -- r1 sy     err symbol if %r1 != nil   { "\n" }
F0 -- r1 --     return %r1                 { "\n" }
<span class="less-important">F1 -- r1 r2     return %r1 if %r2 != nil  { "\n" }
F2 -- -- r2     return nil if %r2 == nil   { "\n" }
F3 -- -- r2     return t   if %r2 == nil</span></code></pre>

    <p>
        it's a little bit funny that the compiled bytecode of
        the `no` function spends five instructions on parameter
        handling (corresponding to the `(x)` parameter list in
        the Bel code), and then just two instructions on the
        body. the function has a disproportionately big head.
    </p>

    <p>
        right now we're kind of wasting registers; using 4 when
        we could use only 2. a bytecode function could use up to
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
        %0 ← params
        err 'underargs if %0 == nil
        %1 ← (cdr %0)
        err 'overargs if %1 != nil
        %2 ← (car %0)
        %3 ← (get-global "no")
        %4 ← (type %1)
        %5 ← (id %4 'pair)
        (arg-start)
          (arg-one %5)
        (arg-end)
        %6 ← (apply %3)
        return %6
      `}
    />

    <p>
        the instructions in the body now outnumber those in
        the header, and from now on it's mostly going to stay
        that way.
    </p>

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
        %0 ← params
        err 'underargs if %0 == nil
        %1 ← (cdr %0)
        err 'overargs if %1 != nil
        %2 ← (car %0)
        %3 ← (get-global "no")
        %4 ← (type %1)
        %5 ← (id %4 'pair)
        %6 ← (id %5 nil)
        return %6
      `}
    />

    <p>
        much better. but how does that work? how can we get only
        the juicy contents of the { " " } <code>no</code>
        function, delivered straight into the { " " }
        <code>atom</code> function?
    </p>

    <p>
        the short answer is that we symbolically evaluate calling
        the { " " } <code>no</code> function. the { " " }
        <code>parms</code> instruction becomes populated with the
        arguments built up before the call, and further
        destructuring juggles around with these, mostly
        eliminating the need for { " " } <code>err</code> { " " }
        instructions and canceling out arguments against parameter
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
  </main>
);

export default App;
