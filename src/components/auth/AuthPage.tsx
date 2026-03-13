import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

interface AuthPageProps {
  onSuccess?: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuth();

  // Initialize Google Sign-In
  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        const clientId = (window as any).process?.env?.GOOGLE_CLIENT_ID || import.meta.env?.VITE_GOOGLE_CLIENT_ID;
        
        if (clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
          });

          const buttonDiv = document.getElementById('google-signin-button');
          if (buttonDiv) {
            window.google.accounts.id.renderButton(buttonDiv, {
              theme: 'filled_black',
              size: 'large',
              width: '100%',
              text: mode === 'login' ? 'signin_with' : 'signup_with',
            });
          }
        }
      }
    };

    // Wait for Google script to load
    const checkGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkGoogle);
        initializeGoogle();
      }
    }, 100);

    return () => clearInterval(checkGoogle);
  }, [mode]);

  const handleGoogleCallback = async (response: any) => {
    setIsLoading(true);
    setError('');

    try {
      await loginWithGoogle(response.credential);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

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
    <div className="min-h-screen bg-smw-black flex items-center justify-center p-4">
      <div className="bg-smw-gray rounded-3xl p-8 max-w-md w-full shadow-2xl border border-smw-pink/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-smw-pink mb-2">
            Crazy Addictive App
          </h1>
          <p className="text-gray-400">
            {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}
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
              <label className="block text-gray-300 text-sm mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-smw-light text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-smw-pink focus:outline-none transition-colors"
                placeholder="Tu nombre"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm mb-2">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-smw-light text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-smw-pink focus:outline-none transition-colors"
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-smw-light text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-smw-pink focus:outline-none transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-smw-pink to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-smw-pink transition-all shadow-lg shadow-smw-pink/25 disabled:opacity-50"
          >
            {isLoading ? 'Cargando...' : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-700"></div>
          <span className="px-4 text-gray-500 text-sm">o</span>
          <div className="flex-1 border-t border-gray-700"></div>
        </div>

        <div id="google-signin-button" className="flex justify-center"></div>

        <p className="text-center text-gray-400 mt-6">
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-smw-pink hover:underline font-semibold"
              >
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-smw-pink hover:underline font-semibold"
              >
                Inicia Sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
