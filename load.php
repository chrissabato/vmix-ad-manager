<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$settings = file_exists('data/settings.json') ? json_decode(file_get_contents('data/settings.json'), true) : null;
$videos   = file_exists('data/videos.json')   ? json_decode(file_get_contents('data/videos.json'),   true) : null;

echo json_encode([
    'settings' => $settings,
    'videos'   => $videos,
]);
