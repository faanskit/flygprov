### **3. Administratör:**

**Problem:** Det finns inget sätt för en administratör att hantera systemet.

#### **3.1 Funktionella Krav**
* En inloggad administratör ska kunna skapa, se en lista över, arkivera och återaktivera examinator-konton. 
  Logiken ska vara nästan identisk med hur en examinator hanterar studenter.
* En inloggad administratör ska kunna skapa, se en lista över, arkivera och återaktivera student-konton. 
  Logiken ska vara nästan identisk med hur en examinator hanterar studenter. Kanske samma.
* En inloggad administratör ska kunna se och managera ämnen i ämnesdatabasendatabasen.
* En inloggad administratör ska kunna se och managera innehållet i frågedatabasen.
- Frågor ska kunna läggas till
- Frågor ska kunna editeras
- Man ska kunna sätta vilket svar som är rätt.
- Frågor ska kunna enablas och disablas
- En typisk fråga i databasen ser ut sä här:
    {
    "_id": {
        "$oid": "689ca855ba3a40b9f945a811"
    },
    "subjectId": {
        "$oid": "6899d97e50b663a38b1e6d1e"
    },
    "questionText": "Vilken kraft motverkar lyftkraften hos ett flygplan?",
    "options": [
        "Dragkraft",
        "Tyngdkraft - rätt svar",
        "Sidokraft",
        "Framåtkraft"
    ],
    "correctOptionIndex": 1,
    "active": true
    }
* Hantering av frågor ska ske per Ämne då databasen är ganska stor. Total mellan 2000-5000 frågor kommer den vara.
* Man ska kunna filtrera frågorna som visas så man enkelt kan söka efter frågor
* Import av frågor från CSV fil
- Man ska kunna importera frågor till databasen enl detta CSV format:
  code,question,option_1,option_2,option_3,option_4,correct_option, active (optional)
  POF,"Vad är den primära kraften som lyfter ett flygplan?","Dragkraft","Lyftkraft","Tyngdkraft","Sidokraft",2, true
  POF,"Vilken av Newtons lagar förklarar varför ett flygplan kan flyga framåt?","Första lagen","Andra lagen","Tredje lagen","Fjärde lagen",3, false
  POF,"Vad kallas vinkeln mellan vingens korda och den relativa luftströmmen?","Anfallsvinkel","Glidvinkel","Rullvinkel","Givinkel",1
- Om active fältet utlämnas antas det som active = true
- Innan en fråga importeras så måste den kollas så den inte redan finns. Det räcker att kolla mot code och question exakt matchning.

#### **3.2 Design och Användarflöde (UI/UX)**
#### **3.2.1 Design och Användarflöde (UI/UX) Hantera Examinatorer**
* Administratörens gränssnitt ska ha en vy för "Hantera Examinatorer".
* Vyn ska innehålla en lista över alla examinatorer och en knapp för att "+ Skapa ny examinator".
* Processen för att skapa och arkivera ska följa samma mönster som för studenthantering.
* Processen för att skapa och arkivera ska följa samma mönster som för studenthantering.
#### **3.2.2 Design och Användarflöde (UI/UX) Hantera Stundeter**
* Administratörens gränssnitt ska ha en vy för "Hantera Stundenter".
* Processen för att skapa och arkivera ska följa samma mönster som för examinatorn.
#### **3.2.3 Design och Användarflöde (UI/UX) Hantering Ämnen**
* Administratörens gränssnitt ska ha en vy för "Hantera Ämnen".
  I denna vy ska man kunna lista och lägga till ämnen. 
  Exempel dokument om ett ämne 
    {
    "_id": {
        "$oid": "6899d97e50b663a38b1e6d1e"
    },
    "name": "Flygningens grundprinciper",
    "code": "POF",
    "description": "Fokuserar på aerodynamik.",
    "defaultTimeLimitMinutes": 60
    }
* Om administratören tar bort ett ämne så ska detta bekräftas, tydligt, och alla frågor kopplade till ämnet ska tas bort.

#### **3.2.4 Design och Användarflöde (UI/UX) Hantering Frågor**
* Denna vy ska man kunna enkelt välja vilket ämne man vill titta på. Ämnen kommer från ämnesdatabasen.
* När man valt ett ämne ska man se frågorna i databasen i en lista
* Man ska kunna filtrera genom fritext
* Man ska kunna aktivera och deaktivera en fråga.

#### **3.2.4 Design och Användarflöde (UI/UX) Import**
* Adminstratören ska ha ett sätt att importera frågor till databasen.
* Adminstratören väljer en CSV fil enl. ett viss format och denna analyseras.
* Efter analysen så presenteras denna för Adminstratören som ska bekräfta innan import får ske.
* Analysen ska visa hur många nya frågor som kommer läsas in och hur många som kommer att skippas då de är duplikat


#### **3.3 API Endpoints (Backend)**
* Utveckla relevanta enpoints enl. samma mönster som befintliga