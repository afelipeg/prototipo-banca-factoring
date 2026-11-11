export type Inyeccion = { sospechoso: boolean; patrones: string[]; severidad: "baja" | "media" | "alta" };

const PATRONES: { nombre: string; re: RegExp; peso: "alta" | "media" }[] = [
  { nombre: "ignora reglas/instrucciones", re: /ignora(r|d)?\s+(las|tus|todas\s+las|todas\s+tus)\s+(reglas|instrucciones|pol[ií]ticas)/i, peso: "alta" },
  { nombre: "ignore previous", re: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/i, peso: "alta" },
  { nombre: "system prompt", re: /system\s+prompt|prompt\s+del\s+sistema/i, peso: "alta" },
  { nombre: "modo desarrollador", re: /modo\s+(desarrollador|developer|dios)|developer\s+mode|jailbreak/i, peso: "alta" },
  { nombre: "sin validar", re: /sin\s+(validar|verificar|revisar)|omite\s+(la\s+)?(validaci[oó]n|verificaci[oó]n)|salta(te)?\s+(las\s+)?(validaciones|reglas)/i, peso: "alta" },
  { nombre: "apruebame", re: /apru[eé]ba(me|lo|la)\b/i, peso: "media" },
  { nombre: "eres ahora", re: /eres\s+ahora|you\s+are\s+now|act[uú]a\s+como\s+si/i, peso: "media" },
  { nombre: "revela instrucciones", re: /(revela|muestra|imprime|reveal|show)\s+(tus|your)\s+(instrucciones|instructions|reglas)/i, peso: "media" },
];

export function detectarInyeccion(texto: string): Inyeccion {
  const hallados = PATRONES.filter((p) => p.re.test(texto));
  const patrones = hallados.map((p) => p.nombre);
  if (hallados.length === 0) return { sospechoso: false, patrones, severidad: "baja" };
  const severidad = hallados.some((p) => p.peso === "alta") || hallados.length >= 2 ? "alta" : "media";
  return { sospechoso: true, patrones, severidad };
}

const maskDigits = (s: string) => {
  const total = (s.match(/\d/g) ?? []).length;
  let visto = 0;
  return s.replace(/\d/g, (d) => (++visto > total - 3 ? d : "*"));
};

/** Enmascara cedulas/NIT (deja los ultimos 3 digitos), correos y telefonos. */
export function enmascararPII(texto: string): string {
  return texto
    .replace(/([\w.+-])[\w.+-]*@([\w-]+(?:\.[\w-]+)+)/g, "$1***@$2")
    .replace(/((?:nit|c[eé]dula|c\.?c\.?)\s*(?:n[o°.]*\s*)?:?\s*)(\d[\d.\-]*\d)/gi, (_m, pre: string, num: string) => pre + maskDigits(num))
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d\b/g, maskDigits)
    .replace(/(?<![\d*])(?:\+?57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g, maskDigits);
}
