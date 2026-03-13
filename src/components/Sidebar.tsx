import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export type FeatureId = 
  | 'home'
  | 'account'
  | 'my-creations'
  | 'ai-1990s-shoots'
  | 'ai-avatar-creator'
  | 'ai-branding'
  | 'ai-photoshoot'
  | 'ai-podcasts'
  | 'ai-vlogs'
  | 'flatlay-picture'
  | 'home-canvas'
  | 'ai-makeup-studio'
  | 'mood-board-stylist'
  | 'ai-music-studio'
  | 'ai-nail-studio'
  | 'photo-fusion'
  | 'ai-product-gallery'
  | 'ai-real-estate'
  | 'ai-travel-world'
  | 'ai-twin-creator'
  | 'ai-wig-studio'
  | 'image-edit'
  | 'foot-rituals'
  | 'image-gen'
  | 'tts'
  | 'prompt-bulb';

export interface Feature {
  id: FeatureId;
  name: string;
  icon: React.ReactNode;
}

export const icons: Record<string, React.ReactNode> = {
  home: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  account: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  'my-creations': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  'ai-1990s-shoots': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4m11-4v4m2-1h-4m-5 12v4m-2-1h4M5 21v-4m-2 1h4m4-11a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  'ai-avatar-creator': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.414 7.414a2 2 0 112.828 2.828L11 21.586H8v-3l11.414-11.414z" /></svg>,
  'ai-branding': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  'ai-photoshoot': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  'ai-podcasts': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>,
  'ai-vlogs': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>,
  'flatlay-picture': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  'home-canvas': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  'ai-makeup-studio': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  'mood-board-stylist': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  'ai-music-studio': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
  'ai-nail-studio': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2zM12 7v10M8 12h8" /></svg>,
  'photo-fusion': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  'ai-product-gallery': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  'ai-real-estate': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M12 11a1 1 0 100-2 1 1 0 000 2z" /></svg>,
  'ai-travel-world': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  'ai-twin-creator': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
  'ai-wig-studio': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>,
  'image-edit': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>,
  'foot-rituals': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-3.866 0-7-3.134-7-7 0-3.31 2.239-6.096 5.25-6.858C10.158 6.643 10 6.088 10 5.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5c0 .588-.158 1.143-.41 1.642 3.011.762 5.25 3.548 5.25 6.858 0 3.866-3.134 7-7 7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4M12 12c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2z" /></svg>,
  'image-gen': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L16 8M4 16l4.586-4.586a2 2 0 012.828L16 16m-2-2l1.586 1.586a2 2 0 010 2.828L12 20M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-2-2m0 0l-2 2m2-2v12" /></svg>,
  'tts': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 8.464a5 5 0 000 7.072m-2.828 2.828a9 9 0 000-12.728" /></svg>,
  'prompt-bulb': <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V9a6 6 0 10-12 0v10a2 2 0 002 2z" /></svg>,
};

export const features: Feature[] = [
  { id: 'home', name: 'Inicio', icon: icons.home },
  { id: 'account', name: 'Mi Cuenta', icon: icons.account },
  { id: 'my-creations', name: 'Mis Creaciones', icon: icons['my-creations'] },
  // Tools below
  { id: 'ai-1990s-shoots', name: 'Sesiones de los 90 IA', icon: icons['ai-1990s-shoots'] },
  { id: 'ai-avatar-creator', name: 'Creador de Avatar IA', icon: icons['ai-avatar-creator'] },
  { id: 'ai-branding', name: 'Branding IA', icon: icons['ai-branding'] },
  { id: 'ai-photoshoot', name: 'Moda IA', icon: icons['ai-photoshoot'] },
  { id: 'flatlay-picture', name: 'Flatlay IA', icon: icons['flatlay-picture'] },
  { id: 'foot-rituals', name: 'Rituales de Pies IA', icon: icons['foot-rituals'] },
  { id: 'home-canvas', name: 'Lienzo de Hogar IA', icon: icons['home-canvas'] },
  { id: 'ai-makeup-studio', name: 'Estudio de Maquillaje IA', icon: icons['ai-makeup-studio'] },
  { id: 'mood-board-stylist', name: 'Mood Board IA', icon: icons['mood-board-stylist'] },
  { id: 'ai-music-studio', name: 'Música IA', icon: icons['ai-music-studio'] },
  { id: 'ai-nail-studio', name: 'Uñas IA', icon: icons['ai-nail-studio'] },
  { id: 'photo-fusion', name: 'PhotoFusion IA', icon: icons['photo-fusion'] },
  { id: 'ai-podcasts', name: 'Podcasts IA', icon: icons['ai-podcasts'] },
  { id: 'ai-product-gallery', name: 'Galería Productos IA', icon: icons['ai-product-gallery'] },
  { id: 'ai-real-estate', name: 'Bienes Raíces IA', icon: icons['ai-real-estate'] },
  { id: 'ai-travel-world', name: 'Viajes IA', icon: icons['ai-travel-world'] },
  { id: 'ai-twin-creator', name: 'Creador IA Twin', icon: icons['ai-twin-creator'] },
  { id: 'ai-vlogs', name: 'Vlogs IA', icon: icons['ai-vlogs'] },
  { id: 'ai-wig-studio', name: 'Pelucas IA', icon: icons['ai-wig-studio'] },
  { id: 'image-edit', name: 'Edición Imágenes IA', icon: icons['image-edit'] },
  { id: 'image-gen', name: 'Generación Imágenes IA', icon: icons['image-gen'] },
  { id: 'prompt-bulb', name: 'Bóveda Prompts IA', icon: icons['prompt-bulb'] },
  { id: 'tts', name: 'Texto a Voz IA', icon: icons.tts },
];

