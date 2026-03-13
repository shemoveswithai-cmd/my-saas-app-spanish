import React, { useState } from 'react';
import { Spinner } from './common/Spinner';
import { Creation } from '../types';

interface MyCreationsProps {
    creations: Creation[];
    favorites: Set<number>;
    toggleFavorite: (creationId: number) => void;
    onDelete: (creationId: number) => void;
    onDeleteAll: () => void;
    addCreations: (images: string[]) => void;
}

const MyCreations: React.FC<MyCreationsProps> = ({ creations, favorites, toggleFavorite, onDelete, onDeleteAll, addCreations }) => {
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(new Set());
    const [activeFilter, setActiveFilter] = useState<'Todo' | 'Favoritos'>('Todo');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedImageIds(new Set());
    };

    const toggleImageSelection = (creationId: number) => {
        const newSelection = new Set(selectedImageIds);
        if (newSelection.has(creationId)) newSelection.delete(creationId);
        else newSelection.add(creationId);
        setSelectedImageIds(newSelection);
    };

    const displayedCreations = activeFilter === 'Todo' 
        ? creations 
        : creations.filter(c => favorites.has(c.id));

    const handleDownload = async () => {
        const imagesToDownload = isSelectMode && selectedImageIds.size > 0 
            ? creations.filter(c => selectedImageIds.has(c.id))
            : displayedCreations;

        if (imagesToDownload.length === 0) return;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        for (let i = 0; i < imagesToDownload.length; i++) {
            const creation = imagesToDownload[i];
            const link = document.createElement('a');
            link.href = creation.url;
            link.download = `ai-creation-${creation.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await delay(200);
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-rosa-claro rounded-lg shadow-xl p-4 md:p-6 space-y-4">
            <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-negro-fondo">Mis Creaciones</h2>
                <p className="text-sm text-negro-fondo opacity-80">Una galería de todas tus imágenes generadas por IA.</p>
            </div>
            
            <div className="flex-shrink-0 bg-white/60 backdrop-blur-sm shadow-md p-3 rounded-lg flex items-center gap-3 text-sm text-negro-fondo opacity-80">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-rosa-principal" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-[11px] sm:text-sm">La galería guarda hasta 1,000 creaciones recientes. ¡Tu bóveda de arte personal!</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-rosa-principal/20 flex-shrink-0">
                <div className="flex items-center bg-white/60 rounded-full p-1 w-full sm:w-auto justify-center">
                    {['Todo', 'Favoritos'].map((f: any) => (
                        <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-1 text-sm rounded-full transition-colors flex-1 sm:flex-none ${activeFilter === f ? 'bg-rosa-principal text-negro-fondo font-bold' : 'text-negro-fondo opacity-80 hover:bg-white'}`}>{f}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <button onClick={handleDownload} className="flex-1 sm:flex-none bg-white/80 text-negro-fondo font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-white disabled:opacity-50 text-xs sm:text-sm">Descargar</button>
                    <button onClick={toggleSelectMode} className="flex-1 sm:flex-none bg-rosa-principal text-negro-fondo font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-white text-xs sm:text-sm">{isSelectMode ? 'Cancelar' : 'Seleccionar'}</button>
                    {creations.length > 0 && (
                        <button 
                            onClick={() => setShowDeleteAllConfirm(true)}
                            className="flex-1 sm:flex-none bg-red-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg hover:bg-red-700 transition-colors text-[10px] sm:text-xs uppercase"
                        >
                            Eliminar Todo
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {displayedCreations.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                        {displayedCreations.map((creation) => (
                            <div key={creation.id} className="relative group rounded-xl overflow-hidden shadow-lg border border-white/50 bg-white">
                                <img 
                                    src={creation.url} 
                                    alt="Creation" 
                                    className={`w-full aspect-square object-cover ${isSelectMode ? 'cursor-pointer' : 'cursor-zoom-in'}`}
                                    onClick={() => isSelectMode ? toggleImageSelection(creation.id) : setZoomedImage(creation.url)}
                                />
                                
                                {!isSelectMode && (
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(creation.id); }} 
                                                className="p-1 text-white hover:text-rosa-principal transition-colors active:scale-90"
                                                title={favorites.has(creation.id) ? "Quitar de favoritos" : "Favorito"}
                                            >
                                                {favorites.has(creation.id) ? (
                                                    <svg className="h-4 w-4 text-rosa-principal" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                                                ) : (
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                )}
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setZoomedImage(creation.url); }} 
                                                className="p-1 text-white hover:text-rosa-principal transition-colors active:scale-90"
                                                title="Expandir"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </button>

                                            <a 
                                                href={creation.url} 
                                                download 
                                                onClick={e => e.stopPropagation()} 
                                                className="p-1 text-white hover:text-rosa-principal transition-colors active:scale-90"
                                                title="Descargar"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(creation.id); }} 
                                                className="p-1 text-white hover:text-red-500 transition-colors active:scale-90"
                                                title="Eliminar"
                                            >
                                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {isSelectMode && (
                                    <div 
                                        className={`absolute inset-0 flex items-center justify-center transition-colors pointer-events-none ${selectedImageIds.has(creation.id) ? 'bg-black/40 border-4 border-rosa-principal' : 'bg-transparent'}`}
                                    >
                                        {selectedImageIds.has(creation.id) && (
                                            <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <div className="flex flex-col items-center justify-center h-full text-negro-fondo opacity-60"><p>Aún no hay creaciones aquí.</p></div>}
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-4">
                    <div className="bg-negro-fondo p-6 rounded-lg border border-rosa-principal max-w-sm text-center">
                        <h3 className="text-xl font-bold mb-4">¿Eliminar creación?</h3>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowDeleteConfirm(null)} className="py-2 px-6 rounded-lg bg-gris-medio-light font-bold">Cancelar</button>
                            <button onClick={() => { onDelete(showDeleteConfirm); setShowDeleteConfirm(null); }} className="py-2 px-6 rounded-lg bg-red-600 text-white font-bold">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteAllConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] p-4">
                    <div className="bg-negro-fondo p-6 rounded-lg border border-red-600 max-w-sm text-center">
                        <h3 className="text-xl font-bold mb-2">¿Eliminar toda la galería?</h3>
                        <p className="text-sm text-gray-400 mb-6">Esto eliminará permanentemente todas las fotos de tu historial de "Mis Creaciones". Esta acción no se puede deshacer.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { onDeleteAll(); setShowDeleteAllConfirm(false); }} className="w-full py-3 rounded-lg bg-red-600 text-white font-black uppercase tracking-widest shadow-lg">Sí, eliminar todo</button>
                            <button onClick={() => setShowDeleteAllConfirm(false)} className="w-full py-2 rounded-lg bg-gris-medio-light font-bold">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="absolute top-0 right-0 p-4 md:p-8 z-10">
                        <button 
                            onClick={() => setZoomedImage(null)} 
                            className="text-white bg-black/40 hover:bg-black/60 rounded-full w-14 h-14 flex items-center justify-center text-4xl font-light transition-all backdrop-blur-md border border-white/20 shadow-2xl" 
                            aria-label="Cerrar"
                        >
                            &times;
                        </button>
                    </div>
                    <div className="w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <img 
                            src={zoomedImage} 
                            alt="Expanded" 
                            className="max-w-full max-h-full object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCreations;