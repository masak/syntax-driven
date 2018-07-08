import React, { Fragment } from 'react';
import Car from './Car';

const cars = [
  {
    alt: "den blåa bilen",
    imgUrl: "images/blue-car.png",
    body: (
      <Fragment>
        <h2>Den blåa bilen</h2>
        <p>Den kan åka supersnabbt, och skjuta laser och pistoler och eld.</p>
      </Fragment>
    ),
  },
  {
    alt: "den svarta bilen",
    imgUrl: "images/black-car.png",
    body: (
      <Fragment>
        <h2>Den svarta bilen</h2>
        <p>Den kan skjuta lava och laser och vatten och pistoler och jord.</p>
      </Fragment>
    ),
  },
  {
    alt: "den röda bilen",
    imgUrl: "images/red-car-1.png",
    body: (
      <Fragment>
        <h2>Den röda bilen</h2>
        <p>Bara laser kan den göra. Den är jättesnabb.</p>
      </Fragment>
    ),
  },
  {
    alt: "den andra röda bilen",
    imgUrl: "images/red-car-2.png",
    body: (
      <Fragment>
        <h2>Den andra röda bilen</h2>
        <p>Den kan åka jättesnabbt också.</p>
      </Fragment>
    ),
  },
];

const CarList = () => (
  cars.map(car => (
    <Car imgUrl={car.imgUrl}>
      {car.body}
    </Car>
  ))
);

export default CarList;
