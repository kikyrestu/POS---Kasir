<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            $debugMsg = 'Debug - User: ' . ($user ? 'Found (ID:'.$user->id.')' : 'Not Found') . 
                       ' | HashMatch: ' . ($user && Hash::check($request->password, $user->password) ? 'Yes' : 'No') . 
                       ' | Tenant: ' . tenant('id');
            return response()->json([
                'message' => $debugMsg
            ], 401);
        }
        
        // Buat token sanctum untuk mobile app
        $token = $user->createToken('mobile-app-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        // Revoke token yang sedang dipakai
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out'
        ]);
    }
}
