'use strict';

var THREE = require('three');
var settings = require('../../../settings');

var Creature = require('../Creature');

function Mineral (index, pos, scale) {
  Creature.call(this, 'mineral', index, pos, scale);

  var geometry = new THREE.CylinderBufferGeometry(1, 1, 5, 5);
  geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 2.5, 0));
  this.originalColor = settings.mineralsColor;
  var material = new THREE.MeshStandardMaterial({color: this.originalColor, transparent: true, opacity: 0.5, shading: THREE.FlatShading});
  this.mesh = new THREE.Mesh(geometry, material);
  this.mesh.name = 'mineral_' + index;
  this.mesh.receiveShadow = true;
  this.mesh.castShadow = true;

  this.add(this.mesh);
}

Mineral.prototype = Object.create(Creature.prototype);

module.exports = Mineral;