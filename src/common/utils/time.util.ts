import { formatInTimeZone } from 'date-fns-tz';

/** Convierte "HH:MM:SS" o "HH:MM" a minutos desde medianoche */
export function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

/** ISO weekday en zona (1=lun … 7=dom) → Date.getDay() (0=dom … 6=sáb) */
function isoWeekdayToJs(iso: number): number {
  return iso === 7 ? 0 : iso;
}

/**
 * Día civil y minutos desde medianoche en `timeZone`, alineado con
 * `professor_availability.day_of_week` y franjas horarias del profesor.
 */
export function zonedDayAndMinutes(
  start: Date,
  end: Date,
  timeZone: string,
) {
  const isoDow = parseInt(formatInTimeZone(start, timeZone, 'i'), 10);
  const dayOfWeek = isoWeekdayToJs(isoDow);
  const [sh, sm] = formatInTimeZone(start, timeZone, 'HH:mm')
    .split(':')
    .map((x) => parseInt(x, 10));
  const [eh, em] = formatInTimeZone(end, timeZone, 'HH:mm')
    .split(':')
    .map((x) => parseInt(x, 10));
  return {
    dayOfWeek,
    startMinutes: sh * 60 + sm,
    endMinutes: eh * 60 + em,
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
