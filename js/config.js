// HADAL – configuration
//
// 1) Online features (leaderboard, multiplayer) need a Firebase project.
//    Paste the web config from the Firebase console here (see FIREBASE-SETUP.md).
//    Leave it as null and the game runs fully offline with a local leaderboard.
//
// 2) The onboard AI scientist answers from a built-in knowledge base.
//    To connect a real AI model, set AI_ENDPOINT to the URL of a small server
//    function that receives { question, context } and returns { answer }.
//    Never put an API key in this file: the repository is public.

export const FIREBASE_CONFIG = null;

export const AI_ENDPOINT = null;

export const GAME_VERSION = '0.3.0';
