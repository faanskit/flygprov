### BACKGROUND  
Kalmar flygklubb offers theory training for LAPL and PPL students. The theory comprises nine different areas and each area is concluded with a formal test at Transportstyrelsen. In total the student will have to pass nine tests at Transportstyrelsen before he is approved.
Before a student is allowed to perform the test at Transportstyrelsen, a pre-tests is performed. The student will, for each study section, have to pass a 20 question long multiple choice test where each question have four choices.
The pre-test is supervised by the instructor and is time-bound. Each area has different time allocated for the tests.

### THE TASK  
The task is to develop the pre-test application.

### QUESTIONS  
In total there are 3500 questions available divided over the nine areas, so ca. 200-400 questions available for each area.
The areas are:
Luftfartsrätt och bestämmelser (Air Law): Omfattar nationella och internationella luftfartsregler, inklusive lufttrafikregler och procedurer.
1.	Allmän flygplanslära (Aircraft General Knowledge): Behandlar flygplanets konstruktion, system, instrument och motorer.
2.	Flygningens grundprinciper (Principles of Flight): Fokuserar på aerodynamik, det vill säga hur och varför ett flygplan kan flyga.
3.	Prestanda och färdplanering (Flight Performance and Planning): Inkluderar beräkningar av start- och landningssträckor, bränsleplanering och hur man sammanställer en färdplan.
4.	Människans prestationsförmåga och begränsningar (Human Performance and Limitations): Tar upp de fysiologiska och psykologiska aspekterna av flygning och hur de kan påverka en pilot.
5.	Meteorologi (Meteorology): Ger kunskap om väderfenomen, hur man tolkar väderprognoser och farliga väderförhållanden för flygning.
6.	Navigation: Omfattar metoder för att bestämma ett flygplans position och planera en rutt, inklusive användning av kartor och navigationshjälpmedel.
7.	Operativa procedurer (Operational Procedures): Behandlar de standardprocedurer som används under olika faser av en flygning, inklusive nödförfaranden.
8.	Kommunikation (Communications): Fokuserar på fraseologi och procedurer för radiokommunikation med flygtrafikledningen och andra flygplan.

### THE TEST WORKFLOW  
The user signs in with his pre-provided credentials (username and password) and is greeted with an instruction and an overview of his performance of the nine areas.  
The user can only select areas that are made available for him by the instructor and previously passed tests are locked and only the result is shown (E.g.PASSED, 19 / 20 was correct)
The user then selects the area he shall perform the tests in and is provided with a simple screen with a short instruction, like “Detta prov täcker området METEORLOLOGI. Det består av 20 frågor och du behöver tillgång till följande material: Penna, papper, dokument X, dokument y). Du har 30 minuter på dig att klara provet”. In addition, there is a button called "Starta provet”.
When the user presses the start button, the test starts. On the top right of the screen, there will be a timer counting down. When there is 5 minutes left, that timer will flash and where there is only one minute left the timer will be highlighted for the user.  
The user will be presented with 20 multiple choice questions, one per page. He will be able to move back and forth between the questions.
There will be a dashed line that shows progress like this
BACK  – – – – – – – – – – – – – – – – – – – – NEXT
Each dash represents a question and initially each dash is in a neutral color. When the user progresses the tests using the next button, the dash will either become green representing that the question was answered or red representing that the user skipped the question.  
The user shall be able to move back and forth and go directly to a question clicking the corresponding dash.
Upon completion of all the questions a submit button will be presented “Skicka in”. When the user is ready, he will press that button.  
Irrespective of status, when the allocated time has elapsed, the test will be automatically submitted.

### THE TEST EVALUATION  
Upon submission of the tests, the test will be graded and presented to the user. On a single page the question and the correct answer will be presented to the user and whether he is correct or not.

### TEST PREPARATION  
The test administrator starts the preparation of a new test by selecting the student that shall undergo the test and selects an area that shall be tested. This can either be the first test in an area for a student, or a repeat test for an area that was flunked.
The test admin will upon selecting a student get an overview of the performance of the student and the number of attempts made per area. T,ex.  
Område	FÖRSÖK	STATUS	ACTION  
Flygplanet	1		OK  
Meteorlogi	2		EJ OK		SKAPA PROV  
Human fact.	0				SKAPA PROV  
…
When the test admin presses the SKAPA PROV button, he will be presented with the 20 questions that are selected by the system randomly. He will have the possibility to replace questions, one by one, by pressing a button (with a refresh icon). Upon pressing the refresh button, a new random question replaces the current one.
When he is satisfied with the 20 questions he can create the test and pre-allocate that test to the specific user.

### TEST EXECUTION  
When its time for the student to perform the test. The test administrator will release the tests to the student, which will be performed supervised. The student shall not have access to the tests prior to the release of the test.

### USER ADMINISTRATION  
The system offers the possibility to create new students and to archive students, either manually or automatically. A student that has passed all the test shall be archived automatically after a grace period.

### PERSONAS  
Student - A user that undergoes theory training and performs pre-tests  
Examiniator - A user that prepares and allocates tests to a user. The examinator also creates new users (students) and archives them.  
Administrator - The system administrator that manages examinators and have back-office tools to manage the database.