// iamSubPilot – configuration
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

// 3) Online rooms run over LiveKit – the same technique as iamPilot, but with its own LiveKit project and its
//    own Netlify site (functions in netlify/functions, keys only in the Netlify environment variables).
//    Served from Netlify the game uses its own address; on GitHub Pages it asks this site. If the site is not
//    reachable, rooms fall back to direct browser-to-browser connections (PeerJS).
export const MP_SITE = 'https://iamsubpilot.netlify.app';

export const GAME_VERSION = '0.9.6';
