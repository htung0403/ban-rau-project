import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface DraggableFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  className?: string; // Thêm class tùy chỉnh (vd: đổi màu, cỡ)
}

export const DraggableFAB: React.FC<DraggableFABProps> = ({ icon, onClick, className }) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Lưu trữ trục x, y để điều khiển Snap To Corner
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (_e: any, info: PanInfo) => {
    // Tránh việc nhấn nhầm click sau khi thả drag
    setTimeout(() => setIsDragging(false), 150);

    const btnSize = 48; // w-12, h-12 = 48px

    // minX, minY là translate âm tối đa, tức là đi về bên trái và lên trên
    const minX = -(window.innerWidth - 32 - btnSize); // 32 = left 16 + right 16
    const minY = -(window.innerHeight - 85 - 70 - btnSize); // 85 = bottom, 70 = top

    // Dự đoán vị trí dựa trên hướng/vận tốc kéo
    const predictedX = x.get() + info.velocity.x * 0.1;
    const predictedY = y.get() + info.velocity.y * 0.1;

    // Xác định góc gần nhất
    const targetX = predictedX > minX / 2 ? 0 : minX;
    const targetY = predictedY > minY / 2 ? 0 : minY;

    animate(x, targetX, { type: 'spring', stiffness: 400, damping: 25, velocity: info.velocity.x });
    animate(y, targetY, { type: 'spring', stiffness: 400, damping: 25, velocity: info.velocity.y });
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Khung giới hạn (Bounds) để kéo thả */}
      <div
        ref={constraintsRef}
        className="md:hidden fixed pointer-events-none z-0"
        style={{ top: 70, bottom: 85, left: 16, right: 16 }}
      />

      {/* Nút Floating Action Button cho phép kéo thả */}
      <motion.button
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false} // Chặn Momentum gốc của framer để tự tay snap
        className={clsx(
          "md:hidden fixed pointer-events-auto shadow-xl shadow-primary/40 flex items-center justify-center z-20 touch-none",
          isDragging ? "scale-105 cursor-grabbing" : "active:scale-95 cursor-grab",
          className || "bg-primary text-white w-12 h-12 rounded-full"
        )}
        style={{
          // Vị trí xuất phát ở góc dưới cùng bên phải
          bottom: 85,
          right: 16,
          x,
          y
        }}
        onClick={(e) => {
          if (!isDragging) {
            onClick();
          } else {
            e.preventDefault();
          }
        }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {icon}
      </motion.button>
    </>,
    document.body
  );
};

export default DraggableFAB;
