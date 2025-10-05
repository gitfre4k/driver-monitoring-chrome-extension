import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";

import { routes } from "./app.routes";

// import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
// import { getAuth, provideAuth } from "@angular/fire/auth";
// import { getFirestore, provideFirestore } from "@angular/fire/firestore";

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIza...",
//   authDomain: "your-project-id.firebaseapp.com",
//   projectId: "your-project-id",
//   storageBucket: "your-project-id.appspot.com",
//   messagingSenderId: "...",
//   appId: "1:...",
// };

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
