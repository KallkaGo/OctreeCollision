import * as THREE from 'three'
import { Capsule } from 'three/examples/jsm/math/Capsule'
import { Octree } from 'three/examples/jsm/math/Octree'
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper'

const DIRECTIONS = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
export default class CharacterControls {
  // state
  toggleRun = true
  fadeDuration = 0.2
  rotateAngle = new THREE.Vector3(0, 1, 0)
  walkDirection = new THREE.Vector3()
  runVelocity = 5
  walkVelocity = 2
  //是否开启碰撞
  isCollision = false


  constructor(model, mixer, animationsMap, orbitControl, camera, currentAction) {
    this.model = model
    this.mixer = mixer
    this.animationsMap = animationsMap
    this.orbitControl = orbitControl
    this.camera = camera
    this.currentAction = currentAction
    this.keyState = {}
    this.initEvent()
    this.animationsMap.forEach((item, key) => {
      if (key === currentAction) {
        item.play()
      }
    })

  }


  switchRunToggle() {
    this.toggleRun = !this.toggleRun
  }
  update(delta) {
    let play = ''
    const directionPressed = DIRECTIONS.some(key => this.keyState[key] === true)
    if (this.toggleRun && directionPressed) {
      play = 'Run'
    } else if (directionPressed) {
      play = 'Walk'
    } else {
      play = 'Idle'
    }
    if (this.currentAction !== play) {
      const toPlay = this.animationsMap.get(play)
      const curPlay = this.animationsMap.get(this.currentAction)
      curPlay.fadeOut(this.fadeDuration)
      toPlay.reset().fadeIn(this.fadeDuration).play()
      this.currentAction = play
    }
    this.mixer.update(delta)
   

    if (this.currentAction === 'Run' || this.currentAction === 'Walk' || (this.currentAction === 'Idle' && this.keyState['Space'] === true) || !this.player?.onFloor ) {
      // 计算相机和模型之间的夹角
      const angleCameraDirection = Math.atan2(
        (this.camera.position.x - this.model.position.x),
        (this.camera.position.z - this.model.position.z)
      )
      //偏移角
      const offset = this.directionOffset(this.keyState)


      // 旋转模型
      const rotateQuarternion = new THREE.Quaternion()
      rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleCameraDirection + offset)
      //线性旋转 有过渡
      this.model.quaternion.rotateTowards(rotateQuarternion, 0.2)


      // 计算方向
      this.camera.getWorldDirection(this.walkDirection)
      this.walkDirection.y = 0
      this.walkDirection.normalize()
      this.walkDirection.applyAxisAngle(this.rotateAngle, offset)


      //行径速率
      const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity
      // 移动摄像机和物体

      if (this.isCollision) {
        let damping = Math.exp(-4 * delta) - 1
        if (!this.player.onFloor) {
          this.player.velocity.y -= this.GRAVITY * delta
          damping *= 0.1
        }
        if(this.player.onFloor){
          if (this.keyState['Space']) {
            this.player.velocity.y = 10
          }
        }
       
        this.player.velocity.addScaledVector(this.player.velocity, damping)
        const deltaPosition = this.player.velocity.clone().multiplyScalar(delta)
        const speedDelta = this.walkDirection.multiplyScalar(velocity * delta)
        speedDelta.add(deltaPosition)

        this.model.position.add(speedDelta)
        this.camera.position.add(speedDelta)
        const Vector3 = new THREE.Vector3(this.model.position.x, this.model.position.y + 1, this.model.position.z)
        this.orbitControl.target = Vector3

        this.player.geometry.translate(speedDelta)
        /* 在位移后进行碰撞检测 */
        this.playerCollisions()
      }

    }

  }
  playerCollisions() {
    // 获取碰撞检测的结果
    const result = this.worldOctree.capsuleIntersect(this.player.geometry)
    if (result) {
      this.player.onFloor = result.normal.y > 0
      // 添加反作用力
      if (!this.player.onFloor) {
        // Vector3.addScaledVector（v,s)将v和s的倍数添加到此向量

        this.player.velocity.addScaledVector(result.normal, -result.normal.dot(this.player.velocity))
        // const speedProjection = this.player.velocity.dot(result.normal)
        // const coefficient = 0.5 // 反作用力与速度大小的比例系数
        // const reactionForce = result.normal.multiplyScalar(-speedProjection * coefficient)

        // // 将计算出的反作用力应用到玩家的速度向量上
        // this.player.velocity.add(reactionForce)
      }
      /* 
      其作用是将法向量(result.normal)按照最小平移向量(result.depth)的大小进行缩放，以得到一个表示最小平移距离的向量。
      这个向量的方向与法向量的方向相同，它表示几何体需要沿着法向量的方向移动多少距离，才能与物体分离
      */
      const res = result.normal.multiplyScalar(result.depth)
      this.model.position.add(res)
      this.camera.position.add(res)
      this.player.geometry.translate(res)
    } else {
      this.player.onFloor = false
    }
  }

  initEvent() {
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey) {
        this.switchRunToggle()
      }
      this.keyState[e.code] = true
      
    })

    document.addEventListener('keyup', (e) => {
      this.keyState[e.code] = false
    })
  }
  directionOffset(keyPressed) {
    let offset = 0  //w
    if (keyPressed[`KeyW`]) {
      if (keyPressed[`KeyA`]) {
        offset = Math.PI / 4 //w+a
      } else if (keyPressed[`KeyD`]) {
        offset = -Math.PI / 4 //w+d
      }

    } else if (keyPressed[`KeyS`]) {
      if (keyPressed[`KeyA`]) {
        offset = Math.PI / 2 + Math.PI / 4
      } else if (keyPressed[`KeyD`]) {
        offset = -Math.PI / 2 - Math.PI / 4
      } else {
        offset = -Math.PI
      }
    } else if (keyPressed[`KeyA`]) {
      offset = Math.PI / 2 //a
    } else if (keyPressed[`KeyD`]) {
      offset = -Math.PI / 2 //d
    }
    return offset
  }

  initOctree(needCollision) {
    this.isCollision = true
    this.GRAVITY = 30
    // player
    this.player = {
      geometry: new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1.35, 0), 0.35),
      // 速度
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      onFloor: true
    }
    // Octree
    this.worldOctree = new Octree()
    this.worldOctree.fromGraphNode(needCollision)

    // helper
    this.helper = new OctreeHelper(this.worldOctree)

    this.player.geometry.translate(this.model.position)
  }
}