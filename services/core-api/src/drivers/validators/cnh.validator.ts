import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function validateCNHDigits(cnh: string): boolean {
  const digits = cnh.replace(/\D/g, '');

  if (digits.length !== 11) return false;
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

@ValidatorConstraint({ name: 'IsCNH', async: false })
export class IsCNHConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return typeof value === 'string' && validateCNHDigits(value);
  }

  defaultMessage(): string {
    return 'Número de CNH inválido (dígitos verificadores incorretos)';
  }
}

export function IsCNH(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsCNHConstraint,
    });
  };
}
