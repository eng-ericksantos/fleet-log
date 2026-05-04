import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valida o número da CNH pelos dígitos verificadores.
 * Algoritmo oficial baseado no padrão DETRAN/SENATRAN.
 * Não substitui consulta ao órgão emissor, mas garante que o número é matematicamente válido.
 */
export function validateCNHDigits(cnh: string): boolean {
  const digits = cnh.replace(/\D/g, '');

  if (digits.length !== 11) return false;

  // Sequências com todos dígitos iguais são inválidas (ex: 11111111111)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0, j = 9; i < 9; i++, j--) {
    sum += Number(digits[i]) * j;
  }

  let dsc = 0;
  let firstDigit = sum % 11;
  if (firstDigit >= 10) {
    firstDigit = 0;
    dsc = 2;
  } else {
    dsc = 1;
  }

  let sum2 = 0;
  for (let i = 0, j = 1; i < 9; i++, j++) {
    sum2 += Number(digits[i]) * j;
  }

  let secondDigit = (sum2 % 11) - dsc;
  if (secondDigit < 0) secondDigit += 11;
  if (secondDigit >= 10) secondDigit = 0;

  return Number(digits[9]) === firstDigit && Number(digits[10]) === secondDigit;
}

export function cnhValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) return null; // required é validado separadamente
    if (!/^\d{11}$/.test(value)) return { cnhFormat: true };
    if (!validateCNHDigits(value)) return { cnhInvalid: true };
    return null;
  };
}
