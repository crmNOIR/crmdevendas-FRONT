
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <h1 className="text-4xl font-bold text-gray-800">404</h1>
            <p className="text-lg text-gray-600">Página não encontrada</p>
            <Link href="/">
                <Button>Voltar ao Início</Button>
            </Link>
        </div>
    );
}
