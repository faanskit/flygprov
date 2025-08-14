### **Optimerad Specifikation för Pre-Test Applikation**

#### **1\. Övergripande Arkitektur**

Projektet kommer att utvecklas med följande stack och driftsättas på Netlify.

* **Frontend:**  
  * **Ramverk:** Vanilla TypeScript + Material Design  
  * **Syfte:** Hanterar all användarinteraktion, vyer för student och examinator, samt testflödet. Kommunicerar med backend via ett REST API.  
* **Backend:**  
  * **Plattform:** Netlify Functions (Serverless).  
  * **Språk:** TypeScript.  
  * **Syfte:** Hanterar affärslogik, användarautentisering, databasinteraktioner och serverar data till frontend.  
* **Databas:**  
  * **System:** MongoDB (t.ex. via MongoDB Atlas).  
  * **Syfte:** Lagrar all persistent data såsom användare, frågor, test och resultat.  
* **Konfiguration & Miljövariabler:**  
  * All känslig information (databasanslutning, JWT-hemlighet, etc.) lagras som miljövariabler (ENV) i Netlify.

#### 

#### **2\. Datamodeller (MongoDB Collections)**

Här är förslag på datamodeller för att strukturera informationen i MongoDB.

**users collection:**

JSON

```

{
  "_id": "ObjectId",
  "username": "String", // Unikt
  "password": "String", // Hashed/krypterat
  "role": "String", // Enum: 'student', 'examinator', 'administrator'
  "createdAt": "Date",
  "archived": "Boolean", // För att arkivera studenter 
  "forcePasswordChange": "Boolean" // För att tvinga lösenordsbyte vid första inloggning
}

```

**subjects collection:**

JSON

```

{
  "_id": "ObjectId",
  "name": "String", // E.g., "Meteorologi"
  "code": "String", // E.g., "MET"
  "description": "String"
}

```

**questions collection:**

JSON

```

{
  "_id": "ObjectId",
  "subjectId": "ObjectId", // Referens till 'subjects'
  "questionText": "String", // Frågan
  "options": ["String", "String", "String", "String"], // Svarsalternativ (alltid 4)
  "correctOptionIndex": "Number" // Index (0-3) för rätt svar
}

```

**tests collection:**

* Representerar ett förberett och tilldelat prov.

JSON

```

{
  "_id": "ObjectId",
  "studentId": "ObjectId", // Student som ska göra provet 
  "subjectId": "ObjectId", // Ämnet som testas
  "questionIds": ["ObjectId"], // Array med 20 referenser till frågor [cite: 6]
  "status": "String", // Enum: 'pending', 'released', 'completed'
  "timeLimitMinutes": "Number", // Tidsgräns för provet [cite: 7, 25]
  "createdAt": "Date",
  "createdBy": "ObjectId" // Examinator som skapade provet
}

```

**test\_attempts collection:**

* Representerar en students försök att genomföra ett prov.

JSON

```

{
  "_id": "ObjectId",
  "testId": "ObjectId", // Vilket prov som gjordes
  "studentId": "ObjectId",
  "answers": [ // Användarens svar
    {
      "questionId": "ObjectId",
      "selectedOptionIndex": "Number", // -1 om obesvarad
      "isCorrect": "Boolean"
    }
  ],
  "startTime": "Date",
  "endTime": "Date",
  "score": "Number", // Antal rätta svar
  "passed": "Boolean", // Resultat
  "submittedAt": "Date"
}

```

#### 

#### **3\. API Endpoints (Backend \- Netlify Functions)**

Definierar kommunikationen mellan frontend och backend.

#### **3\. API Endpoints (Backend \- Netlify Functions)**

Definierar kommunikationen mellan frontend och backend.

* POST /api/auth/login  
  * **Body:** { username, password }  
  * **Svar:** { token, user: { username, role } }  
  * **Funktion:** Loggar in användare och returnerar en JWT.  
* GET /api/student/dashboard  
  * **Auth:** Student  
  * **Svar:** En lista över alla 9 ämnen med status för studenten (locked, available, passed).  
  * Exempel:  
     { subject: "Meteorologi", status: "available", attempts: 2, bestScore: "15/20" }   
* GET /api/tests/:testId/start  
  * **Auth:** Student  
  * **Svar:** { questions: \[...\], timeLimitMinutes }. Returnerar frågelistan (utan rätt svar) för ett "released" prov.  
* POST /api/tests/:testId/submit  
  * **Auth:** Student  
  * **Body:** { answers: \[{ questionId, selectedOptionIndex }\] }  
  * **Funktion:** Tar emot studentens svar, antingen via knapptryckning eller när tiden löpt ut. Rättar provet och lagrar resultatet i  
     test\_attempts.  
  * **Svar:** { results: \[...\], score, passed }. Returnerar det fullständiga rättningsprotokollet.  
