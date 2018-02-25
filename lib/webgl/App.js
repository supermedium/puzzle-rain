'use strict';

var THREE = require('three');
var TWEEN = require('tween.js');

var settings = require('../settings');
var State = require('../state/State');
var Events = require('../events/Events');

var camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 1000000);
var scene = new THREE.Scene();
var listener = new THREE.AudioListener();

var isReadyToStart = false;
var isModeSelected = false;

var VREffect = require('./effects/VREffect');
var VRControls = require('./controls/VRControls');
var OrbitControls = require('./controls/OrbitControls');

// TODO: Fix so models, audio, textures, etc. are loaded progressively
// (see issue #90).
var Sky = require('./assets/Sky');
var Ground = require('./assets/Ground');
var IntroBall = require('./assets/IntroBall');
var TimeRing = require('./assets/TimeRing');
var BigRing = require('./assets/BigRing');
var SuperHead = require('./assets/SuperHead');
var Cracks = require('./assets/Cracks');
var Sun = require('./assets/Sun');
var EndCredits = require('./assets/EndCredits');

var Crowd = require('./Crowd');

var Gamepad = require('./assets/Gamepad');

var sky, ground, introBall, timeRing, bigRing, superHead, cracks, sun, endCredits;
var crowd;
var keyLight, fillLight;

var SHADOW_MAP_WIDTH = 1024, SHADOW_MAP_HEIGHT = 1024;

var effect,
  controls,
  vrMode = false,
  vrDisplay = null,
  gamepadR,
  gamepadL,
  userHeight = 1.7,
  gameAreaWidth = 2,
  gameAreaHeight = 2;

var CameraController;
var renderer, rendererSpectator;
var cameraSpectator;
var Headset;
var headset;

var clock = new THREE.Clock();
global.clock = clock;

var isPaused = false;
var vrActivate = false;

window.addEventListener('vrdisplayactivate', function () {
  vrActivate = true;
});

