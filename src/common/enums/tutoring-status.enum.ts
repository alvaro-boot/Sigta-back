export enum TutoringStatus {
  /** Sin docente asignado; visible en cola para especialistas de la materia. */
  UNASSIGNED = 'UNASSIGNED',
  /** Docente propuesto o elegido; espera confirmación del docente. */
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  /** Docente aceptó; sesión acordada. */
  CONFIRMED = 'CONFIRMED',
  /** Anulada por estudiante (o reglas). */
  CANCELLED = 'CANCELLED',
  /** Sesión realizada (marca el docente). */
  COMPLETED = 'COMPLETED',
}
