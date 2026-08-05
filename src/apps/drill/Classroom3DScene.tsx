import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import type { VirtualStudentState } from '../../harness/types';
import VirtualStudent from './VirtualStudent';

interface Props {
  students: VirtualStudentState[];
  highlightId?: string | null;
}

/** 4 个座位（单行），多余学生向后扩展行 */
const SEATS = [
  { x: -1.8, z: 0.6 },
  { x: -0.6, z: 0.6 },
  { x: 0.6, z: 0.6 },
  { x: 1.8, z: 0.6 },
];

/**
 * Win95 复古配色 3D 教室场景
 * - 青色（teal）地板 / 灰墙 / navy 黑板 / 棕木讲台
 * - 过程化几何，无外部模型资产
 */
export default function Classroom3DScene({ students, highlightId }: Props) {
  return (
    <Canvas camera={{ position: [0, 3.2, 6.5], fov: 50 }} style={{ background: '#0a0a2a' }} dpr={[1, 2]}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 7, 5]} intensity={0.85} />
        <pointLight position={[-3, 2, 3]} intensity={0.3} color="#000080" />

        {/* 地板 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[14, 9]} />
          <meshStandardMaterial color="#008080" />
        </mesh>
        {/* 后墙 */}
        <mesh position={[0, 1.4, -3.2]}>
          <boxGeometry args={[9, 3.4, 0.2]} />
          <meshStandardMaterial color="#c0c0c0" />
        </mesh>
        {/* 黑板 */}
        <mesh position={[0, 1.5, -3.08]}>
          <boxGeometry args={[4.2, 1.7, 0.05]} />
          <meshStandardMaterial color="#000080" />
        </mesh>
        {/* 教师讲台 */}
        <mesh position={[0, -0.05, -2.2]}>
          <boxGeometry args={[1.8, 1, 0.7]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>

        {/* 学生桌椅 + 学生 */}
        {students.map((s, i) => {
          const seat = SEATS[i % SEATS.length];
          const row = Math.floor(i / SEATS.length);
          const z = seat.z + row * 1.5;
          return (
            <group key={s.id} position={[seat.x, 0, z]}>
              <mesh position={[0, -0.18, 0.05]}>
                <boxGeometry args={[0.8, 0.06, 0.55]} />
                <meshStandardMaterial color="#daa520" />
              </mesh>
              <VirtualStudent state={s.state} color={s.avatarColor} highlighted={highlightId === s.id} />
            </group>
          );
        })}

        <OrbitControls enablePan={false} minDistance={4} maxDistance={14} maxPolarAngle={Math.PI / 2.05} />
      </Suspense>
    </Canvas>
  );
}
