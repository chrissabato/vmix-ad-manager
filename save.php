<?php
/**
 * Persists settings and video library to server-side JSON files.
 * Called by the UI whenever settings or videos change.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST required']);
    exit;
}

$type = $_POST['type'] ?? '';
$data = $_POST['data'] ?? '';

if (!in_array($type, ['profiles', 'videos'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'type must be settings or videos']);
    exit;
}

if (json_decode($data) === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON in data']);
    exit;
}

if (!is_dir('data')) {
    if (!mkdir('data', 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not create data/ directory — check web server write permissions on ' . __DIR__]);
        exit;
    }
}

$written = file_put_contents("data/{$type}.json", $data);

if ($written === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => "Could not write data/{$type}.json — check directory permissions"]);
    exit;
}

echo json_encode(['success' => true]);
