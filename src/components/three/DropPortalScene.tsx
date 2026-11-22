import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useVaultCollageTexture } from '../../hooks/useVaultCollageTexture'
import type { Product } from '../../lib/types'

export type DropPortalSceneProps = {
  products: Product[]
  progressRef: RefObject<number>
  compact: boolean
  paused: boolean
  onReady: () => void
}

const CARD_ASPECT = 592 / 512

type PortalCardProps = {
  product: Product
  index: number
  count: number
  progressRef: RefObject<number>
  compact: boolean
  onTexture: () => void
}

function PortalCard({
  product,
  index,
  count,
  progressRef,
  compact,
  onTexture,
}: PortalCardProps) {
  const texture = useVaultCollageTexture(product)
  const group = useRef<THREE.Group>(null)
  const angle = (index / Math.max(count, 1)) * Math.PI * 2 + 0.36
  const radius = compact ? 1.7 : 2.45
  const x = Math.sin(angle) * radius
  const y = Math.cos(angle) * (compact ? 1.18 : 1.58)
  const baseZ = -2.4 - index * 1.32
  const size = compact ? 1.12 : 1.4

  useEffect(() => {
    if (texture) onTexture()
  }, [texture, onTexture])

  useFrame((state) => {
    const node = group.current
    if (!node) return
    const time = state.clock.getElapsedTime()
    const progress = progressRef.current ?? 0
    const z = baseZ + progress * 13.4
    const visible = THREE.MathUtils.clamp((6.2 - z) / 2.6, 0, 1)

    node.position.set(x, y + Math.sin(time * 0.65 + index * 1.3) * 0.07, z)
    node.rotation.y = Math.sin(angle) * 0.14
    node.rotation.z = Math.sin(time * 0.35 + index) * 0.035
    node.scale.setScalar(Math.max(0.001, visible))
  })

  if (!texture) return null

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[size, size * CARD_ASPECT]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[size + 0.055, size * CARD_ASPECT + 0.055]} />
        <meshBasicMaterial color="#d9ff43" toneMapped={false} transparent opacity={0.28} />
      </mesh>
    </group>
  )
}

function PortalRings({ progressRef }: { progressRef: RefObject<number> }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    const node = group.current
    if (!node) return
    const progress = progressRef.current ?? 0
    node.position.z = progress * 12.4
    node.rotation.z = state.clock.getElapsedTime() * 0.035
  })

  return (
    <group ref={group}>
      {[-2.6, -6.2, -9.8].map((z, index) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, 0, index * 0.5]}>
          <torusGeometry args={[3.05 + index * 0.22, 0.009, 6, 96]} />
          <meshBasicMaterial
            color="#d9ff43"
            transparent
            opacity={0.2 - index * 0.04}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function CameraRig({ compact }: { compact: boolean }) {
  const { camera, pointer } = useThree()

  useFrame(() => {
    const targetX = pointer.x * (compact ? 0.12 : 0.26)
    const targetY = 0.1 + pointer.y * (compact ? 0.07 : 0.14)
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
    camera.lookAt(0, 0, -3)
  })

  return null
}

function SceneReady({
  onReady,
  loadedRef,
  target,
}: {
  onReady: () => void
  loadedRef: RefObject<number>
  target: number
}) {
  const frames = useRef(0)
  const done = useRef(false)

  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current > 8 && loadedRef.current >= target) {
      done.current = true
      onReady()
    }
  })

  return null
}

export default function DropPortalScene({
  products,
  progressRef,
  compact,
  paused,
  onReady,
}: DropPortalSceneProps) {
  const loadedRef = useRef(0)
  const target = Math.min(4, products.length)
  const handleTexture = useCallback(() => {
    loadedRef.current += 1
  }, [])

  useEffect(() => {
    loadedRef.current = 0
  }, [products.length])

  if (products.length === 0) return null

  return (
    <Canvas
      key={compact ? 'portal-compact' : 'portal-wide'}
      dpr={compact ? [1, 1.35] : [1, 1.55]}
      camera={{ position: [0, 0.1, 7], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      frameloop={paused ? 'never' : 'always'}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ touchAction: 'pan-y' }}
    >
      <fog attach="fog" args={['#07080a', 8.5, 21]} />
      <ambientLight intensity={0.4} />

      <CameraRig compact={compact} />
      <PortalRings progressRef={progressRef} />

      {products.map((product, index) => (
        <PortalCard
          key={product.id}
          product={product}
          index={index}
          count={products.length}
          progressRef={progressRef}
          compact={compact}
          onTexture={handleTexture}
        />
      ))}

      <SceneReady onReady={onReady} loadedRef={loadedRef} target={target} />
    </Canvas>
  )
}
