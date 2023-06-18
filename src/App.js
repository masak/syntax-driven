import React, { Fragment } from 'react';
import './App.css';
import Nav from './components/Nav';
import Flower from './components/Flower';

const App = (props) => (
  <Fragment>
    <header className="App-header">
      <h1 className="App-title">☺springkids☺</h1>
    </header>
    <Nav />
    <Flower />
  </Fragment>
);

export default App;
