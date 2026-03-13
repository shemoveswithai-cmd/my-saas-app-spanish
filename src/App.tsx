import React, { useState, useEffect } from 'react';

import Sidebar, { Feature, features } from './components/Sidebar';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import TextToSpeech from './components/TextToSpeech';
import Dashboard from './components/Dashboard';
import AITwinCreator from './components/AITwinCreator';
import AIAvatarCreator from './components/AIAvatarCreator';
import AIPhotoshoot from './components/AIPhotoshoot';
import AIPodcastStudio from './components/AIPodcastStudio';
import AIVlogs from './components/AIVlogs';
import MyCreations from './components/MyCreations';
import PhotoFusion from './components/PhotoFusion';
import AccountPage from './components/AccountPage';
import HomeCanvas from './components/HomeCanvas';
import MoodBoardStylist from './components/MoodBoardStylist';
import FlatlayPicture from './components/FlatlayPicture';
import AIMakeupStudio from './components/AIMakeupStudio';
import AINailStudio from './components/AINailStudio';
import AITravelWorld from './components/AITravelWorld';
import AIMusicStudio from './components/AIMusicStudio';
import AIBranding from './components/AIBranding';
import FootRituals from './components/FootRituals';
import PromptBulb from './components/PromptBulb';
import { dataURLtoFile, initDB, saveImageToDB, getImagesFromDB, deleteImageFromDB, pruneImagesInDB, deleteAllImagesFromDB } from './utils';
import { Spinner } from './components/common/Spinner';
import AIProductGallery from './components/AIProductGallery';
import AIRealEstatePhoto from './components/AIRealEstatePhoto';
import AIWigStudio from './components/AIWigStudio';
import AI1990sShoots from './components/VintagePhotoStudio';
import { Creation } from './types';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/auth/AuthPage';
import SubscriptionPage from './components/auth/SubscriptionPage';
import AdminPage from './components/admin/AdminPage';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string;
  nickname: string;
  avatar: string | null;
  aiTwinSelfie: string | null;
  subscriptionStatus?: 'active' | 'inactive';
}

