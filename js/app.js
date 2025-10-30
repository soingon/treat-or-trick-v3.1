// Main app logic (vanilla JS)
import { auth, db } from "./firebase.js";
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, query, orderBy, limit, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, getAuth, getIdToken } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const MAX_PLAYERS = 80;
const QR_TOTAL = 10;
const CLOUD_VERIFY_URL = "https://us-central1-trickortreat-f543b.cloudfunctions.net/verifyScan";
let currentUser = null;
let gameState = { locked:false, endsAt:null };

function renderQRGrid() {
  const grid = document.getElementById("qr-grid");
  grid.innerHTML = "";
  for(let i=1;i<=QR_TOTAL;i++){
    const tile = document.createElement("div");
    tile.className = "qr-tile";
    tile.dataset.qrId = `QR${i}`;
    tile.innerHTML = `<div style="font-weight:600;margin-bottom:8px">QR ${i}</div><img class="qr-img" src="assets/qrs/QR${i}.png" alt="QR${i}" /><div class="muted" style="font-size:12px;margin-top:8px">Or scan with camera</div>`;
    tile.addEventListener("click", ()=>{ alert("This is the printable QR. Use camera scanner to register a scan.") });
    grid.appendChild(tile);
  }
}

function updateTimerUI(){
  const el = document.getElementById("timer");
  if(!gameState.endsAt){ el.textContent = "Timer: --:--"; return; }
  const now = Date.now();
  const diff = gameState.endsAt - now;
  if(diff <= 0){
    el.textContent = "Timer: 00:00 (ended)";
    // lock interactions
    gameState.locked = true;
    playSound("assets/sfx/end.wav");
  } else {
    const m = Math.floor(diff/60000);
    const s = Math.floor((diff%60000)/1000);
    el.textContent = `Timer: ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
}

function watchGameState(){
  const gsRef = doc(db,"gameState","current");
  onSnapshot(gsRef, snap=>{
    if(!snap.exists()) return;
    const d = snap.data();
    gameState.locked = !!d.locked;
    gameState.endsAt = d.endsAt ? d.endsAt.toMillis() : null;
    updateTimerUI();
  });
}

function setupScanner(){
  const resultDiv = document.getElementById("scan-result");
  const html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: 250 };

  function onScanSuccess(decodedText, decodedResult){
    resultDiv.textContent = `Scanned: ${decodedText}`;
    playSound("assets/sfx/scan.wav");
    handleScan(decodedText);
  }

  function onScanFailure(error){
    // ignore
  }

  Html5Qrcode.getCameras().then(devices=>{
    if(devices && devices.length){
      const cameraId = devices[0].id;
      html5QrCode.start(cameraId, config, onScanSuccess, onScanFailure).catch(err=>{
        console.error("Scan start failed", err);
      });
    } else {
      resultDiv.textContent = "No camera found";
    }
  }).catch(err=>{
    resultDiv.textContent = "Camera access denied or not available.";
  });
}

async function handleScan(payload){
  if(!payload.startsWith("TRICKORTREAT::")) return;
  if(gameState.locked){ alert("Game is locked — no scans accepted right now."); return; }
  if(!currentUser){ alert("Please log in to register your scan."); return; }

  try{
    // get idToken to authenticate with Cloud Function
    const token = await currentUser.getIdToken();
    const res = await fetch(CLOUD_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": "Bearer "+token },
      body: JSON.stringify({ payload })
    });
    const data = await res.json();
    if(res.ok){
      alert(data.message || "Scan registered");
      playSound("assets/sfx/success.wav");
      refreshLeaderboard();
    } else {
      alert("Scan failed: " + (data.error || data.message || res.statusText));
    }
  }catch(err){
    console.error(err);
    alert("Error contacting server: "+err.message);
  }
}

async function refreshLeaderboard(){
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "<li>Loading...</li>";
  const q = query(collection(db,"players"), orderBy("points","desc"), limit(20));
  const snap = await getDocs(q);
  list.innerHTML = "";
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const li = document.createElement("li");
    li.textContent = `${d.displayName || docSnap.id} — ${d.points || 0} pts`;
    list.appendChild(li);
  });
}

function playSound(path){
  try{
    const a = new Audio(path);
    a.play();
  }catch(e){}
}

function setupAuthUI(){
  const ua = document.getElementById("user-area");
  ua.innerHTML = `
    <input id="email-input" placeholder="email" />
    <button id="signup" class="btn">Sign up</button>
    <button id="login" class="btn">Log in</button>
    <button id="logout" class="btn" style="display:none">Log out</button>
  `;
  document.getElementById("signup").addEventListener("click", async ()=>{
    const email = document.getElementById("email-input").value;
    const pass = "password123";
    try{
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      currentUser = cred.user;
      alert("Signed up (demo uses default password).");
      document.getElementById("logout").style.display = "inline-block";
      document.getElementById("signup").style.display = "none";
      document.getElementById("login").style.display = "none";
    }catch(err){ alert("Sign up error: "+err.message); }
  });
  document.getElementById("login").addEventListener("click", async ()=>{
    const email = document.getElementById("email-input").value;
    const pass = "password123";
    try{
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      currentUser = cred.user;
      alert("Logged in (demo password used).");
      document.getElementById("logout").style.display = "inline-block";
      document.getElementById("signup").style.display = "none";
      document.getElementById("login").style.display = "none";
    }catch(err){ alert("Login error: "+err.message); }
  });
  document.getElementById("logout").addEventListener("click", async ()=>{
    await signOut(auth);
    currentUser = null;
    document.getElementById("logout").style.display = "none";
    document.getElementById("signup").style.display = "inline-block";
    document.getElementById("login").style.display = "inline-block";
    alert("Logged out.");
  });

  onAuthStateChanged(auth, user=>{
    if(user){
      currentUser = user;
    }else currentUser = null;
  });
}

renderQRGrid();
setupAuthUI();
setupScanner();
watchGameState();
refreshLeaderboard();
document.getElementById("refresh-leaderboard").addEventListener("click", refreshLeaderboard);
