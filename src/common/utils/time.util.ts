/** Convierte "HH:MM:SS" o "HH:MM" a minutos desde medianoche */
export function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

/** Usa componentes UTC para alinear con day_of_week guardado en UTC */
export function utcDayAndMinutes(start: Date, end: Date) {
  return {
    dayOfWeek: start.getUTCDay(),
    startMinutes: start.getUTCHours() * 60 + start.getUTCMinutes(),
    endMinutes: end.getUTCHours() * 60 + end.getUTCMinutes(),
  };
}

export function slotCoversRequest(
  slotStartMin: number,
  slotEndMin: number,
  reqStartMin: number,
  reqEndMin: number,
): boolean {
  return slotStartMin <= reqStartMin && slotEndMin >= reqEndMin;
}
