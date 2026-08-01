<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 | Halaman Tidak Tersedia</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6; /* bg-gray-100 */
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-xl w-full flex flex-col items-center text-center relative z-10">
        
        <!-- Mascot Image -->
        <img src="/images/mascot-sad.jpg" alt="Sad Mascot" class="w-96 sm:w-[450px] h-auto mb-6 drop-shadow-md">

        <h1 class="text-3xl font-bold text-gray-900 mb-3">Halaman Tidak Tersedia 😟</h1>
        <p class="text-gray-500 mb-8 text-sm md:text-base px-4">
            Halaman tenant ini telah dihapus atau disuspend<br class="hidden md:block"> oleh administrator.
        </p>

        <!-- Alert Box -->
        <div class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 mb-8 text-left relative overflow-hidden">
            <!-- Lock Icon Background -->
            <div class="flex-shrink-0 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-inner z-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            
            <div class="flex-1 z-10">
                <h3 class="text-sm font-bold text-gray-900 mb-1">Akses Dibatasi</h3>
                <p class="text-xs text-gray-500 leading-relaxed">
                    Jika menurutmu ini adalah kesalahan,<br>
                    silakan hubungi administrator untuk informasi lebih lanjut.
                </p>
            </div>

            <!-- Faded background lock icon on the right -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"/>
                </svg>
            </div>
        </div>

        <!-- Back Button -->
        <a href="{{ env('APP_URL', 'http://nexapos.localhost:8000') }}" 
           class="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-full transition-colors border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Dashboard
        </a>
    </div>
</body>
</html>
