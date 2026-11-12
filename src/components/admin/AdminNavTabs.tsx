'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Building,
  Building2,
  ShieldAlert,
  FileText,
  Scale,
  AlertTriangle,
  Clock,
  Briefcase,
} from 'lucide-react';

interface AdminNavTabsProps {
  currentTab?: string;
  pendingModerationCount?: number;
}

export default function AdminNavTabs({ currentTab, pendingModerationCount = 0 }: AdminNavTabsProps) {
  const pathname = usePathname();

  const isCompanies = pathname.startsWith('/admin/construtoras') || pathname.startsWith('/admin/empreendimentos') || currentTab === 'companies';
  const isModeration = pathname.startsWith('/admin/moderacao') || currentTab === 'moderation';
  const isUsers = pathname === '/admin' && (!currentTab || currentTab === 'users');
  const isBuildings = currentTab === 'buildings';
  const isLegal = currentTab === 'legal';
  const isAudit = currentTab === 'audit';
  const isDisputes = currentTab === 'disputes';
  const isWaitlist = currentTab === 'waitlist';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #E5E7EB',
        marginBottom: '28px',
        overflowX: 'auto',
        paddingBottom: '2px',
      }}
    >
      <Link
        href="/admin"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: 'none',
          border: 'none',
          borderBottom: isUsers ? '3px solid #1E4620' : '3px solid transparent',
          color: isUsers ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <Users size={18} />
        <span>Usuários e Plataforma</span>
      </Link>

      <Link
        href="/admin/construtoras"
        id="btn-tab-companies"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: isCompanies ? '#F0FDF4' : 'none',
          borderRadius: isCompanies ? '8px 8px 0 0' : '0',
          border: 'none',
          borderBottom: isCompanies ? '3px solid #1E4620' : '3px solid transparent',
          color: isCompanies ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <Briefcase size={18} />
        <span>Construtoras e Empreendimentos</span>
      </Link>

      <Link
        href="/admin/moderacao"
        id="btn-tab-moderation"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: isModeration ? '#F0FDF4' : 'none',
          borderRadius: isModeration ? '8px 8px 0 0' : '0',
          border: 'none',
          borderBottom: isModeration ? '3px solid #1E4620' : '3px solid transparent',
          color: isModeration ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <ShieldAlert size={18} />
        <span>Central de Moderação</span>
        {pendingModerationCount > 0 && (
          <span
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: '999px',
              padding: '2px 7px',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            {pendingModerationCount}
          </span>
        )}
      </Link>

      <Link
        href="/admin?tab=buildings"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: 'none',
          border: 'none',
          borderBottom: isBuildings ? '3px solid #1E4620' : '3px solid transparent',
          color: isBuildings ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <Building size={18} />
        <span>Edifícios e Condomínios</span>
      </Link>

      <Link
        href="/admin?tab=legal"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: 'none',
          border: 'none',
          borderBottom: isLegal ? '3px solid #1E4620' : '3px solid transparent',
          color: isLegal ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <FileText size={18} />
        <span>Documentos Jurídicos</span>
      </Link>

      <Link
        href="/admin?tab=audit"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: 'none',
          border: 'none',
          borderBottom: isAudit ? '3px solid #1E4620' : '3px solid transparent',
          color: isAudit ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <Scale size={18} />
        <span>Auditoria Jurídica</span>
      </Link>

      <Link
        href="/admin?tab=disputes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: 'none',
          border: 'none',
          borderBottom: isDisputes ? '3px solid #1E4620' : '3px solid transparent',
          color: isDisputes ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <AlertTriangle size={18} />
        <span>Contestações de Preço</span>
      </Link>

      <Link
        href="/admin?tab=waitlist"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: 'none',
          border: 'none',
          borderBottom: isWaitlist ? '3px solid #1E4620' : '3px solid transparent',
          color: isWaitlist ? '#1E4620' : '#6B7280',
          fontWeight: 800,
          fontSize: '0.90rem',
          textDecoration: 'none',
          marginBottom: '-4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        <Clock size={18} />
        <span>Filas de Espera</span>
      </Link>
    </div>
  );
}

