Medication Reminder App
This project is a Medication Reminder application with two parts:

Spring Boot Backend
A REST API server to manage medications. It stores medications and their doses, and exposes endpoints to add, list, update, and delete medications.

JavaFX Frontend
A graphical user interface built with JavaFX that allows users to add medications and set reminders. It connects to the backend to save and retrieve medication data dynamically.

Features
Add new medications with name and dose.

View the list of all medications fetched from the backend.

Set reminders for medications (JavaFX timer notifications).

Backend API supports adding and listing medications with REST endpoints.

Getting Started:


Prerequisites
Java 17 or newer

Maven 3.x

Internet connection to download dependencies

Running the Backend
Open terminal/PowerShell in the project directory containing the backend (where pom.xml is).

Run the backend with:
mvn spring-boot:run
Backend starts on http://localhost:8080.

API endpoints:

GET /api/medications — List all medications

POST /api/medications — Add a new medication (send JSON with name and dose)

Running the Frontend
Open terminal/PowerShell in the project directory.

Run the JavaFX app with Maven:
mvn javafx:run

The JavaFX window will open, allowing you to add medications and set reminders.

How They Work Together
The JavaFX frontend communicates with the Spring Boot backend via HTTP requests.

When you add a medication in the frontend, it sends a POST request to the backend.

The frontend fetches the list of medications from the backend and displays them.

The backend manages the medication data in-memory (you can extend it to use a database).

Future Improvements
Add update and delete medication endpoints in the backend.

Persist medications in a database.

Improve frontend UI with better styling and validation.

Add user authentication.

Technologies Used
Java 17

Spring Boot 3.5.4

JavaFX 21

Maven for build and dependency management

License
This project is open source and available under the MIT License.

