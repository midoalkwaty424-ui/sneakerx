import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import type { Product } from '../../lib/types'
import { useVaultCollageTexture } from '../../hooks/useVaultCollageTexture'

export type VaultDragState = {
  active: boolean
  moved: boolean
  startX: number
  startY: number
  startRotation: number
  rotation: number
}

export type VaultSceneProps = {
  products: Product[]
  active: number
  compact: boolean
  paused: boolean
  dragRef: RefObject<VaultDragState>
  onSelect: (index: number) => void
  onOpen: (index: number) => void
  onReady: () => void
}

/* -------------------------------------------------------------------------- */
/*                                 textures                                   */
/* -------------------------------------------------------------------------- */

function useGlowTexture() {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) return null

    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    gradient.addColorStop(0, 'rgba(217, 255, 67, 0.5)')
    gradient.addColorStop(0.42, 'rgba(217, 255, 67, 0.13)')
    gradient.addColorStop(1, 'rgba(217, 255, 67, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    return map
  }, [])

  const latest = useRef(texture)
  useEffect(() => {
    latest.current = texture
  }, [texture])
  useEffect(() => () => latest.current?.dispose(), [])

  return texture
}

/* -------------------------------------------------------------------------- */
/*                                  scene                                     */
/* -------------------------------------------------------------------------- */

type CardProps = {
  product: Product
  index: number
  count: number
  active: boolean
  radius: number
  dragRef: RefObject<VaultDragState>
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}

function Card({
  product,
  index,
  count,
  active,
  radius,
  dragRef,
  onSelect,
  onOpen,
}: CardProps) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2
  const texture = useVaultCollageTexture(product)
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const scale = useRef(0.9)

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return
    const goal = (active ? 1.04 : 0.9) * (hovered ? 1.035 : 1)
    scale.current += (goal - scale.current) * Math.min(1, delta * 5)
    node.scale.setScalar(scale.current)
    node.position.y =
      0.14 + Math.sin(state.clock.getElapsedTime() * 0.8 + index * 1.7) * 0.045
  })

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 8 || dragRef.current.moved) return
    if (active) onOpen(index)
    else onSelect(index)
  }

  return (
    <group
      ref={group}
      position={[Math.sin(angle) * radius, 0.14, Math.cos(angle) * radius]}
      rotation={[0, angle, 0]}
      onClick={onClick}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, -0.21]}>
        <planeGeometry args={[2.32, 2.68]} />
        <meshBasicMaterial
          color="#d9ff43"
          transparent
          opacity={active ? 0.16 : 0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <RoundedBox
        args={[2.14, 2.5, 0.14]}
        radius={0.08}
        smoothness={3}
        position={[0, 0, -0.08]}
      >
        <meshStandardMaterial
          color="#10141a"
          metalness={0.75}
          roughness={0.28}
          envMapIntensity={0.9}
        />
      </RoundedBox>

      {texture ? (
        <mesh position={[0, 0.06, 0.012]}>
          <planeGeometry args={[1.92, 2.22]} />
          <meshBasicMaterial key={texture.uuid} map={texture} toneMapped={false} />
        </mesh>
      ) : null}

      <mesh position={[0, -1.14, 0.03]}>
        <planeGeometry args={[1.72, 0.045]} />
        <meshBasicMaterial
          color="#d9ff43"
          toneMapped={false}
          transparent
          opacity={active ? 1 : 0.35}
        />
      </mesh>

      <mesh position={[0, -1.22, 0.03]}>
        <planeGeometry args={[1.72, 0.012]} />
        <meshBasicMaterial
          color="#f1eee5"
          toneMapped={false}
          transparent
          opacity={0.18}
        />
      </mesh>
    </group>
  )
}

type RingProps = Omit<VaultSceneProps, 'paused' | 'onReady'> & {
  radius: number
}