function App () {
  function init (spectatorMode) {
    settings.spectatorMode = !!spectatorMode;

    State.add('scene', scene);
    scene.fog = new THREE.Fog(0xbc483e, 0, 75);
    State.add('camera', camera);
    State.add('listener', listener);
    camera.add(listener);

    renderer = require('./Renderer');
    if (settings.spectatorMode) {
      initSpectatorMode();
      console.log('Press "1 2 3 4..." to change to the active camera or press 0 to change to the headset camera');
    }

    effect = new THREE.VREffect(renderer);
    effect.setSize(window.innerWidth, window.innerHeight);

    // CONTROLS
    if (navigator.getVRDisplays) {
      controls = new THREE.VRControls(camera);
      controls.standing = true;
      vrMode = true;

      console.log('Waiting to detect a connected VR display...');

      navigator.getVRDisplays().then(function (displays) {
        if (displays.length > 0) {
          console.log('VR display detected: ' + displays[0].displayName);
          vrDisplay = displays[0];
          if (vrDisplay.stageParameters) {
            gameAreaWidth = vrDisplay.stageParameters.sizeX;
            gameAreaHeight = vrDisplay.stageParameters.sizeZ;
          }
          State.add('vrDisplay', vrDisplay);
          SHADOW_MAP_WIDTH = 4096;
          SHADOW_MAP_HEIGHT = 4096;
          addObjects();
        }
      }).catch(function (err) {
        console.error('Could not get VR displays:', err.stack);
      });
    } 
  }

  function addObjects () {
    sky = new Sky();
    scene.add(sky);

    State.add('roomArea', gameAreaWidth * gameAreaHeight);

    // Room reference to place objects
    // if (settings.debugMode) {
    //   var material = new THREE.MeshBasicMaterial({transparent: true,opacity: 0.1})
    //   var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1.5, 2), material)
    //   mesh.rotation.x = -Math.PI / 2
    //   mesh.position.y = 0.5
    //   scene.add(mesh)
    // }

    ground = new Ground();
    scene.add(ground);

    superHead = new SuperHead();
    scene.add(superHead);
    superHead.scale.set(2.5, 2.5, 2.5);
    superHead.position.y = -3.3;
    superHead.position.z = -4.5;

    sun = new Sun();
    sun.position.set(-16, 20, -36);
    scene.add(sun);

    cracks = new Cracks();
    cracks.scale.set(3, 1, 3);
    scene.add(cracks);

    endCredits = new EndCredits();
    scene.add(endCredits);

    // Light for testing purposes
    keyLight = new THREE.DirectionalLight(0xf4f4f4, 0.6, 0);
    if (!State.get('vrDisplay')) {
      keyLight.intensity = 0.6;
    }
    keyLight.castShadow = true;
    keyLight.shadow.camera.near = 20;
    keyLight.shadow.camera.far = 26;
    keyLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    keyLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    keyLight.position.set(-8, 10, -18);
    keyLight.shadow.bias = - 0.001;
    scene.add(keyLight);
    State.add('keyLight', keyLight);

    // if (settings.debugMode) {
    //   var directionalLightHelper = new THREE.DirectionalLightHelper(keyLight)
    //   scene.add(directionalLightHelper)
    // }

    fillLight = new THREE.PointLight(0xf4f4f4, 0.2, 0);
    fillLight.position.set(8, 10, 18);
    scene.add(fillLight);

    crowd = new Crowd();

    gamepadR = new Gamepad('R');
    scene.add(gamepadR);
    State.add('gamepadR', gamepadR);
    gamepadL = new Gamepad('L');
    scene.add(gamepadL);
    State.add('gamepadL', gamepadL);

    if (settings.debugMode) {
      gamepadR.position.y = 0.5;
      gamepadR.position.x = 0.1;
      gamepadL.position.y = 0.5;
      gamepadL.position.x = -0.1;
    }

    if (!settings.debugMode) {
      introBall = new IntroBall();
      introBall.position.set(0, 1.6, -0.5);
      State.add('introBall', introBall);
      scene.add(introBall);
    }

    timeRing = new TimeRing();
    scene.add(timeRing);

    bigRing = new BigRing();
    scene.add(bigRing);

    if (settings.spectatorMode) {
      camera.add(headset);
      scene.add(headset);
    }
    Events.on('shellRised', shellRised);
    Events.on('hideAll', hideAll);

    Events.on('elevationStarted', elevationStarted);
    Events.on('changeSpectatorMode', changeSpectatorMode);

    if (settings.debugMode) {
      Events.emit('stageChanged', 'experience');
    } else {
      Events.emit('stageChanged', 'intro');
    }

    window.addEventListener('resize', onWindowResize);

    animate();

    // TODO: control if meshes are loaded to start rendering.
    scene.visible = false;
    enterVR();
    Events.on('lastAssetIsLoaded', lastAssetIsLoaded);
  }

  function lastAssetIsLoaded () { 
    document.getElementById('preloader').classList.add('hidden');
  }

  function modeSelected (isSpectator) {
    isModeSelected = true;
    if (isSpectator) {
      changeSpectatorMode();
    }
    if (isReadyToStart) {
      enterVR();
    } else {
      // var enterVRBtn = document.querySelector('#enter-vr');
      // enterVRBtn.addEventListener('click', enterVR);
      // enterVRBtn.style.display = 'block';
    }
  }

  function enterVR () {
    scene.visible = true;
    effect.requestPresent();
    document.querySelector('#enter-vr').classList.add('hidden');
  }

  function shellRised () {
    moveShadowCamera();
  }

  function moveShadowCamera () {
    // Add wide shadow camera range to view the shadow of the final super head.
    new TWEEN.Tween(keyLight.shadow.camera).to({
      near: 8,
      far: 35
    }, 10000)
      .onUpdate(function () {
        keyLight.shadow.camera.updateProjectionMatrix();
      })
      .start();
  }

  function elevationStarted () {
    if (State.get('endMode') === 1) {
      // Add wide shadow camera range to view the shadow of the final super head.
      new TWEEN.Tween(keyLight.position).to({
        x: 0,
        z: 0
      }, 20000)
        .easing(TWEEN.Easing.Sinusoidal.Out)
        .start();
      moveShadowCamera();
    }
  }

  function hideAll () {
    // TODO: improve this hack to hide all and to prevent fps fallback.
    scene.remove(sky);
    scene.remove(ground);
    scene.remove(superHead);
    scene.remove(cracks);
    scene.remove(keyLight);
    scene.remove(fillLight);
    scene.remove(gamepadR);
    scene.remove(gamepadL);
    scene.remove(introBall);
  }

  function cameraSwitched (i) {
    cameraSpectator = State.get('cameraSpectator');
    if (controls) {
      controls.object = cameraSpectator;
    }

    if (cameraSpectator === camera) {
      headset.visible = false;
    } else {
      headset.visible = true;
    }
    // if (settings.trailerMode) {
    //   cameraSpectator.add(listener)
    // }
  }

  function onWindowResize (event) {
    if (settings.spectatorMode) {
      cameraSpectator.aspect = window.innerWidth / window.innerHeight;
      cameraSpectator.updateProjectionMatrix();
    }
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (vrMode) {
      if (vrDisplay && vrDisplay.isPresenting) {
        var leftEye = vrDisplay.getEyeParameters('left');
        var rightEye = vrDisplay.getEyeParameters('right');

        var width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
        var height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

        effect.setSize(width, height);
      } else {
        effect.setSize(window.innerWidth, window.innerHeight);
      }
    } else {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    if (settings.spectatorMode) {
      rendererSpectator.setSize(window.innerWidth, window.innerHeight);
    }
  }

  function animate () {
    if (isPaused) { return; }
    if (vrActivate) { 
      enterVR();
      vrActivate = false;
      console.log("YEAH"); 
    }
    render();
    effect.requestAnimationFrame(animate);
  }

  function render () {
    var delta = clock.getDelta();
    var time = clock.getElapsedTime();

    // Update VR headset position and apply to camera.
    controls.update();
    TWEEN.update();

    Events.emit('updateScene', delta, time);
    if (vrMode) {
      effect.render(scene, camera);
    } else {
      renderer.render(scene, camera);
    } 
  }

  function pauseAll (bool) {
    Events.emit('pauseAll', bool);
    isPaused = bool;
    if (!isPaused) {
      animate();
    }
  }

  function vrFallback () {
    if (settings.spectatorMode) {
      controls = new THREE.OrbitControls(camera, rendererSpectator.domElement);
    } else {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
    }
    controls.enableKeys = false;
    camera.position.set(0, userHeight, 0);
  }

  function initSpectatorMode () {
    CameraController = require('./cameras/CameraController');
    rendererSpectator = require('./RendererSpectator');
    Headset = require('./assets/Headset');

    headset = new Headset();
    Events.on('cameraSwitched', cameraSwitched);
    CameraController.init();
  }

  function changeSpectatorMode () {
    var container = document.querySelector('#container');
    if (!settings.spectatorMode) {
      container.removeChild(renderer.domElement);
      if (!CameraController) {
        initSpectatorMode();
        camera.add(headset);
        scene.add(headset);
      } else {
        container.appendChild(rendererSpectator.domElement);
      }
    } else {
      container.removeChild(rendererSpectator.domElement);
      container.appendChild(renderer.domElement);
    }
    settings.spectatorMode ^= true;
    var modeSpectator = 'OFF';
    if (settings.spectatorMode) {
      modeSpectator = 'ON';
    }
    console.log('spectator mode', modeSpectator);
  }

  return {
    init: init,
    modeSelected: modeSelected,
    enterVR: enterVR,
    isReadyToStart: isReadyToStart
  };
}

module.exports = new App();
