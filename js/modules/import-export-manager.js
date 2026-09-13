/**
 * import-export-manager.js - Importación y Exportación de Pacientes y Profesionales (Excel / CSV)
 */
import { showToast } from './app-utils.js';

export function exportToCSV(data, headers, filename) {
  if (!data || data.length === 0) {
    showToast('No hay datos para exportar', 'warning');
    return;
  }

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header] ?? '';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  const csvContent = [csvHeaders, ...csvRows].join('\r\n');
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  const _now = new Date();
  const _dateStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  link.setAttribute('download', `${filename}_${_dateStr}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`Exportado: ${data.length} registros`, 'success');
}

function intelligentColumnMapping(fileHeaders, expectedHeaders) {
  const mapping = {};
  const synonyms = {
    'name': ['nombre', 'nombre completo', 'paciente', 'full name', 'patient name', 'nombre_completo'],
    'lastName': ['apellido', 'apellidos', 'last name', 'surname'],
    'dni': ['documento', 'cedula', 'id', 'identification', 'nro documento', 'nro_documento', 'numero documento'],
    'phone': ['teléfono', 'telefono', 'celular', 'móvil', 'movil', 'whatsapp', 'telephone', 'mobile', 'tel', 'cel'],
    'email': ['correo', 'mail', 'e-mail', 'correo electrónico', 'correo electronico', 'email_address'],
    'birthDate': ['fecha de nacimiento', 'fecha nacimiento', 'nacimiento', 'birth date', 'dob', 'fecha_nacimiento', 'fechanacimiento', 'birthdate'],
    'age': ['edad', 'años'],
    'insurance': ['obra social', 'cobertura', 'seguro', 'prepaga', 'health insurance', 'obra_social', 'obrasocial', 'health_insurance'],
    'insuranceNumber': ['numero afiliado', 'número afiliado', 'numero de afiliado', 'número de afiliado', 'afiliado', 'member number', 'nro_afiliado', 'affiliate_number'],
    'address': ['dirección', 'direccion', 'domicilio', 'domicilio_completo'],
    'assignedProfessionalId': ['profesional', 'profesional asignado', 'medico', 'médico', 'doctor', 'professional'],
    'generalNotes': ['notas', 'observaciones', 'comentarios', 'notes', 'observations'],
    'specialty': ['especialidad', 'especialización', 'specialization'],
    'color': ['color'],
    'username': ['usuario', 'user'],
    'password': ['contraseña', 'password', 'clave']
  };
  
  fileHeaders.forEach(fileHeader => {
    const normalizedFileHeader = fileHeader.toLowerCase().trim();
    if (expectedHeaders.includes(fileHeader)) {
      mapping[fileHeader] = fileHeader;
      return;
    }
    for (const [standardField, alternatives] of Object.entries(synonyms)) {
      if (expectedHeaders.includes(standardField)) {
        if (alternatives.some(alt => normalizedFileHeader.includes(alt.toLowerCase()))) {
          mapping[fileHeader] = standardField;
          return;
        }
      }
    }
    mapping[fileHeader] = null;
  });
  
  return mapping;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }
  
  return { headers, rows };
}

export function createImportUI(entityType, expectedFields, onImport) {
  const container = document.createElement('div');
  container.className = 'import-container modal';
  
  const entityLabel = entityType === 'patients' ? 'pacientes' : 'profesionales';
  
  container.innerHTML = `
    <div class="modal-body" style="max-width:700px; max-height:90vh; overflow-y:auto;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fas fa-file-import" style="color:var(--primary); font-size:1.4rem;"></i>
          <h3 style="margin:0;">Importar ${entityLabel} masivamente</h3>
        </div>
        <button class="ghost close-import-btn" title="Cerrar"><i class="fas fa-times"></i></button>
      </div>
      
      <div class="import-instructions" style="background:var(--bg-page); padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:0.85rem;">
        <p><strong>Formatos aceptados:</strong> Archivos Excel (.xlsx, .xls) y CSV</p>
        <p>El sistema reconocerá y mapeará automáticamente las columnas de tu planilla.</p>
        <p class="muted">Columnas soportadas: Nombre, Cédula / Identificación, Teléfono, Email, Fecha de nacimiento, Obra Social, Dirección.</p>
      </div>
      
      <div class="file-upload-area" id="fileUploadArea" style="border:2px dashed var(--border); border-radius:12px; padding:32px 16px; text-align:center; cursor:pointer; background:var(--surface);">
        <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--primary); margin-bottom: 12px; display:block;"></i>
        <p style="font-weight:600; margin-bottom:4px;">Arrastrá tu archivo Excel o CSV aquí</p>
        <p class="muted" style="font-size: 13px;">o hacé clic en el botón para buscar en tu computadora</p>
        <input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display: none;">
        <button class="primary" id="selectFileBtn" style="margin-top: 16px;">
          <i class="fas fa-folder-open"></i> Seleccionar archivo
        </button>
      </div>
      
      <div class="import-preview hidden" id="importPreview" style="margin-top:16px;">
        <h5>Vista previa y mapeo de columnas</h5>
        <div class="mapping-info" style="margin:8px 0 12px; font-size:0.9rem;">
          Se encontraron <strong id="rowCount">0</strong> registros listos para importar.
          <button class="ghost" id="downloadTemplateBtn" style="margin-left: 12px; font-size:0.8rem;">
            <i class="fas fa-download"></i> Descargar plantilla CSV de ejemplo
          </button>
        </div>
        
        <div class="column-mapping" id="columnMapping" style="background:var(--bg-page); padding:12px; border-radius:8px; margin-bottom:12px;"></div>
        
        <div class="table-responsive" style="max-height:220px; overflow-y:auto; margin-bottom:16px;">
          <table class="data-table" id="previewTable"></table>
        </div>
        
        <div class="import-actions" style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="ghost" id="cancelImportBtn">Cancelar</button>
          <button class="primary" id="confirmImportBtn">
            <i class="fas fa-check"></i> Confirmar e importar datos
          </button>
        </div>
      </div>
      
      <div id="importMsg" class="msg" style="margin-top:12px; font-weight:600;"></div>
    </div>
  `;
  
  const fileInput = container.querySelector('#importFileInput');
  const selectFileBtn = container.querySelector('#selectFileBtn');
  const fileUploadArea = container.querySelector('#fileUploadArea');
  const importPreview = container.querySelector('#importPreview');
  const columnMapping = container.querySelector('#columnMapping');
  const previewTable = container.querySelector('#previewTable');
  const confirmImportBtn = container.querySelector('#confirmImportBtn');
  const cancelImportBtn = container.querySelector('#cancelImportBtn');
  const closeBtn = container.querySelector('.close-import-btn');
  const importMsg = container.querySelector('#importMsg');
  const downloadTemplateBtn = container.querySelector('#downloadTemplateBtn');
  
  let parsedData = null;
  let mappingConfig = {};
  
  downloadTemplateBtn.addEventListener('click', () => {
    const sampleHeaders = ['Nombre', 'DNI', 'Telefono', 'Email', 'FechaNacimiento', 'ObraSocial', 'Direccion'];
    const sampleData = [
      { 'Nombre': 'Juan Perez', 'DNI': '35123456', 'Telefono': '1155551234', 'Email': 'juan@correo.com', 'FechaNacimiento': '1990-05-15', 'ObraSocial': 'OSDE', 'Direccion': 'Av. Corrientes 1234' },
      { 'Nombre': 'Maria Gonzalez', 'DNI': '38987654', 'Telefono': '1144449876', 'Email': 'maria@correo.com', 'FechaNacimiento': '1995-10-20', 'ObraSocial': 'Swiss Medical', 'Direccion': 'Calle Falsa 123' }
    ];
    exportToCSV(sampleData, sampleHeaders, `plantilla_${entityType}`);
  });
  
  selectFileBtn.addEventListener('click', () => fileInput.click());
  fileUploadArea.addEventListener('click', (e) => {
    if (e.target !== selectFileBtn) fileInput.click();
  });
  
  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.style.borderColor = 'var(--primary)';
    fileUploadArea.style.background = 'var(--primary-light)';
  });
  
  fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.style.borderColor = '';
    fileUploadArea.style.background = '';
  });
  
  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.style.borderColor = '';
    fileUploadArea.style.background = '';
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
  
  async function handleFile(file) {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      importMsg.textContent = 'Formato no válido. Solo se aceptan archivos CSV o Excel.';
      importMsg.style.color = 'var(--danger)';
      return;
    }
    
    importMsg.textContent = 'Procesando archivo...';
    importMsg.style.color = 'var(--muted)';
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let headers = [];
        let rows = [];
        
        if (fileName.endsWith('.csv')) {
          const text = e.target.result;
          const parsed = parseCSV(text);
          headers = parsed.headers;
          rows = parsed.rows;
        } else {
          if (typeof XLSX === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.async = false;
            document.head.appendChild(script);
            await new Promise(resolve => { script.onload = resolve; script.onerror = resolve; });
          }
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) throw new Error('El archivo Excel está vacío');
          headers = jsonData[0].map(h => String(h || '').trim());
          
          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i];
            if (!rowData || rowData.length === 0) continue;
            const row = {};
            headers.forEach((header, idx) => {
              row[header] = rowData[idx] !== undefined ? String(rowData[idx]).trim() : '';
            });
            if (Object.values(row).some(v => v !== '')) rows.push(row);
          }
        }
        
        if (rows.length === 0) {
          importMsg.textContent = 'El archivo está vacío o no tiene el formato correcto.';
          importMsg.style.color = 'var(--danger)';
          return;
        }
        
        mappingConfig = intelligentColumnMapping(headers, expectedFields);
        parsedData = { headers, rows };
        showPreview(headers, rows, mappingConfig);
        
        fileUploadArea.classList.add('hidden');
        importPreview.classList.remove('hidden');
        importMsg.textContent = '';
      } catch (err) {
        importMsg.textContent = `Error al procesar archivo: ${err.message}`;
        importMsg.style.color = 'var(--danger)';
      }
    };
    
    if (fileName.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  }
  
  function showPreview(headers, rows, mapping) {
    container.querySelector('#rowCount').textContent = rows.length;
    
    const fieldLabels = {
      'name': 'Nombre del paciente',
      'lastName': 'Apellido',
      'dni': 'Cédula / Identificación',
      'phone': 'Teléfono / WhatsApp',
      'email': 'Correo electrónico',
      'birthDate': 'Fecha de nacimiento',
      'age': 'Edad',
      'insurance': 'Obra social / Prepaga',
      'insuranceNumber': 'Número de afiliado',
      'address': 'Dirección',
      'assignedProfessionalId': 'Profesional asignado',
      'generalNotes': 'Observaciones / Notas',
      'specialty': 'Especialidad',
      'color': 'Color',
      'username': 'Usuario',
      'password': 'Contraseña'
    };
    
    columnMapping.innerHTML = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">' + headers.map(header => {
      const mappedField = mapping[header];
      const headerLabel = mappedField ? (fieldLabels[mappedField] || header) : header;
      const options = ['<option value="">-- No importar --</option>']
        .concat(expectedFields.map(field => 
          `<option value="${field}" ${mappedField === field ? 'selected' : ''}>${fieldLabels[field] || field}</option>`
        ));
      
      return `
        <div style="font-size:0.8rem;">
          <label style="font-weight:600; display:block; margin-bottom:2px;" title="${header}">${headerLabel}</label>
          <select class="mapping-select" data-original="${header}" style="width:100%; font-size:0.8rem; padding:4px;">
            ${options.join('')}
          </select>
        </div>
      `;
    }).join('') + '</div>';
    
    columnMapping.querySelectorAll('.mapping-select').forEach(select => {
      select.addEventListener('change', () => {
        mappingConfig[select.dataset.original] = select.value || null;
      });
    });
    
    const previewRows = rows.slice(0, 5);
    previewTable.innerHTML = `
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${previewRows.map(row => `<tr>${headers.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}</tbody>
    `;
  }
  
  confirmImportBtn.addEventListener('click', async () => {
    if (!parsedData) return;
    
    try {
      confirmImportBtn.disabled = true;
      confirmImportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
      importMsg.textContent = '';
      
      const currentMapping = {};
      columnMapping.querySelectorAll('.mapping-select').forEach(select => {
        if (select.value) currentMapping[select.dataset.original] = select.value;
      });
      
      const transformedData = parsedData.rows.map(row => {
        const newRow = {};
        for (const [originalHeader, mappedField] of Object.entries(currentMapping)) {
          if (mappedField && row[originalHeader] !== undefined && row[originalHeader] !== '') {
            newRow[mappedField] = row[originalHeader];
          }
        }
        
        const nombreColumn = Object.keys(currentMapping).find(k => currentMapping[k] === 'name');
        const apellidoColumn = Object.keys(currentMapping).find(k => currentMapping[k] === 'lastName');
        if (nombreColumn && apellidoColumn && row[nombreColumn] && row[apellidoColumn]) {
          newRow.name = `${row[nombreColumn]} ${row[apellidoColumn]}`.trim();
          delete newRow.lastName;
        }
        
        return newRow;
      }).filter(row => Object.keys(row).length > 0 && row.name);
      
      if (transformedData.length === 0) {
        throw new Error('No hay datos válidos para importar. Asegurate de mapear al menos el campo "Nombre".');
      }
      
      await onImport(transformedData);
      showToast(`¡${transformedData.length} registros importados correctamente!`, 'success');
      container.remove();
    } catch (error) {
      importMsg.textContent = 'Error al importar: ' + error.message;
      importMsg.style.color = 'var(--danger)';
      confirmImportBtn.disabled = false;
      confirmImportBtn.innerHTML = '<i class="fas fa-check"></i> Confirmar e importar datos';
    }
  });
  
  cancelImportBtn.addEventListener('click', () => {
    fileUploadArea.classList.remove('hidden');
    importPreview.classList.add('hidden');
    fileInput.value = '';
    parsedData = null;
  });
  
  closeBtn.addEventListener('click', () => container.remove());
  
  return container;
}