interface SidebarProps {
  activeFeature: Feature | null;
  setActiveFeature: (feature: Feature) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onAdminClick?: () => void;
}

// Icons for logout and admin
const logoutIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const adminIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;

const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature, isOpen, onClose, onAdminClick }) => {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Items that are NOT part of the numbered list
  const topItems = ['home', 'account', 'my-creations'];
  
  const topFeaturesList = features.filter(f => topItems.includes(f.id));
  const toolFeatures = features
    .filter(f => !topItems.includes(f.id));

  const handleFeatureClick = (feature: Feature) => {
    setActiveFeature(feature);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'w-72'} 
        bg-negro-fondo text-blanco-texto flex flex-col border-r border-rosa-principal/10 h-screen transition-all duration-300 ease-in-out
      `}>
        {/* Fixed Header section */}
        <div className={`p-6 flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-end'} border-b border-blanco-texto/20 flex-shrink-0`}>
          <div className="flex items-center gap-2">
            {/* Desktop Collapse Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block text-blanco-texto hover:text-rosa-principal transition-colors focus:outline-none"
              title={isCollapsed ? "Expandir Barra Lateral" : "Contraer Barra Lateral"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Mobile Close Button */}
            <button 
              onClick={onClose}
              className="lg:hidden text-blanco-texto hover:text-rosa-principal transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Nav section */}
        <nav className="flex-1 px-3 space-y-1 pb-20 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="mt-4">
            {topFeaturesList.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature)}
                  className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all group mb-1 ${
                    activeFeature?.id === feature.id
                      ? 'bg-rosa-principal text-negro-fondo font-bold'
                      : 'text-blanco-texto hover:bg-gris-medio'
                  }`}
                  title={isCollapsed ? feature.name : ""}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {feature.icon}
                    </div>
                    {(!isCollapsed || isOpen) && (
                      <span className="text-[13px] font-medium tracking-wide whitespace-nowrap">
                        {feature.name}
                      </span>
                    )}
                  </div>
                </button>
            ))}
          </div>

          <div className="h-4 border-t border-blanco-texto/10 my-4" />

          {toolFeatures.map((feature, index) => {
            const numberedIndex = index + 1;

            return (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all group mb-1 overflow-visible pr-3 gap-10 ${
                  activeFeature?.id === feature.id
                    ? 'bg-rosa-principal text-negro-fondo font-bold'
                    : 'text-blanco-texto hover:bg-gris-medio'
                }`}
                title={isCollapsed ? feature.name : ""}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1 mr-10">
                  <div className="flex-shrink-0">
                    {feature.icon}
                  </div>
                  {(!isCollapsed || isOpen) && (
                    <span className="text-[13px] font-medium tracking-wide whitespace-nowrap">
                      {feature.name}
                    </span>
                  )}
                </div>
                
                {(!isCollapsed || isOpen) && (
                  <div className={`flex items-center justify-center w-[26px] h-[26px] rounded-full text-[12px] font-bold flex-shrink-0 leading-none ${
                    activeFeature?.id === feature.id
                      ? 'bg-negro-fondo/20 text-negro-fondo'
                      : 'bg-rosa-principal text-negro-fondo'
                  }`}>
                    {numberedIndex}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section - Admin Panel & Logout */}
        <div className="flex-shrink-0 border-t border-blanco-texto/20 p-3 space-y-1">
          {/* Panel de Admin - Only for admin users */}
          {user?.isAdmin && onAdminClick && (
            <button
              onClick={() => {
                onAdminClick();
                if (onClose) onClose();
              }}
              className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all group mb-1 text-blanco-texto hover:bg-gris-medio`}
              title={isCollapsed ? "Panel de Admin" : ""}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0">
                  {adminIcon}
                </div>
                {(!isCollapsed || isOpen) && (
                  <span className="text-[13px] font-medium tracking-wide whitespace-nowrap">
                    Panel de Admin
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Cerrar Sesión */}
          <button
            onClick={() => {
              logout();
              if (onClose) onClose();
            }}
            className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all group text-red-400 hover:bg-red-500/10 hover:text-red-300`}
            title={isCollapsed ? "Cerrar Sesión" : ""}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {logoutIcon}
              </div>
              {(!isCollapsed || isOpen) && (
                <span className="text-[13px] font-medium tracking-wide whitespace-nowrap">
                  Cerrar Sesión
                </span>
              )}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;