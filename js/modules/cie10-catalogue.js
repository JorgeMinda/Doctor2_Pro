/**
 * cie10-catalogue.js - Catálogo Oficial CIE-10 de Diagnósticos Odontológicos (K00-K14, Z01.2 y afines)
 * Diseñado específicamente para clínica dental con rango completo K00-K14, Z01.2, traumatismos y catálogo dinámico ampliable.
 */

export const CIE10_DENTAL_BASE = [
  // --- K02: CARIES DENTAL ---
  { code: 'K02.0', name: 'Caries limitada al esmalte (mancha blanca / lesiones iniciales)', category: 'Caries Dental', popular: true },
  { code: 'K02.1', name: 'Caries de la dentina (cavidad activa)', category: 'Caries Dental', popular: true },
  { code: 'K02.2', name: 'Caries del cemento radicular', category: 'Caries Dental' },
  { code: 'K02.3', name: 'Caries dental detenida / inactiva', category: 'Caries Dental' },
  { code: 'K02.4', name: 'Odontoclasia / Caries de la infancia temprana (biberón)', category: 'Caries Dental' },
  { code: 'K02.5', name: 'Caries con compromiso / sospecha de exposición pulpar', category: 'Caries Dental', popular: true },
  { code: 'K02.8', name: 'Otras caries dentales (caries secundaria / recidivante)', category: 'Caries Dental', popular: true },
  { code: 'K02.9', name: 'Caries dental, no especificada', category: 'Caries Dental' },

  // --- K04: ENFERMEDADES DE LA PULPA Y DE LOS TEJIDOS PERIAPICALES (ENDODONCIA) ---
  { code: 'K04.0', name: 'Pulpitis reversible / irreversible (aguda o crónica)', category: 'Endodoncia / Pulpa', popular: true },
  { code: 'K04.1', name: 'Necrosis de la pulpa (gangrena pulpar / diente no vital)', category: 'Endodoncia / Pulpa', popular: true },
  { code: 'K04.2', name: 'Degeneración de la pulpa (calcificaciones / piedras pulpares)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.3', name: 'Formación anormal de tejido duro en la pulpa (dentina secundaria)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.4', name: 'Periodontitis apical aguda de origen pulpar (dolor a la percusión)', category: 'Endodoncia / Pulpa', popular: true },
  { code: 'K04.5', name: 'Periodontitis apical crónica (granuloma apical / lesión periapical)', category: 'Endodoncia / Pulpa', popular: true },
  { code: 'K04.6', name: 'Absceso periapical con fístula (fístula alveolar mucosa)', category: 'Endodoncia / Pulpa', popular: true },
  { code: 'K04.7', name: 'Absceso periapical sin fístula (absceso dental agudo)', category: 'Endodoncia / Pulpa', popular: true },
  { code: 'K04.8', name: 'Quiste radicular (apical, periodontal apical)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.9', name: 'Otras enfermedades y las no especificadas de la pulpa y tejido periapical', category: 'Endodoncia / Pulpa' },

  // --- K05: GINGIVITIS Y ENFERMEDADES PERIODONTALES ---
  { code: 'K05.0', name: 'Gingivitis aguda (estreptocócica, no específica)', category: 'Periodoncia', popular: true },
  { code: 'K05.1', name: 'Gingivitis crónica inducida por placa bacteriana (sangrado gingival)', category: 'Periodoncia', popular: true },
  { code: 'K05.2', name: 'Periodontitis aguda / Absceso periodontal', category: 'Periodoncia', popular: true },
  { code: 'K05.3', name: 'Periodontitis crónica (leve, moderada o avanzada con pérdida de inserción)', category: 'Periodoncia', popular: true },
  { code: 'K05.4', name: 'Periodontosis / Periodontitis agresiva localizada o generalizada', category: 'Periodoncia' },
  { code: 'K05.5', name: 'Otras enfermedades periodontales', category: 'Periodoncia' },
  { code: 'K05.6', name: 'Enfermedad periodontal, no especificada', category: 'Periodoncia' },

  // --- K06: OTROS TRASTORNOS DE LA ENCÍA Y REBORDE ALVEOLAR ---
  { code: 'K06.0', name: 'Recesión gingival (retracción gingival clase Miller)', category: 'Periodoncia', popular: true },
  { code: 'K06.1', name: 'Hiperplasia / Agrandamiento gingival (inducida por fármacos / idiopática)', category: 'Periodoncia' },
  { code: 'K06.2', name: 'Lesiones de la encía y del reborde por traumatismo o prótesis', category: 'Periodoncia' },
  { code: 'K06.8', name: 'Otros trastornos especificados de la encía y del reborde alveolar', category: 'Periodoncia' },
  { code: 'K06.9', name: 'Trastorno de la encía y del reborde alveolar, no especificado', category: 'Periodoncia' },

  // --- K00: TRASTORNOS DEL DESARROLLO Y DE LA ERUPCIÓN DENTAL ---
  { code: 'K00.0', name: 'Anodoncia / Hipodoncia (ausencia congénita o agenesia dental)', category: 'Desarrollo / Erupción' },
  { code: 'K00.1', name: 'Dientes supernumerarios (hiperdoncia / mesiodens)', category: 'Desarrollo / Erupción' },
  { code: 'K00.2', name: 'Anomalías del tamaño y forma del diente (microdoncia, cúspide accesoria, geminación)', category: 'Desarrollo / Erupción' },
  { code: 'K00.3', name: 'Dientes moteados / Fluorosis dental / Opacidades no fluoróticas', category: 'Desarrollo / Erupción' },
  { code: 'K00.4', name: 'Alteraciones en la formación dentaria / Hipoplasia del esmalte / Hipomineralización incisivo-molar (MIH)', category: 'Desarrollo / Erupción', popular: true },
  { code: 'K00.5', name: 'Alteraciones hereditarias de la estructura (Amelogénesis / Dentinogénesis imperfecta)', category: 'Desarrollo / Erupción' },
  { code: 'K00.6', name: 'Alteraciones en la erupción (diente retenido, exfoliación tardía, persistencia temporal)', category: 'Desarrollo / Erupción', popular: true },
  { code: 'K00.7', name: 'Síndrome de la erupción dentaria (dolor y eritema por brote)', category: 'Desarrollo / Erupción' },
  { code: 'K00.9', name: 'Trastorno del desarrollo de los dientes, no especificado', category: 'Desarrollo / Erupción' },

  // --- K01: DIENTES INCLUIDOS E IMPACTADOS ---
  { code: 'K01.0', name: 'Diente incluido (no ha erupcionado en el arco)', category: 'Cirugía / Retención' },
  { code: 'K01.1', name: 'Diente impactado (Tercer molar retenido / Canino incluido impactado)', category: 'Cirugía / Retención', popular: true },

  // --- K03: TEJIDOS DUROS / DESGASTE DENTAL ---
  { code: 'K03.0', name: 'Atrición excesiva de los dientes (bruxismo / desgaste oclusal o incisal)', category: 'Tejidos Duros / Desgaste', popular: true },
  { code: 'K03.1', name: 'Abrasión dental (técnica de cepillado traumática / abrasión cervical)', category: 'Tejidos Duros / Desgaste', popular: true },
  { code: 'K03.2', name: 'Erosión dental (ácidos intrínsecos por reflujo o extrínsecos por cítricos)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.3', name: 'Reabsorción patológica de los dientes (reabsorción interna / externa radicular)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.4', name: 'Hipercementosis', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.5', name: 'Anquilosis dental', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.6', name: 'Depósitos en los dientes (sarro, cálculo subgingival / supragingival, placa)', category: 'Tejidos Duros / Desgaste', popular: true },
  { code: 'K03.7', name: 'Cambios de color posteruptivos de los tejidos dentales (tinción intrínseca/extrínseca)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.8', name: 'Hipersensibilidad dentinaria / Lesión cervical no cariosa (Abfracción)', category: 'Tejidos Duros / Desgaste', popular: true },
  { code: 'K03.9', name: 'Enfermedad de los tejidos duros de los dientes, no especificada', category: 'Tejidos Duros / Desgaste' },

  // --- K07: ANOMALÍAS DENTOFACIALES, MALOCLUSIÓN Y ATM ---
  { code: 'K07.0', name: 'Anomalías mayores del tamaño de los maxilares (Macrognatia / Micrognatia)', category: 'Ortodoncia / ATM' },
  { code: 'K07.1', name: 'Anomalías de la relación maxilobasilar (Asimetría facial, Prognatismo, Retrognatismo)', category: 'Ortodoncia / ATM' },
  { code: 'K07.2', name: 'Anomalías de relación de arcadas (Maloclusión Clase I, II división 1/2, III, Mordida abierta, Mordida cruzada)', category: 'Ortodoncia / ATM', popular: true },
  { code: 'K07.3', name: 'Anomalías de posición dental (Apiñamiento, Diastema, Rotación, Transposición)', category: 'Ortodoncia / ATM', popular: true },
  { code: 'K07.4', name: 'Maloclusión de tipo no especificado', category: 'Ortodoncia / ATM' },
  { code: 'K07.5', name: 'Anormalidades funcionales (Deglución atípica, Respiración bucal, Succión digital)', category: 'Ortodoncia / ATM' },
  { code: 'K07.6', name: 'Trastornos de la articulación temporomandibular (ATM / DTM, chasquido, bloqueo, dolor)', category: 'Ortodoncia / ATM', popular: true },

  // --- K08: PÉRDIDA DENTAL Y ESTRUCTURAS DE SOSTÉN ---
  { code: 'K08.1', name: 'Pérdida de dientes por accidente, extracción o afección periodontal (Edentulismo parcial)', category: 'Rehabilitación / Pérdida', popular: true },
  { code: 'K08.2', name: 'Atrofia del reborde alveolar desdentado (reabsorción ósea residual)', category: 'Rehabilitación / Pérdida' },
  { code: 'K08.3', name: 'Raíz dental retenida / Resto radicular', category: 'Cirugía / Retención', popular: true },
  { code: 'K08.4', name: 'Pérdida total de dientes (Edentulismo total maxilar / mandibular)', category: 'Rehabilitación / Pérdida', popular: true },
  { code: 'K08.8', name: 'Odontalgia / Dolor dental agudo no especificado', category: 'Urgencias / Dolor', popular: true },
  { code: 'K08.9', name: 'Trastorno de los dientes y estructuras de sostén, no especificado', category: 'Rehabilitación / Pérdida' },

  // --- K10: ENFERMEDADES DE LOS MAXILARES ---
  { code: 'K10.0', name: 'Trastornos del desarrollo de los maxilares (Torus palatino / Torus mandibular)', category: 'Cirugía / Retención' },
  { code: 'K10.2', name: 'Afecciones inflamatorias de maxilares (Osteítis, Osteomielitis, Osteonecrosis medicamentosa)', category: 'Cirugía / Retención' },
  { code: 'K10.3', name: 'Alveolitis del maxilar (Alveolitis seca / post-exodoncia)', category: 'Cirugía / Retención', popular: true },

  // --- K11: GLÁNDULAS SALIVALES ---
  { code: 'K11.2', name: 'Sialadenitis (infección o inflamación de glándula salival)', category: 'Glándulas Salivales' },
  { code: 'K11.5', name: 'Sialolitiasis (cálculo en conducto salival)', category: 'Glándulas Salivales' },
  { code: 'K11.6', name: 'Mucocele de glándula salival menor / Ránula', category: 'Glándulas Salivales', popular: true },
  { code: 'K11.7', name: 'Alteraciones de secreción salival (Xerostomía / Boca seca / Ptialismo)', category: 'Glándulas Salivales' },

  // --- K12, K13, K14: MUCOSA BUCAL, LABIOS Y LENGUA ---
  { code: 'K12.0', name: 'Estomatitis aftosa recurrente (aftas bucales, úlceras orales recurrentes)', category: 'Mucosa / Tejidos Blandos', popular: true },
  { code: 'K12.1', name: 'Otras formas de estomatitis (estomatitis protésica / candidiásica asociada a placa)', category: 'Mucosa / Tejidos Blandos', popular: true },
  { code: 'K12.2', name: 'Celulitis y flemón de boca (infección odontogénica difusa / Angina de Ludwig)', category: 'Urgencias / Dolor', popular: true },
  { code: 'K13.0', name: 'Enfermedades de los labios (Queilitis angular / boqueras, Queilitis actínica)', category: 'Mucosa / Tejidos Blandos', popular: true },
  { code: 'K13.1', name: 'Mordedura del labio y de la mejilla (línea alba / queratosis friccional)', category: 'Mucosa / Tejidos Blandos' },
  { code: 'K13.2', name: 'Leucoplasia y otras alteraciones del epitelio bucal (eritroplasia)', category: 'Mucosa / Tejidos Blandos' },
  { code: 'K13.4', name: 'Granuloma y lesiones similares de mucosa bucal (Épulis / Granuloma piógeno)', category: 'Mucosa / Tejidos Blandos' },
  { code: 'K14.0', name: 'Glositis (inflamación de la lengua)', category: 'Mucosa / Tejidos Blandos' },
  { code: 'K14.1', name: 'Lengua geográfica (glositis migratoria benigna)', category: 'Mucosa / Tejidos Blandos', popular: true },
  { code: 'K14.5', name: 'Lengua fisurada / escrotal', category: 'Mucosa / Tejidos Blandos' },
  { code: 'K14.6', name: 'Glosodinia / Síndrome de ardor bucal', category: 'Mucosa / Tejidos Blandos' },

  // --- S02, S03: TRAUMATISMOS DENTALES ---
  { code: 'S02.5', name: 'Fractura de los dientes (fractura de esmalte, esmalte-dentina o radicular)', category: 'Traumatismos Dentales', popular: true },
  { code: 'S03.2', name: 'Luxación de diente / Concusión / Subluxación / Intrusión / Extrusión / Avulsión dental', category: 'Traumatismos Dentales', popular: true },
  { code: 'S00.5', name: 'Traumatismo superficial de los labios y de la cavidad bucal (laceración gingival)', category: 'Traumatismos Dentales' },

  // --- Z01, Z29, Z46: CONTROL, PREVENCIÓN Y REHABILITACIÓN ---
  { code: 'Z01.2', name: 'Examen y control odontológico de rutina / Consulta preventiva de salud bucal', category: 'Control y Prevención', popular: true },
  { code: 'Z29.8', name: 'Profilaxis dental profesional / Aplicación tópica preventiva de flúor / Sellantes', category: 'Control y Prevención', popular: true },
  { code: 'Z46.3', name: 'Prueba y ajuste de prótesis dental (fija, removible o total)', category: 'Control y Prevención', popular: true },
  { code: 'Z46.4', name: 'Ajuste y control de dispositivo ortodóntico (brackets / alineadores)', category: 'Control y Prevención', popular: true },

  // --- INFECCIONES Y PATOLOGÍAS AFINES ---
  { code: 'B37.0', name: 'Estomatitis candidiásica / Candidiasis oral (muguet oral)', category: 'Infeccioso / Otros', popular: true },
  { code: 'B00.2', name: 'Gingivoestomatitis herpética aguda (Virus Herpes Simple Tipo 1)', category: 'Infeccioso / Otros' }
];

