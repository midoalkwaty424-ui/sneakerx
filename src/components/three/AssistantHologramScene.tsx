import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

export type AssistantPointer = { x: number; y: number }

type PointerRef = { current: AssistantPointer }

type AssistantHologramSceneProps = {
  pointer: PointerRef
  active: boolean
  hovered: boolean
}

type Palette = {
  shell: string
  shellShade: string
  joint: string
  accent: string
  glow: string
  visor: string
  blush: string
}

/** Fixed light-shell robot for the storefront's dark-only palette. */
const PALETTE: Palette = {
  shell: '#eef2f4',
  shellShade: '#c9d4dd',
  joint: '#93a5b3',
  accent: '#d9ff43',
  glow: '#a9c7ff',
  visor: '#070b0e',
  blush: '#ff9db8',
}

function Spark({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.022, 8, 6]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function Projector({ palette }: { palette: Palette }) {
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const sparks = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    if (ringA.current) ringA.current.rotation.z = t * 0.7
    if (ringB.current) ringB.current.rotation.z = -t * 0.45
    if (sparks.current) sparks.current.rotation.y += delta * 0.6
  })

  return (
    <group position={[0, -1.18, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, 32]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringA} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.012, 6, 40]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.8} />
      </mesh>
      <mesh ref={ringB} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.009, 6, 32]} />
        <meshBasicMaterial color={palette.glow} transparent opacity={0.6} />
      </mesh>
      <group ref={sparks}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2
          return (
            <Spark
              key={i}
              position={[Math.cos(angle) * 0.56, 0.02 + (i % 2) * 0.035, Math.sin(angle) * 0.56]}
              color={i % 2 ? palette.glow : palette.accent}
            />
          )
        })}
      </group>
    </group>
  )
}

