import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AuthPageProps {
  onSuccess?: () => void;
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Client-side validation
    if (!isValidEmail(email)) {
      setError('Por favor, ingresa una dirección de correo válida.');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-negro-fondo flex items-center justify-center p-4">
      <div className="bg-gris-oscuro rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gris-medio">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-rosa-principal mb-2">
            Crazy Addictive App
          </h1>
          <p className="text-gris-atenuado">
            {mode === 'login' ? '¡Bienvenido de nuevo! Inicia sesión para continuar.' : 'Crea tu cuenta'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-blanco-texto text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gris-medio text-blanco-texto rounded-xl px-4 py-3 border border-gris-atenuado/30 focus:border-rosa-principal focus:outline-none focus:ring-1 focus:ring-rosa-principal transition-colors"
                placeholder="Tu nombre"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="block text-blanco-texto text-sm font-medium mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gris-medio text-blanco-texto rounded-xl px-4 py-3 border border-gris-atenuado/30 focus:border-rosa-principal focus:outline-none focus:ring-1 focus:ring-rosa-principal transition-colors"
              placeholder="tu@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-blanco-texto text-sm font-medium mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gris-medio text-blanco-texto rounded-xl px-4 py-3 border border-gris-atenuado/30 focus:border-rosa-principal focus:outline-none focus:ring-1 focus:ring-rosa-principal transition-colors"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-rosa-principal text-negro-fondo py-3 rounded-xl font-semibold hover:bg-rosa-claro transition-all shadow-lg shadow-rosa-principal/25 disabled:opacity-50"
          >
            {isLoading ? 'Cargando...' : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <p className="text-center text-gris-atenuado mt-6">
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-rosa-principal hover:text-rosa-claro font-semibold"
              >
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-rosa-principal hover:text-rosa-claro font-semibold"
              >
                Iniciar Sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
