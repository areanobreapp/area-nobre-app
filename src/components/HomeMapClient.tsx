'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const HomeMap = dynamic(() => import('@/components/HomeMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        minHeight: '620px',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--text-muted)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--color-primary-subtle)',
          borderTopColor: 'var(--color-primary)',
          animation: 'pulseGlow 1s infinite alternate',
        }}
      />
      <span style={{ fontSize: '0.90rem', fontWeight: 600 }}>Carregando carteira no território...</span>
    </div>
  ),
});

export default function HomeMapClient(props: any) {
  return <HomeMap {...props} />;
}