const App: React.FC = () => {
  const { user, loading, isSubscribed } = useAuth();
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
  const [allCreations, setAllCreations] = useState<Creation[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastToolFeature, setLastToolFeature] = useState<Feature | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // Create userProfile from auth user
  const userProfile: UserProfile | null = user ? {
    uid: user.id,
    email: user.email,
    name: user.name || 'Usuario',
    nickname: user.name || 'Usuario',
    avatar: null,
    aiTwinSelfie: null,
    subscriptionStatus: isSubscribed ? 'active' : 'inactive',
  } : null;

  // Load active feature from localStorage
  useEffect(() => {
    try {
        const savedFeatureId = localStorage.getItem('smwActiveFeatureId');
        if (savedFeatureId) {
            const feature = features.find(f => f.id === savedFeatureId);
            if (feature) {
                setActiveFeature(feature);
            }
        }
    } catch (error) {
        console.error("Failed to load data from localStorage:", error);
    }
  }, []);

  // Save active feature to localStorage on change
  useEffect(() => {
    if (activeFeature) {
        localStorage.setItem('smwActiveFeatureId', activeFeature.id);
        
        // Track last tool used (excluding non-tool pages)
        if (!['home', 'account', 'my-creations', 'prompt-bulb'].includes(activeFeature.id)) {
            setLastToolFeature(activeFeature);
        }
    }
  }, [activeFeature]);

  // Load all user data from IndexedDB and localStorage on initial render
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
        try {
            await initDB();
            const imagesFromDB = await getImagesFromDB();
            // Sort descending to show newest first
            const sortedImages = imagesFromDB.sort((a, b) => b.id - a.id);
            const creationsWithUrls = sortedImages.map(({ id, blob }) => ({
                id,
                url: URL.createObjectURL(blob),
            }));
            setAllCreations(creationsWithUrls);
            console.log(`Loaded ${creationsWithUrls.length} creations from IndexedDB.`);

            // Favorites are still in localStorage but store IDs now
            const savedFavorites = localStorage.getItem(`smwFavorites_${user.id}`);
            if (savedFavorites) {
                setFavorites(new Set(JSON.parse(savedFavorites)));
            }

        } catch (error) {
            console.error("Error loading creations from IndexedDB:", error);
        }
    };
    
    loadData();

    // Cleanup object URLs on unmount
    return () => {
        allCreations.forEach(creation => URL.revokeObjectURL(creation.url));
    };
  }, [user?.id]);


  // Save favorites to localStorage
  useEffect(() => {
    if (user?.id) {
        try {
            localStorage.setItem(`smwFavorites_${user.id}`, JSON.stringify(Array.from(favorites)));
        } catch (error) {
            console.error("Failed to save favorites to localStorage:", error);
        }
    }
  }, [favorites, user?.id]);


  const addCreations = async (newImagesDataUrls: string[]) => {
    if (!user?.id || !Array.isArray(newImagesDataUrls) || newImagesDataUrls.length === 0) {
        console.warn("No new images to save or user not available.");
        return;
    }
    console.log("Adding new images count:", newImagesDataUrls.length);
    
    const newCreations: Creation[] = [];
    for (const dataUrl of newImagesDataUrls) {
        const file = dataURLtoFile(dataUrl, `creation-${Date.now()}.png`);
        if (file) {
            try {
                const newId = await saveImageToDB(file);
                const newCreation: Creation = {
                    id: newId,
                    url: URL.createObjectURL(file),
                };
                newCreations.push(newCreation);
            } catch (error) {
                console.error("Failed to save an image to IndexedDB:", error);
            }
        }
    }
    
    // Prepend new creations to show them first
    setAllCreations(prev => [...newCreations, ...prev]);

    // Prune old creations in the background - Increased to 1000 to satisfy "Save All" request
    await pruneImagesInDB(1000);
  };

  const toggleFavorite = (creationId: number) => {
    setFavorites(prevFavorites => {
        const newFavorites = new Set(prevFavorites);
        if (newFavorites.has(creationId)) {
            newFavorites.delete(creationId);
        } else {
            newFavorites.add(creationId);
        }
        return newFavorites;
    });
  };

  const handleDeleteCreation = async (creationId: number) => {
    try {
        await deleteImageFromDB(creationId);
        setAllCreations(prev => {
            const creationToDelete = prev.find(c => c.id === creationId);
            if(creationToDelete) URL.revokeObjectURL(creationToDelete.url);
            return prev.filter(c => c.id !== creationId)
        });
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            newFavorites.delete(creationId);
            return newFavorites;
        });
    } catch (error) {
        console.error("Failed to delete creation:", error);
    }
  };

  const handleDeleteAllCreations = async () => {
    try {
        await deleteAllImagesFromDB();
        allCreations.forEach(c => URL.revokeObjectURL(c.url));
        setAllCreations([]);
        setFavorites(new Set());
    } catch (error) {
        console.error("Failed to delete all creations:", error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-smw-pink-light">
        <Spinner className="w-12 h-12 text-smw-pink" />
      </div>
    );
  }

  // Not logged in - show auth page
  if (!user) {
    return <AuthPage />;
  }

  // Logged in but no subscription (and not admin) - show paywall
  if (!isSubscribed && !user.isAdmin) {
    return <SubscriptionPage />;
  }

  // Show admin page if requested
  if (showAdmin && user.isAdmin) {
    return <AdminPage onBack={() => setShowAdmin(false)} />;
  }

  const renderActiveFeature = () => {
    switch (activeFeature?.id) {
      case 'account':
        return <AccountPage user={userProfile!} onUpdate={handleUpdateProfile} />;
      case 'image-gen':
        return <ImageGenerator addCreations={addCreations} />;
      case 'photo-fusion':
        return <PhotoFusion addCreations={addCreations} />;
      case 'mood-board-stylist':
        return <MoodBoardStylist addCreations={addCreations} />;
      case 'ai-makeup-studio':
        return <AIMakeupStudio addCreations={addCreations} />;
      case 'ai-nail-studio':
        return <AINailStudio addCreations={addCreations} />;
      case 'ai-music-studio':
        return <AIMusicStudio addCreations={addCreations} />;
      case 'ai-product-gallery':
        return <AIProductGallery addCreations={addCreations} />;
      case 'ai-branding':
        return <AIBranding addCreations={addCreations} />;
      case 'ai-real-estate':
        return <AIRealEstatePhoto addCreations={addCreations} />;
      case 'ai-twin-creator':
        return <AITwinCreator addCreations={addCreations} user={userProfile!} />;
      case 'ai-avatar-creator':
        return <AIAvatarCreator addCreations={addCreations} />;
      case 'ai-photoshoot':
        return <AIPhotoshoot addCreations={addCreations} user={userProfile!} setActiveFeature={setActiveFeature} />;
      case 'ai-podcasts':
        return <AIPodcastStudio addCreations={addCreations} user={userProfile!} />;
      case 'ai-vlogs':
        return <AIVlogs addCreations={addCreations} user={userProfile!} />;
      case 'ai-wig-studio':
        return <AIWigStudio addCreations={addCreations} user={userProfile!} />;
      case 'ai-travel-world':
        return <AITravelWorld addCreations={addCreations} />;
      case 'home-canvas':
        return <HomeCanvas addCreations={addCreations} />;
      case 'flatlay-picture':
        return <FlatlayPicture addCreations={addCreations} />;
      case 'ai-1990s-shoots':
        return <AI1990sShoots addCreations={addCreations} />;
      case 'foot-rituals':
        return <FootRituals addCreations={addCreations} />;
      case 'prompt-bulb':
        return <PromptBulb 
                  onReturn={() => {
                    if (lastToolFeature) {
                      setActiveFeature(lastToolFeature);
                    } else {
                      const homeFeature = features.find(f => f.id === 'home');
                      if (homeFeature) setActiveFeature(homeFeature);
                    }
                  }} 
                  lastToolName={lastToolFeature?.name}
               />;
      case 'my-creations':
        return <MyCreations
                    creations={allCreations}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    onDelete={handleDeleteCreation}
                    onDeleteAll={handleDeleteAllCreations}
                    addCreations={addCreations}
                />;
      case 'image-edit':
        return <ImageEditor addCreations={addCreations} />;
      case 'tts':
        return <TextToSpeech />;
      case 'home':
      default:
        return <Dashboard user={userProfile!} setActiveFeature={setActiveFeature} onAdminClick={user?.isAdmin ? () => setShowAdmin(true) : undefined} />;
    }
  };

  return (
    <div className="flex h-screen bg-smw-black overflow-hidden">
      <Sidebar 
        activeFeature={activeFeature} 
        setActiveFeature={setActiveFeature} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 bg-smw-pink-light h-full overflow-hidden">
        {/* Mobile Header - Main Navigation */}
        <header className="lg:hidden sticky top-0 z-30 w-full bg-smw-black h-16 flex items-center px-4 border-b border-smw-pink/20 shadow-lg relative">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 text-smw-pink hover:bg-white/5 rounded-md transition-colors flex-shrink-0 z-10"
            aria-label="Abrir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {activeFeature && !['home', 'account', 'my-creations', 'prompt-bulb'].includes(activeFeature.id) && (
              <button 
                onClick={() => {
                  const promptBulb = features.find(f => f.id === 'prompt-bulb');
                  if (promptBulb) setActiveFeature(promptBulb);
                }}
                className="bg-white/10 hover:bg-white/20 text-smw-pink px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-smw-pink/20 pointer-events-auto shadow-sm"
              >
                <span>Bóveda de Prompts</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto w-full h-full relative">
          <div className="pt-0">
            {renderActiveFeature()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;