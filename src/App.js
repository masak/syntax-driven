import React, { Fragment } from 'react';
import './App.css';
import AllCars from './components/AllCars';
import CarList from './components/CarList';

const App = (props) => (
  <Fragment>
    <header className="App-header">
      <h1 className="App-title">☺springkids☺</h1>
    </header>
    <nav>
      <ul>
        <li>music</li>
        <li>games</li>
        <li>art</li>
      </ul>
    </nav>
    <AllCars />
    <CarList />
  </Fragment>
);

export default App;
