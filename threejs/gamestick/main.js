import * as THREE from 'three';
import { FirstPersonControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/FirstPersonControls.js';

let camera, scene, renderer, controls;
let minimapCamera, minimapRenderer;
let moveForward = false;
let canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const objects = [];

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 10, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new FirstPersonControls(camera, renderer.domElement);
  controls.lookSpeed = 0.1;
  controls.movementSpeed = 0;

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 200, 0);
  scene.add(light);

  createScenery();
  setupJoystick();
  setupButtons();
  //setupMinimap();

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createScenery() {
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  objects.push(floor);

  const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });

  for (let i = 0; i < 10; i++) {
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(
      Math.random() * 100 - 50,
      2.5,
      Math.random() * 100 - 50
    );
    scene.add(box);
    objects.push(box);
  }

  camera.position.set(0, 20, 0);
}

function setupJoystick() {
  const joystickContainer = document.getElementById('joystick-container');
  const joystick = document.getElementById('joystick');
  let joystickActive = false;
  let startX, startY;

  joystickContainer.addEventListener('pointerdown', (event) => {
    joystickActive = true;
    startX = event.clientX;
    startY = event.clientY;
  });

  window.addEventListener('pointermove', (event) => {
    if (!joystickActive) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    camera.rotation.y -= deltaX * 0.002;
    camera.rotation.x -= deltaY * 0.002;
    startX = event.clientX;
    startY = event.clientY;
  });

  window.addEventListener('pointerup', () => {
    joystickActive = false;
  });
}

function setupButtons() {
  const buttonA = document.getElementById('buttonA');
  const buttonB = document.getElementById('buttonB');

  buttonA.addEventListener('pointerdown', () => {
    if (canJump) velocity.y += 10;
    canJump = false;
  });

  buttonB.addEventListener('pointerdown', () => {
    moveForward = true;
  });

  buttonB.addEventListener('pointerup', () => {
    moveForward = false;
  });
}

function animate() {
  requestAnimationFrame(animate);

  const delta = 0.1;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  velocity.y -= 9.8 * 100.0 * delta;

  direction.z = Number(moveForward) - Number(false);
  direction.normalize();

  if (moveForward) velocity.z -= direction.z * 0.01 * delta;

  raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
  const intersections = raycaster.intersectObjects(scene.children, false);
  const onObject = intersections.length > 0;

  if (onObject) {
    velocity.y = Math.max(0, velocity.y);
    canJump = true;
  }

  camera.position.add(velocity.clone().multiplyScalar(delta));

  controls.update(delta);
  renderer.render(scene, camera);
}