* GET /api/examinator/students
  * **Auth:** Examinator
  * **Svar:** Lista över alla studenter. Kan filtreras med `?status=active` eller `?status=archived`.
* POST /api/examinator/students
  * **Auth:** Examinator
  * **Body:** { username }
  * **Svar:** { userId, username, tempPassword }
  * **Funktion:** Skapar en ny student med ett temporärt lösenord.
* PUT /api/examinator/students/:studentId/archive
  * **Auth:** Examinator
  * **Funktion:** Arkiverar en student.
* PUT /api/examinator/students/:studentId/reactivate
  * **Auth:** Examinator
  * **Funktion:** Återaktiverar en student.
* DELETE /api/examinator/students/:studentId
  * **Auth:** Examinator
  * **Funktion:** Tar bort en student permanent.
* PUT /api/student/change-password
  * **Auth:** Student
  * **Body:** { oldPassword, newPassword }
  * **Funktion:** Byter lösenord för den inloggade studenten.

#### 

#### **4\. Funktionella Krav (Uppdelat per Persona)**

Student

* **Inloggning & Dashboard:**  
  * Kan logga in med användarnamn och lösenord.  
  * Möts av en översikt som visar de nio ämnena.  
  * Kan se sin status per ämne (ännu ej påbörjad, underkänd, godkänd).  
  * Kan endast klicka på ämnen som examinatorn har gjort tillgängliga/släppt.  
  * Godkända prov är låsta och visar endast resultatet (t.ex. "GODKÄND, 19/20").  
* **Starta Prov:**  
  * En "Starta provet"-knapp finns för att påbörja testet.  
* **Genomföra Prov:**  
  * En nedräkningstimer är synlig uppe i högra hörnet.  
  * Timern ska blinka när 5 minuter återstår.  
  * Timern ska markeras (t.ex. röd bakgrund) när 1 minut återstår.  
  * En fråga i taget presenteras på skärmen.  
  * Användaren kan navigera fram och tillbaka mellan frågor.  
  * En progressbar med 20 streck visar status för varje fråga.  
  * Strecket blir grönt för besvarad fråga, rött för överhoppad (via "Nästa"-knappen utan att svara).  
  * Användaren kan klicka på ett streck för att hoppa direkt till den frågan.  
* **Avsluta Prov:**  
  * När alla frågor är besvarade (eller användaren navigerat till sista frågan) visas en "Skicka in"-knapp.  
  * Provet skickas in automatiskt när tiden löper ut, oavsett status.  
* **Resultat:**  
  * Efter inlämning visas en resultatsida.  
  * Sidan listar alla 20 frågor, det korrekta svaret, och markerar om studentens svar var rätt eller fel.

Examinator

* **Användarhantering:**  
  * Kan skapa nya student-användare.  
  * Kan arkivera studenter manuellt.  
* **Provförberedelse:**  
  * Kan välja en student för att se deras provhistorik (antal försök, status per ämne).  
  * Kan initiera skapandet av ett nytt prov för ett specifikt ämne för studenten.  
  * Systemet presenterar 20 slumpmässigt utvalda frågor för det valda ämnet.  
  * Har möjlighet att byta ut enskilda frågor via en "uppdatera"-knapp, som ersätter frågan med en ny slumpad.  
  * När examinatorn är nöjd med frågorna, skapas och tilldelas provet till studenten (status pending).  
* **Provövervakning:**  
  * Vid provtillfället kan examinatorn "släppa" provet (ändra status till  
     released), vilket gör det tillgängligt för studenten.  
  * Studenten ska inte kunna se provet innan det släppts.
* **Provgranskning:** 
  * Efter att studenten genomfört ett prov så ska examinatorn kunna kolla på det detaljerade resultatet, 
      i princip samma vy som studenten ser på sin resultatsida. 
  * Resultatsidan för examinatorn ska tala om ifall provet skickades in automatiskt eller av studenten.


Administrator

* Hanterar examinator-konton.  
* Har tillgång till back-office verktyg för databashantering.  
* Systemet ska automatiskt arkivera studenter som klarat alla nio delprov efter en viss tid.

TODO
Examinator, nytt krav:
* **Provgranskning:** 
  * Efter att studenten genomfört ett prov så ska examinatorn kunna kolla på det detaljerade resultatet, 
      i princip samma vy som studenten ser på sin resultatsida. 
  * Resultatsidan för examinatorn ska tala om ifall provet skickades in automatiskt eller av studenten.

