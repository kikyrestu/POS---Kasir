import { Head } from '@inertiajs/react';
import { Card, CardContent, Button } from '@/Components/UI';
import { CheckCircle } from 'lucide-react';

export default function RegisterSuccess({ url }) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <Head title="Store Created Successfully" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Card>
                    <CardContent className="py-12 px-4 sm:px-10 text-center">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                            Store Created Successfully!
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Your store has been created and your database is ready. You can now log in to your store dashboard.
                        </p>

                        <a href={url} className="block">
                            <Button className="w-full justify-center text-lg h-12">
                                Go to My Store
                            </Button>
                        </a>
                        
                        <p className="mt-4 text-sm text-gray-500">
                            URL: <a href={url} className="text-primary-600 hover:underline">{url}</a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
