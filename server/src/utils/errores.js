export class ErrorHttp extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const solicitudInvalida = (mensaje, detalles) => new ErrorHttp(400, mensaje, detalles);
