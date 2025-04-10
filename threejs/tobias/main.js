import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';

let moveForward = false;
let moveBack = false;
let joystickActive = false;
let horizontalInput = 0;
let verticalInput = 0;

const settings = {
    rotationSpeed: 0.02,
    disSpeed: 0.02
};

//---- tobias head code
// Load the GLTF model
// Dummy texture (1x1 white pixel) for meshes without textures
const dummyTexture = new THREE.TextureLoader().load('./sq.jpg');

const loader = new GLTFLoader();

loader.load('./skull.glb', (gltf) => {
    const skull = gltf.scene;

    // OPTIONAL: find the "head" in your original model to match position/scale
    const head = scene.getObjectByName('Head'); // Replace 'Head' with the actual name if needed

    if (head) {
        skull.position.copy(head.position);
        skull.scale.copy(head.scale);
        skull.rotation.copy(head.rotation); // if needed
    } else {
        // fallback default position
        skull.position.set(0, 7, 0);
        var scale = 5.2;
        skull.scale.set(scale, scale, scale);
    }

    scene.add(skull);
});

loader.load('./tobiascubehead.glb', (gltf) => {
    const model = gltf.scene;


    model.traverse((child) => {
        if (child.isMesh && child.material && child.material.isMeshStandardMaterial) {
            const material = child.material;

            material.onBeforeCompile = (shader) => {
                // Add custom uniforms
                shader.uniforms.uTime = { value: 0 };
                shader.uniforms.uDissolveThreshold = { value: 0.1 };
                shader.uniforms.uDissolveColor = { value: new THREE.Color(0x000000) };
            
                // Inject varying into vertex shader
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec2 vUv;`
                );
            
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <uv_vertex>`,
                    `#include <uv_vertex>
                    vUv = uv;`
                );
            
                // Inject code into fragment shader
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec2 vUv;
                    uniform float uTime;
                    uniform float uDissolveThreshold;
                    uniform vec3 uDissolveColor;
            
                    float random(vec2 st) {
                        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                    }`
                );
            
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <dithering_fragment>`,
                    `
                    float dissolveFactor = vUv.y + sin(uTime) * 0.5;
                    float noise = random(vUv + uTime * 0.1);
                    
                    if (noise < dissolveFactor - uDissolveThreshold) discard;
            
                    if (abs(noise - (dissolveFactor - uDissolveThreshold)) < 0.02) {
                        gl_FragColor.rgb = mix(gl_FragColor.rgb, uDissolveColor, 0.8);
                    }
            
                    #include <dithering_fragment>
                    `
                );
            
                // Store reference for updating uniforms
                child.userData.shader = shader;
            };


        }
    });

    model.position.set(0, 7, 0);
    model.scale.set(5, 5, 5);
    scene.add(model);
});
//----

const direction = new THREE.Vector3();
// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);

// Camera - positioned above the ground looking down slightly
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 15);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

setupButtons();

// prevent click weirdness buttons
document.querySelectorAll('.button').forEach(btn => {
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('selectstart', e => e.preventDefault());
    btn.addEventListener('dragstart', e => e.preventDefault());
});
// prevent click weirdness buttons


document.getElementById('rotationSpeed').addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    settings.rotationSpeed = value;
    document.getElementById('rotationSpeedValue').textContent = value.toFixed(2);
});



function setupButtons() {
    const buttonA = document.getElementById('buttonA');
    const buttonB = document.getElementById('buttonB');


    buttonA.addEventListener('pointerdown', () => {
        moveBack = true;
    });

    buttonA.addEventListener('pointerup', () => {
        moveBack = false;
    });

    buttonB.addEventListener('pointerdown', () => {
        moveForward = true;
    });

    buttonB.addEventListener('pointerup', () => {
        moveForward = false;
    });
}



// Render loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    const delta = 0.1;
    //const rotationSpeed = 0.02;

    if (joystickActive) {

        rotateCamera(horizontalInput, verticalInput);
        /*
        camera.rotation.y -= horizontalInput * rotationSpeed;
        camera.rotation.x -= verticalInput * rotationSpeed;

        const maxVerticalRotation = Math.PI / 2;
        camera.rotation.x = Math.max(-maxVerticalRotation, Math.min(maxVerticalRotation, camera.rotation.x));
        */
    }

    //direction.z = Number(moveForward) - Number(false);
    //direction.normalize();

    if (moveForward) {
        // Move camera forward in the direction it's looking (ignoring vertical tilt)
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; // flatten to horizontal movement
        forward.normalize();

        camera.position.add(forward.multiplyScalar(5 * delta)); // 2 is speed multiplier
    }

    if (moveBack) {
        // Move camera forward in the direction it's looking (ignoring vertical tilt)
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; // flatten to horizontal movement
        forward.normalize();

        camera.position.add(forward.multiplyScalar(-5 * delta)); // 2 is speed multiplier
    }

    // Update dissolve animation
    scene.traverse((child) => {
        if (child.isMesh && child.userData.shader) {
            child.userData.shader.uniforms.uTime.value = performance.now() / 1000;
        }
    });


}
animate();

