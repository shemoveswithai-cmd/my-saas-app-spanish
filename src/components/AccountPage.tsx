import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../App';
import { Spinner } from './common/Spinner';

interface AccountPageProps {
    user: UserProfile;
    onUpdate: (updatedProfile: UserProfile) => void;
}

const AccountPage: React.FC<AccountPageProps> = ({ user, onUpdate }) => {
    const [name, setName] = useState(user.name);
    const [nickname, setNickname] = useState(user.nickname);
    const [avatar, setAvatar] = useState(user.avatar);
    const [aiTwinSelfie, setAiTwinSelfie] = useState(user.aiTwinSelfie);
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false); // For visual feedback

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const aiTwinSelfieInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setNickname(user.nickname);
            setAvatar(user.avatar);
            setAiTwinSelfie(user.aiTwinSelfie);
        }
    }, [user]);

    const handleSave = () => {
        setIsSaving(true);
        setSaveSuccess(false);
        
        onUpdate({ ...user, name, nickname, avatar, aiTwinSelfie });
        
        // Provide visual feedback for saving
        setTimeout(() => {
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        }, 500);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newAvatar = reader.result as string;
                setAvatar(newAvatar);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiTwinSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newSelfie = reader.result as string;
                setAiTwinSelfie(newSelfie);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAiTwinSelfie = () => {
        setAiTwinSelfie(null);
        if (aiTwinSelfieInputRef.current) {
            aiTwinSelfieInputRef.current.value = '';
        }
    };
    
    const isUnchanged =
        name === user.name &&
        nickname === user.nickname &&
        avatar === user.avatar &&
        aiTwinSelfie === user.aiTwinSelfie;


    return (
        <div className="flex flex-col h-full bg-rosa-claro p-4 md:p-10 space-y-8 overflow-y-auto">
            <header className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-negro-fondo tracking-tight">Mi Cuenta</h2>
                <p className="text-gris-atenuado font-medium">Gestiona tu información personal.</p>
            </header>
            
            <div className="space-y-10 max-w-5xl">
                {/* Main Profile Box */}
                <div className="bg-rosa-claro shadow-xl p-8 rounded-[2rem] border border-rosa-principal/30">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        {/* Avatar Column */}
                        <div className="md:col-span-4 flex flex-col items-center text-center">
                            <div className="relative group w-40 h-40 mb-6">
                                <img 
                                    src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'A')}&background=F5B2E1&color=111111&size=160`} 
                                    alt="User Avatar"
                                    className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                                />
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                    aria-label="Change avatar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            <h3 className="text-2xl font-black text-negro-fondo tracking-tight">{name}</h3>
                        </div>

                        {/* Form Column */}
                        <div className="md:col-span-8 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-xs font-black text-gris-atenuado uppercase tracking-widest mb-2">Nombre Completo</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white/40 border-2 border-rosa-principal/10 rounded-xl p-3 focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none text-negro-fondo font-medium transition-all"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="nickname" className="block text-xs font-black text-gris-atenuado uppercase tracking-widest mb-2">Apodo (La IA te llamará así)</label>
                                    <input
                                        id="nickname"
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="ej., Alex"
                                        className="w-full bg-white/40 border-2 border-rosa-principal/10 rounded-xl p-3 focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none text-negro-fondo font-medium transition-all placeholder:text-gris-atenuado"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-black text-gris-atenuado uppercase tracking-widest">Selfie de Identidad Maestra</label>
                                    {aiTwinSelfie && (
                                        <button
                                            onClick={handleRemoveAiTwinSelfie}
                                            className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                                <div 
                                    className="w-full h-56 bg-white/40 rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-rosa-principal/20 hover:border-rosa-principal transition-all group overflow-hidden"
                                    onClick={() => aiTwinSelfieInputRef.current?.click()}
                                >
                                    {aiTwinSelfie ? (
                                        <img src={aiTwinSelfie} alt="Vista previa de Selfie IA Twin" className="h-full w-full object-contain p-2" />
                                    ) : (
                                        <div className="text-center group-hover:scale-105 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-rosa-principal opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 013-3h10a3 3 0 013 3v1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                                            <p className="text-xs font-bold text-gris-atenuado uppercase tracking-widest">Subir Selfie Maestra</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={aiTwinSelfieInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handleAiTwinSelfieChange}
                                />
                                <p className="text-[10px] text-gris-atenuado mt-3 font-medium text-center">
                                    Esta foto se utiliza como tu fuente de identidad principal para todas las herramientas de generación de IA.
                                </p>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-rosa-principal/10">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || saveSuccess || isUnchanged}
                                    className={`font-black py-3 px-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg text-sm uppercase tracking-widest
                                    ${saveSuccess 
                                        ? 'bg-green-500 text-white' 
                                        : `bg-rosa-principal text-negro-fondo hover:bg-negro-fondo hover:text-blanco-texto ${isUnchanged ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : ''}`
                                    }
                                     disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isSaving ? <Spinner className="w-5 h-5 text-negro-fondo" /> : saveSuccess ? (
                                        <div className="flex items-center gap-2">
                                            <svg xmlns="https://cdn-icons-png.flaticon.com/512/11825/11825984.png" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            ¡Guardado!
                                        </div>
                                    ) : 'Guardar Cambios de la Cuenta'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            
            <div className="h-20 flex-shrink-0" />
        </div>
    );
};

export default AccountPage;