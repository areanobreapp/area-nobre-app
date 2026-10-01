'use client';

import React from 'react';

interface CircularMatchScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export default function CircularMatchScore({
  score,
  size = 56,
  strokeWidth = 5,
  showLabel = true,
}: CircularMatchScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  // Cor harmônica baseada no score
  let strokeColor = 'var(--color-primary)';
  let bgFill = 'var(--color-primary-light)';
  let textColor = 'var(--color-primary)';

  if (validScore >= 90) {
    strokeColor = '#059669'; // Emerald vibrante
    bgFill = '#ecfdf5';
    textColor = '#065f46';
  } else if (validScore >= 75) {
    strokeColor = '#0284c7'; // Sky / Azul nobre
    bgFill = '#f0f9ff';
    textColor = '#0369a1';
  } else if (validScore >= 70) {
    strokeColor = '#4f46e5'; // Indigo
    bgFill = '#eef2ff';
    textColor = '#3730a3';
  } else {
    strokeColor = '#d97706'; // Âmbar moderado
    bgFill = '#fffbeb';
    textColor = '#92400e';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Fundo do anel */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border-light)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Anel de progresso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Texto central */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: size >= 60 ? '1rem' : size >= 48 ? '0.84rem' : '0.72rem',
              fontWeight: 800,
              color: textColor,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {validScore}%
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          style={{
            marginTop: 4,
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Match
        </span>
      )}
    </div>
  );
}
