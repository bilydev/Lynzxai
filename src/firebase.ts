import { initializeApp, getApps } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  update, 
  remove,
  get
} from "firebase/database";

// Encrypted runtime configuration string decoder
function _d(s: string): string {
  try {
    return typeof window !== 'undefined' && typeof window.atob === 'function' ? window.atob(s) : s;
  } catch {
    return s;
  }
}

// Obfuscated Firebase Credentials to block static scraper tools
const firebaseConfig = {
  apiKey: _d("QUl6YVN5QkZwT3g0X295TkdPUjRPUXozamJfaTRRYXkyMk0tVFpn"),
  authDomain: _d("YmlsLXByb2plY3QtMjg0MWMuZmlyZWJhc2VhcHAuY29t"),
  projectId: _d("YmlsLXByb2plY3QtMjg0MWM="),
  storageBucket: _d("YmlsLXByb2plY3QtMjg0MWMuZmlyZWJhc3RvcmFnZS5hcHA="),
  messagingSenderId: _d("Mjk2MDMwODE3NzUy"),
  appId: _d("MToyOTYwMzA4MTc3NTI6d2ViOjJlOTE4ZDJlMWIyY2Y1N2NmNWY2YWQ="),
  measurementId: _d("Ry1TUzQ0UlZTU1ZK"),
  databaseURL: _d("aHR0cHM6Ly9iaWx5LXByb2plY3QtMjg0MWMtZGVmYXVsdC1ydGRiLmZpcmViYXNlaW8uY29t")
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export interface UserAccount {
  username: string;
  password?: string;
  createdAt: number;
  isBanned?: boolean;
  isDeleted?: boolean;
}

export interface Stats {
  totalCreated: number;
  totalLogins: number;
  totalDeleted: number;
  totalBanned: number;
}

export interface BugReport {
  id: string;
  username: string;
  reportText: string;
  status: 'pending' | 'approved' | 'wait';
  createdAt: number;
  notified?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  model?: string;
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

export interface AdminCredentials {
  username: string;
  password: string;
}

// Local Storage Fallback Keys
const LOCAL_USERS_KEY = 'lynzx_users_db_v1';
const LOCAL_STATS_KEY = 'lynzx_stats_db_v1';
const LOCAL_BUGS_KEY = 'lynzx_bugs_db_v1';
const LOCAL_CHATS_KEY = 'lynzx_chats_db_v1';
const LOCAL_ADMIN_KEY = 'lynzx_admin_creds_v1';

// Helper to sanitize key for Firebase (no '.', '#', '$', '[', ']')
export function sanitizeKey(str: string): string {
  return str.replace(/[.#$[\]]/g, '_');
}

// Local Storage Helpers
export function getLocalUsers(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalUsers(users: Record<string, UserAccount>) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function getLocalStats(): Stats {
  try {
    const raw = localStorage.getItem(LOCAL_STATS_KEY);
    return raw ? JSON.parse(raw) : { totalCreated: 0, totalLogins: 0, totalDeleted: 0, totalBanned: 0 };
  } catch {
    return { totalCreated: 0, totalLogins: 0, totalDeleted: 0, totalBanned: 0 };
  }
}

export function saveLocalStats(stats: Stats) {
  localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
}

export function getLocalBugs(): Record<string, BugReport> {
  try {
    const raw = localStorage.getItem(LOCAL_BUGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalBugs(bugs: Record<string, BugReport>) {
  localStorage.setItem(LOCAL_BUGS_KEY, JSON.stringify(bugs));
}

export function getLocalChats(username: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_CHATS_KEY}_${username.toLowerCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalChats(username: string, sessions: ChatSession[]) {
  const key = username.toLowerCase();
  localStorage.setItem(`${LOCAL_CHATS_KEY}_${key}`, JSON.stringify(sessions));
  
  // Realtime background sync user chat sessions to Firebase
  set(ref(db, `userChats/${sanitizeKey(key)}`), sessions).catch(() => {});
}

export function clearLocalChats(username: string) {
  const key = username.toLowerCase();
  localStorage.removeItem(`${LOCAL_CHATS_KEY}_${key}`);
  remove(ref(db, `userChats/${sanitizeKey(key)}`)).catch(() => {});
}

export function getLocalAdminCredentials(): AdminCredentials {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_KEY);
    return raw ? JSON.parse(raw) : { username: 'admin', password: 'adminbily' };
  } catch {
    return { username: 'admin', password: 'adminbily' };
  }
}

/**
 * Fetch a user account directly from Firebase Database with a strict 1.5s timeout.
 * Prevents infinite loading / spinning buttons under any network condition.
 */
export async function fetchUserFromFirebase(username: string): Promise<UserAccount | null> {
  if (!username) return null;
  const key = sanitizeKey(username.toLowerCase());

  // 1.5s max timeout promise
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 1500);
  });

  const firebasePromise = (async () => {
    try {
      const snapshot = await get(ref(db, `users/${key}`));
      if (snapshot.exists()) {
        const data = snapshot.val() as UserAccount;
        const users = getLocalUsers();
        users[key] = data;
        saveLocalUsers(users);
        return data;
      }
    } catch {
      // Ignore network error and fallback
    }
    return null;
  })();

  const result = await Promise.race([firebasePromise, timeoutPromise]);
  if (result) return result;

  // Fallback to local storage
  const users = getLocalUsers();
  return users[key] || null;
}

// ---- REALTIME FIREBASE SUBSCRIPTIONS ---- //

/**
 * Realtime listener for Admin Credentials
 */
export function subscribeToAdminCredentials(callback: (creds: AdminCredentials) => void) {
  callback(getLocalAdminCredentials());

  const credsRef = ref(db, 'adminCredentials');
  const unsubscribe = onValue(credsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as AdminCredentials;
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(data));
      callback(data);
    }
  }, (err) => {
    console.warn("Firebase admin creds listener error:", err);
  });

  return unsubscribe;
}

/**
 * Update Admin Credentials in Firebase
 */
export function updateAdminCredentialsInFirebase(newUsername: string, newPass: string) {
  const creds: AdminCredentials = { username: newUsername, password: newPass };
  localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(creds));
  set(ref(db, 'adminCredentials'), creds).catch((e) => console.warn("Firebase set admin creds error:", e));
}

