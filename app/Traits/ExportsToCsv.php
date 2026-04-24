<?php

namespace App\Traits;

use Symfony\Component\HttpFoundation\StreamedResponse;

trait ExportsToCsv
{
    /**
     * Export data to a CSV file.
     *
     * @param string $filename Name of the file without extension.
     * @param array $headers Column headers.
     * @param array $data Array of data rows.
     * @return StreamedResponse
     */
    protected function exportCsv(string $filename, array $headers, array $data)
    {
        $response = new StreamedResponse(function () use ($headers, $data) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);
            foreach ($data as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '.csv"');

        return $response;
    }
}
