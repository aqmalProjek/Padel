export interface CourtPricing {
  price_session_1: number;
  price_session_1_discount: number;
  is_discount_session_1: boolean;
  price_session_2: number;
  price_session_2_discount: number;
  is_discount_session_2: boolean;
  price_per_hour?: number; // fallback harga default
}

/**
 * Menghitung harga per jam berdasarkan jam main
 * - Sesi 1: 07:00 - 14:59
 * - Sesi 2: 15:00 - 21:00
 */
export function getHourlyRate(timeString: string, court: CourtPricing): number {
  const hour = parseInt(timeString.split(':')[0], 10);

  // Sesi 1: 07.00 - 14.00
  if (hour >= 7 && hour < 15) {
    return court.is_discount_session_1
      ? Number(court.price_session_1_discount)
      : Number(court.price_session_1);
  }

  // Sesi 2: 15.00 - 21.00
  if (hour >= 15 && hour <= 21) {
    return court.is_discount_session_2
      ? Number(court.price_session_2_discount)
      : Number(court.price_session_2);
  }

  // Default fallback jika di luar jam tersebut
  return Number(court.price_session_1 || court.price_per_hour || 125000);
}