/**
 * Realtime listener for stats
 */
export function subscribeToStats(callback: (stats: Stats) => void) {
  callback(getLocalStats());

  const statsRef = ref(db, 'stats');
  const unsubscribe = onValue(statsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as Stats;
      saveLocalStats(data);
      callback(data);
    }
  }, (err) => {
    console.warn("Firebase stats listener error:", err);
  });

  return unsubscribe;
}

/**
 * Realtime listener for users list
 */
export function subscribeToUsers(callback: (users: Record<string, UserAccount>) => void) {
  callback(getLocalUsers());

  const usersRef = ref(db, 'users');
  const unsubscribe = onValue(usersRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as Record<string, UserAccount>;
      const activeData: Record<string, UserAccount> = {};
      Object.entries(data).forEach(([key, val]) => {
        if (val && !val.isDeleted) {
          activeData[key] = val;
        }
      });
      saveLocalUsers(activeData);
      callback(activeData);
    } else {
      saveLocalUsers({});
      callback({});
    }
  }, (err) => {
    console.warn("Firebase users listener error:", err);
  });

  return unsubscribe;
}

/**
 * Realtime listener for logged-in user status (Ban / Delete detection)
 */
export function subscribeToUserStatus(username: string, callback: (account: UserAccount | null) => void) {
  if (!username) return () => {};

  const key = sanitizeKey(username.toLowerCase());
  const userRef = ref(db, `users/${key}`);

  const unsubscribe = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as UserAccount;
      callback(data);
    } else {
      // Account deleted from Firebase
      callback({ username, isDeleted: true, createdAt: Date.now() });
    }
  }, (err) => {
    console.warn("Firebase user status listener error:", err);
  });

  return unsubscribe;
}

/**
 * Realtime listener for bug reports
 */
export function subscribeToBugReports(callback: (bugs: Record<string, BugReport>) => void) {
  callback(getLocalBugs());

  const bugsRef = ref(db, 'bugReports');
  const unsubscribe = onValue(bugsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as Record<string, BugReport>;
      saveLocalBugs(data);
      callback(data);
    } else {
      saveLocalBugs({});
      callback({});
    }
  }, (err) => {
    console.warn("Firebase bug reports listener error:", err);
  });

  return unsubscribe;
}

// ---- NON-BLOCKING INSTANT ACTION FUNCTIONS ---- //

/**
 * Register user in Firebase & update stats (Instant 0ms UI response + async Firebase write)
 */
