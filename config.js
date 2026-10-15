// Fill in after creating your Firebase project (see SETUP.md). Leave empty to run offline with localStorage.
export const CONFIG = {
  firebase: { apiKey: "", authDomain: "", projectId: "", appId: "" },
  checkoutUrl: "" // HTTPS Cloud Function URL that creates a Stripe Checkout session
};

let auth, db, user, fb;
async function init() {
  if (fb || !CONFIG.firebase.apiKey) return !!fb;
  const v = "10.12.2", b = `https://www.gstatic.com/firebasejs/${v}/`;
  const [app, a, f] = await Promise.all([import(b + "firebase-app.js"), import(b + "firebase-auth.js"), import(b + "firebase-firestore.js")]);
  const ap = app.initializeApp(CONFIG.firebase);
  auth = a.getAuth(ap); db = f.getFirestore(ap); fb = { a, f };
  return true;
}

export const cloud = {
  async login() {
    if (!(await init())) { alert("Firebase isn't configured yet. See SETUP.md."); return null; }
    const cred = await fb.a.signInWithPopup(auth, new fb.a.GoogleAuthProvider());
    user = cred.user;
    const snap = await fb.f.getDoc(fb.f.doc(db, "profiles", user.uid));
    return snap.exists() ? snap.data() : null; // coins/ownership are only WRITTEN by Cloud Functions in production
  },
  async save(p) {
    if (!user || !fb) return;
    // DEV ONLY: trusting the client with coins is cheatable. Move rewards/purchases to Cloud Functions before launch.
    await fb.f.setDoc(fb.f.doc(db, "profiles", user.uid), p);
  },
  async checkout() {
    if (!CONFIG.checkoutUrl || !user) { alert("Sign in first, and set checkoutUrl in config.js (see SETUP.md)."); return; }
    const r = await fetch(CONFIG.checkoutUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await user.getIdToken() }, body: JSON.stringify({ pack: "coins_500" }) });
    const { url } = await r.json(); location.href = url;
  }
};
