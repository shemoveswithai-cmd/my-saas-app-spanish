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
  const [googleLoaded, setGoogleLoaded] = useState(false);

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
            setGoogleLoaded(true);
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

    // Timeout after 3 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkGoogle);
    }, 3000);

    return () => {
      clearInterval(checkGoogle);
      clearTimeout(timeout);
    };
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

  // Fallback Google Sign-In using redirect (note: backend only supports POST, so this won't work)
  // The proper fix is to ensure Google SDK loads by adding the domain to Google OAuth authorized origins
  const handleGoogleRedirect = () => {
    setError('Error: No se pudo cargar Google Sign-In. Verifica que el dominio esté autorizado en Google Cloud Console.');
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
              minLength={6}
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

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gris-medio"></div>
          <span className="px-4 text-gris-atenuado text-sm">o continuar con</span>
          <div className="flex-1 border-t border-gris-medio"></div>
        </div>

        {/* Google Sign-In Button - rendered by Google library */}
        <div id="google-signin-button" className="flex justify-center"></div>

        {/* Fallback Google Button if library doesn't load */}
        {!googleLoaded && (
          <button
            type="button"
            onClick={handleGoogleRedirect}
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3 border border-gray-300 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Iniciar sesión con Google</span>
          </button>
        )}

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
