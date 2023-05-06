import { Capsule } from 'three/examples/jsm/math/Capsule'
import { Octree } from 'three/examples/jsm/math/Octree'
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper'
import * as THREE from 'three'

export default class octreeCollision {
  constructor(camera, needCollision) {
    this.camera = camera
    this.GRAVITY = 30
    // player
    this.player = {
      geometry: new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 3, 0), 0.35),
      // 速度
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      onFloor: false
    }
    // Octree
    this.worldOctree = new Octree()
    this.worldOctree.fromGraphNode(needCollision)

    // helper
    this.helper = new OctreeHelper(this.worldOctree)
    // controls
    this.keyState = {}
    this.initEvent()

  }
  initEvent () {
    // mousedown <=> esc
    document.addEventListener('mousedown', (e) => {
      document.body.requestPointerLock()
    })

    // mousemove
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === document.body) {
        this.camera.rotation.y -= e.movementX / 500
        // this.camera.rotation.x -= e.movementY / 500
        this.emitFov(e.movementY / 500)
      }
    })
    // key
    document.addEventListener('keydown', (e) => {
      this.keyState[e.code] = true
    })

    document.addEventListener('keyup', (e) => {
      this.keyState[e.code] = false
    })
  }
  handleControls (deltaTime) {
    const speedDelta = deltaTime * (this.player.onFloor ? 50 : 8)
    if (this.keyState['KeyW']) {
      this.player.velocity.add(this.getForwardVector().multiplyScalar(speedDelta))
    }
    if (this.keyState['KeyS']) {
      this.player.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta))
    }
    if (this.keyState['KeyA']) {
      this.player.velocity.add(this.getSideVector().multiplyScalar(-speedDelta))
    }
    if (this.keyState['KeyD']) {
      this.player.velocity.add(this.getSideVector().multiplyScalar(speedDelta))
    }
    if (this.player.onFloor) {
      if (this.keyState['Space']) {
        this.player.velocity.y = 15
      }
    }
  }
  getForwardVector () {
    this.camera.getWorldDirection(this.player.direction)
    this.player.direction.y = 0
    this.player.direction.normalize()
    return this.player.direction
  }
  getSideVector () {
    this.camera.getWorldDirection(this.player.direction)
    this.player.direction.y = 0
    this.player.direction.normalize()
    return this.player.direction.cross(this.camera.up)
  }
  uodatePlayer (deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1
    /* 若不在地面上 则在空中自由落体 */
    if (!this.player.onFloor) {
      this.player.velocity.y -= this.GRAVITY * deltaTime
      damping *= 0.1
    }
    this.player.velocity.addScaledVector(this.player.velocity, damping)
    const deltaPosition = this.player.velocity.clone().multiplyScalar(deltaTime)
    this.player.geometry.translate(deltaPosition)
    /* 在位移后进行碰撞检测 */
    this.playerCollisions()
    this.camera.position.copy(this.player.geometry.end)
  }
  playerCollisions () {
    // 获取碰撞检测的结果
    const result = this.worldOctree.capsuleIntersect(this.player.geometry)
    if (result) {
      this.player.onFloor = result.normal.y > 0
      // 添加反作用力
      if (!this.player.onFloor) {
        // Vector3.addScaledVector（v,s)将v和s的倍数添加到此向量

        // this.player.velocity.addScaledVector(result.normal, -result.normal.dot(this.player.velocity))
        const speedProjection = this.player.velocity.dot(result.normal)
        const coefficient = 0.5 // 反作用力与速度大小的比例系数
        const reactionForce = result.normal.multiplyScalar(-speedProjection * coefficient)

        // 将计算出的反作用力应用到玩家的速度向量上
        this.player.velocity.add(reactionForce)
      }
      /* 
      其作用是将法向量(result.normal)按照最小平移向量(result.depth)的大小进行缩放，以得到一个表示最小平移距离的向量。
      这个向量的方向与法向量的方向相同，它表示几何体需要沿着法向量的方向移动多少距离，才能与物体分离
      */
      this.player.geometry.translate(result.normal.multiplyScalar(result.depth))
    } else {
      this.player.onFloor = false
    }
  }

  emitFov (del) {
    let target = this.camera.rotation.x
    if (target - del < -0.8) {
      target = -0.8
    }
    else if (target - del > 0.8) {
      console.log(2)
      target = 0.8
    } else {
      target = target - del
    }
    this.camera.rotation.x = target

  }

}