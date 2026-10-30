import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarSceneProps {
  isSpeaking: boolean;
  isListening: boolean;
  emotion: 'calm' | 'empathetic' | 'encouraging' | 'thoughtful' | 'celebratory';
  lipSyncAmplitude: number;
  modelStyle?: 'stylized_human' | 'robot_expressive';
}

/**
 * Stylized 3D Human Avatar with procedural rigging, head tracking,
 * natural eye blinking, facial expressions, and dynamic lip-sync mouth visemes.
 */
function StylizedHumanAvatar({
  isSpeaking,
  isListening,
  emotion,
  lipSyncAmplitude,
}: {
  isSpeaking: boolean;
  isListening: boolean;
  emotion: string;
  lipSyncAmplitude: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);

  // Blinking state
  const [blinkProgress, setBlinkProgress] = useState(0);
  const blinkTimerRef = useRef(0);

  // Color palette for futuristic calm look
  const colors = useMemo(() => {
    return {
      skin: new THREE.Color('#38bdf8'), // subtle glowing teal/cyan skin tone
      darkSkin: new THREE.Color('#0369a1'),
      hair: new THREE.Color('#1e1b4b'), // midnight violet
      suit: new THREE.Color('#0f172a'), // deep navy cyber suit
      trim: new THREE.Color('#06b6d4'), // bright cyan neon trim
      accent: new THREE.Color('#8b5cf6'), // violet highlight
      eyes: new THREE.Color('#38bdf8'), // luminous cyan iris
      mouth: new THREE.Color('#0284c7'),
    };
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Idle breathing and floating
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 1.5) * 0.05 - 0.2;
    }

    // 2. Head tracking mouse cursor
    if (headRef.current) {
      const targetRotationY = state.pointer.x * 0.45;
      const targetRotationX = -state.pointer.y * 0.35;
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetRotationY, 0.08);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetRotationX, 0.08);

      // Subtle head tilt when listening or empathetic
      if (isListening || emotion === 'empathetic') {
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0.08, 0.05);
      } else {
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0, 0.05);
      }
    }

    // 3. Eye Blinking timer
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > 3.5 + Math.sin(time) * 1.5) {
      blinkTimerRef.current = 0;
      setBlinkProgress(1);
    }
    if (blinkProgress > 0) {
      setBlinkProgress((prev) => Math.max(0, prev - delta * 6));
    }

    // Apply blink scaling to eyes
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeScaleY = 1 - blinkProgress * 0.9;
      leftEyeRef.current.scale.y = eyeScaleY;
      rightEyeRef.current.scale.y = eyeScaleY;
    }

    // 4. Dynamic Lip-Sync Viseme
    if (mouthRef.current) {
      let targetMouthY = 0.2;
      let targetMouthX = 1.0;

      if (isSpeaking) {
        // Modulate with lip sync amplitude + fallback sine wave
        const amp = lipSyncAmplitude > 0 ? lipSyncAmplitude : (Math.sin(time * 12) * 0.5 + 0.5) * 0.8;
        targetMouthY = 0.2 + amp * 1.8;
        targetMouthX = 1.0 + amp * 0.4;
      } else {
        // Emotion-based static mouth curve
        if (emotion === 'celebratory' || emotion === 'encouraging') {
          targetMouthX = 1.3;
          targetMouthY = 0.35;
        } else if (emotion === 'empathetic') {
          targetMouthX = 1.1;
          targetMouthY = 0.25;
        } else {
          targetMouthX = 1.0;
          targetMouthY = 0.2;
        }
      }

      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, targetMouthY, 0.25);
      mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, targetMouthX, 0.25);
    }

    // 5. Eyebrow expressions
    if (leftBrowRef.current && rightBrowRef.current) {
      let browY = 0.38;
      let browRot = 0;

      if (emotion === 'thoughtful') {
        browY = 0.35;
        browRot = 0.15;
      } else if (emotion === 'empathetic') {
        browY = 0.42;
        browRot = -0.12;
      } else if (emotion === 'celebratory') {
        browY = 0.44;
        browRot = 0.05;
      }

      leftBrowRef.current.position.y = THREE.MathUtils.lerp(leftBrowRef.current.position.y, browY, 0.1);
      rightBrowRef.current.position.y = THREE.MathUtils.lerp(rightBrowRef.current.position.y, browY, 0.1);
      leftBrowRef.current.rotation.z = THREE.MathUtils.lerp(leftBrowRef.current.rotation.z, browRot, 0.1);
      rightBrowRef.current.rotation.z = THREE.MathUtils.lerp(rightBrowRef.current.rotation.z, -browRot, 0.1);
    }

    // 6. Rotating holographic aura ring
    if (auraRef.current) {
      auraRef.current.rotation.z += delta * (isSpeaking ? 0.9 : 0.3);
      auraRef.current.rotation.x = Math.sin(time * 0.5) * 0.2 + 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* Holographic Glowing Aura Ring behind head */}
      <mesh ref={auraRef} position={[0, 0.7, -0.6]}>
        <torusGeometry args={[0.9, 0.015, 16, 64]} />
        <meshStandardMaterial
          color={isSpeaking ? colors.trim : isListening ? colors.accent : colors.trim}
          emissive={isSpeaking ? colors.trim : isListening ? colors.accent : colors.trim}
          emissiveIntensity={isSpeaking ? 1.8 : 0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Chest & Cyber Shoulders */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.35, 0.7, 32]} />
          <meshStandardMaterial color={colors.suit} roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Cyber Neon Chest Core (pulses when thinking or speaking) */}
        <mesh position={[0, 0.08, 0.24]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial
            color={isSpeaking ? colors.trim : isListening ? colors.accent : colors.trim}
            emissive={isSpeaking ? colors.trim : isListening ? colors.accent : colors.trim}
            emissiveIntensity={isSpeaking ? 2.5 : isListening ? 2.0 : 0.9}
          />
        </mesh>

        {/* Shoulders */}
        <mesh position={[-0.55, 0.22, 0]}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial color={colors.suit} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0.55, 0.22, 0]}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial color={colors.suit} roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* Head and Face Group */}
      <group ref={headRef} position={[0, 0.72, 0]}>
        {/* Neck */}
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.3, 24]} />
          <meshStandardMaterial color={colors.suit} roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Head Mesh */}
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.46, 32, 32]} />
          <meshStandardMaterial
            color="#0ea5e9"
            roughness={0.25}
            metalness={0.4}
            emissive="#0369a1"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Stylized Hair Crest */}
        <mesh position={[0, 0.44, -0.06]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.4, 0.22, 0.55]} />
          <meshStandardMaterial color={colors.hair} roughness={0.5} />
        </mesh>

        {/* Eyebrows */}
        <mesh ref={leftBrowRef} position={[-0.17, 0.38, 0.42]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.14, 0.024, 0.02]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>
        <mesh ref={rightBrowRef} position={[0.17, 0.38, 0.42]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.14, 0.024, 0.02]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>

        {/* Eyes (Left & Right) */}
        <group position={[-0.17, 0.24, 0.4]}>
          <mesh ref={leftEyeRef}>
            <sphereGeometry args={[0.07, 24, 24]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive={isListening ? colors.accent : colors.trim}
              emissiveIntensity={1.2}
            />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, 0.055]}>
            <circleGeometry args={[0.035, 16]} />
            <meshBasicMaterial color="#0c4a6e" />
          </mesh>
        </group>

        <group position={[0.17, 0.24, 0.4]}>
          <mesh ref={rightEyeRef}>
            <sphereGeometry args={[0.07, 24, 24]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive={isListening ? colors.accent : colors.trim}
              emissiveIntensity={1.2}
            />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, 0.055]}>
            <circleGeometry args={[0.035, 16]} />
            <meshBasicMaterial color="#0c4a6e" />
          </mesh>
        </group>

        {/* Nose Bridge */}
        <mesh position={[0, 0.14, 0.44]}>
          <coneGeometry args={[0.04, 0.12, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>

        {/* Dynamic Mouth (Viseme Scale Target) */}
        <mesh ref={mouthRef} position={[0, -0.04, 0.42]}>
          <capsuleGeometry args={[0.035, 0.12, 12, 16]} />
          <meshStandardMaterial
            color="#0369a1"
            emissive={isSpeaking ? colors.trim : '#0284c7'}
            emissiveIntensity={isSpeaking ? 1.0 : 0.3}
          />
        </mesh>

        {/* Cyber Temple Interface Headset */}
        <mesh position={[-0.47, 0.12, 0]} rotation={[0, 0, 1.57]}>
          <cylinderGeometry args={[0.09, 0.09, 0.08, 16]} />
          <meshStandardMaterial color={colors.suit} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.48, 0.12, 0]}>
          <circleGeometry args={[0.06, 16]} />
          <meshStandardMaterial
            color={colors.trim}
            emissive={colors.trim}
            emissiveIntensity={isSpeaking ? 2.0 : 0.8}
          />
        </mesh>

        <mesh position={[0.47, 0.12, 0]} rotation={[0, 0, 1.57]}>
          <cylinderGeometry args={[0.09, 0.09, 0.08, 16]} />
          <meshStandardMaterial color={colors.suit} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.48, 0.12, 0]}>
          <circleGeometry args={[0.06, 16]} />
          <meshStandardMaterial
            color={colors.trim}
            emissive={colors.trim}
            emissiveIntensity={isSpeaking ? 2.0 : 0.8}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Expressive 3D Floating Particle Field
 */
