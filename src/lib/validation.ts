/**
 * Helper de validação numérica estrita para contagens, áreas e valores imobiliários.
 * Rejeita valores negativos, decimais em contagens inteiras e textos não numéricos com mensagens claras.
 */

export interface ValidationFieldResult<T> {
  value: T;
  error?: string;
}

/**
 * Valida número inteiro não negativo (>= 0).
 */
export function validateNonNegativeInt(
  val: any,
  fieldName: string,
  options: { required?: boolean; defaultValue?: number | null } = {}
): ValidationFieldResult<number | null> {
  const { required = false, defaultValue = null } = options;

  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    if (required) {
      return { value: null, error: `O campo ${fieldName} é obrigatório.` };
    }
    return { value: defaultValue };
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('-')) {
      return { value: null, error: `O campo ${fieldName} não pode ser negativo.` };
    }
    if (trimmed.includes('.') || trimmed.includes(',')) {
      return { value: null, error: `O campo ${fieldName} deve ser um número inteiro.` };
    }
    if (!/^\d+$/.test(trimmed)) {
      return { value: null, error: `O campo ${fieldName} deve ser um número válido.` };
    }
  }

  const num = Number(val);

  if (!Number.isFinite(num)) {
    return { value: null, error: `O campo ${fieldName} deve ser um número válido.` };
  }

  if (num < 0) {
    return { value: null, error: `O campo ${fieldName} não pode ser negativo.` };
  }

  if (!Number.isInteger(num)) {
    return { value: null, error: `O campo ${fieldName} deve ser um número inteiro.` };
  }

  return { value: num };
}

/**
 * Valida número flutuante não negativo (>= 0) para áreas, metragens e preços.
 */
export function validateNonNegativeFloat(
  val: any,
  fieldName: string,
  options: { required?: boolean; defaultValue?: number | null; isCurrencyString?: boolean } = {}
): ValidationFieldResult<number | null> {
  const { required = false, defaultValue = null, isCurrencyString = false } = options;

  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    if (required) {
      return { value: null, error: `O campo ${fieldName} é obrigatório.` };
    }
    return { value: defaultValue };
  }

  let num: number;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('-')) {
      return { value: null, error: `O campo ${fieldName} não pode ser negativo.` };
    }

    if (isCurrencyString) {
      const cleaned = trimmed.replace(/[R$\s]/g, '');
      if (cleaned.startsWith('-')) {
        return { value: null, error: `O campo ${fieldName} não pode ser negativo.` };
      }
      if (cleaned.includes(',') && cleaned.includes('.')) {
        const normalized = cleaned.replace(/\./g, '').replace(',', '.');
        num = Number(normalized);
      } else if (cleaned.includes(',')) {
        num = Number(cleaned.replace(',', '.'));
      } else {
        num = Number(cleaned);
      }
    } else {
      const normalized = trimmed.replace(',', '.');
      num = Number(normalized);
    }
  } else {
    num = Number(val);
  }

  if (!Number.isFinite(num)) {
    return { value: null, error: `O campo ${fieldName} deve ser um número válido.` };
  }

  if (num < 0) {
    return { value: null, error: `O campo ${fieldName} não pode ser negativo.` };
  }

  return { value: num };
}
