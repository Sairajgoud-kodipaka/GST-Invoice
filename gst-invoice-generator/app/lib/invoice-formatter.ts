// Number to words conversion for invoice amount in words

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const SCALES = ['', 'Thousand', 'Lakh', 'Crore'];

function convertHundreds(num: number): string {
  let result = '';

  // Hundreds place
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    result += ONES[hundreds] + ' Hundred';
    num %= 100;
    if (num > 0) result += ' ';
  }

  // Tens and ones
  if (num >= 20) {
    const tens = Math.floor(num / 10);
    result += TENS[tens];
    num %= 10;
    if (num > 0) result += ' ' + ONES[num];
  } else if (num > 0) {
    result += ONES[num];
  }

  return result.trim();
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = '';

  // Handle crores
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000);
    words += convertHundreds(crores) + ' Crore ';
    rupees %= 10000000;
  }

  // Handle lakhs
  if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    words += convertHundreds(lakhs) + ' Lakh ';
    rupees %= 100000;
  }

  // Handle thousands
  if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    words += convertHundreds(thousands) + ' Thousand ';
    rupees %= 1000;
  }

  // Handle hundreds, tens, ones
  if (rupees > 0) {
    words += convertHundreds(rupees);
  }

  // Add "Rupees"
  if (words.trim()) {
    words = words.trim() + ' Rupees';
  } else {
    words = 'Zero Rupees';
  }

  // Add paise if any
  if (paise > 0) {
    const paiseWords = convertHundreds(paise);
    words += ' and ' + paiseWords + ' Paise';
  }

  return words + ' Only';
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(dateStr: string): string {
  // Already in DD-MM-YYYY format from field-mapper
  return dateStr;
}

