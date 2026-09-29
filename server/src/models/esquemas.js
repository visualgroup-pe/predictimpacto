/**
 * Validadores $jsonSchema a nivel de colección.
 * MongoDB los aplica en cada inserción/actualización, incluso si el documento
 * no pasa por Mongoose (p. ej. mongosh o un driver distinto).
 */
const numero = { bsonType: 'number' };
const texto = { bsonType: 'string', minLength: 1 };
const sku = { bsonType: 'string', pattern: '^[A-Z0-9-]{2,20}$' };
const fecha = { bsonType: 'date' };
const noNegativo = { bsonType: 'number', minimum: 0 };

export const jsonSchemas = {
  productos: {
    bsonType: 'object',
    required: [
      'sku',
      'nombre',
      'categoria',
      'nivelServicio',
      'leadTimeDias',
      'existenciaActual',
      'existenciaMinima',
    ],
    properties: {
      sku,
      nombre: texto,
      categoria: texto,
      // Exclusivo en ambos extremos: z(0) y z(1) son infinitos.
      nivelServicio: {
        ...numero,
        minimum: 0,
        exclusiveMinimum: true,
        maximum: 1,
        exclusiveMaximum: true,
      },
      leadTimeDias: { ...numero, minimum: 1 },
      existenciaActual: noNegativo,
      existenciaMinima: noNegativo,
    },
  },
  ventas: {
    bsonType: 'object',
    required: ['sku', 'fecha', 'unidades'],
    properties: { sku, fecha, unidades: noNegativo },
  },
  predicciones: {
    bsonType: 'object',
    required: ['sku', 'fecha', 'demandaPredicha', 'modeloVersion', 'generadoEn'],
    properties: {
      sku,
      fecha,
      demandaPredicha: noNegativo,
      modeloVersion: texto,
      generadoEn: fecha,
    },
  },
  recomendaciones: {
    bsonType: 'object',
    required: [
      'sku',
      'fecha',
      'demandaProyectada7d',
      'stockSeguridad',
      'puntoReorden',
      'estado',
      'accionSugerida',
    ],
    properties: {
      sku,
      fecha,
      demandaProyectada7d: noNegativo,
      stockSeguridad: noNegativo,
      puntoReorden: noNegativo,
      estado: { enum: ['critico', 'moderado', 'estable'] },
      accionSugerida: texto,
    },
  },
  usuarios: {
    bsonType: 'object',
    required: ['usuario', 'passwordHash'],
    properties: { usuario: texto, passwordHash: texto },
  },
};
