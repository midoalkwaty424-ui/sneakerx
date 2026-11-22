import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useRef } from 'react'
import type { Group } from 'three'

type MonolithSceneProps = {
  active: boolean
  onReady: () => void
}

function ChromeMaterial() {
  return (
    <meshStandardMaterial
      color="#cdd1d8"
      metalness={1}
      roughness={0.17}
      envMapIntensity={1.55}
    />
  )
}

type Shard = { position: [number, number, number]; size: number; color: string }

const SHARDS: Shard[] = [
  { position: [1.22, 0.78, 0.28], size: 0.1, color: '#d9ff43' },
  { position: [-1.28, 0.94, 0.18], size: 0.07, color: '#a9c7ff' },
  { position: [1.34, -0.92, 0.3], size: 0.06, color: '#f1eee5' },
  { position: [-1.18, -1.02, 0.24], size: 0.09, color: '#ff5a36' },
  { position: [0.72, 1.32, -0.2], size: 0.05, color: '#d9ff43' },
  { position: [-0.86, -1.38, -0.14], size: 0.05, color: '#a9c7ff' },
]

function Shards() {
  const group = useRef<Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.getElapsedTime()
    group.current.rotation.y = t * 0.14
    group.current.rotation.x = Math.sin(t * 0.2) * 0.16
  })

  return (
    <group ref={group}>
      {SHARDS.map((shard, index) => (
        <mesh
          key={index}
          position={shard.position}
          rotation={[index * 0.8, index * 0.55, index * 0.3]}
        >
          <boxGeometry args={[shard.size, shard.size, shard.size]} />
          <meshStandardMaterial
            color={shard.color}
            emissive={shard.color}
            emissiveIntensity={0.9}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

function Mark() {
  const root = useRef<Group>(null)
  const spin = useRef<Group>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (root.current) {
      root.current.rotation.y += (state.pointer.x * 0.3 - root.current.rotation.y) * 0.045
      root.current.rotation.x += (-state.pointer.y * 0.16 - root.current.rotation.x) * 0.045
      root.current.position.y = 0.06 + Math.sin(t * 0.55) * 0.06
    }
    if (spin.current) {
      spin.current.rotation.y = Math.sin(t * 0.2) * 0.42
      spin.current.rotation.z = -0.12 + Math.sin(t * 0.14) * 0.04
    }
  })

  return (
    <group ref={root} scale={3.1}>
      <group ref={spin}>
        <RoundedBox
          args={[2.1, 0.46, 0.46]}
          radius={0.1}
          smoothness={3}
          rotation={[0, 0, Math.PI / 4]}
        >
          <ChromeMaterial />
        </RoundedBox>
        <RoundedBox
          args={[2.1, 0.46, 0.46]}
          radius={0.1}
          smoothness={3}
          rotation={[0, 0, -Math.PI / 4]}
        >
          <ChromeMaterial />
        </RoundedBox>
      </group>
      <Shards />
    </group>
  )
}

export default function MonolithScene({ active, onReady }: MonolithSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 5.5], fov: 45 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        onReady()
      }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 4, 3]} intensity={1.1} color="#f1eee5" />
      <pointLight position={[0, 0, 3]} intensity={9} color="#d9ff43" />
      <pointLight position={[-3, 1, 2]} intensity={5} color="#a9c7ff" />

      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#050608']} />
        <Lightformer
          intensity={3.4}
          position={[0, 3.2, -2.4]}
          scale={[7, 2.4, 1]}
          color="#d9ff43"
        />
        <Lightformer
          intensity={2.1}
          position={[-3.4, 0.6, 2.2]}
          scale={[2, 5, 1]}
          color="#a9c7ff"
        />
        <Lightformer
          intensity={1.7}
          position={[3.4, 1.2, 1.4]}
          scale={[2, 4.4, 1]}
          color="#ff5a36"
        />
        <Lightformer
          intensity={1.2}
          position={[0, -2.8, 1.6]}
          scale={[6, 1.6, 1]}
          color="#f1eee5"
        />
      </Environment>

      <Mark />
    </Canvas>
  )
}
