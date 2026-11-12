import React from 'react';

export default function BuildingLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Placeholder topo */}
        <div
          style={{
            height: '40px',
            width: '140px',
            backgroundColor: '#E2E8F0',
            borderRadius: '8px',
          }}
        />

        {/* Placeholder fachada */}
        <div
          style={{
            height: '240px',
            backgroundColor: '#E2E8F0',
            borderRadius: '16px',
          }}
        />

        {/* Placeholder título */}
        <div
          style={{
            height: '32px',
            width: '60%',
            backgroundColor: '#E2E8F0',
            borderRadius: '8px',
          }}
        />

        {/* Placeholder cards */}
        <div
          style={{
            height: '80px',
            backgroundColor: '#E2E8F0',
            borderRadius: '12px',
          }}
        />

        {/* Placeholder mapa */}
        <div
          style={{
            height: '260px',
            backgroundColor: '#E2E8F0',
            borderRadius: '12px',
          }}
        />
      </div>
    </main>
  );
}