function HolographicParticleField({ isSpeaking }: { isSpeaking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 75;

  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
    }
    return pos;
  });

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * (isSpeaking ? 0.25 : 0.08);
      pointsRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#38bdf8"
        transparent
        opacity={isSpeaking ? 0.75 : 0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export const AvatarScene: React.FC<AvatarSceneProps> = ({
  isSpeaking,
  isListening,
  emotion,
  lipSyncAmplitude,
}) => {
  return (
    <div className="relative w-full h-full min-h-[340px] flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0.5, 2.6], fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.5} />

        {/* Directional Key Light (Cyan) */}
        <directionalLight position={[2, 3, 3]} intensity={1.2} color="#bae6fd" />

        {/* Fill Light (Soft Teal) */}
        <directionalLight position={[-3, 1, 2]} intensity={0.7} color="#2dd4bf" />

        {/* Rim / Back Light (Futuristic Violet) */}
        <pointLight position={[0, 2, -2]} intensity={2.0} color="#c084fc" />

        {/* Underlight (Subtle Cyber glow) */}
        <pointLight position={[0, -2, 1]} intensity={0.8} color="#0284c7" />

        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
          <StylizedHumanAvatar
            isSpeaking={isSpeaking}
            isListening={isListening}
            emotion={emotion}
            lipSyncAmplitude={lipSyncAmplitude}
          />
        </Float>

        <HolographicParticleField isSpeaking={isSpeaking} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 3}
          maxAzimuthAngle={Math.PI / 4}
          minAzimuthAngle={-Math.PI / 4}
        />
      </Canvas>

      {/* Floating Status Pill over Canvas */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-cyan-500/30 backdrop-blur-md text-xs font-semibold text-cyan-300 shadow-lg">
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
            : `Pluto 3D • ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`}
        </span>
      </div>
    </div>
  );
};