export function registerUserToFirebase(user: UserAccount): boolean {
  const key = sanitizeKey(user.username.toLowerCase());
  
  // 1. Save to local storage first for 0ms instant UI response
  const users = getLocalUsers();
  users[key] = user;
  saveLocalUsers(users);

  const stats = getLocalStats();
  stats.totalCreated = (stats.totalCreated || 0) + 1;
  saveLocalStats(stats);

  // 2. Fire-and-forget background sync to Firebase Realtime Database
  set(ref(db, `users/${key}`), user).catch((e) => console.warn("Firebase set user error:", e));
  set(ref(db, 'stats'), stats).catch((e) => console.warn("Firebase set stats error:", e));

  return true;
}

/**
 * Record user login count (Instant 0ms UI response + async Firebase write)
 */
export function recordUserLoginToFirebase(): void {
  const stats = getLocalStats();
  stats.totalLogins = (stats.totalLogins || 0) + 1;
  saveLocalStats(stats);

  set(ref(db, 'stats'), stats).catch((e) => console.warn("Firebase login stats error:", e));
}

/**
 * Delete user from Firebase & update totalDeleted counter
 */
export function deleteUserInFirebase(username: string): void {
  const key = sanitizeKey(username.toLowerCase());

  const users = getLocalUsers();
  delete users[key];
  saveLocalUsers(users);

  clearLocalChats(username);

  const stats = getLocalStats();
  stats.totalDeleted = (stats.totalDeleted || 0) + 1;
  saveLocalStats(stats);

  remove(ref(db, `users/${key}`)).catch((e) => console.warn("Firebase remove user error:", e));
  set(ref(db, 'stats'), stats).catch((e) => console.warn("Firebase stats error:", e));
}

/**
 * Ban user in Firebase & update totalBanned counter
 */
export function banUserInFirebase(username: string): void {
  const key = sanitizeKey(username.toLowerCase());

  const users = getLocalUsers();
  if (users[key]) {
    users[key].isBanned = true;
    saveLocalUsers(users);
  }

  const stats = getLocalStats();
  stats.totalBanned = (stats.totalBanned || 0) + 1;
  saveLocalStats(stats);

  update(ref(db, `users/${key}`), { isBanned: true }).catch((e) => console.warn("Firebase ban error:", e));
  set(ref(db, 'stats'), stats).catch((e) => console.warn("Firebase stats error:", e));
}

/**
 * Unban user in Firebase
 */
export function unbanUserInFirebase(username: string): void {
  const key = sanitizeKey(username.toLowerCase());

  const users = getLocalUsers();
  if (users[key]) {
    users[key].isBanned = false;
    saveLocalUsers(users);
  }

  update(ref(db, `users/${key}`), { isBanned: false }).catch((e) => console.warn("Firebase unban error:", e));
}

/**
 * Submit bug report to Firebase
 */
export function submitBugReport(username: string, reportText: string): void {
  const id = 'bug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const report: BugReport = {
    id,
    username,
    reportText,
    status: 'pending',
    createdAt: Date.now()
  };

  const bugs = getLocalBugs();
  bugs[id] = report;
  saveLocalBugs(bugs);

  set(ref(db, `bugReports/${id}`), report).catch((e) => console.warn("Firebase bug report error:", e));
}

/**
 * Delete bug report from Firebase
 */
export function deleteBugReport(reportId: string): void {
  const bugs = getLocalBugs();
  delete bugs[reportId];
  saveLocalBugs(bugs);

  remove(ref(db, `bugReports/${reportId}`)).catch((e) => console.warn("Firebase delete bug report error:", e));
}

/**
 * Update bug report status ('approved' or 'wait')
 */
export function updateBugReportStatus(reportId: string, status: 'approved' | 'wait'): void {
  const bugs = getLocalBugs();
  if (bugs[reportId]) {
    bugs[reportId].status = status;
    bugs[reportId].notified = false;
    saveLocalBugs(bugs);
  }

  update(ref(db, `bugReports/${reportId}`), { status, notified: false }).catch((e) => console.warn("Firebase update bug status error:", e));
}

/**
 * Mark bug report as notified for user
 */
export function markBugReportNotified(reportId: string): void {
  const bugs = getLocalBugs();
  if (bugs[reportId]) {
    bugs[reportId].notified = true;
    saveLocalBugs(bugs);
  }

  update(ref(db, `bugReports/${reportId}`), { notified: true }).catch((e) => console.warn("Firebase mark bug report notified error:", e));
}

export { db };
