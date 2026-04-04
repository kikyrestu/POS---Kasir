<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with('role')
            ->when($request->search, function ($q, $s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $roles = Role::all(['id', 'name', 'display_name']);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'filters' => $request->only('search'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'required|exists:roles,id',
        ]);

        User::create($validated);

        return redirect()->back()->with('success', 'User berhasil ditambahkan.');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        return redirect()->back()->with('success', 'User berhasil diperbarui.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'Tidak dapat menghapus akun sendiri.');
        }

        $user->delete();
        return redirect()->back()->with('success', 'User berhasil dihapus.');
    }

    public function toggleActive(User $user)
    {
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'Tidak dapat menonaktifkan akun sendiri.');
        }

        $user->update(['is_active' => !$user->is_active]);

        return redirect()->back()->with('success', 'Status user berhasil diubah.');
    }
}
