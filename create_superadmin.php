<?php
$role = \App\Models\Role::firstOrCreate(
    ['name' => 'superadmin'],
    ['display_name' => 'Super Administrator', 'description' => 'Super User']
);

\App\Models\User::updateOrCreate(
    ['email' => 'superadmin@nexapos.com'],
    [
        'name' => 'Super Admin',
        'password' => bcrypt('password'),
        'role_id' => $role->id,
        'is_active' => true
    ]
);

echo "Superadmin created: superadmin@nexapos.com / password\n";
