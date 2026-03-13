// The firebase object is initialized in index.html and available globally.

// Ensure firebase is available before using it
if (typeof window.firebase === 'undefined') {
    throw new Error("Firebase is not initialized. Make sure the scripts are loaded in index.html.");
}

const auth = window.firebase.auth();
const google = new window.firebase.auth.GoogleAuthProvider();
const db = window.firebase.firestore();

// Persist session (so user stays signed in)
auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).catch((error: any) => {
    console.error("Firebase persistence error:", error.code, error.message);
});

export { auth, google, db };
