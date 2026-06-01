// Lista hardcodeada de modelos para el autocompletado del formulario.
// iPhone-first (el negocio real son iPhones), recientes arriba, luego iPad,
// y al final "Apple (otro)". Si el técnico escribe algo que no matchea, el
// ModeloPicker igual acepta el texto libre (Android sueltos).
//
// Mantenimiento: es solo un array. Agregar/quitar líneas acá; sin backend.

export const APPLE_MODELS: string[] = [
  // iPhone
  'iPhone 16 Pro Max',
  'iPhone 16 Pro',
  'iPhone 16 Plus',
  'iPhone 16',
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15 Plus',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14 Plus',
  'iPhone 14',
  'iPhone SE (3ra gen)',
  'iPhone 13 Pro Max',
  'iPhone 13 Pro',
  'iPhone 13',
  'iPhone 13 mini',
  'iPhone 12 Pro Max',
  'iPhone 12 Pro',
  'iPhone 12',
  'iPhone 12 mini',
  'iPhone SE (2da gen)',
  'iPhone 11 Pro Max',
  'iPhone 11 Pro',
  'iPhone 11',
  'iPhone XS Max',
  'iPhone XS',
  'iPhone XR',
  'iPhone X',
  'iPhone 8 Plus',
  'iPhone 8',
  'iPhone 7 Plus',
  'iPhone 7',
  'iPhone 6s Plus',
  'iPhone 6s',
  'iPhone 6 Plus',
  'iPhone 6',
  'iPhone SE (2016)',

  // iPad
  'iPad Pro 13" (M4)',
  'iPad Pro 11" (M4)',
  'iPad Air 13" (M2)',
  'iPad Air 11" (M2)',
  'iPad Pro 12.9"',
  'iPad Pro 11"',
  'iPad Air (5ta gen)',
  'iPad Air (4ta gen)',
  'iPad (10ma gen)',
  'iPad (9na gen)',
  'iPad mini (6ta gen)',

  // Genérico
  'Apple (otro)',
];
