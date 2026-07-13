importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCfhAn4ka-GqKo-nw7mj2oVLvmr0IAhI3g",
  authDomain: "dovlim-smart-pro-2.firebaseapp.com",
  databaseURL: "https://dovlim-smart-pro-2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dovlim-smart-pro-2",
  storageBucket: "dovlim-smart-pro-2.firebasestorage.app",
  messagingSenderId: "843996743947",
  appId: "1:843996743947:web:9b48799a6b598acda53a0e"
});

const messaging = firebase.messaging();

// Fires when a push notification arrives while the app/tab is CLOSED or
// in the background - this is the whole point of PATCH FCM-1. The
// Cloud Function (to be written server-side) sends the "notification"
// payload shape, which this handler turns into an actual OS notification.
messaging.onBackgroundMessage(function(payload) {
  const title = (payload.notification && payload.notification.title) || "DOVLIM";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/icon.png"
  };
  self.registration.showNotification(title, options);
});
