<?php
/**
 * End Here API
 *
 * Removes every playlist item after the currently playing one, so the
 * playlist ends at whatever is on air right now.
 *
 * GET /end-here.php
 * GET /end-here.php?profile=<id>   (target a specific setup)
 *
 * Response: { success, profile, keptIndex, totalBefore, removed }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// --- Load server-side data ---

function load_json(string $path): ?array {
    if (!file_exists($path)) return null;
    $decoded = json_decode(file_get_contents($path), true);
    return is_array($decoded) ? $decoded : null;
}

$profiles = load_json('data/profiles.json');

if (!$profiles || count($profiles) === 0) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'No setups saved yet. Open the UI and save a setup.']);
    exit;
}

// --- Select profile ---

$profileParam = $_GET['profile'] ?? null;
$profile = null;

if ($profileParam !== null) {
    foreach ($profiles as $p) {
        if ((string)$p['id'] === (string)$profileParam || strtolower($p['name']) === strtolower($profileParam)) {
            $profile = $p;
            break;
        }
    }
    if (!$profile) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => "Profile not found: {$profileParam}"]);
        exit;
    }
} else {
    $profile = $profiles[0];
}

// --- Validate required profile fields ---

$vmixIp    = $profile['vmixIp']    ?? '';
$vmixPort  = $profile['vmixPort']  ?? '8088';
$vmixInput = $profile['vmixInput'] ?? '';

if (!$vmixIp || !$vmixInput) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => "Profile \"{$profile['name']}\" is missing vmixIp or vmixInput."]);
    exit;
}

$vmixBase = "http://{$vmixIp}:{$vmixPort}/api/";

// --- vMix helpers ---

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

function vmix_get_state(string $base): ?string {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $base,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $result = curl_exec($ch);
    $errno  = curl_errno($ch);
    curl_close($ch);
    return ($errno === 0 && $result !== false) ? $result : null;
}

// --- Fetch and parse current state ---

$xml = vmix_get_state($vmixBase);
if ($xml === null) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error'   => 'Could not connect to vMix. Check IP, port, and that Web Controller is enabled.',
    ]);
    exit;
}

libxml_use_internal_errors(true);
$dom = new DOMDocument();
if (!$dom->loadXML($xml)) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Could not parse vMix state XML.']);
    exit;
}

$searchTerm = strtolower($vmixInput);
$matchedInput = null;

foreach ($dom->getElementsByTagName('input') as $inputEl) {
    $title  = $inputEl->getAttribute('title');
    $key    = $inputEl->getAttribute('key');
    $number = $inputEl->getAttribute('number');

    if (strtolower($title) === $searchTerm || $key === $vmixInput || $number === $vmixInput) {
        $matchedInput = $inputEl;
        break;
    }
    if ($matchedInput === null && strpos(strtolower($title), $searchTerm) !== false) {
        $matchedInput = $inputEl;
    }
}

if ($matchedInput === null) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => "Input not found in vMix: {$vmixInput}"]);
    exit;
}

$selectedIndexAttr = $matchedInput->getAttribute('selectedIndex');
$selectedIndex = $selectedIndexAttr !== '' ? intval($selectedIndexAttr) : -1;

$items = [];
foreach ($matchedInput->getElementsByTagName('list') as $listEl) {
    foreach ($listEl->getElementsByTagName('item') as $itemEl) {
        $items[] = $itemEl;
    }
    break;
}
$totalItems = count($items);

if ($selectedIndex <= 0) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Nothing is currently playing on this input.']);
    exit;
}

if ($totalItems === 0 || $selectedIndex >= $totalItems) {
    echo json_encode([
        'success'     => true,
        'profile'     => $profile['name'],
        'keptIndex'   => $selectedIndex,
        'totalBefore' => $totalItems,
        'removed'     => 0,
    ]);
    exit;
}

// --- Remove trailing items, from the end backward so indices don't shift ---

$removed = 0;
for ($i = $totalItems; $i > $selectedIndex; $i--) {
    if (vmix_call($vmixBase, ['Function' => 'ListRemove', 'Input' => $vmixInput, 'Value' => (string)$i])) {
        $removed++;
    }
    usleep(50000);
}

echo json_encode([
    'success'     => true,
    'profile'     => $profile['name'],
    'keptIndex'   => $selectedIndex,
    'totalBefore' => $totalItems,
    'removed'     => $removed,
]);
