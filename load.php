<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$profiles = file_exists('data/profiles.json') ? json_decode(file_get_contents('data/profiles.json'), true) : null;
$videos   = file_exists('data/videos.json')   ? json_decode(file_get_contents('data/videos.json'),   true) : null;

echo json_encode([
    'profiles' => $profiles,
    'videos'   => $videos,
]);
