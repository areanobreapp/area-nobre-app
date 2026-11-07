'use client';

import { useState, useEffect } from 'react';
import {
  DEFAULT_SUPPORT_WHATSAPP,
  DEFAULT_SUPPORT_MESSAGE,
  LOGIN_SUPPORT_MESSAGE,
  formatBrazilianPhoneDisplay,
  getWhatsAppUrl,
} from './whatsapp';

export function useSupportContact() {
  const [phone, setPhone] = useState<string>(DEFAULT_SUPPORT_WHATSAPP);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/support')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.phone) {
          setPhone(data.phone);
        }
      })
      .catch(() => {
        // Mantém fallback inicial seguro
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const defaultUrl = getWhatsAppUrl(phone, DEFAULT_SUPPORT_MESSAGE) || `https://wa.me/${phone}`;
  const loginUrl = getWhatsAppUrl(phone, LOGIN_SUPPORT_MESSAGE) || `https://wa.me/${phone}`;

  return {
    phone,
    formattedPhone: formatBrazilianPhoneDisplay(phone),
    defaultUrl,
    loginUrl,
    loading,
  };
}
