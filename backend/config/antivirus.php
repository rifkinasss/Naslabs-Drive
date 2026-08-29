<?php

return [
    'enabled' => (bool) env('ANTIVIRUS_ENABLED', false),
    'required' => (bool) env('ANTIVIRUS_REQUIRED', false),
    'binary' => env('CLAMSCAN_BINARY', 'clamscan'),
    'timeout' => (int) env('ANTIVIRUS_TIMEOUT', 120),
];
