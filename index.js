const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const VALID_QRS = Array.from({length:10}, (_,i)=>`QR${i+1}`);

exports.verifyScan = functions.https.onRequest(async (req, res) => {
  try{
    if(req.method !== 'POST') return res.status(405).send({ error: 'Method not allowed' });
    const authHeader = req.get('Authorization') || '';
    const match = authHeader.match(/Bearer (.*)/);
    if(!match) return res.status(401).send({ error: 'Unauthorized' });
    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const body = req.body || {};
    const payload = body.payload;
    if(!payload || typeof payload !== 'string' || !payload.startsWith('TRICKORTREAT::')) return res.status(400).send({ error: 'Invalid payload' });
    const qr = payload.replace('TRICKORTREAT::','');
    if(!VALID_QRS.includes(qr)) return res.status(400).send({ error: 'Unknown QR' });

    const playerRef = db.collection('players').doc(uid);
    const playerSnap = await playerRef.get();
    let player = { points:0, scanned: [] };
    if(playerSnap.exists) player = playerSnap.data();

    if(Array.isArray(player.scanned) && player.scanned.includes(qr)){
      return res.status(400).send({ error: 'Already scanned' });
    }

    // simple points logic
    let points = 10;
    if(qr !== 'QR10'){ // make QR10 the normal one
      // sample perk: QR6 gives 25 points
      if(qr === 'QR6') points = 25;
      if(qr === 'QR1') points = 20; // double-points represented as 20 single award
    }

    const newPoints = (player.points || 0) + points;
    await playerRef.set({
      email: decoded.email || null,
      displayName: decoded.email || uid,
      points: newPoints,
      scanned: (player.scanned || []).concat([qr]),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.send({ message: 'Scan accepted', points: newPoints });
  }catch(err){
    console.error(err);
    return res.status(500).send({ error: err.message });
  }
});
