/**
 * cie10-catalogue.js - Catálogo Oficial CIE-10 de Diagnósticos Odontológicos (K00-K14, Z01.2 y afines)
 * Diseñado específicamente para clínica dental con rango completo K00-K14, Z01.2, traumatismos y catálogo dinámico ampliable.
 */

export const CIE10_DENTAL_BASE = [
  // --- K00: TRASTORNOS DEL DESARROLLO Y DE LA ERUPCIÓN DE LOS DIENTES ---
  { code: 'K00.0', name: 'Anodoncia / Hipodoncia (ausencia congénita de dientes)', category: 'Desarrollo / Erupción' },
  { code: 'K00.1', name: 'Dientes supernumerarios (hiperdoncia / mesiodens)', category: 'Desarrollo / Erupción' },
  { code: 'K00.2', name: 'Anomalías del tamaño y de la forma del diente (microdoncia, macrodoncia, dens in dente)', category: 'Desarrollo / Erupción' },
  { code: 'K00.3', name: 'Dientes moteados / Fluorosis dental / Opacidades no fluoróticas', category: 'Desarrollo / Erupción' },
  { code: 'K00.4', name: 'Alteraciones en la formación dentaria / Hipoplasia del esmalte', category: 'Desarrollo / Erupción' },
  { code: 'K00.5', name: 'Alteraciones hereditarias de la estructura dentaria (Amelogénesis / Dentinogénesis imperfecta)', category: 'Desarrollo / Erupción' },
  { code: 'K00.6', name: 'Alteraciones en la erupción dentaria (diente retenido, caída prematura o retrasada)', category: 'Desarrollo / Erupción' },
  { code: 'K00.7', name: 'Síndrome de la erupción dentaria', category: 'Desarrollo / Erupción' },
  { code: 'K00.8', name: 'Otros trastornos del desarrollo de los dientes', category: 'Desarrollo / Erupción' },
  { code: 'K00.9', name: 'Trastorno del desarrollo de los dientes, no especificado', category: 'Desarrollo / Erupción' },

  // --- K01: DIENTES INCLUIDOS E IMPACTADOS ---
  { code: 'K01.0', name: 'Diente incluido', category: 'Inclusión / Impactación' },
  { code: 'K01.1', name: 'Diente impactado (ej: Tercer molar / Canino retenido)', category: 'Inclusión / Impactación' },

  // --- K02: CARIES DENTAL ---
  { code: 'K02.0', name: 'Caries limitada al esmalte (mancha blanca / lesiones iniciales)', category: 'Caries Dental' },
  { code: 'K02.1', name: 'Caries de la dentina', category: 'Caries Dental' },
  { code: 'K02.2', name: 'Caries del cemento radicular', category: 'Caries Dental' },
  { code: 'K02.3', name: 'Caries dental detenida', category: 'Caries Dental' },
  { code: 'K02.4', name: 'Odontoclasia / Caries de la infancia temprana (biberón)', category: 'Caries Dental' },
  { code: 'K02.8', name: 'Otras caries dentales', category: 'Caries Dental' },
  { code: 'K02.9', name: 'Caries dental, no especificada', category: 'Caries Dental' },

  // --- K03: OTRAS ENFERMEDADES DE LOS TEJIDOS DUROS DE LOS DIENTES ---
  { code: 'K03.0', name: 'Atrición excesiva de los dientes (bruxismo / desgaste oclusal)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.1', name: 'Abrasión dental (técnica de cepillado traumática / abrasivos)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.2', name: 'Erosión dental (ácidos gástricos, reflujo, cítricos)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.3', name: 'Reabsorción patológica de los dientes (interna / externa)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.4', name: 'Hipercementosis', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.5', name: 'Anquilosis dental', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.6', name: 'Depósitos en los dientes (sarro, cálculo sub/supragingival, placa)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.7', name: 'Cambios de color posteruptivos de los tejidos duros dentales', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.8', name: 'Otras enfermedades de los tejidos duros (Abfracción / Hipersensibilidad dentinaria)', category: 'Tejidos Duros / Desgaste' },
  { code: 'K03.9', name: 'Enfermedad de los tejidos duros de los dientes, no especificada', category: 'Tejidos Duros / Desgaste' },

  // --- K04: ENFERMEDADES DE LA PULPA Y DE LOS TEJIDOS PERIAPICALES ---
  { code: 'K04.0', name: 'Pulpitis (reversible / irreversible aguda o crónica)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.1', name: 'Necrosis de la pulpa (gangrena pulpar)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.2', name: 'Degeneración de la pulpa (calcificaciones, piedras pulpares)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.3', name: 'Formación anormal de tejido duro en la pulpa (dentina secundaria)', category: 'Endodoncia / Pulpa' },
  { code: 'K04.4', name: 'Periodontitis apical aguda de origen pulpar', category: 'Endodoncia / Periapical' },
  { code: 'K04.5', name: 'Periodontitis apical crónica (granuloma apical / periapical)', category: 'Endodoncia / Periapical' },
  { code: 'K04.6', name: 'Absceso periapical con fístula (fístula alveolar)', category: 'Endodoncia / Periapical' },
  { code: 'K04.7', name: 'Absceso periapical sin fístula', category: 'Endodoncia / Periapical' },
  { code: 'K04.8', name: 'Quiste radicular (apical, periodontal apical)', category: 'Endodoncia / Periapical' },
  { code: 'K04.9', name: 'Otras enfermedades y las no especificadas de la pulpa y del tejido periapical', category: 'Endodoncia / Periapical' },

  // --- K05: GINGIVITIS Y ENFERMEDADES PERIODONTALES ---
  { code: 'K05.0', name: 'Gingivitis aguda (estreptocócica, no específica)', category: 'Periodoncia' },
  { code: 'K05.1', name: 'Gingivitis crónica inducida por placa bacteriana', category: 'Periodoncia' },
  { code: 'K05.2', name: 'Periodontitis aguda / Absceso periodontal', category: 'Periodoncia' },
  { code: 'K05.3', name: 'Periodontitis crónica (leve, moderada, avanzada)', category: 'Periodoncia' },
  { code: 'K05.4', name: 'Periodontosis / Periodontitis agresiva juvenil', category: 'Periodoncia' },
  { code: 'K05.5', name: 'Otras enfermedades periodontales', category: 'Periodoncia' },
  { code: 'K05.6', name: 'Enfermedad periodontal, no especificada', category: 'Periodoncia' },

  // --- K06: OTROS TRASTORNOS DE LA ENCÍA Y DEL REBORDE ALVEOLAR DESDENTADO ---
  { code: 'K06.0', name: 'Recesión gingival (retracción gingival localizada / generalizada)', category: 'Periodoncia / Reborde' },
  { code: 'K06.1', name: 'Hiperplasia / Agrandamiento gingival (fibromatosis, inducida por fármacos)', category: 'Periodoncia / Reborde' },
  { code: 'K06.2', name: 'Lesiones de la encía y del reborde por traumatismo o prótesis', category: 'Periodoncia / Reborde' },
  { code: 'K06.8', name: 'Otros trastornos especificados de la encía y del reborde alveolar', category: 'Periodoncia / Reborde' },
  { code: 'K06.9', name: 'Trastorno de la encía y del reborde alveolar, no especificado', category: 'Periodoncia / Reborde' },

  // --- K07: ANOMALÍAS DENTOFACIALES (INCLUSO LA MALOCLUSIÓN) Y ATM ---
  { code: 'K07.0', name: 'Anomalías mayores del tamaño de los maxilares (Macrognatia / Micrognatia)', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.1', name: 'Anomalías de la relación maxilobasilar (Asimetría, Prognatismo, Retrognatismo)', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.2', name: 'Anomalías de la relación entre los arcos dentarios (Maloclusión Clase I, II, III, Sobremordida, Mordida cruzada, Mordida abierta)', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.3', name: 'Anomalías de la posición del diente (Apiñamiento, Diastema, Transposición, Rotación)', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.4', name: 'Maloclusión de tipo no especificado', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.5', name: 'Anormalidades dentofaciales funcionales (Deglución atípica, Respirador bucal)', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.6', name: 'Trastornos de la articulación temporomandibular (ATM / DTM, chasquido, dolor miofascial)', category: 'ATM / Oclusión' },
  { code: 'K07.8', name: 'Otras anomalías dentofaciales', category: 'Ortodoncia / Oclusión' },
  { code: 'K07.9', name: 'Anomalía dentofacial, no especificada', category: 'Ortodoncia / Oclusión' },

  // --- K08: OTROS TRASTORNOS DE LOS DIENTES Y DE SUS ESTRUCTURAS DE SOSTÉN ---
  { code: 'K08.0', name: 'Exfoliación de los dientes debida a causas sistémicas', category: 'Pérdida / Reborde' },
  { code: 'K08.1', name: 'Pérdida de dientes por accidente, extracción o afección periodontal (Edentulismo parcial)', category: 'Pérdida / Reborde' },
  { code: 'K08.2', name: 'Atrofia del reborde alveolar desdentado', category: 'Pérdida / Reborde' },
  { code: 'K08.3', name: 'Raíz dental retenida / Resto radicular', category: 'Pérdida / Reborde' },
  { code: 'K08.8', name: 'Otros trastornos especificados de los dientes (Odontalgia / Dolor dental no especificado)', category: 'Pérdida / Reborde' },
  { code: 'K08.9', name: 'Trastorno de los dientes y de sus estructuras de sostén, no especificado', category: 'Pérdida / Reborde' },

  // --- K09: QUISTES DE LA REGIÓN BUCAL ---
  { code: 'K09.0', name: 'Quistes odontogénicos del desarrollo (dentígero, de erupción, primordial)', category: 'Quistes Bucales' },
  { code: 'K09.1', name: 'Quistes del desarrollo (no odontogénicos) de la región bucal (nasopalatino)', category: 'Quistes Bucales' },
  { code: 'K09.2', name: 'Otros quistes de los maxilares', category: 'Quistes Bucales' },
  { code: 'K09.8', name: 'Otros quistes de la región bucal', category: 'Quistes Bucales' },
  { code: 'K09.9', name: 'Quiste de la región bucal, no especificado', category: 'Quistes Bucales' },

  // --- K10: OTRAS ENFERMEDADES DE LOS MAXILARES ---
  { code: 'K10.0', name: 'Trastornos del desarrollo de los maxilares (Torus palatino / Torus mandibular)', category: 'Maxilares' },
  { code: 'K10.1', name: 'Granuloma central de células gigantes', category: 'Maxilares' },
  { code: 'K10.2', name: 'Afecciones inflamatorias de los maxilares (Osteítis, Osteomielitis, Osteorradionecrosis)', category: 'Maxilares' },
  { code: 'K10.3', name: 'Alveolitis del maxilar (Alveolitis seca / Fibrinolítica)', category: 'Maxilares' },
  { code: 'K10.8', name: 'Otras enfermedades especificadas de los maxilares', category: 'Maxilares' },
  { code: 'K10.9', name: 'Enfermedad de los maxilares, no especificada', category: 'Maxilares' },

  // --- K11: ENFERMEDADES DE LAS GLÁNDULAS SALIVALES ---
  { code: 'K11.0', name: 'Atrofia de la glándula salival', category: 'Glándulas Salivales' },
  { code: 'K11.1', name: 'Hipertrofia de la glándula salival', category: 'Glándulas Salivales' },
  { code: 'K11.2', name: 'Sialadenitis (infección / inflamación salival)', category: 'Glándulas Salivales' },
  { code: 'K11.3', name: 'Absceso de glándula salival', category: 'Glándulas Salivales' },
  { code: 'K11.5', name: 'Sialolitiasis (cálculo en conducto salival)', category: 'Glándulas Salivales' },
  { code: 'K11.6', name: 'Mucocele de glándula salival / Ránula', category: 'Glándulas Salivales' },
  { code: 'K11.7', name: 'Alteraciones de la secreción salival (Hiposialia, Xerostomía, Ptialismo)', category: 'Glándulas Salivales' },
  { code: 'K11.8', name: 'Otras enfermedades de las glándulas salivales', category: 'Glándulas Salivales' },
  { code: 'K11.9', name: 'Enfermedad de la glándula salival, no especificada', category: 'Glándulas Salivales' },

  // --- K12: ESTOMATITIS Y LESIONES AFINES ---
  { code: 'K12.0', name: 'Estomatitis aftosa recurrente (aftas bucales, úlceras orales)', category: 'Mucosa Bucal' },
  { code: 'K12.1', name: 'Otras formas de estomatitis (estomatitis protésica, geográfica)', category: 'Mucosa Bucal' },
  { code: 'K12.2', name: 'Celulitis y absceso de boca (flemón de piso de boca / Angina de Ludwig)', category: 'Mucosa Bucal' },
  { code: 'K12.3', name: 'Mucositis oral (ulcerativa / por radioterapia)', category: 'Mucosa Bucal' },

  // --- K13: OTRAS ENFERMEDADES DE LOS LABIOS Y DE LA MUCOSA BUCAL ---
  { code: 'K13.0', name: 'Enfermedades de los labios (Queilitis angular, Queilitis actínica, exfoliative)', category: 'Labios / Mucosa' },
  { code: 'K13.1', name: 'Mordedura del labio y de la mejilla', category: 'Labios / Mucosa' },
  { code: 'K13.2', name: 'Leucoplasia y otras alteraciones del epitelio bucal (eritroplasia)', category: 'Labios / Mucosa' },
  { code: 'K13.4', name: 'Granuloma y lesiones similares de la mucosa bucal (Épulis / Granuloma piógeno)', category: 'Labios / Mucosa' },
  { code: 'K13.7', name: 'Otras lesiones y las no especificadas de la mucosa bucal', category: 'Labios / Mucosa' },

  // --- K14: ENFERMEDADES DE LA LENGUA ---
  { code: 'K14.0', name: 'Glositis', category: 'Lengua' },
  { code: 'K14.1', name: 'Lengua geográfica (glositis migratoria benigna)', category: 'Lengua' },
  { code: 'K14.2', name: 'Glositis romboidea mediana', category: 'Lengua' },
  { code: 'K14.3', name: 'Hipertrofia de las papilas linguales (Lengua negra vellosa)', category: 'Lengua' },
  { code: 'K14.5', name: 'Lengua fisurada / Lengua escrotal', category: 'Lengua' },
  { code: 'K14.6', name: 'Glosodinia / Síndrome de ardor bucal / Lengua dolorosa', category: 'Lengua' },
  { code: 'K14.8', name: 'Otras enfermedades de la lengua', category: 'Lengua' },
  { code: 'K14.9', name: 'Enfermedad de la lengua, no especificada', category: 'Lengua' },

  // --- Z01.2: EXAMEN Y CONTROL ODONTOLÓGICO Y CÓDIGOS FRECUENTES ---
  { code: 'Z01.2', name: 'Examen y control odontológico de rutina / Consulta preventiva de salud bucal', category: 'Examen y Control' },
  { code: 'S02.5', name: 'Fractura de los dientes (traumatismo dental / fractura coronaria o radicular)', category: 'Traumatismo' },
  { code: 'S03.2', name: 'Luxación de diente / Subluxación / Avulsión dental', category: 'Traumatismo' },
  { code: 'B37.0', name: 'Estomatitis candidiásica / Candidiasis oral', category: 'Infeccioso' },
  { code: 'B00.2', name: 'Gingivoestomatitis y faringoamigdalitis herpética', category: 'Infeccioso' }
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

export function searchCIE10(query = '') {
  const list = getFullCIE10Catalogue();
  const q = query.toLowerCase().trim();
  if (!q) return list.slice(0, 15);

  return list.filter(item => {
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
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
