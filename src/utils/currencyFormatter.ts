/**
 * Formats a price according to the currency's conventions
 */
export const formatCurrency = (price: number, currencyCode: string): string => {
  // Currencies that don't use decimal places
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'IDR', 'HUF', 'TWD'];

  // Special formatting for certain currencies
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    KRW: '₩',
    AUD: 'A$',
    CAD: 'CA$',
    CHF: 'CHF',
    HKD: 'HK$',
    SGD: 'S$',
    NZD: 'NZ$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    MXN: 'MX$',
    INR: '₹',
    BRL: 'R$',
    ZAR: 'R',
    TRY: '₺',
    RUB: '₽',
    PLN: 'zł',
    THB: '฿',
    IDR: 'Rp',
    MYR: 'RM',
    PHP: '₱',
    VND: '₫',
    AED: 'AED',
    SAR: 'SAR',
    ILS: '₪',
    EGP: 'EGP',
    CZK: 'Kč',
    HUF: 'Ft',
    RON: 'lei',
    BGN: 'lev',
    COP: 'COL$',
    CLP: 'CLP$',
    PEN: 'S/',
    QAR: 'QAR',
    KZT: '₸',
    NGN: '₦',
    PKR: 'Rs',
    TZS: 'TSh',
    TWD: 'NT$',
  };

  const symbol = currencySymbols[currencyCode] || currencyCode;
  const hasDecimals = !noDecimalCurrencies.includes(currencyCode);

  // Format the number
  let formattedPrice: string;

  if (hasDecimals) {
    // Use 2 decimal places
    formattedPrice = price.toFixed(2);
  } else {
    // No decimal places
    formattedPrice = Math.round(price).toString();
  }

  // Add thousand separators for large numbers
  const parts = formattedPrice.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  formattedPrice = parts.join('.');

  // Symbol placement (before or after)
  const symbolAfterCurrencies = ['SEK', 'NOK', 'DKK', 'CZK', 'PLN', 'RON', 'BGN'];

  if (symbolAfterCurrencies.includes(currencyCode)) {
    return `${formattedPrice} ${symbol}`;
  }

  return `${symbol}${formattedPrice}`;
};

/**
 * Get localized pricing display for subscription plans
 */
export const getLocalizedPriceDisplay = (
  price: number,
  currency: string,
  period: 'monthly' | 'yearly'
): { price: string; period: string; pricePerMonth?: string } => {
  const formattedPrice = formatCurrency(price, currency);

  if (period === 'monthly') {
    return {
      price: formattedPrice,
      period: 'per month',
    };
  } else {
    // Calculate price per month for yearly plan
    const monthlyEquivalent = price / 12;
    const formattedMonthly = formatCurrency(monthlyEquivalent, currency);

    return {
      price: formattedPrice,
      period: 'per year',
      pricePerMonth: `${formattedMonthly}/month`,
    };
  }
};

/**
 * Calculate savings percentage
 */
export const calculateSavings = (monthlyPrice: number, yearlyPrice: number): string => {
  const yearlyEquivalent = monthlyPrice * 12;
  const savingsPercent = Math.round(((yearlyEquivalent - yearlyPrice) / yearlyEquivalent) * 100);
  return `Save ${savingsPercent}%`;
};
