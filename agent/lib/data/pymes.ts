// Datos 100% sinteticos para el prototipo. Todas las empresas son ficticias.

export type EstadoRadian = "aceptada" | "endosada" | "rechazada" | "pendiente_aceptacion";
export type EstadoSarlaft = "sin_coincidencias" | "coincidencia_parcial" | "coincidencia_confirmada";
export type CalificacionPagador = "AAA" | "AA" | "A" | "BBB+" | "BBB" | "BB" | "B";

export type Pyme = {
  nit: string;
  rut: {
    razonSocial: string;
    representanteLegal: string;
    ciudad: string;
    ciiu: string;
    actividad: string;
    estado: "activo";
    fechaInscripcion: string;
  };
  camara: {
    razonSocial: string;
    representanteLegal: string;
    matriculaVigente: boolean;
    antiguedadAnios: number;
    ciudad: string;
  };
  sarlaft: {
    estado: EstadoSarlaft;
    detalle: string;
    listasConsultadas: string[];
  };
  buro: {
    score: number;
    moras: { diasMora: number; hace_meses: number }[];
    obligacionesActivas: number;
    consultasUltimos6Meses: number;
  };
  ventasAnualesCOP: number;
  concentracionPagadorPct: number;
};

export type Factura = {
  numero: string;
  nit: string;
  pagador: string;
  valor: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estadoRadian: EstadoRadian;
  cufe: string;
  endoso?: { fecha: string; endosatario: string };
};

export type Pagador = {
  nombre: string;
  calificacion: CalificacionPagador;
  pagaATiempoPct: number;
  diasPromedioPago: number;
  sector: string;
};

export type OperacionCartera = {
  id: string;
  numeroFactura: string;
  pagador: string;
  valorFactura: number;
  anticipoDesembolsado: number;
  estado: "pagada" | "activa";
  fechaDesembolso: string;
  fechaVencimiento: string;
  fechaPago?: string;
};

export type Usuario = {
  email: string;
  password: string;
  rol: "pyme" | "analista";
  nombre: string;
  nitPyme?: string;
};

