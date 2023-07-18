import React from 'react';
import './App.css';

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

    <pre><code>(def no (x) { "\n" }
  (id x nil))</code></pre>

    <pre><code>%0 &lt;- params { "\n" }
%1 &lt;- (car %0) { "\n" }
%2 &lt;- (cdr %0) { "\n" }
(err-if %2 "overargs") { "\n" }
%3 &lt;- (id %1 nil) { "\n" }
(return %3)</code></pre>

  </main>
);

export default App;
