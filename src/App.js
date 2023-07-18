import React from 'react';
import './App.css';

const App = (props) => (
  <main>
    <header className="App-header">
      <h1 className="App-title">syntax-driven compilation</h1>
    </header>

    <p>
        a good compiler can be created from a bad compiler,
        which is better than no compiler.
        that is the premise of this project, which uses&#20;
        <em>syntax-driven compilation</em> as its basis.
    </p>

    <p>
        what does it mean for syntax to drive the
        compilation? the abstract syntax tree (ast) has
        different types of nodes (for example, one node for
        if statements, another node for calling the "car"
        primitive). each such type of node has a small bit
        of translation logic. we traverse the tree, run each
        bit of translation logic based on the nodes that we
        find, and... that's it, really.
    </p>

  </main>
);

export default App;
