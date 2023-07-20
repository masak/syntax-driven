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
        %0 <- params
        %1 <- (car %0)
        %2 <- (cdr %0)
        (err-if %2 'overargs)
        %3 <- (id %1 nil)
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

    <pre><code>01 tr -- --     %tr &lt;- params          { "\n" }
22 tr r1 --     %tr &lt;- (car %r1)       { "\n" }
23 tr r1 --     %tr &lt;- (cdr %r1)       { "\n" }
24 tr r1 sy     %tr &lt;- (id %r1 symbol) { "\n" }
<span class="less-important">25 tr -- --     %tr &lt;- (join nil nil)  { "\n" }
26 tr r1 --     %tr &lt;- (join %r1 nil)  { "\n" }
27 tr r1 r2     %tr &lt;- (join %r1 %r2)  { "\n" }
28 tr r1 --     %tr &lt;- (type %r1)      { "\n" }
30 tr r1 --     %tr &lt;- r1              { "\n" }
31 tr s1 --     %tr &lt;- symbol          { "\n" }
40 lb -- --     jmp label                 { "\n" }
41 lb r1 --     jmp label if %r1 != nil   { "\n" }
42 lb r1 --     jmp label if %r1 == nil   { "\n" }
50 -- -- --     (start of arguments)      { "\n" }
51 -- r1 --       add a single argument   { "\n" }
52 -- r1 --       add list of arguments   { "\n" }
53 -- -- --     (end of arguments)        { "\n" }
60 -- r1 --     (apply %r1 &lt;args&gt;)  { "\n" }
61 tr r1 --     %tr &lt; (apply %r1 &lt;args&gt;) { "\n" }</span>
E0 -- r1 sy     (err symbol) if %r1 != nil        { "\n" }
F0 -- r1 --     return %r1                { "\n" }
<span class="less-important">F1 -- r1 r2     return %r1 if %r2 != nil  { "\n" }
F2 -- -- r2     return nil if %r2 == nil  { "\n" }
F3 -- -- r2     return t   if %r2 == nil  { "\n" }</span></code></pre>
  </main>
);

export default App;