function Ring({
  products,
  active,
  compact,
  dragRef,
  onSelect,
  onOpen,
  radius,
}: RingProps) {
  const group = useRef<THREE.Group>(null)
  const current = useRef(0)
  const { camera, pointer } = useThree()
  const step = (Math.PI * 2) / Math.max(products.length, 1)

  useEffect(() => {
    current.current = 0
    dragRef.current.rotation = 0
  }, [products.length, dragRef])

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return

    if (dragRef.current.active) {
      current.current = dragRef.current.rotation
    } else {
      const base = -active * step
      const turns = Math.round((current.current - base) / (Math.PI * 2))
      const target = base + turns * Math.PI * 2
      const ease = 1 - Math.pow(0.0015, Math.min(delta, 0.05))
      current.current += (target - current.current) * ease
      if (Math.abs(target - current.current) < 0.0004) current.current = target
    }

    dragRef.current.rotation = current.current
    node.rotation.y = current.current
    node.rotation.x = -0.015
    node.position.y = Math.sin(state.clock.getElapsedTime() * 0.45) * 0.03

    const camX = pointer.x * (compact ? 0.1 : 0.22)
    const camY = 0.22 + pointer.y * (compact ? 0.06 : 0.12)
    camera.position.x += (camX - camera.position.x) * 0.06
    camera.position.y += (camY - camera.position.y) * 0.06
    camera.lookAt(0, 0.05, 0)
  })

  return (
    <group ref={group}>
      {products.map((product, index) => (
        <Card
          key={product.id}
          product={product}
          index={index}
          count={products.length}
          active={index === active}
          radius={radius}
          dragRef={dragRef}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}
    </group>
  )
}

function Floor() {
  const glow = useGlowTexture()

  return (
    <group position={[0, -1.52, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7.2, 64]} />
        <meshStandardMaterial
          color="#090c11"
          metalness={0.7}
          roughness={0.32}
          envMapIntensity={0.4}
        />
      </mesh>
      {glow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <planeGeometry args={[8.4, 8.4]} />
          <meshBasicMaterial
            map={glow}
            transparent
            opacity={0.6}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

function Dust({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const array = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 12
      array[i * 3 + 1] = Math.random() * 4.6 - 1.3
      array[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return array
  }, [count])

  useFrame((state) => {
    if (points.current) points.current.rotation.y = state.clock.getElapsedTime() * 0.018
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#f1eee5"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  const done = useRef(false)

  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current > 10) {
      done.current = true
      onReady()
    }
  })

  return null
}

export default function SneakerVaultScene({
  products,
  active,
  compact,
  paused,
  dragRef,
  onSelect,
  onOpen,
  onReady,
}: VaultSceneProps) {
  const radius = compact ? 2.7 : 3.05

  if (products.length === 0) return null

  return (
    <Canvas
      key={compact ? 'compact' : 'wide'}
      dpr={compact ? [1, 1.4] : [1, 1.75]}
      camera={{ position: [0, 0.22, compact ? 10.8 : 9.4], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      frameloop={paused ? 'never' : 'always'}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
      }}
      style={{ touchAction: 'pan-y' }}
    >
      <fog attach="fog" args={['#07080a', compact ? 10 : 9, compact ? 20 : 18]} />

      <ambientLight intensity={0.28} />
      <spotLight
        position={[0, 5.8, 4.4]}
        angle={0.55}
        penumbra={1}
        intensity={65}
        color="#f1eee5"
      />
      <pointLight position={[-3.6, 1.6, 2.6]} intensity={18} color="#a9c7ff" />
      <pointLight position={[3.4, 1.2, 2.2]} intensity={16} color="#ff5a36" />
      <pointLight position={[0, -0.4, 3.4]} intensity={12} color="#d9ff43" />

      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#050608']} />
        <Lightformer
          intensity={2.2}
          position={[0, 4, -3]}
          scale={[8, 3, 1]}
          color="#d9ff43"
        />
        <Lightformer
          intensity={1.4}
          position={[-4, 1, 2]}
          scale={[3, 5, 1]}
          color="#a9c7ff"
        />
        <Lightformer
          intensity={1.1}
          position={[4, 1, 1]}
          scale={[3, 5, 1]}
          color="#ff5a36"
        />
        <Lightformer
          intensity={1.3}
          position={[0, -3, 2]}
          scale={[8, 2, 1]}
          color="#f1eee5"
        />
      </Environment>

      <Ring
        products={products}
        active={active}
        compact={compact}
        dragRef={dragRef}
        onSelect={onSelect}
        onOpen={onOpen}
        radius={radius}
      />
      <Floor />
      <Dust count={compact ? 70 : 130} />
      <SceneReady onReady={onReady} />
    </Canvas>
  )
}
