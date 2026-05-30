'use client';

import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'elevated' | 'interactive' | 'subtle';
  borderGradient?: boolean;
  hoverGlow?: boolean;
  glowColor?: string;
  noPadding?: boolean;
}

const variantStyles = {
  default: 'bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-white/10',
  elevated: 'bg-white/10 dark:bg-white/8 backdrop-blur-2xl border border-white/15 shadow-2xl',
  interactive: 'bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-white/10 cursor-pointer',
  subtle: 'bg-white/3 dark:bg-white/3 backdrop-blur-md border border-white/5',
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      borderGradient = false,
      hoverGlow = true,
      glowColor = 'rgba(99, 102, 241, 0.15)',
      noPadding = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isInteractive = variant === 'interactive';

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative rounded-2xl overflow-hidden',
          variantStyles[variant],
          !noPadding && 'p-6',
          className,
        )}
        whileHover={
          isInteractive
            ? { scale: 1.01, y: -2 }
            : hoverGlow
              ? { boxShadow: `0 0 40px ${glowColor}` }
              : undefined
        }
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        {...props}
      >
        {/* Gradient border overlay */}
        {borderGradient && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2), rgba(236,72,153,0.15))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: '1px',
            }}
          />
        )}

        {/* Animated shadow layer */}
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-0 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  },
);

GlassCard.displayName = 'GlassCard';

export { GlassCard, type GlassCardProps };
