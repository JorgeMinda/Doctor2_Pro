/**
 * cie11-catalogue.js - Catálogo Oficial CIE-11 de Odontología y Salud Bucal (OMS)
 * Proporciona búsqueda predictiva por código, nombre y sinónimos comunes.
 */

export const CIE11_DENTAL_CATALOGUE = [
  // 1. Caries Dental y Trastornos de los Tejidos Duros del Diente
  { code: 'DA01.0', name: 'Caries dental limitada al esmalte (mancha blanca / microcavidad)', category: 'Caries' },
  { code: 'DA01.1', name: 'Caries de la dentina', category: 'Caries' },
  { code: 'DA01.2', name: 'Caries del cemento radicular', category: 'Caries' },
  { code: 'DA01.3', name: 'Caries dental detenida', category: 'Caries' },
  { code: 'DA01.4', name: 'Odontoclasia infantil / Caries de la primera infancia', category: 'Caries' },
  { code: 'DA01.Z', name: 'Caries dental, no especificada', category: 'Caries' },
  { code: 'DA02.0', name: 'Diente retenido / incluido', category: 'Erupción y Posición' },
  { code: 'DA02.1', name: 'Diente impactado (ej: Tercer molar / Canino)', category: 'Erupción y Posición' },
  { code: 'DA03.0', name: 'Abrasión dental (por cepillado / fricción)', category: 'Desgaste Dental' },
  { code: 'DA03.1', name: 'Erosión dental (ácidos intrínsecos / extrínsecos)', category: 'Desgaste Dental' },
  { code: 'DA03.2', name: 'Atrición dental (bruxismo / contacto oclusal)', category: 'Desgaste Dental' },
  { code: 'DA03.3', name: 'Abfracción dental (lesión cervical no cariosa)', category: 'Desgaste Dental' },
  { code: 'DA03.4', name: 'Reabsorción radicular externa o interna', category: 'Tejidos Duros' },
  { code: 'DA03.5', name: 'Hipercementosis', category: 'Tejidos Duros' },

  // 2. Enfermedades de la Pulpa y de los Tejidos Periapicales
  { code: 'DA04.0', name: 'Pulpitis reversible (hiperemia pulpar)', category: 'Endodoncia' },
  { code: 'DA04.1', name: 'Pulpitis irreversible aguda', category: 'Endodoncia' },
  { code: 'DA04.2', name: 'Pulpitis irreversible crónica (ulcerosa / hiperplásica)', category: 'Endodoncia' },
  { code: 'DA05',   name: 'Necrosis de la pulpa dental / Gangrena pulpar', category: 'Endodoncia' },
  { code: 'DA06',   name: 'Degeneración pulpar (cálculos pulpares / calcificación)', category: 'Endodoncia' },
  { code: 'DA07',   name: 'Formación anormal de tejido duro en la pulpa', category: 'Endodoncia' },
  { code: 'DA08.0', name: 'Periodontitis apical aguda de origen pulpar', category: 'Endodoncia / Periapical' },
  { code: 'DA08.1', name: 'Periodontitis apical crónica (granuloma apical)', category: 'Endodoncia / Periapical' },
  { code: 'DA08.2', name: 'Absceso periapical con fístula (fístula alveolar)', category: 'Endodoncia / Periapical' },
  { code: 'DA08.3', name: 'Absceso periapical sin fístula', category: 'Endodoncia / Periapical' },
  { code: 'DA09',   name: 'Quiste radicular (apical / inflamatorio)', category: 'Endodoncia / Periapical' },

  // 3. Gingivitis y Enfermedades Periodontales
  { code: 'DA0F.0', name: 'Gingivitis inducida por placa dental (aguda / crónica)', category: 'Periodoncia' },
  { code: 'DA0F.1', name: 'Enfermedad gingival no inducida por placa', category: 'Periodoncia' },
  { code: 'DA0F.2', name: 'Gingivitis ulcerativa necrosante (GUN)', category: 'Periodoncia' },
  { code: 'DA0F.3', name: 'Periodontitis crónica (Estadio I a IV)', category: 'Periodoncia' },
  { code: 'DA0F.4', name: 'Periodontitis agresiva / de progresión rápida', category: 'Periodoncia' },
  { code: 'DA0F.5', name: 'Absceso periodontal', category: 'Periodoncia' },
  { code: 'DA0F.6', name: 'Recesión gingival (defecto mucogingival)', category: 'Periodoncia' },
  { code: 'DA0F.7', name: 'Agrandamiento gingival / Hiperplasia gingival', category: 'Periodoncia' },
  { code: 'DA0F.8', name: 'Trauma oclusal / Lesión periodontal oclusal', category: 'Periodoncia' },

  // 4. Anomalías Dentofaciales y Trastornos de la Oclusión / ATM
  { code: 'DA0C.0', name: 'Maloclusión Clase I de Angle', category: 'Ortodoncia / Oclusión' },
  { code: 'DA0C.1', name: 'Maloclusión Clase II de Angle (División 1 / 2)', category: 'Ortodoncia / Oclusión' },
  { code: 'DA0C.2', name: 'Maloclusión Clase III de Angle (Prognatismo mandibular)', category: 'Ortodoncia / Oclusión' },
  { code: 'DA0C.3', name: 'Mordida abierta (anterior / posterior)', category: 'Ortodoncia / Oclusión' },
  { code: 'DA0C.4', name: 'Mordida cruzada (unilateral / bilateral)', category: 'Ortodoncia / Oclusión' },
  { code: 'DA0C.5', name: 'Apiñamiento dental / Diastemas múltiples', category: 'Ortodoncia / Oclusión' },
  { code: 'FA30.0', name: 'Trastorno de la Articulación Temporomandibular (ATM / DTM)', category: 'ATM / Oclusión' },
  { code: 'FA30.1', name: 'Desplazamiento del disco articular de la ATM (con/sin reducción)', category: 'ATM / Oclusión' },
  { code: 'FA30.2', name: 'Dolor miofascial masticatorio / Bruxismo del sueño o vigilia', category: 'ATM / Oclusión' },

  // 5. Trastornos de los Labios, Mucosa Oral y Lengua
  { code: 'DA0A.0', name: 'Estomatitis aftosa recurrente (aftas orales)', category: 'Medicina Bucal' },
  { code: 'DA0A.1', name: 'Candidiasis oral (muguet / eritematosa)', category: 'Medicina Bucal' },
  { code: 'DA0A.2', name: 'Herpes labial / Estomatitis herpética', category: 'Medicina Bucal' },
  { code: 'DA0A.3', name: 'Leucoplasia oral / Lesión premaligna', category: 'Medicina Bucal' },
  { code: 'DA0A.4', name: 'Liquen plano oral', category: 'Medicina Bucal' },
  { code: 'DA0B.0', name: 'Glositis / Lengua geográfica / Lengua fisurada', category: 'Lengua' },
  { code: 'DA0B.1', name: 'Anquiloglosia (frenillo lingual corto)', category: 'Lengua' },
  { code: 'DA0E.0', name: 'Mucocele / Quiste salival por extravasación', category: 'Glándulas Salivales' },
  { code: 'DA0E.1', name: 'Sialolitiasis / Cálculo salival', category: 'Glándulas Salivales' },
  { code: 'DA0E.2', name: 'Xerostomía / Hiposialia (boca seca)', category: 'Glándulas Salivales' },

  // 6. Traumatismos Dentales y Maxilofaciales
  { code: 'NA07.0', name: 'Fractura de esmalte y dentina sin compromiso pulpar', category: 'Traumatismo' },
  { code: 'NA07.1', name: 'Fractura coronaria complicada con compromiso pulpar', category: 'Traumatismo' },
  { code: 'NA07.2', name: 'Fractura corono-radicular / radicular', category: 'Traumatismo' },
  { code: 'NA07.3', name: 'Luxación dental (concusión / subluxación / extrusiva / lateral / intrusiva)', category: 'Traumatismo' },
  { code: 'NA07.4', name: 'Avulsión dental completa', category: 'Traumatismo' },

  // 7. Prótesis, Pérdida Dental y Salud Pública
  { code: 'DA0D.0', name: 'Pérdida de dientes por caries / periodontitis (Edentulismo parcial)', category: 'Rehabilitación' },
  { code: 'DA0D.1', name: 'Edentulismo total (maxilar / mandibular)', category: 'Rehabilitación' },
  { code: 'DA0D.2', name: 'Reborde alveolar atrófico', category: 'Rehabilitación' },
  { code: 'DA00.0', name: 'Anodoncia / Hipodoncia (ausencia congénita de dientes)', category: 'Desarrollo' },
  { code: 'DA00.1', name: 'Dientes supernumerarios (hiperdoncia / mesiodens)', category: 'Desarrollo' },
  { code: 'DA00.2', name: 'Amelogénesis / Dentinogénesis imperfecta', category: 'Desarrollo' },
  { code: 'DA00.3', name: 'Fluorosis dental (esmalte moteado)', category: 'Desarrollo' }
];

/**
 * Busca en el catálogo CIE-11 por término o código
 */
export function searchCIE11(query = '') {
  const q = query.toLowerCase().trim();
  if (!q) return CIE11_DENTAL_CATALOGUE.slice(0, 12);

  return CIE11_DENTAL_CATALOGUE.filter(item => {
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });
}

/**
 * Obtiene un diagnóstico por código exacto
 */
export function getCIE11ByCode(code) {
  return CIE11_DENTAL_CATALOGUE.find(item => item.code.toUpperCase() === (code || '').toUpperCase()) || null;
}