/** A big-headed, rounded, chibi-style assistant that tracks the pointer. */
function Assistant({
  pointer,
  hovered,
  palette,
}: {
  pointer: PointerRef
  hovered: boolean
  palette: Palette
}) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const antenna = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    const p = pointer.current
    const ease = 1 - Math.exp(-7 * Math.min(delta, 0.1))

    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, p.x * 0.3, ease)
      root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, -p.y * 0.12, ease)
      root.current.position.y = 0.02 + Math.sin(t * 1.8) * 0.045
    }
    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, p.x * 0.5, ease)
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, -p.y * 0.34, ease)
      head.current.rotation.z = Math.sin(t * 1.1) * 0.045
    }
    if (eyes.current) {
      eyes.current.position.x = THREE.MathUtils.lerp(eyes.current.position.x, p.x * 0.07, ease)
      eyes.current.position.y = THREE.MathUtils.lerp(eyes.current.position.y, -p.y * 0.045, ease)
      const blink = t % 4.6 < 0.14 ? Math.sin(((t % 4.6) / 0.14) * Math.PI) : 0
      eyes.current.scale.y = 1 - blink * 0.88
    }
    if (antenna.current) antenna.current.rotation.z = Math.sin(t * 2.2) * 0.13 + p.x * 0.16
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 3) * 0.12)

    const sway = Math.sin(t * 1.6)
    if (leftArm.current) {
      leftArm.current.rotation.z = 0.2 + sway * 0.07 - p.x * 0.1
    }
    if (rightArm.current) {
      rightArm.current.rotation.z = -0.2 - sway * 0.05 - p.x * 0.1
      rightArm.current.rotation.x = THREE.MathUtils.lerp(
        rightArm.current.rotation.x,
        hovered ? -1.35 + Math.sin(t * 9) * 0.18 : 0,
        ease,
      )
    }
  })

  return (
    <group ref={root}>
      {/* stubby legs and feet */}
      <group position={[0, -0.72, 0]}>
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.19, 0, 0]}>
            <mesh position={[0, -0.04, 0]}>
              <sphereGeometry args={[0.095, 12, 10]} />
              <meshStandardMaterial color={palette.joint} metalness={0.7} roughness={0.3} />
            </mesh>
            <RoundedBox args={[0.2, 0.24, 0.22]} radius={0.08} smoothness={3} position={[0, -0.19, 0]}>
              <meshStandardMaterial color={palette.shellShade} metalness={0.55} roughness={0.35} />
            </RoundedBox>
            <RoundedBox args={[0.27, 0.12, 0.34]} radius={0.055} smoothness={3} position={[0, -0.35, 0.07]}>
              <meshStandardMaterial color={palette.shell} metalness={0.5} roughness={0.32} />
            </RoundedBox>
          </group>
        ))}
      </group>

      {/* round body */}
      <group position={[0, -0.18, 0]}>
        <RoundedBox args={[0.76, 0.6, 0.5]} radius={0.24} smoothness={4}>
          <meshStandardMaterial
            color={palette.shell}
            metalness={0.5}
            roughness={0.32}
            emissive={palette.accent}
            emissiveIntensity={0.07}
          />
        </RoundedBox>
        <mesh position={[0, 0.02, 0.27]} ref={core}>
          <sphereGeometry args={[0.085, 16, 12]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
        <mesh position={[0, 0.02, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.012, 6, 24]} />
          <meshBasicMaterial color={palette.glow} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, -0.18, 0.25]}>
          <capsuleGeometry args={[0.012, 0.1, 3, 8]} />
          <meshBasicMaterial color={palette.glow} transparent opacity={0.65} />
        </mesh>

        {/* tiny arms */}
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            ref={side === -1 ? leftArm : rightArm}
            position={[side * 0.42, 0.08, 0]}
          >
            <mesh>
              <sphereGeometry args={[0.115, 12, 10]} />
              <meshStandardMaterial color={palette.joint} metalness={0.65} roughness={0.3} />
            </mesh>
            <RoundedBox args={[0.15, 0.28, 0.17]} radius={0.07} smoothness={3} position={[side * 0.04, -0.2, 0]}>
              <meshStandardMaterial color={palette.shellShade} metalness={0.55} roughness={0.35} />
            </RoundedBox>
            <mesh position={[side * 0.05, -0.39, 0]}>
              <sphereGeometry args={[0.105, 12, 10]} />
              <meshStandardMaterial color={palette.shell} metalness={0.5} roughness={0.32} />
            </mesh>
          </group>
        ))}
      </group>

      {/* oversized cute head */}
      <group position={[0, 0.56, 0]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.11, 0.16, 12]} />
          <meshStandardMaterial color={palette.joint} metalness={0.65} roughness={0.3} />
        </mesh>
        <group ref={head} position={[0, 0.34, 0]}>
          <RoundedBox args={[0.82, 0.72, 0.6]} radius={0.28} smoothness={5}>
            <meshStandardMaterial
              color={palette.shell}
              metalness={0.45}
              roughness={0.28}
              emissive={palette.accent}
              emissiveIntensity={0.06}
            />
          </RoundedBox>

          {/* little ears */}
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.42, 0.04, 0]}>
              <sphereGeometry args={[0.085, 12, 10]} />
              <meshStandardMaterial color={palette.joint} metalness={0.65} roughness={0.3} />
            </mesh>
          ))}

          {/* visor + big eyes */}
          <RoundedBox args={[0.66, 0.36, 0.12]} radius={0.14} smoothness={4} position={[0, 0.02, 0.3]}>
            <meshStandardMaterial color={palette.visor} metalness={0.8} roughness={0.12} />
          </RoundedBox>
          <group ref={eyes} position={[0, 0.02, 0.375]}>
            {([-1, 1] as const).map((side) => (
              <group key={side} position={[side * 0.145, 0, 0]}>
                <mesh scale={[1, 1.12, 0.55]}>
                  <sphereGeometry args={[0.085, 14, 12]} />
                  <meshBasicMaterial color={palette.accent} />
                </mesh>
                <mesh position={[side * 0.018, 0.02, 0.045]} scale={[0.35, 0.4, 0.3]}>
                  <sphereGeometry args={[0.085, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>

          {/* blush + smile */}
          {([-1, 1] as const).map((side) => (
            <mesh key={side} position={[side * 0.28, -0.12, 0.29]} scale={[1, 0.55, 0.3]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshBasicMaterial color={palette.blush} transparent opacity={0.75} />
            </mesh>
          ))}
          <mesh position={[0, -0.14, 0.31]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.045, 0.008, 6, 16, Math.PI]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>

          {/* antenna */}
          <group ref={antenna} position={[0, 0.36, 0]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.012, 0.016, 0.2, 8]} />
              <meshStandardMaterial color={palette.joint} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.23, 0]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshBasicMaterial color={palette.accent} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

export default function AssistantHologramScene({
  pointer,
  active,
  hovered,
}: AssistantHologramSceneProps) {
  const palette = PALETTE

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.2], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 4, 3]} intensity={1.3} color="#f1eee5" />
      <pointLight position={[1.6, 1.4, 2.4]} intensity={4} color={palette.accent} />
      <pointLight position={[-1.8, 0.6, 1.8]} intensity={2.2} color={palette.glow} />
      <Environment resolution={48} frames={1}>
        <Lightformer intensity={3} position={[0, 3, -2]} scale={[5, 2, 1]} color={palette.accent} />
        <Lightformer intensity={2} position={[-3, 0.5, 2]} scale={[2, 4, 1]} color={palette.glow} />
      </Environment>
      <Assistant pointer={pointer} hovered={hovered} palette={palette} />
      <Projector palette={palette} />
    </Canvas>
  )
}
