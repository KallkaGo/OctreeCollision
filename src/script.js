import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import CharacterControls from './charactorControls'
// import octreeCollision from './octreeCollision'

/* 
CollisionControl
*/
let TppControl


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}


/**
 * Base
 */
// Debug
const gui = new dat.GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Textures
 */
const env = textureLoader.load('/img/Sky_Mirrored_02.jpg')
env.mapping = THREE.EquirectangularReflectionMapping
scene.environment = env



/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(6, 4, 5)

// camera.rotation.order = 'YZX'
scene.add(camera)

/* 
Controls
*/
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true


/* 
RayCaster
*/
const raycaster = new THREE.Raycaster()




/**
 * Model
 */
const modelArr = []

let sceneModel = null
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }))
floor.rotation.x = -Math.PI / 2
floor.position.y -= 0.01
scene.add(floor)
modelArr.push(floor)
console.log(scene.children[1] === floor)
// gltfLoader.load('/gallery.glb', (gltf) => {
//     gltf.scene.scale.set(2, 2, 2)
//     sceneModel = gltf.scene
//     scene.add(sceneModel)
//     TppControl.initOctree(sceneModel)
//     // scene.add(TppControl.helper)

//     // collision = new octreeCollision(camera, gltf.scene)
//     // scene.add(collision.user)
// })

gltfLoader.load('/Soldier.glb', (gltf) => {
    const model = gltf.scene
    model.traverse(function (object) {
        if (object.isMesh) object.castShadow = false
    })
    model.position.set(8, 0, 0)

    controls.target.set(8, 1, 0)
    scene.add(model)

    const gltfAnimations = gltf.animations
    const mixer = new THREE.AnimationMixer(model)
    const animationsMap = new Map()
    gltfAnimations.filter(a => a.name != 'TPose').forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a))
    })
    TppControl = new CharacterControls(model, mixer, animationsMap, controls, camera, 'Idle')
    TppControl.initOctree(floor)
})



/* 
helper
*/
const axesHelper = new THREE.AxesHelper(10)
scene.add(axesHelper)


window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})





/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()


const tick = () => {
    const deltaTime = Math.min(0.05, clock.getDelta())

    // if (collision) {
    //     collision.handleControls(deltaTime)
    //     collision.uodatePlayer(deltaTime)
    // }

    if (TppControl) {

        const rayDirection = new THREE.Vector3()
        rayDirection.subVectors(camera.position, controls.target).normalize()
        raycaster.set(controls.target, rayDirection)
        raycaster.near = 0.1
        raycaster.far = camera.position.distanceTo(controls.target)
        // Test
        const intersects = raycaster.intersectObjects(modelArr, true)

        if (intersects.length > 0) {
            const point = new THREE.Vector3().copy(intersects[0].point)
            camera.position.copy(point)

        }

        TppControl.update(deltaTime)

    }



    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()