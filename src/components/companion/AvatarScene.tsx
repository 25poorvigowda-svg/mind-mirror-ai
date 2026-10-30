import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { EmotionType } from '../../types';

interface AvatarSceneProps {
  isSpeaking: boolean;
  isListening: boolean;
  emotion: EmotionType;
  lipSyncAmplitude: number;
  modelStyle?: 'realistic_pluto' | 'stylized_human';
}

/**
 * Realistic Female 3D Avatar (Pluto) loaded from /pluto.glb
 * Uses full facial blendshapes, bone rigging, cursor tracking, and speech lip-sync
 */
function RealisticPlutoAvatar({
  isSpeaking,
  isListening,
  emotion,
  lipSyncAmplitude,
}: {
  isSpeaking: boolean;
  isListening: boolean;
  emotion: EmotionType;
  lipSyncAmplitude: number;
}) {
  const { scene } = useGLTF('/pluto.glb');
  const avatarRef = useRef<THREE.Group>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const neckBoneRef = useRef<THREE.Bone | null>(null);

  // Mesh references for morph targets
  const morphMeshesRef = useRef<THREE.SkinnedMesh[]>([]);

  // Blinking timer state
  const blinkTimerRef = useRef(0);
  const [blinkWeight, setBlinkWeight] = useState(0);

  // Cache cloned scene
  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  useEffect(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    clonedScene.traverse((node) => {
      if ((node as THREE.Bone).isBone) {
        if (node.name === 'Head') headBoneRef.current = node as THREE.Bone;
        if (node.name === 'Neck') neckBoneRef.current = node as THREE.Bone;
      }
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = node as THREE.SkinnedMesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          meshes.push(mesh);
        }
      }
    });
    morphMeshesRef.current = meshes;
  }, [clonedScene]);

  // Helper to safely set morph target influence on all face meshes
  const setMorph = (targetName: string, value: number) => {
    morphMeshesRef.current.forEach((mesh) => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        const idx = mesh.morphTargetDictionary[targetName];
        if (idx !== undefined) {
          mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[idx],
            value,
            0.2
          );
        }
      }
    });
  };

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Natural Idle Breathing & Micro Sway
    if (avatarRef.current) {
      avatarRef.current.position.y = -1.45 + Math.sin(time * 1.6) * 0.015;
    }

    // 2. Cursor tracking with Head and Neck bones
    if (headBoneRef.current) {
      const targetRotY = state.pointer.x * 0.35;
      const targetRotX = -state.pointer.y * 0.25;
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, targetRotY, 0.08);
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, targetRotX, 0.08);

      // Listening alert tilt
      const targetTilt = isListening ? 0.09 : emotion === 'confused' ? -0.12 : 0;
      headBoneRef.current.rotation.z = THREE.MathUtils.lerp(headBoneRef.current.rotation.z, targetTilt, 0.06);
    }

    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(neckBoneRef.current.rotation.y, state.pointer.x * 0.15, 0.05);
    }

    // 3. Natural Eye Blinking cycle
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > 3.8 + Math.sin(time * 0.7) * 1.5) {
      blinkTimerRef.current = 0;
      setBlinkWeight(1);
    }
    if (blinkWeight > 0) {
      setBlinkWeight((prev) => Math.max(0, prev - delta * 7));
    }
    setMorph('eyeBlinkLeft', blinkWeight);
    setMorph('eyeBlinkRight', blinkWeight);

    // 4. Emotion-based Facial Expressions
    const isHappy = emotion === 'happy' || emotion === 'excited';
    const isSad = emotion === 'sad' || emotion === 'lonely';
    const isStressed = emotion === 'stressed';
    const isConfused = emotion === 'confused';
    const isAngry = emotion === 'angry';

    setMorph('mouthSmile', isHappy ? 0.8 : emotion === 'calm' ? 0.15 : 0);
    setMorph('mouthSmileLeft', isHappy ? 0.4 : 0);
    setMorph('mouthSmileRight', isHappy ? 0.4 : 0);
    setMorph('mouthFrownLeft', isSad || isAngry ? 0.6 : 0);
    setMorph('mouthFrownRight', isSad || isAngry ? 0.6 : 0);

    setMorph('browInnerUp', isSad || isConfused ? 0.6 : 0);
    setMorph('browOuterUpLeft', isHappy ? 0.45 : 0);
    setMorph('browOuterUpRight', isHappy ? 0.45 : 0);
    setMorph('browDownLeft', isStressed || isAngry ? 0.65 : 0);
    setMorph('browDownRight', isStressed || isAngry ? 0.65 : isConfused ? 0.35 : 0);

    setMorph('eyeSquintLeft', isStressed ? 0.4 : isHappy ? 0.2 : 0);
    setMorph('eyeSquintRight', isStressed ? 0.4 : isHappy ? 0.2 : 0);
    setMorph('eyeWideLeft', emotion === 'excited' ? 0.35 : 0);
    setMorph('eyeWideRight', emotion === 'excited' ? 0.35 : 0);
    setMorph('noseSneerLeft', isAngry ? 0.5 : 0);
    setMorph('noseSneerRight', isAngry ? 0.5 : 0);

    // 5. Speech-Synchronized Lip Movement (Visemes & Jaw Open)
    if (isSpeaking) {
      const baseAmp = lipSyncAmplitude > 0 ? lipSyncAmplitude : (Math.sin(time * 14) * 0.5 + 0.5) * 0.75;
      const openAmount = Math.min(1.0, baseAmp * 1.25);
      const visemeA = Math.sin(time * 11) > 0 ? openAmount * 0.9 : 0.1;
      const visemeO = Math.cos(time * 9) > 0.2 ? openAmount * 0.7 : 0;
      const visemeE = Math.sin(time * 16) > 0 ? openAmount * 0.6 : 0;

      setMorph('mouthOpen', openAmount * 0.8);
      setMorph('jawOpen', openAmount * 0.9);
      setMorph('viseme_aa', visemeA);
      setMorph('viseme_O', visemeO);
      setMorph('viseme_E', visemeE);
    } else {
      setMorph('mouthOpen', 0);
      setMorph('jawOpen', 0);
      setMorph('viseme_aa', 0);
      setMorph('viseme_O', 0);
      setMorph('viseme_E', 0);
    }
  });

  return (
    <group ref={avatarRef} position={[0, -1.45, 0]} scale={[1.4, 1.4, 1.4]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Holographic Floating Energy Particles
 */
function HolographicParticleField({ isSpeaking }: { isSpeaking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 90;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const rx = (Math.sin(i * 14.23 + 1.2) * 43758.54) % 1;
      const ry = (Math.sin(i * 26.54 + 2.7) * 43758.54) % 1;
      const rz = (Math.sin(i * 39.81 + 4.1) * 43758.54) % 1;
      pos[i * 3] = rx * 5;
      pos[i * 3 + 1] = ry * 4;
      pos[i * 3 + 2] = rz * 3 - 0.5;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * (isSpeaking ? 0.35 : 0.1);
      pointsRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#38bdf8"
        transparent
        opacity={isSpeaking ? 0.8 : 0.45}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Fallback glowing loading placeholder while 3D mesh loads
 */
function AvatarLoadingPlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#06b6d4" wireframe transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export const AvatarScene: React.FC<AvatarSceneProps> = ({
  isSpeaking,
  isListening,
  emotion,
  lipSyncAmplitude,
}) => {
  // Lighting highlights that react to emotional presence
  const rimColor = useMemo(() => {
    switch (emotion) {
      case 'happy':
      case 'excited':
        return '#38bdf8'; // vivid cyan
      case 'stressed':
        return '#f59e0b'; // amber warning
      case 'sad':
      case 'lonely':
        return '#818cf8'; // gentle soft indigo
      case 'angry':
        return '#f43f5e'; // rose
      case 'confused':
        return '#c084fc'; // violet
      case 'calm':
      default:
        return '#2dd4bf'; // teal
    }
  }, [emotion]);

  return (
    <div className="relative w-full h-full min-h-[380px] md:min-h-[460px] flex items-center justify-center select-none">
      <Canvas
        camera={{ position: [0, 0.25, 1.45], fov: 38 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Soft Ambient Environment */}
        <ambientLight intensity={0.8} />

        {/* Key Light (Soft Warm Studio) */}
        <directionalLight position={[1.5, 2.5, 2.0]} intensity={1.4} color="#f0f9ff" />

        {/* Soft Fill Light */}
        <directionalLight position={[-2, 1, 1.5]} intensity={0.9} color="#bae6fd" />

        {/* Reactive Emotional Rim Light */}
        <pointLight position={[0, 1.5, -1.5]} intensity={2.2} color={rimColor} />

        {/* Subtle Underlight */}
        <pointLight position={[0, -1.2, 0.8]} intensity={0.7} color="#0284c7" />

        <Suspense fallback={<AvatarLoadingPlaceholder />}>
          <Float speed={1.5} rotationIntensity={0.12} floatIntensity={0.25}>
            <RealisticPlutoAvatar
              isSpeaking={isSpeaking}
              isListening={isListening}
              emotion={emotion}
              lipSyncAmplitude={lipSyncAmplitude}
            />
          </Float>
        </Suspense>

        <HolographicParticleField isSpeaking={isSpeaking} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minPolarAngle={Math.PI / 3}
          maxAzimuthAngle={Math.PI / 5}
          minAzimuthAngle={-Math.PI / 5}
        />
      </Canvas>

      {/* Floating Interactive Status Pill */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 dark:bg-slate-900/85 light:bg-white/90 border border-cyan-500/30 backdrop-blur-md text-xs font-semibold text-cyan-300 dark:text-cyan-300 light:text-cyan-700 shadow-lg">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isSpeaking
              ? 'bg-cyan-400 animate-ping'
              : isListening
              ? 'bg-violet-400 animate-pulse'
              : 'bg-teal-400'
          }`}
        />
        <span>
          {isSpeaking
            ? 'Pluto: Speaking & Reflecting...'
            : isListening
            ? 'Pluto: Listening to you...'
            : `Pluto 3D • ${emotion.toUpperCase()}`}
        </span>
      </div>

      {/* Orbit Hint */}
      <div className="absolute bottom-3 right-4 z-10 text-[10px] text-slate-400/80 pointer-events-none">
        Drag to inspect 3D view
      </div>
    </div>
  );
};
