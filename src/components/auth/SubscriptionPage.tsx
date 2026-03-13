import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function SubscriptionPage() {
  const { user, subscription, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al iniciar el pago');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al acceder al portal');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    '23 Herramientas de IA Premium',
    'Generación de imágenes ilimitada',
    'Acceso a todas las funciones',
    'Soporte prioritario',
    'Nuevas herramientas cada mes'
  ];

  return (
    <div className="min-h-screen bg-smw-pink-light flex items-center justify-center p-4">
      <div className="bg-smw-black rounded-3xl p-8 max-w-md w-full shadow-2xl border border-smw-pink/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Desbloquea Todo el Poder</h1>
          <p className="text-gray-400">
            Hola, {user?.name || user?.email}
          </p>
        </div>

        <div className="bg-smw-light rounded-2xl p-6 mb-6">
          <div className="flex items-baseline justify-center mb-4">
            <span className="text-5xl font-bold text-smw-pink">$15</span>
            <span className="text-gray-400 ml-2">/mes</span>
          </div>
          
          <ul className="space-y-3 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-gray-300">
                <svg className="w-5 h-5 text-smw-pink mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {subscription?.status === 'active' ? (
          <button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full bg-smw-light text-white py-4 rounded-2xl font-semibold hover:bg-smw-gray transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Cargando...' : 'Gestionar Suscripción'}
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-smw-pink to-pink-600 text-white py-4 rounded-2xl font-bold hover:from-pink-600 hover:to-smw-pink transition-all shadow-lg shadow-smw-pink/25 disabled:opacity-50"
          >
            {isLoading ? 'Cargando...' : 'Suscribirse Ahora'}
          </button>
        )}

        <button
          onClick={logout}
          className="w-full text-gray-400 hover:text-white py-3 mt-4 transition-colors text-sm"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
