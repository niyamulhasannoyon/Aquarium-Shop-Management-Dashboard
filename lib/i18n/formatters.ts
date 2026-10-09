import { Language } from './translations';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts Western digits in a string or number to Bengali digits
 */
export function toBengaliDigits(input: number | string): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  return str.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Formats currency amount based on active language
 */
export function formatCurrency(amount: number, language: Language = 'en'): string {
  const formattedNumber = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  if (language === 'bn') {
    return `৳ ${formattedNumber}`;
  }
  return `৳ ${formattedNumber}`;
}

/**
 * Formats a number with Bengali digits if language is 'bn'
 */
export function formatNumber(num: number | string, language: Language = 'en'): string {
  if (language === 'bn') {
    return toBengaliDigits(num);
  }
  return num.toString();
}

/**
 * Formats date string into localized representation
 */
export function formatDate(dateString: string, language: Language = 'en'): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const formatted = new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', options).format(date);
    return formatted;
  } catch (e) {
    return dateString;
  }
}
