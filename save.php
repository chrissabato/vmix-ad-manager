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

if (!in_array($type, ['settings', 'videos'], true)) {
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
    mkdir('data', 0755, true);
}

file_put_contents("data/{$type}.json", $data);

echo json_encode(['success' => true]);