// Handle resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
//-------------

const joyStickHandle = document.querySelector(".joystick-handle");
const joyStickContainer = document.querySelector(".joystick");

//joyStickContainer.addEventListener("touchstart", handleJoystickStart);
//----
joyStickContainer.addEventListener("touchstart", handleJoystickStart, { passive: true });
joyStickContainer.addEventListener("touchmove", handleJoystickMove, { passive: true });
joyStickContainer.addEventListener("touchend", handleJoystickEnd, { passive: true });


document.addEventListener("touchstart", handleTouchStart, { passive: true });
document.addEventListener("touchmove", handleTouchMove, { passive: true });
document.addEventListener("touchend", handleTouchEnd, { passive: true });

function handleTouchStart(event) {
    // Determine if the touch is outside the joystick; if so, handle camera rotation
    if (!event.target.closest('.joystick')) {
        // Initialize camera rotation handling
    }
}

function handleTouchMove(event) {
    // Handle camera rotation if the touch is outside the joystick
    if (!event.target.closest('.joystick')) {
        // Process camera rotation based on touch movement
    }
}

function handleTouchEnd(event) {
    // End camera rotation handling
}
//----

function handleJoystickStart(event) {
    joystickActive = true;
    handleJoystickMove(event);
    document.addEventListener("touchmove", handleJoystickMove);
    document.addEventListener("touchend", handleJoystickEnd);
}

//-----
function handleJoystickMove(event) {
    const { angle, distance } = calculateCircleAngleAndDistance(
        event.touches[0].clientX,
        event.touches[0].clientY
    );

    joyStickHandle.style.transform = `translateY(${-distance}px)`;
    joyStickHandle.parentElement.style.transform = `rotate(${angle}deg)`;
    //---
    const touch = event.touches[0];
    const { x, y, width, height } = joyStickContainer.getBoundingClientRect();
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;

    const distance2 = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), height / 2);
    const angle2 = Math.atan2(deltaY, deltaX);

    // Normalize the distance to a range of 0 to 1
    const normalizedDistance = distance2 / (height / 2);

    // Calculate horizontal and vertical inputs
    horizontalInput = Math.cos(angle2) * normalizedDistance;
    verticalInput = Math.sin(angle2) * normalizedDistance;

    //console.log("horizontal" + horizontalInput);
    //console.log("vert" + verticalInput);

    //joyStickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Apply the inputs to rotate the camera
    rotateCamera(horizontalInput, verticalInput);
    //--
}

//let cameraRotationX = 0;
//let cameraRotationY = 0;
let cameraQuaternion = new THREE.Quaternion();
let euler = new THREE.Euler(0, 0, 0, 'YXZ'); // 'YXZ' order allows for intuitive controls

function rotateCamera(horizontalInput, verticalInput) {
    //const rotationSpeed = 0.04; // Adjust rotation speed as needed
    const rotationSpeed = settings.rotationSpeed;

    euler.y -= horizontalInput * rotationSpeed; // yaw
    euler.x -= verticalInput * rotationSpeed; // pitch
    // Update rotation angles based on input
    //cameraRotationY -= horizontalInput * rotationSpeed;
    //cameraRotationX -= verticalInput * rotationSpeed;

    // Clamp the vertical rotation to prevent flipping
    const maxPitch = Math.PI / 2; // 90 degrees
    //const maxVerticalRotation = Math.PI / 2; // 90 degrees
    //cameraRotationX = Math.max(-maxVerticalRotation, Math.min(maxVerticalRotation, cameraRotationX));
    euler.x = Math.max(-maxPitch, Math.min(maxPitch, euler.x));

    // Apply rotations to the camera
    //camera.rotation.set(cameraRotationX, cameraRotationY, 0);
    cameraQuaternion.setFromEuler(euler);
    camera.quaternion.copy(cameraQuaternion);
}


//--------

function calculateAngle(centerX, centerY, pointX, pointY) {
    const deltaX = pointX - centerX;
    const deltaY = pointY - centerY;
    const angleInRadians = Math.atan2(deltaY, deltaX);
    let angleInDegrees = (angleInRadians * 180) / Math.PI + 90;
    if (angleInDegrees < 0) angleInDegrees += 360;
    return angleInDegrees;
}

function calculateCircleAngleAndDistance(clientX, clientY) {
    const { x, y, width, height } = joyStickContainer.getBoundingClientRect();

    let distance = Math.sqrt(
        Math.pow(clientX - (x + width / 2), 2) +
        Math.pow(clientY - (y + height / 2), 2)
    );

    distance = clamp(distance, 0, height / 2);

    return {
        angle: calculateAngle(x + width / 2, y + height / 2, clientX, clientY),
        distance,
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function handleJoystickEnd(event) {
    if (event.touches.length === 0) {
        joystickActive = false;
        horizontalInput = 0;
        verticalInput = 0;
        joyStickHandle.style.transform = "";
        joyStickHandle.parentElement.style.transform = "";
        document.removeEventListener("touchmove", handleJoystickMove);
        document.removeEventListener("touchend", handleJoystickEnd);
    }
}



