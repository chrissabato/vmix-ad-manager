<?php
/**
 * vMix API Proxy
 *
 * This proxy bypasses CORS restrictions when calling the vMix API from the browser.
 * The browser calls this PHP script, which then calls the vMix API server-side.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Get parameters
$vmixIp = $_GET['ip'] ?? '';
$vmixPort = $_GET['port'] ?? '8088';
$function = $_GET['function'] ?? '';
$input = $_GET['input'] ?? '';
$value = $_GET['value'] ?? '';
$getState = isset($_GET['getState']);

// Validate required parameters
if (empty($vmixIp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameter: ip']);
    exit;
}

if (!$getState && empty($function)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameter: function']);
    exit;
}

// Validate IP format (basic check)
if (!filter_var($vmixIp, FILTER_VALIDATE_IP) && !preg_match('/^[a-zA-Z0-9\-\.]+$/', $vmixIp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid IP address format']);
    exit;
}

// Validate port
$vmixPort = intval($vmixPort);
if ($vmixPort < 1 || $vmixPort > 65535) {
    $vmixPort = 8088;
}

// Build vMix API URL
$vmixUrl = "http://{$vmixIp}:{$vmixPort}/api/";

if ($getState) {
    // Get full XML state - no parameters needed
} else {
    $params = ['Function' => $function];

    if (!empty($input)) {
        $params['Input'] = $input;
    }
    if (!empty($value)) {
        $params['Value'] = $value;
    }

    $vmixUrl .= '?' . http_build_query($params);
}

// Make request to vMix
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 10,
        'ignore_errors' => true
    ]
]);

$response = @file_get_contents($vmixUrl, false, $context);

if ($response === false) {
    $error = error_get_last();
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to connect to vMix API',
        'details' => $error['message'] ?? 'Unknown error'
    ]);
    exit;
}

// Check HTTP response code
$httpCode = null;
if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
            $httpCode = intval($matches[1]);
            break;
        }
    }
}

// Return response with debug info
echo json_encode([
    'success' => true,
    'response' => $response,
    'url' => $vmixUrl,
    'httpCode' => $httpCode,
    'debug' => [
        'function' => $function,
        'input' => $input,
        'value' => $value,
        'getState' => $getState
    ]
]);