// Almacén dinámico en memoria y local para ampliaciones de la clínica
let customCatalogue = [];
try {
  const saved = localStorage.getItem('doctor2_custom_cie10');
  if (saved) customCatalogue = JSON.parse(saved);
} catch (e) {}

export function getFullCIE10Catalogue() {
  return [...CIE10_DENTAL_BASE, ...customCatalogue];
}

export function getCIE10Categories() {
  const list = getFullCIE10Catalogue();
  const set = new Set();
  list.forEach(i => {
    if (i.category) set.add(i.category);
  });
  return Array.from(set);
}

export function getPopularCIE10() {
  const list = getFullCIE10Catalogue();
  return list.filter(item => item.popular);
}

export function searchCIE10(query = '', categoryFilter = null) {
  let list = getFullCIE10Catalogue();
  if (categoryFilter && categoryFilter !== 'Todas') {
    list = list.filter(item => item.category === categoryFilter);
  }

  const q = (query || '').toLowerCase().trim();
  if (!q) {
    if (categoryFilter && categoryFilter !== 'Todas') {
      return list;
    }
    // Si no hay búsqueda, devolver los populares primero y luego el resto
    return list.slice(0, 20);
  }

  return list.filter(item => {
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });
}

export function getCIE10ByCode(code) {
  const list = getFullCIE10Catalogue();
  return list.find(item => item.code.toUpperCase() === (code || '').toUpperCase()) || null;
}

export function addCustomCIE10(entry) {
  if (!entry || !entry.code || !entry.name) return false;
  const list = getFullCIE10Catalogue();
  const exists = list.some(item => item.code.toUpperCase() === entry.code.toUpperCase());
  if (!exists) {
    customCatalogue.push({
      code: entry.code.trim().toUpperCase(),
      name: entry.name.trim(),
      category: entry.category?.trim() || 'Personalizado'
    });
    try {
      localStorage.setItem('doctor2_custom_cie10', JSON.stringify(customCatalogue));
    } catch (e) {}
  }
  return true;
}

// Compatibilidad hacia atrás
export const CIE11_DENTAL_CATALOGUE = CIE10_DENTAL_BASE;
export const searchCIE11 = searchCIE10;
export const getCIE11ByCode = getCIE10ByCode;
