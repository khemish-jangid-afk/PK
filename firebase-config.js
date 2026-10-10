// Firebase Realtime Database event tracking for myLove.html.
// Replace the placeholder values with the config from Firebase Console
// > Project settings > Your apps before deploying.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase,
    push,
    ref,
    serverTimestamp,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyApC-_p4vS88_D90rTsTIdW8S9W01POOyc",
    authDomain: "mylove-8f78b.firebaseapp.com",
    // Verify this exact URL in Firebase Console > Realtime Database.
    databaseURL: "https://mylove-8f78b-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "mylove-8f78b",
    storageBucket: "mylove-8f78b.firebasestorage.app",
    messagingSenderId: "441612054445",
    appId: "1:441612054445:web:5f8bd2713c0ec5f6693b24",
    measurementId: "G-QZ8593PB8R"
};

const isConfigured = Object.values(firebaseConfig).every(
    (value) => value && !value.includes("YOUR_")
);

let database = null;
let initializationError = null;

if (isConfigured) {
    try {
        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);
    } catch (error) {
        initializationError = error;
        console.error("Firebase initialization failed:", error);
    }
} else {
    console.warn("Firebase tracking is disabled until firebaseConfig is filled in.");
}

const SESSION_STORAGE_KEY = "myLoveSessionId";

function createSessionId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId() {
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!sessionId) {
        sessionId = createSessionId();
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }

    return sessionId;
}

// Create the ID as soon as this module loads so every visit has a stable ID,
// even before the first chapter or decision event is written.
getSessionId();

async function writeEvent(eventType, payload) {
    if (!database) return null;

    const sessionId = getSessionId();
    const eventRef = push(ref(database, `sessions/${sessionId}/logs`));
    const event = {
        eventType,
        sessionId,
        clientTimestamp: new Date().toISOString(),
        serverTimestamp: serverTimestamp(),
        ...payload
    };

    try {
        await set(eventRef, event);
        return eventRef.key;
    } catch (error) {
        console.error("Unable to write Firebase tracking event:", error);
        return null;
    }
}

async function writeActiveStatus(chapterNumber, chapterTitle) {
    if (!database) return null;

    const sessionId = getSessionId();
    const statusRef = ref(database, `sessions/${sessionId}/activeStatus`);

    try {
        await set(statusRef, {
            sessionId,
            chapterId: chapterNumber,
            chapterNumber,
            chapterTitle,
            clientTimestamp: new Date().toISOString(),
            serverTimestamp: serverTimestamp(),
            status: "reading"
        });
        return true;
    } catch (error) {
        console.error("Unable to update Firebase active status:", error);
        return false;
    }
}

export function logChapterView(chapterNumber, chapterTitle) {
    return Promise.all([
        writeEvent("chapter_view", {
            chapterId: chapterNumber,
            chapterNumber,
            chapterTitle
        }),
        writeActiveStatus(chapterNumber, chapterTitle)
    ]);
}

export function logUserDecision(decisionType, message) {
    return writeEvent("user_decision", { decisionType, message });
}

// Expose a small browser API for the existing non-module app script.
window.eventTracker = {
    getSessionId,
    logChapterView,
    logUserDecision,
    setActiveStatus: writeActiveStatus
};

// Shared exports for admin.html and other Firebase-aware pages.
export { database, firebaseConfig, initializationError };
