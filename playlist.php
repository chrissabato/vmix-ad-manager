<?php
/**
 * Playlist API
 *
 * Generates a weighted random ad selection and replaces the vMix playlist.
 *
 * GET /playlist.php?count=4
 *
 * Response: { success, count, playlist: ["file1.mp4", ...] }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// --- Load server-side config ---

function load_json(string $path): ?array {
    if (!file_exists($path)) return null;
    $decoded = json_decode(file_get_contents($path), true);
    return is_array($decoded) ? $decoded : null;
}

$settings = load_json('data/settings.json');
$videos   = load_json('data/videos.json');

if (!$settings) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Settings not saved yet. Open the UI and click Save Settings.']);
    exit;
}

if (!$videos || count($videos) === 0) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Video library is empty. Add videos in the UI first.']);
    exit;
}

// --- Validate required settings ---

$vmixIp    = $settings['vmixIp']    ?? '';
$vmixPort  = $settings['vmixPort']  ?? '8088';
$vmixInput = $settings['vmixInput'] ?? '';
$folder    = $settings['folderPath'] ?? '';

if (!$vmixIp || !$vmixInput || !$folder) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'vmixIp, vmixInput, and folderPath must be set in Settings.']);
    exit;
}

// Ensure trailing backslash on folder path
if ($folder && !str_ends_with($folder, '\\') && !str_ends_with($folder, '/')) {
    $folder .= '\\';
}

// --- Validate count param ---

$count = isset($_GET['count']) ? intval($_GET['count']) : 0;
if ($count < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'count must be a positive integer']);
    exit;
}

// --- Weighted random selection ---

function get_ad_base(string $filename): string {
    $name = preg_replace('/\.mp4$/i', '', $filename);
    return strtolower(preg_replace('/[-_]\d+$/', '', $name));
}

function is_same_group(array $a, array $b): bool {
    if (strtolower($a['filename']) === strtolower($b['filename'])) return true;
    return get_ad_base($a['filename']) === get_ad_base($b['filename']);
}

// Build weighted pool: priority 1=1x, 2=2x, 3=3x
$pool = [];
foreach ($videos as $video) {
    $p = intval($video['priority'] ?? 2);
    for ($i = 0; $i < $p; $i++) {
        $pool[] = $video;
    }
}

$unique_groups = array_unique(array_map(fn($v) => get_ad_base($v['filename']), $videos));
$can_avoid_back_to_back = count($unique_groups) > 1;

$selected = [];
for ($i = 0; $i < $count; $i++) {
    $last = count($selected) > 0 ? $selected[count($selected) - 1] : null;

    if (!$can_avoid_back_to_back || !$last) {
        $selected[] = $pool[array_rand($pool)];
    } else {
        $filtered = array_values(array_filter($pool, fn($v) => !is_same_group($v, $last)));
        $source = count($filtered) > 0 ? $filtered : $pool;
        $selected[] = $source[array_rand($source)];
    }
}

// --- Send to vMix ---

$vmixBase = "http://{$vmixIp}:{$vmixPort}/api/";

function vmix_call(string $base, array $params): bool {
    $url = $base . '?' . http_build_query($params);
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $result = curl_exec($ch);
    $errno  = curl_errno($ch);
    curl_close($ch);
    return $errno === 0 && $result !== false;
}

// Clear existing playlist
vmix_call($vmixBase, ['Function' => 'ListRemoveAll', 'Input' => $vmixInput]);

// Add each video
$added = [];
foreach ($selected as $video) {
    $path = $folder . $video['filename'];
    if (vmix_call($vmixBase, ['Function' => 'ListAdd', 'Input' => $vmixInput, 'Value' => $path])) {
        $added[] = $video['filename'];
    }
}

if (count($added) === 0) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error'   => 'Could not connect to vMix. Check IP, port, and that Web Controller is enabled.',
    ]);
    exit;
}

echo json_encode([
    'success'  => true,
    'count'    => count($added),
    'playlist' => $added,
]);
