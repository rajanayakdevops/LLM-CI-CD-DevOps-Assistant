# LLM-Powered DevOps Assistant

A Spring Boot app that connects to your Jenkins instance, pulls build logs, and runs them through Gemini AI to tell you what broke and how to fix it. Results get saved to MySQL so you have a history of past builds and their analyses.

## How it works

You hit the API with a job name → it fetches the latest build logs from Jenkins → sends them to Gemini 2.5 Flash → returns a plain-English explanation of the failure + a suggested fix. Everything gets stored in MySQL so you can look back at previous builds.

## Stack

- Java 21 + Spring Boot 3.2.5
- Spring Data JPA + MySQL
- Apache HttpClient (Jenkins API calls)
- Google Gemini 2.5 Flash (AI analysis)
- Thymeleaf (simple frontend at `/`)

## Project structure

```
src/main/java/.../
├── controller/
│   ├── JenkinsController.java   ← REST endpoints
│   └── HomeController.java
├── service/
│   ├── JenkinsService.java      ← Jenkins API + DB logic
│   └── LLMService.java          ← Gemini AI calls
├── model/
│   └── Build.java               ← JPA entity
├── repository/
│   └── BuildRepository.java
└── config/
    └── SecurityConfig.java
```

## Setup

### Prerequisites
- Java 21
- Maven
- MySQL running locally
- Jenkins instance with API token
- Gemini API key

### 1. Create the database

```sql
CREATE DATABASE test;
```

### 2. Configure environment

Create `src/main/resources/application.properties` (don't commit this):

```properties
spring.application.name=LLM-Powered-Assistant
server.port=8081

spring.datasource.url=jdbc:mysql://localhost:3306/test
spring.datasource.username=your_mysql_user
spring.datasource.password=your_mysql_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.hibernate.ddl-auto=update

jenkins.base.url=http://localhost:8080
jenkins.user=your_jenkins_user
jenkins.token=your_jenkins_api_token

gemini.api.key=your_gemini_api_key
```

### 3. Run

```bash
mvn spring-boot:run
```

App starts on `http://localhost:8081`

## API endpoints

| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | `/api/jobs` | Lists all Jenkins job names |
| GET | `/api/logs?job=<jobName>` | Fetches latest build logs for a job |
| POST | `/api/analyze` | Sends logs to Gemini, returns analysis |
| GET | `/api/history?job=<jobName>` | Last 5 builds from DB |

### Example — analyze a build

```bash
curl -X POST http://localhost:8081/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"logs": "...", "jobName": "my-job", "buildNumber": 42}'
```

Response is plain text — what went wrong and how to fix it.

## UI

There's a basic HTML page at `http://localhost:8081` where you can paste logs and hit Analyze. Nothing fancy, just for quick testing.

## Known issue

The frontend currently calls `/api/jenkins/analyze` but the controller maps to `/api/analyze` — so the button on the UI won't work until that's fixed in `index.html`.

## Notes

- `spring.jpa.hibernate.ddl-auto=update` will auto-create the `builds` table on first run
- Logs and AI analysis are stored as `LONGTEXT` in MySQL — handles large build outputs fine
- CSRF is disabled since this is an internal tool — don't expose it publicly as-is
