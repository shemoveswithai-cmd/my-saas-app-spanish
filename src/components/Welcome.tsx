
import React from 'react';

export const Welcome: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-4xl font-bold text-rosa-principal mb-4">Muestra de SMW IA</h1>
            <p className="text-xl text-gris-atenuado">
                Selecciona una función de la barra lateral para comenzar.
            </p>
        </div>
    );
};
