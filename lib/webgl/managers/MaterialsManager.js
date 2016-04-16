'use strict';

const Events = require('../../events/Events');
const THREE = require('three');
const CANNON = require('cannon');

let initialized = false;

function MaterialsManager () {
}

MaterialsManager.prototype.init = function (world) {
  if (initialized) {
    return;
  }
  initialized = true;

  // To be accesible from other classes
  this.world = world;
  // Materials
  this.groundMaterial = new CANNON.Material('groundMaterial');
  this.bouncyMaterial = new CANNON.Material('bouncyMaterial');
  this.slipperyMaterial = new CANNON.Material('slipperyMaterial');

  // Adjust constraint equation parameters for ground/ground contact
  const ground_ground_cm = new CANNON.ContactMaterial(this.groundMaterial, this.groundMaterial, {
    friction: 0.4,
    restitution: 0.1,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRegularizationTime: 3
  });
  const bouncyMaterial_ground_cm = new CANNON.ContactMaterial(this.bouncyMaterial, this.groundMaterial, {
    friction: 0.4,
    restitution: 0.4
  });
  const slippery_ground_cm = new CANNON.ContactMaterial(this.slipperyMaterial, this.groundMaterial, {
    friction: 0.1,
    restitution: 0.2
  });

  // Add contact material to the world
  world.addContactMaterial(ground_ground_cm);
  world.addContactMaterial(bouncyMaterial_ground_cm);
  world.addContactMaterial(slippery_ground_cm);
};

module.exports = new MaterialsManager();