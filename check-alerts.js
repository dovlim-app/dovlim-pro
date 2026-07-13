const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

// PATCH GHA-1 - runs on GitHub Actions instead of Firebase Cloud Functions
// (which requires the Blaze plan to deploy). Same idea, different host:
// read the credentials from environment variables (set from GitHub
// Secrets in the workflow file, never hardcoded here).
initializeApp({
  credential: cert({
    projectId: "dovlim-smart-pro-2",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // PATCH GHA-2 - GitHub Secrets store the key as plain text, so the
    // "\n" sequences typed into the secret box are literal backslash+n
    // characters, not real newlines. The PEM parser needs actual
    // newlines, so we convert them here before use.
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase();

// Each flag has its own "already notified" marker stored back in the
// database at /device/app/notified/<flagName>. Without this, EVERY run
// (every 5 minutes) would re-send the same push as long as the flag
// stays true - PATCH GHA-1 only sends once per flag, on the transition
// from false/absent to true. It resets automatically once the flag goes
// back to false (e.g. tank refilled, jam cleared).
const CHECKS = [
  { path: "/device/food/low", notifiedKey: "foodLow", title: "DOVLIM - نقص الأكل", body: "الخزان الأكل قريب يخلص، وقت تعبيه." },
  { path: "/device/water/low", notifiedKey: "waterLow", title: "DOVLIM - نقص الماء", body: "الخزان الماء قريب يخلص، وقت تعبيه." },
  { path: "/device/food/jamSuspected", notifiedKey: "jamSuspected", title: "DOVLIM - انحشار محتمل", body: "الآلة ما نجحتش تفرز الأكل، تأكد من الأنبوب." },
  { path: "/device/food/tubeBlocked", notifiedKey: "tubeBlocked", title: "DOVLIM - أنبوب محشور", body: "الأنبوب محشور بالحبوب، لازم تفقد يدوي." },
  { path: "/device/status/rtcNeedsAttention", notifiedKey: "rtcNeedsAttention", title: "DOVLIM - مشكلة فالساعة", body: "البطارية متاع الساعة (RTC) تحتاج تبديل." },
  { path: "/device/water/pumpStuck", notifiedKey: "pumpStuck", title: "DOVLIM - البمبة محبوسة", body: "البمبة خدمت أكثر من الوقت العادي، تأكد منها." },
];

async function sendPush(token, title, body) {
  try {
    await getMessaging().send({ token, notification: { title, body } });
    console.log("Push sent:", title);
  } catch (err) {
    console.error("Push failed:", err.message);
  }
}

async function main() {
  const tokenSnap = await db.ref("/device/app/fcmToken").get();
  const token = tokenSnap.val();
  if (!token) {
    console.log("No fcmToken saved yet - nothing to do.");
    return;
  }

  for (const check of CHECKS) {
    const [valSnap, notifiedSnap] = await Promise.all([
      db.ref(check.path).get(),
      db.ref("/device/app/notified/" + check.notifiedKey).get(),
    ]);

    const isActive = valSnap.val() === true;
    const alreadyNotified = notifiedSnap.val() === true;

    if (isActive && !alreadyNotified) {
      await sendPush(token, check.title, check.body);
      await db.ref("/device/app/notified/" + check.notifiedKey).set(true);
    } else if (!isActive && alreadyNotified) {
      // Condition cleared - reset so a future recurrence notifies again.
      await db.ref("/device/app/notified/" + check.notifiedKey).set(false);
    }
  }

  console.log("Check complete.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
