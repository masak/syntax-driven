import React, { Fragment } from 'react';
import './App.css';
import Nav from './components/Nav';
import AllCars from './components/AllCars';
import CarList from './components/CarList';

const App = (props) => (
  <Fragment>
    <header className="App-header">
      <h1 className="App-title">☺springkids☺</h1>
    </header>
    <Nav />
    <AllCars />
    <CarList />
  </Fragment>
);

export default App;
