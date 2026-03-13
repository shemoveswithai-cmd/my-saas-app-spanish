
import React from 'react';

const DiamondIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-smw-pink mb-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 12l10 10 10-12L12 2z" />
    </svg>
);

const LoginScreen: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-smw-black text-smw-text p-4">
            <div className="w-full max-w-md bg-smw-gray-dark p-8 rounded-2xl shadow-lg text-center border-2 border-smw-pink">
                <DiamondIcon />
                <h1 className="text-3xl font-bold mb-2">Bienvenido a Crazy Addictive App</h1>
                <p className="text-smw-text-dim mb-8">Inicia sesión para acceder a tu ecosistema de IA todo en uno.</p>
                <a
                    href="https://smw-ai.outseta.com/profile#o-authenticated"
                    className="w-full inline-flex items-center justify-center bg-smw-pink text-smw-gray-dark font-bold py-3 px-4 rounded-lg hover:bg-smw-pink-light transition-colors duration-300"
                >
                    Iniciar Sesión / Registrarse
                </a>
            </div>
        </div>
    );
};

export default LoginScreen;