/** Fecha ISO (YYYY-MM-DD) relativa a hoy: negativo = pasado, positivo = futuro. */
export function fechaRelativa(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const NIT_PYME_1 = "901.234.567-1";
export const NIT_PYME_2 = "900.876.543-2";
export const NIT_PYME_3 = "901.555.010-7";

export const PYMES: Pyme[] = [
  {
    nit: NIT_PYME_1,
    rut: {
      razonSocial: "Confecciones Andinas S.A.S.",
      representanteLegal: "Marta Lucía Osorio Vargas",
      ciudad: "Bogotá D.C.",
      ciiu: "1410",
      actividad: "Confección de prendas de vestir, excepto prendas de piel",
      estado: "activo",
      fechaInscripcion: "2020-03-12",
    },
    camara: {
      razonSocial: "Confecciones Andinas S.A.S.",
      representanteLegal: "Marta Lucía Osorio Vargas",
      matriculaVigente: true,
      antiguedadAnios: 6,
      ciudad: "Bogotá D.C.",
    },
    sarlaft: {
      estado: "sin_coincidencias",
      detalle: "Sin coincidencias en OFAC, ONU, listas internas ni PEP.",
      listasConsultadas: ["OFAC", "ONU", "Lista interna del banco", "PEP"],
    },
    buro: { score: 782, moras: [], obligacionesActivas: 2, consultasUltimos6Meses: 1 },
    ventasAnualesCOP: 3_800_000_000,
    concentracionPagadorPct: 18,
  },
  {
    nit: NIT_PYME_2,
    rut: {
      razonSocial: "Metalmecánica del Valle S.A.S.",
      representanteLegal: "Jorge Enrique Cardona Ruiz",
      ciudad: "Cali",
      ciiu: "2592",
      actividad: "Tratamiento y revestimiento de metales; mecanizado",
      estado: "activo",
      fechaInscripcion: "2017-06-05",
    },
    camara: {
      razonSocial: "Metalmecánica del Valle S.A.S.",
      representanteLegal: "Jorge Enrique Cardona Ruiz",
      matriculaVigente: true,
      antiguedadAnios: 9,
      ciudad: "Cali",
    },
    sarlaft: {
      estado: "sin_coincidencias",
      detalle: "Sin coincidencias en OFAC, ONU, listas internas ni PEP.",
      listasConsultadas: ["OFAC", "ONU", "Lista interna del banco", "PEP"],
    },
    buro: {
      score: 641,
      moras: [{ diasMora: 30, hace_meses: 14 }],
      obligacionesActivas: 4,
      consultasUltimos6Meses: 3,
    },
    ventasAnualesCOP: 5_200_000_000,
    concentracionPagadorPct: 45,
  },
  {
    nit: NIT_PYME_3,
    rut: {
      razonSocial: "Distribuciones Caribe Express",
      representanteLegal: "Andrés Felipe Meza Barrios",
      ciudad: "Barranquilla",
      ciiu: "4690",
      actividad: "Comercio al por mayor no especializado",
      estado: "activo",
      fechaInscripcion: "2024-05-20",
    },
    camara: {
      razonSocial: "Caribe Express Logística S.A.S.",
      representanteLegal: "Luis Alberto Pertuz Quintero",
      matriculaVigente: true,
      antiguedadAnios: 1.5,
      ciudad: "Barranquilla",
    },
    sarlaft: {
      estado: "coincidencia_parcial",
      detalle: "Homónimo parcial del representante legal en lista interna de alertas; requiere revisión manual.",
      listasConsultadas: ["OFAC", "ONU", "Lista interna del banco", "PEP"],
    },
    buro: {
      score: 598,
      moras: [
        { diasMora: 60, hace_meses: 5 },
        { diasMora: 30, hace_meses: 9 },
      ],
      obligacionesActivas: 5,
      consultasUltimos6Meses: 7,
    },
    ventasAnualesCOP: 1_900_000_000,
    concentracionPagadorPct: 70,
  },
];

export const FACTURAS: Factura[] = [
  {
    numero: "FE-1001",
    nit: NIT_PYME_1,
    pagador: "Almacenes La Sabana S.A.",
    valor: 48_500_000,
    fechaEmision: fechaRelativa(-10),
    fechaVencimiento: fechaRelativa(60),
    estadoRadian: "aceptada",
    cufe: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9011",
  },
  {
    numero: "FE-2002",
    nit: NIT_PYME_2,
    pagador: "Constructora Pacífico Norte S.A.",
    valor: 385_000_000,
    fechaEmision: fechaRelativa(-15),
    fechaVencimiento: fechaRelativa(90),
    estadoRadian: "aceptada",
    cufe: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a122",
  },
  {
    numero: "FE-3003",
    nit: NIT_PYME_3,
    pagador: "Comercializadora Antillana del Norte S.A.",
    valor: 120_000_000,
    fechaEmision: fechaRelativa(-20),
    fechaVencimiento: fechaRelativa(45),
    estadoRadian: "endosada",
    cufe: "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b233",
    endoso: { fecha: fechaRelativa(-5), endosatario: "Factoring Andino Capital S.A." },
  },
];

export const PAGADORES: Pagador[] = [
  { nombre: "Almacenes La Sabana S.A.", calificacion: "AAA", pagaATiempoPct: 98, diasPromedioPago: 2, sector: "Comercio minorista" },
  { nombre: "Constructora Pacífico Norte S.A.", calificacion: "BBB+", pagaATiempoPct: 81, diasPromedioPago: 12, sector: "Construcción" },
  { nombre: "Comercializadora Antillana del Norte S.A.", calificacion: "BB", pagaATiempoPct: 58, diasPromedioPago: 34, sector: "Comercio mayorista" },
];

/** Cartera de acompanamiento (solo pyme 1). */
export const CARTERA: Record<string, OperacionCartera[]> = {
  [NIT_PYME_1]: [
    {
      id: "OP-0001",
      numeroFactura: "FE-0877",
      pagador: "Almacenes La Sabana S.A.",
      valorFactura: 32_000_000,
      anticipoDesembolsado: 28_800_000,
      estado: "pagada",
      fechaDesembolso: fechaRelativa(-100),
      fechaVencimiento: fechaRelativa(-40),
      fechaPago: fechaRelativa(-41),
    },
    {
      id: "OP-0002",
      numeroFactura: "FE-0955",
      pagador: "Almacenes La Sabana S.A.",
      valorFactura: 41_000_000,
      anticipoDesembolsado: 36_900_000,
      estado: "activa",
      fechaDesembolso: fechaRelativa(-53),
      fechaVencimiento: fechaRelativa(7),
    },
  ],
};

// Contrasena en texto plano: solo para el prototipo.
export const USUARIOS: Usuario[] = [
  { email: "empresario@confeccionesandinas.co", password: "demo2026", rol: "pyme", nombre: "Marta Lucía Osorio", nitPyme: NIT_PYME_1 },
  { email: "gerente@metalvalle.co", password: "demo2026", rol: "pyme", nombre: "Jorge Enrique Cardona", nitPyme: NIT_PYME_2 },
  { email: "admin@caribeexpress.co", password: "demo2026", rol: "pyme", nombre: "Andrés Felipe Meza", nitPyme: NIT_PYME_3 },
  { email: "analista@bancopyme.co", password: "demo2026", rol: "analista", nombre: "Analista de Crédito" },
];
