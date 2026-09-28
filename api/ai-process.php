<?php
/**
 * api/ai-process.php - Procesador de IA para Historia Clínica Estructurada
 * Recibe texto por POST, lo envía a un modelo LLM (local o nube) y devuelve JSON estructurado.
 * 
 * Parámetros POST:
 *   - text: Texto dictado o ingresado por el clínico
 *   - mode: 'local' (Ollama) | 'cloud' (OpenAI/Gemini)
 *   - model: Nombre del modelo (opcional, usa default por defecto)
 *   
 * Retorna JSON con: motivo, cie10, pieza, tratamiento, raw_text
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de modo IA
$aiMode = $_POST['mode'] ?? 'cloud';
$model = $_POST['model'] ?? null;

// Texto a procesar
$rawText = $_POST['text'] ?? '';
if (empty(trim($rawText))) {
    echo json_encode(['error' => 'Texto vacío']);
    exit;
}

// Determinar endpoint del modelo
$apiEndpoint = null;
$apiKey = null;

// Modo local (Ollama)
if ($aiMode === 'local') {
    $apiEndpoint = 'http://localhost:11434/api/chat';
    $apiKey = null; // Sin key para local
}
// Modo nube
else if ($aiMode === 'cloud') {
    $apiKey = $_POST['api_key'] ?? '';
    if (empty($apiKey)) {
        echo json_encode(['error' => 'API Key requerida para modo cloud']);
        exit;
    }
}

// Preparar prompt para extracción estructurada
$prompt = <<<PROMPTEOF
Eres un asistente de IA para un sistema de gestión clínica odontológica y médica. Extrae la siguiente información del texto clínico a continuación y devuelve SOLO un objeto JSON válido con estas campos exactos:

{
  "motivo": "Motivo de consulta principal (máx 100 caracteres)",
  "cie10": "Código CIE-10 del diagnóstico (ej: K03.9, A09, I10) - si no se encuentra, usa 'P00'",
  "pieza": "Número de pieza dental FDI (11-48) o 'Ninguna' si no aplica",
  "tratamiento": "Tratamiento o procedimiento sugerido (máx 200 caracteres)",
  "confidence": "Nivel de confianza 0.0-1.0"
}

INSTRUCCIONES CLAVE:
- Motivo: Qué paciente viene a consultar hoy
- CIE-10: Código de diagnóstico según clasificación internacional
- Pieza: Número FDI (11=tercera molar superior derecha, 31=tercera molar inferior derecha, etc.) o 'Ninguna' para medicina general
- Tratamiento: Qué se va a hacer (limpieza, extracción, restauración, etc.)
- Confidence: Tu certeza sobre la extracción (0.0 = nada seguro, 1.0 = totalmente seguro)

Texto clínico a analizar:
PROMPTEOF;

// Añadir el texto del clínico al prompt
$fullPrompt = $prompt . "\n\nTexto: " . $rawText;

// Configuración del modelo
if ($aiMode === 'local') {
    $payload = [
        'model' => $model ?? 'llama3:8b',
        'messages' => [
            ['role' => 'user', 'content' => $fullPrompt]
        ],
        'stream' => false,
        'options' => [
            'temperature' => 0.1,
            'top_p' => 0.9
        ]
    ];
} else {
    // Modo nube - OpenAI/Gemini example
    $payload = [
        'model' => $model ?? 'gpt-4o-mini',
        'messages' => [
            ['role' => 'user', 'content' => $fullPrompt]
        ],
        'temperature' => 0.1,
        'max_tokens' => 500
    ];
}

// Ejecutar petición al modelo LLM
$ch = curl_init();

if ($aiMode === 'local') {
    curl_setopt($ch, CURLOPT_URL, $apiEndpoint);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER([
        'Content-Type: application/json',
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        $aiResponse = $result?['choices']?[0]?['message']?['content'] ?? '';
    } else {
        $aiResponse = 'Error en modelo local: ' . $response;
    }
} else {
    // Modo nube - OpenAI
    curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER([
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        $aiResponse = $result?['choices']?[0]?['message']?['content'] ?? '';
    } else {
        $aiResponse = 'Error en modelo nube: ' . $response;
    }
}

curl_close($ch);

// Parsear respuesta JSON de la IA
$cleanResponse = trim($aiResponse);
$startPos = strpos($cleanResponse, '{');
$endPos = strrpos($cleanResponse, '}');

if ($startPos !== false && $endPos !== false) {
    $jsonStr = substr($cleanResponse, $startPos, $endPos - $startPos + 1);
    $parsed = json_decode($jsonStr, true);
    
    if ($parsed && is_array($parsed)) {
        // Validar campos requeridos
        $motivo = $parsed['motivo'] ?? 'Consulta general';
        $cie10 = $parsed['cie10'] ?? 'P00';
        $pieza = $parsed['pieza'] ?? 'Ninguna';
        $tratamiento = $parsed['tratamiento'] ?? 'Consulta de rutina';
        $confidence = floatval($parsed['confidence'] ?? 0.5);
        
        // Limitar longitudes
        $motivo = mb_substr($motivo, 0, 100);
        $tratamiento = mb_substr($tratamiento, 0, 200);
        
        // Devolver respuesta estructurada
        echo json_encode([
            'success' => true,
            'motivo' => $motivo,
            'cie10' => $cie10,
            'pieza' => $pieza,
            'tratamiento' => $tratamiento,
            'confidence' => $confidence,
            'raw_text' => $rawText,
            'mode' => $aiMode
        ]);
        exit;
    }
}

echo json_encode([
    'success' => false,
    'error' => 'No se pudo parsear respuesta de la IA',
    'raw_ai_response' => $aiResponse
]);