import React from 'react';

const Car = (props) => (
  <div className="App-car">
    <img
      src={props.imgUrl}
      alt={props.alt}
      width="500px"
      height="500px" />
    <div className="App-car-description">
      {props.children}
    </div>
    <div className="clear" />
  </div>
);

export default Car;
