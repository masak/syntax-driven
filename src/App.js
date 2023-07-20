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
        (err-if %2 "overargs")
        %3 <- (id %1 nil)
        (return %3)
      `}
    />

    <p>
        let me say a few things about the target language on the
        right. it's an assembly view of a bytecode language for a
        simple virtual machine &mdash; maybe better to call it a
        runtime &mdash; and the instructions correspond to the
        smallest possible actions that a bel evaluator carries out.
        at least in principle, it should be possible to translate
        each instruction into a sequence of bytes.
    </p>

    <p>
        here is the instruction set.
    </p>

    <pre><code>
%1 &lt;- params { "\n" }
%1 &lt;- (car %0) { "\n" }
%1 &lt;- (cdr %0) { "\n" }
%1 &lt;- (id %0 'sym) { "\n" }
%1 &lt;- (type %0) { "\n" }
%0 &lt;- (sym 'sym) { "\n" }
%1 &lt;- (get-global %0) { "\n" }
%1 &lt;- %0 { "\n" }
{ "\n" }
(arg-in) { "\n" }
(arg-next %0) { "\n" }
(arg-many %0) { "\n" }
(arg-out) { "\n" }
%1 &lt;- (apply %0) { "\n" }
{ "\n" }
(err-if %0 "message") { "\n" }
(return %0) { "\n" }
(jmp 'label) { "\n" }
(unless-jmp %0 'label)</code></pre>

  </main>
);

export default App;
