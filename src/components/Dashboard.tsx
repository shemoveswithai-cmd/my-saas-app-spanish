import React from 'react';
import { UserProfile } from '../App';
import { Feature, features, FeatureId } from './Sidebar';

interface DashboardProps {
    user: UserProfile;
    setActiveFeature: (feature: Feature) => void;
    onAdminClick?: () => void;
}

const featureDescriptions: Record<string, string> = {
    'home': '',
    'account': '',
    'ai-avatar-creator': 'Sube una foto (opcional), elige tu estilo de avatar y escena, personaliza cabello/atuendo/expresión y genera.',
    'ai-branding': 'Crea fotos profesionales tuyas mostrando los activos de tu marca como folletos, cuadernos de trabajo o tarjetas de presentación en escenas realistas.',
    'ai-twin-creator': 'Genera fotos impresionantes y profesionales de ti mismo en cualquier escena o estilo.',
    'ai-photoshoot': 'Pruébate virtualmente cualquier atuendo. Sube tu foto e imágenes de ropa, zapatos o accesorios para crear tu look perfecto.',
    'ai-podcasts': 'Transfórmate en un presentador de podcast. Elige entre vibras de estudio de alta gama y varios ángulos de cámara para tu marca profesional de podcaster.',
    'ai-vlogs': 'Construye tu marca de rutina diaria con escenas de estilo vlog profesionales y de alta fidelidad.',
    'ai-travel-world': 'Genera fotos realistas de ti mismo en lugares icónicos de todo el mundo.',
    'home-canvas': 'Sube fotos de productos y escenas, luego arrastra tu producto a su lugar para crear una composición fotorrealista.',
    'flatlay-picture': 'Extrae automáticamente la ropa de una foto de modelo y organízala en un diseño plano y limpio.',
    'image-edit': 'Edita tus fotos sin esfuerzo con comandos de texto simples. Agrega filtros, cambia objetos y más.',
    'image-gen': 'Haz realidad tus ideas generando imágenes originales y de alta calidad a partir de texto.',
    'my-creations': 'Accede a tu galería personal de todas las imágenes generadas por IA guardadas y favoritas.',
    'photo-fusion': 'Combina mágicamente personas de dos fotos diferentes en una sola imagen perfecta.',
    'mood-board-stylist': 'Genera una sesión de fotos profesional basada en el estilo de una imagen de moodboard.',
    'ai-makeup-studio': 'Diseña y aplica maquillaje virtual a tus fotos al instante.',
    'ai-nail-studio': 'Diseña las uñas de tus sueños y verlas cobrar vida en una sesión de fotos virtual.',
    'ai-music-studio': 'Colócate en un estudio de música profesional. Elige tu vibra, escena y ángulos de cámara para crear la toma perfecta.',
    'ai-product-gallery': 'Crea sesiones de fotos profesionales para tus productos en cualquier escena o estilo.',
    'ai-real-estate': 'Crea una sesión de fotos inmobiliaria profesional de ti mismo en varios entornos de propiedad.',
    'foot-rituals': 'Diseña tus propias imágenes estéticas de pies con tonos de piel personalizados, arte de uñas y elementos rituales como aceite o agua.',
    'tts': 'Convierte texto escrito en locuciones de audio de alta calidad y sonido natural.',
    'ai-wig-studio': 'Estudio profesional de extracción de pelucas y prueba virtual para marcas de cabello y belleza.',
    'ai-1990s-shoots': 'Recrea las icónicas fotos glamorosas de los 90 con fondos retro, accesorios y un estilo retocado.',
    'prompt-bulb': 'Accede a una bóveda curada de prompts avanzados para resultados de IA hiperrealistas en piel, cabello y moda.',
};

const Dashboard: React.FC<DashboardProps> = ({ user, setActiveFeature, onAdminClick }) => {
    const handleFeatureClick = (featureId: FeatureId) => {
        const feature = features.find(f => f.id === featureId);
        if (feature) {
            setActiveFeature(feature);
        }
    };
    
    // Sort dashboard features alphabetically by name
    const dashboardFeatures = features
        .filter(f => f.id !== 'home' && f.id !== 'account' && f.id !== 'my-creations');

    return (
        <div className="p-4 sm:p-6 h-full overflow-y-auto">
            <header className="mb-6 max-w-5xl mx-auto w-full">
                <div className="bg-rosa-claro shadow-xl p-5 sm:p-6 rounded-3xl text-center border border-rosa-principal/30">
                    <h2 className="text-xl sm:text-2xl font-bold text-negro-fondo tracking-tight mb-2">
                        ¡Bienvenido de nuevo, <span className="text-negro-fondo">{user.nickname}!</span>
                    </h2>
                    <p className="text-sm sm:text-base text-gris-atenuado font-normal leading-tight max-w-2xl mx-auto">
                        Tu plataforma de IA todo en uno está lista para ayudarte a crear contenido increíble.
                    </p>
                </div>
            </header>

            {onAdminClick && (
                <div className="max-w-5xl mx-auto w-full mb-6">
                    <button
                        onClick={onAdminClick}
                        className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-2xl font-semibold hover:from-purple-700 hover:to-purple-900 transition-all shadow-lg"
                    >
                        Abrir Panel de Admin
                    </button>
                </div>
            )}

            <section>
                <h2 className="text-2xl font-bold text-negro-fondo mb-6 uppercase tracking-tight ml-2">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardFeatures.map((feature) => {
                        const description = featureDescriptions[feature.id] || 'Explora esta función.';
                        return (
                            <button
                                key={feature.id}
                                onClick={() => handleFeatureClick(feature.id)}
                                className="bg-rosa-claro p-6 rounded-[2rem] shadow-lg border border-rosa-principal/20 hover:border-rosa-principal/40 transform hover:-translate-y-1 transition-all duration-300 text-left relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-negro-fondo bg-rosa-principal/20 p-2.5 rounded-2xl group-hover:bg-rosa-principal group-hover:text-negro-fondo transition-colors">
                                        {React.cloneElement(feature.icon as React.ReactElement<any>, { className: 'h-6 w-6' })}
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-negro-fondo mb-2 uppercase tracking-tight">{feature.name}</h3>
                                <p className="text-sm text-gris-atenuado leading-relaxed font-medium">{description}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

        </div>
    );
};

export default Dashboard;