export function exportPatients(patients, professionals) {
  const headers = [
    'name', 'dni', 'phone', 'email', 'birthDate', 'age',
    'insurance', 'insuranceNumber', 'address', 'assignedProfessionalId', 'generalNotes'
  ];
  
  const data = patients.map(p => {
    const prof = professionals.find(pr => pr.id === p.assignedProfessionalId);
    return {
      name: p.name || '',
      dni: p.dni || '',
      phone: p.phone || '',
      email: p.email || '',
      birthDate: p.birthdate || p.birthDate || '',
      age: p.age || '',
      insurance: p.health_insurance || p.insurance || 'Particular',
      insuranceNumber: p.affiliate_number || p.insuranceNumber || '',
      address: p.address || '',
      assignedProfessionalId: prof ? prof.name : '',
      generalNotes: p.notes || p.generalNotes || ''
    };
  });
  
  exportToCSV(data, headers, 'pacientes');
}

export function exportProfessionals(professionals) {
  const headers = ['name', 'specialty', 'email', 'phone', 'color', 'username'];
  const data = professionals.map(p => ({
    name: p.name || '',
    specialty: p.specialty || '',
    email: p.email || '',
    phone: p.phone || '',
    color: p.color || '',
    username: p.username || ''
  }));
  exportToCSV(data, headers, 'profesionales');
}
