<?php

return [
    'disk' => env('BACKUP_DISK', 'backups'),
    'retention' => (int) env('BACKUP_RETENTION', 7),
];
