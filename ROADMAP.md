# Roadmap
## Overview
### Functionality
* Seed script to reset admin
* Seed initialize the system from scratch
* Use Google Auth to login
  -- Detailed requirements does not exist
* Add name and surname for students (Depends on Google Auth to login)
  -- Detailed requirements does not exist

### Improvements
* TBA

### Documentation
* Document system management
* Updated the README.md
* Create a owner and user manuals


## Detailed Description
### **Seed script to reset admin**

**Problem:** If the admin password is lost, there is no way to reset it.

#### **1.1 Create script to reset admin**
* In netlify/functions/src there are multiple supporting scripts, all started via netlify run 
  as per netlify/functions/paackage.json:

    Seed the system from start:
    "db:seed": "dotenv -e ../../.env ts-node src/seed.ts",
    
    Seed sample tests into the system
    "db:seed:tests": "dotenv -e ../../.env ts-node src/seed-tests.ts",
    
    Seed questions from a CSV into the system
    "db:seed:pof": "dotenv -e ../../.env ts-node src/seed-questions.ts src/data/flight_principles_questions_balanced_120.csv",
    
    Reset the user student to basics
    "db:reset:student": "dotenv -e ../../.env ts-node src/reset-student.ts"

  - Create a new script src/reset-admin.ts based on reset-student.ts that sets the password of the user "admin" to "password"
  - Add it to package.json as "db:reset:admin"

#### **1.2 Systemprocess**
* N/A

#### **1.3 Konfiguration**
* N/A

#### **1.4 API Endpoints (Backend)**
* N/A


### **Seed initialize the system from scratch**

**Problem:** If we have to set-up the system from scratch, we don't have a full srcipt for it.

#### **2.1 Create scrip to initalite the databases**
* In netlify/functions/src there are multiple supporting scripts, all started via netlify run 
  as per netlify/functions/paackage.json:

    Seed the system from start:
    "db:seed": "dotenv -e ../../.env ts-node src/seed.ts",
    
    Seed sample tests into the system
    "db:seed:tests": "dotenv -e ../../.env ts-node src/seed-tests.ts",
    
    Seed questions from a CSV into the system
    "db:seed:pof": "dotenv -e ../../.env ts-node src/seed-questions.ts src/data/flight_principles_questions_balanced_120.csv",
    
    Reset the user student to basics
    "db:reset:student": "dotenv -e ../../.env ts-node src/reset-student.ts"
  
  - Check so that the system is not already created, and if so stop the operation
  - Create a script src/intialize-system.ts based on seed.ts that:
    -- Creates a database called "flygprov"
    -- In that database, creates collections: questions, subjects, test_attempts, tests, users
    -- Populates the nine subjects, in collection "subjects", as per this list:
        LAW, Luftfartsrätt, Omfattar nationella och internationella luftfartsregler, 45 minuter
        AGK, Allmän luftfartygskunskap, Omfattar tekniska aspekter av luftfartyg och deras system, 35 minuter
        FPP, Genomförande och planering av flygningar, Omfattar planering och genomförande av flygningar inklusive ruttplanering och bränsleberäkningar, 95 minuter
        HPL, Människans prestationsförmåga, Omfattar fysiologiska och psykologiska faktorer som påverkar pilotens prestation, 30 minuter
        MET, Meteorologi, Omfattar väderfenomen och deras påverkan på flygning, 45 minuter
        NAV, Navigering, Omfattar principer och tekniker för flygnavigering, 65 minuter
        OPS, Operativa förfaranden, Omfattar rutiner och procedurer för säker flygning, 30 minuter
        POF, Flygningens grundprinciper, Omfattar aerodynamik och flygplans prestanda, 45 minuter
        COM, Kommunikation, Omfattar radiokommunikation och flygledningsprocedurer, 30 minuter
    -- Creates the user "admin" with password "password":

  - Add it to package.json as "db:initiatize:system"

### **Document system management**

**Problem:** The systemand its operation is not documented.

#### **3.1 Create documentation on system setup**
* Create SYSTEM_SETUP.md that documents the process on how to:
  - Set-up a MongoDb account and obtain the MONGO_URI
  - Set-up a Netlify account
  - Set-up a Github account
  - Clone the flyprov repository
  - Create Netllify project and connect it to Github
  - Configure the environment variables in Netlify:
  -- MONGO_URI
  -- JWT_SECRET 
  -- GRACE_PERIOD_DAYS 
  - Create a .env file from .env.example
  - Install Netlify CLI
  - Run the setup comment: npm run db:initiatize:system -w netlify/functions
  - Inform admin and default password
  - Login as admin to create examiners

#### **3.2 Create documentation on system setup**
* Create SYSTEM_OPERATION.md that documents the how to operate the system
    Seed the system from start (do not use):
    "db:seed": "dotenv -e ../../.env ts-node src/seed.ts",
    
    Seed sample tests into the system:
    "db:seed:tests": "dotenv -e ../../.env ts-node src/seed-tests.ts",
    
    Seed questions from a CSV into the system:
    "db:seed:pof": "dotenv -e ../../.env ts-node src/seed-questions.ts src/data/flight_principles_questions_balanced_120.csv",
    
    Reset the user student to basics:
    "db:reset:student": "dotenv -e ../../.env ts-node src/reset-student.ts"
    
    Reset the admin password:
    "db:reset:admin": "dotenv -e ../../.env ts-node src/reset-admin.ts"


### **Updated the README.md**

**Problem:** README.md is dated

#### **4.1 Update README.md**
* Based on the available sourcecode, updated the readme


### **Create a owner and user manuals**

**Problem:** There exist no user manual

#### **5.1 Create a OWNERS_MANUAL.md  that covers examiner and admin role**
* Based on the available sourcecode, create a onwers manual

#### **5.2 Create a USER_MANUAL.md  that covers student role**
* Based on the available sourcecode, create a user manual
