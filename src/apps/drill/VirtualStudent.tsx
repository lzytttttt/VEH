import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VirtualStudentState } from '../../harness/types';

interface Props {
  state: VirtualStudentState['state'];
  color: string;
  highlighted?: boolean;
}

const STATE_LABEL: Record<Props['state'], string> = {
  attentive: '专心',
  distracted: '走神',
  asking: '提问',
  discussing: '讨论',
};

/** 低多边形虚拟学生：头 + 身体 + 手臂，状态影响姿态与闲置动画 */
export default function VirtualStudent({ state, color, highlighted }: Props) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const arm = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!group.current) return;
    const t = performance.now() / 1000;
    switch (state) {
      case 'attentive':
        group.current.position.y = Math.sin(t * 2) * 0.02;
        if (head.current) head.current.rotation.set(0, 0, 0);
        if (arm.current) arm.current.rotation.z = 0;
        break;
      case 'distracted':
        if (head.current) head.current.rotation.y = 0.9;
        group.current.position.y = -0.05;
        break;
      case 'asking':
        group.current.position.y = Math.sin(t * 8) * 0.02 + 0.02;
        if (arm.current) arm.current.rotation.z = -2.4;
        break;
      case 'discussing':
        if (head.current) head.current.rotation.y = Math.sin(t * 3) * 0.5;
        break;
    }
  });

  return (
    <group ref={group}>
      {/* 身体 */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 头 */}
      <mesh ref={head} position={[0, 0.45, 0]}>
        <boxGeometry args={[0.26, 0.26, 0.26]} />
        <meshStandardMaterial color="#ffdab9" />
      </mesh>
      {/* 右臂 */}
      <mesh ref={arm} position={[0.27, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.36, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 高亮环 */}
      {highlighted && (
        <mesh position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.46, 24]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export { STATE_LABEL };
