
import React from 'react';

const DiamondIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-rosa-principal mb-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 12l10 10 10-12L12 2z" />
    </svg>
);

const LoginScreen: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-negro-fondo text-blanco-texto p-4">
            <div className="w-full max-w-md bg-negro-fondo p-8 rounded-2xl shadow-lg text-center border-2 border-rosa-principal">
                <DiamondIcon />
                <h1 className="text-3xl font-bold mb-2">Bienvenido a Crazy Addictive App</h1>
                <p className="text-gris-atenuado mb-8">Inicia sesión para acceder a tu ecosistema de IA todo en uno.</p>
                <a
                    href="https://smw-ai.outseta.com/profile#o-authenticated"
                    className="w-full inline-flex items-center justify-center bg-rosa-principal text-negro-fondo font-bold py-3 px-4 rounded-lg hover:bg-rosa-claro transition-colors duration-300"
                >
                    Iniciar Sesión / Registrarse
                </a>
            </div>
        </div>
    );
};

export default LoginScreen;
