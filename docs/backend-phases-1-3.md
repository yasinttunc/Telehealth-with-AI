# Backend Roadmap: Phases 1-3

This guide covers the first three backend phases for the AI-Integrated Telehealth Web Application.

The goal of these phases is to turn the current early Spring Boot project into a clean, runnable backend foundation. By the end of Phase 3, the backend should have the correct project structure, required dependencies, environment-based configuration, and a database/test setup that supports the rest of the project.

## Phase 1: Backend Project Cleanup

### Objective

Move the project from a prototype layout into a normal Spring Boot backend structure.

At the moment, the most important issue is that many real application classes are inside `src/test/java`. That folder is only for test code. Classes such as controllers, services, repositories, and entities must live inside `src/main/java` so they are compiled into the actual application.

### Target Structure

Use this structure if the repository remains a single backend project:

```text
Telehealth_With_AI/
  pom.xml
  mvnw
  mvnw.cmd
  src/
    main/
      java/
        com/project/ibm/telehealth_with_ai/
          TelehealthWithAiApplication.java
          config/
          controller/
          dto/
          exception/
          mapper/
          model/
          repository/
          security/
          service/
          client/
      resources/
        application.yml
        db/
          migration/
    test/
      java/
        com/project/ibm/telehealth_with_ai/
          controller/
          service/
          repository/
```

Use this structure if you later convert the repository into a monorepo:

```text
Telehealth_With_AI/
  backend/
    pom.xml
    src/
      main/
      test/
  ai-service/
  research/
  frontend/
  infra/
  docs/
```

For now, the simplest option is to keep the Spring Boot backend at the repository root and add folders gradually.

### Task 1.1: Create Backend Packages

Create these packages under:

```text
src/main/java/com/project/ibm/telehealth_with_ai/
```

Checklist:

- [ ] Create `config`
- [ ] Create `controller`
- [ ] Create `dto`
- [ ] Create `exception`
- [ ] Create `mapper`
- [ ] Create `model`
- [ ] Create `repository`
- [ ] Create `security`
- [ ] Create `service`
- [ ] Create `client`

What each package is for:

```text
config      Spring configuration classes
controller  REST API endpoints
dto         Request and response objects
exception   Custom exceptions and global error handling
mapper      Converts entities to DTOs and DTOs to entities
model       JPA entities and enums
repository  Spring Data JPA repositories
security    JWT, filters, user details, security rules
service     Business logic
client      External service clients, such as FastAPI AI client
```

Example package:

```java
package com.project.ibm.telehealth_with_ai.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public String health() {
        return "OK";
    }
}
```

This is only an example. Later, Actuator will provide better health endpoints.

### Task 1.2: Move Real Code From `src/test/java` To `src/main/java`

Current problem:

```text
src/test/java/com/project/ibm/telehealth_with_ai/controller/
src/test/java/com/project/ibm/telehealth_with_ai/model/
src/test/java/com/project/ibm/telehealth_with_ai/repository/
src/test/java/com/project/ibm/telehealth_with_ai/service/
```

These are application classes, not tests.

Move them to:

```text
src/main/java/com/project/ibm/telehealth_with_ai/controller/
src/main/java/com/project/ibm/telehealth_with_ai/model/
src/main/java/com/project/ibm/telehealth_with_ai/repository/
src/main/java/com/project/ibm/telehealth_with_ai/service/
```

Checklist:

- [ ] Move controllers into `src/main/java/.../controller`
- [ ] Move models/entities into `src/main/java/.../model`
- [ ] Move repositories into `src/main/java/.../repository`
- [ ] Move services into `src/main/java/.../service`
- [ ] Leave `TelehealthWithAiApplicationTests.java` inside `src/test/java`
- [ ] Do not keep duplicate copies in both places

Why this matters:

Spring Boot scans the package of `TelehealthWithAiApplication` and its subpackages. Production classes in `src/test/java` are only compiled during tests and should not be part of the deployable application.

### Task 1.3: Clean Up Naming

Your blueprint uses `CLINICIAN`, `ADMIN`, and `PATIENT`. The current code uses `Doctor`.

You can choose either:

- Use `Doctor` everywhere
- Use `Clinician` everywhere

Recommended choice: use `Clinician`, because it matches the research/project language better.

Checklist:

- [ ] Decide between `Doctor` and `Clinician`
- [ ] Use one term consistently in classes, URLs, DTOs, and dissertation
- [ ] If renaming, rename:
  - `Doctor.java` to `Clinician.java`
  - `DoctorRepository` to `ClinicianRepository`
  - `DoctorService` to `ClinicianService`
  - `DoctorController` to `ClinicianController`

Example:

```java
public enum Role {
    PATIENT,
    CLINICIAN,
    ADMIN
}
```

### Task 1.4: Keep Tests In The Test Folder

Only test files should remain under:

```text
src/test/java
```

Examples of valid test classes:

```text
TelehealthWithAiApplicationTests.java
PatientServiceTest.java
PatientControllerTest.java
PatientRepositoryTest.java
```

Example test:

```java
package com.project.ibm.telehealth_with_ai;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class TelehealthWithAiApplicationTests {

    @Test
    void contextLoads() {
    }
}
```

### Task 1.5: Confirm The App Compiles

Run:

```bash
./mvnw -q -DskipTests compile
```

Expected result:

```text
No output and exit code 0
```

If it fails, fix compile errors before moving forward.

Common errors after moving files:

```text
Cannot find symbol
Package does not exist
Duplicate class
```

What to do:

- [ ] Check package declarations at the top of each Java file
- [ ] Make sure the folder path matches the package name
- [ ] Remove duplicate copies from `src/test/java`
- [ ] Fix imports after renaming classes

### Phase 1 Definition Of Done

Phase 1 is complete when:

- [ ] Real backend code is under `src/main/java`
- [ ] `src/test/java` contains only tests
- [ ] Packages are clearly separated
- [ ] Naming is consistent
- [ ] `./mvnw -q -DskipTests compile` succeeds

## Phase 2: Maven Dependencies

### Objective

Make sure the backend has the correct dependencies for a secure REST API with PostgreSQL, JPA, validation, migrations, testing, documentation, and AI-service resilience.

### Task 2.1: Use API-Appropriate Starters

For an API backend, the core dependencies should be:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

What each one does:

```text
spring-boot-starter-web         REST controllers, JSON, HTTP server
spring-boot-starter-data-jpa    JPA entities, repositories, transactions
spring-boot-starter-security    authentication and authorization
spring-boot-starter-validation  request validation using annotations
```

Checklist:

- [ ] Add `spring-boot-starter-web`
- [ ] Add `spring-boot-starter-data-jpa`
- [ ] Add `spring-boot-starter-security`
- [ ] Add `spring-boot-starter-validation`
- [ ] Remove Thymeleaf unless you plan server-rendered pages

Current note:

If your project currently uses `spring-boot-starter-webmvc`, consider replacing it with the standard `spring-boot-starter-web` unless there is a specific reason to use the newer separated WebMVC starter.

### Task 2.2: Add PostgreSQL And Flyway

PostgreSQL will be the production database. Flyway will manage schema migrations.

Add:

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>

<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

Why Flyway matters:

Without migrations, your database schema can silently drift away from your entity classes. For a dissertation project, Flyway is also good evidence that the system is reproducible.

Checklist:

- [ ] Add PostgreSQL driver
- [ ] Add Flyway core
- [ ] Add Flyway PostgreSQL support
- [ ] Create `src/main/resources/db/migration`
- [ ] Add your first migration later as `V1__initial_schema.sql`

### Task 2.3: Add Actuator

Actuator provides operational endpoints such as health checks.

Add:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Useful endpoint:

```text
GET /actuator/health
```

Checklist:

- [ ] Add Actuator dependency
- [ ] Expose health endpoint in config
- [ ] Use it later in Docker Compose health checks

### Task 2.4: Add OpenAPI/Swagger

Swagger helps you document and manually test the API.

Add:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.13</version>
</dependency>
```

Common URL after the app starts:

```text
http://localhost:8080/swagger-ui/index.html
```

Checklist:

- [ ] Add Springdoc OpenAPI dependency
- [ ] Confirm Swagger UI loads
- [ ] Keep endpoint names clean and REST-like

### Task 2.5: Add JWT Dependencies

JWT will support stateless login.

Add:

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>

<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>

<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

Checklist:

- [ ] Add JWT API dependency
- [ ] Add JWT runtime implementation
- [ ] Add JWT Jackson integration
- [ ] Store JWT secret in `.env`, not in Git

### Task 2.6: Add Resilience4j

Resilience4j protects the backend when the FastAPI AI service is slow or unavailable.

Add:

```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
    <version>2.3.0</version>
</dependency>
```

You will use it later for:

- timeout
- retry
- circuit breaker
- fallback when AI extraction fails

Checklist:

- [ ] Add Resilience4j dependency
- [ ] Add config later in `application.yml`
- [ ] Wrap the FastAPI extraction client later

### Task 2.7: Add Test Dependencies

Recommended test dependencies:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

What they are for:

```text
spring-boot-starter-test  JUnit, assertions, Spring test tools, Mockito
spring-security-test      Testing secured endpoints and mock users
testcontainers            Running real PostgreSQL during integration tests
```

Checklist:

- [ ] Add Spring Boot test starter
- [ ] Add Spring Security test
- [ ] Add Testcontainers JUnit
- [ ] Add Testcontainers PostgreSQL

### Task 2.8: Remove Unused Dependencies

If the backend is REST-only, remove:

```xml
spring-boot-starter-thymeleaf
thymeleaf-extras-springsecurity6
spring-boot-starter-thymeleaf-test
```

Keep them only if you are building server-rendered pages with Thymeleaf.

Checklist:

- [ ] Decide whether the backend serves HTML or only JSON
- [ ] Remove unused UI/template dependencies
- [ ] Keep the dependency tree simple

### Example `pom.xml` Dependency Block

This is an example. Versions managed by Spring Boot do not always need explicit version numbers.

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>

    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-database-postgresql</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.8.13</version>
    </dependency>

    <dependency>
        <groupId>io.github.resilience4j</groupId>
        <artifactId>resilience4j-spring-boot3</artifactId>
        <version>2.3.0</version>
    </dependency>

    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.6</version>
    </dependency>

    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>

    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Task 2.9: Validate Dependencies

Run:

```bash
./mvnw -q -DskipTests compile
```

Then run:

```bash
./mvnw -q test
```

At this stage, tests may still fail if database config is not complete. That is expected until Phase 3 is finished.

### Phase 2 Definition Of Done

Phase 2 is complete when:

- [ ] `pom.xml` contains the required backend dependencies
- [ ] Unused Thymeleaf dependencies are removed if API-only
- [ ] Maven compile succeeds
- [ ] Dependency choices match the backend architecture

## Phase 3: Configuration

### Objective

Replace minimal properties with a real environment-based configuration.

The backend needs to know:

- what database to connect to
- how JPA should behave
- where Flyway migrations live
- what port to run on
- how JWT tokens are configured
- where the FastAPI AI service is located
- which Actuator endpoints are exposed
- how Resilience4j should handle AI failure

### Task 3.1: Replace `application.properties` With `application.yml`

Current file:

```text
src/main/resources/application.properties
```

Recommended replacement:

```text
src/main/resources/application.yml
```

Why YAML:

YAML is easier to read for nested configuration such as `spring.datasource`, `app.jwt`, and `resilience4j`.

Checklist:

- [ ] Create `application.yml`
- [ ] Move `spring.application.name` into YAML
- [ ] Delete `application.properties` after confirming YAML works

Example:

```yaml
spring:
  application:
    name: telehealth-with-ai
```

### Task 3.2: Configure PostgreSQL

Add:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/telehealth}
    username: ${DB_USERNAME:telehealth}
    password: ${DB_PASSWORD:telehealth}
```

Explanation:

```text
${DB_URL:...} means:
Use DB_URL from the environment if it exists.
Otherwise, use jdbc:postgresql://localhost:5432/telehealth.
```

Checklist:

- [ ] Use environment variables
- [ ] Provide local defaults for development
- [ ] Do not hard-code real passwords
- [ ] Make sure `.env` is ignored by Git

Example local `.env`:

```bash
DB_URL=jdbc:postgresql://localhost:5432/telehealth
DB_USERNAME=telehealth
DB_PASSWORD=telehealth
JWT_SECRET=replace-this-with-a-long-random-secret
AI_SERVICE_BASE_URL=http://localhost:8000
```

Do not commit `.env`.

### Task 3.3: Configure JPA

Add:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        format_sql: true
```

Explanation:

```text
ddl-auto: validate
  Hibernate checks that entities match the database schema.
  It does not create or modify tables automatically.

open-in-view: false
  Prevents lazy database access during JSON rendering.
  This encourages clean service-layer transaction boundaries.

format_sql: true
  Makes SQL easier to read during debugging.
```

Checklist:

- [ ] Use `validate`, not `update`, for dissertation-quality reproducibility
- [ ] Disable `open-in-view`
- [ ] Keep schema changes in Flyway migrations

### Task 3.4: Configure Flyway

Add:

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
```

Then create:

```text
src/main/resources/db/migration/
```

Example migration name:

```text
V1__initial_schema.sql
```

Flyway naming rules:

```text
V1__initial_schema.sql
V2__add_alert_table.sql
V3__add_refresh_tokens.sql
```

Important:

There are two underscores between the version and the description.

Checklist:

- [ ] Create migration directory
- [ ] Add Flyway config
- [ ] Use one migration per meaningful schema change
- [ ] Never edit a migration after it has been shared or applied by someone else

### Task 3.5: Configure Server Port

Add:

```yaml
server:
  port: ${SERVER_PORT:8080}
```

Checklist:

- [ ] Use port `8080` locally
- [ ] Allow override through environment variable

### Task 3.6: Configure JWT Settings

Add:

```yaml
app:
  jwt:
    secret: ${JWT_SECRET}
    access-token-minutes: ${JWT_ACCESS_TOKEN_MINUTES:15}
    refresh-token-days: ${JWT_REFRESH_TOKEN_DAYS:7}
```

Explanation:

```text
secret:
  Used to sign JWTs.
  Must be long, random, and private.

access-token-minutes:
  Short lifetime for access tokens.

refresh-token-days:
  Longer lifetime for refresh tokens.
```

Checklist:

- [ ] Never commit real JWT secret
- [ ] Use a long random secret
- [ ] Keep access tokens short-lived
- [ ] Store refresh tokens hashed later in the database

Example secret generation:

```bash
openssl rand -base64 64
```

### Task 3.7: Configure AI Service URL

Add:

```yaml
app:
  ai-service:
    base-url: ${AI_SERVICE_BASE_URL:http://localhost:8000}
    timeout-ms: ${AI_SERVICE_TIMEOUT_MS:5000}
```

Explanation:

The Spring backend should not hard-code the FastAPI address. In development, FastAPI may run at `http://localhost:8000`. In Docker Compose, it may run at something like `http://ai-service:8000`.

Checklist:

- [ ] Use config for AI service base URL
- [ ] Use config for timeout
- [ ] Make the AI service swappable without code changes

### Task 3.8: Configure Actuator

Add:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when_authorized
```

Checklist:

- [ ] Expose health endpoint
- [ ] Avoid exposing every Actuator endpoint publicly
- [ ] Use health endpoint later for Docker checks

### Task 3.9: Configure Resilience4j

Add:

```yaml
resilience4j:
  circuitbreaker:
    instances:
      aiExtraction:
        sliding-window-size: 10
        minimum-number-of-calls: 5
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s

  retry:
    instances:
      aiExtraction:
        max-attempts: 3
        wait-duration: 500ms
```

Explanation:

```text
circuitbreaker:
  Stops repeatedly calling the AI service when it keeps failing.

retry:
  Retries temporary failures before falling back.
```

Checklist:

- [ ] Add circuit breaker config
- [ ] Add retry config
- [ ] Use the same name later in code: `aiExtraction`
- [ ] Test AI failure path later

### Task 3.10: Create `.env.example`

Create:

```text
.env.example
```

Example:

```bash
DB_URL=jdbc:postgresql://localhost:5432/telehealth
DB_USERNAME=telehealth
DB_PASSWORD=telehealth
JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_TOKEN_MINUTES=15
JWT_REFRESH_TOKEN_DAYS=7
AI_SERVICE_BASE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=5000
SERVER_PORT=8080
```

Checklist:

- [ ] Commit `.env.example`
- [ ] Do not commit `.env`
- [ ] Make sure `.gitignore` includes `.env`

### Task 3.11: Add Test Configuration

Create:

```text
src/test/resources/application-test.yml
```

Option A: Testcontainers PostgreSQL.

Use this when you want the most realistic database tests. This is recommended for later integration tests.

Option B: H2 database.

Use this when you want quick early tests, but remember H2 is not identical to PostgreSQL, especially for JSONB.

Recommended for this project:

Use Testcontainers for repository/integration tests because your project depends on PostgreSQL JSONB.

Example test properties:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
```

Checklist:

- [ ] Create `src/test/resources`
- [ ] Create `application-test.yml`
- [ ] Use a separate test profile
- [ ] Do not connect tests to the development database

### Complete Example `application.yml`

```yaml
spring:
  application:
    name: telehealth-with-ai

  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/telehealth}
    username: ${DB_USERNAME:telehealth}
    password: ${DB_PASSWORD:telehealth}

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        format_sql: true

  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: ${SERVER_PORT:8080}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when_authorized

app:
  jwt:
    secret: ${JWT_SECRET}
    access-token-minutes: ${JWT_ACCESS_TOKEN_MINUTES:15}
    refresh-token-days: ${JWT_REFRESH_TOKEN_DAYS:7}

  ai-service:
    base-url: ${AI_SERVICE_BASE_URL:http://localhost:8000}
    timeout-ms: ${AI_SERVICE_TIMEOUT_MS:5000}

resilience4j:
  circuitbreaker:
    instances:
      aiExtraction:
        sliding-window-size: 10
        minimum-number-of-calls: 5
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s

  retry:
    instances:
      aiExtraction:
        max-attempts: 3
        wait-duration: 500ms
```

### Task 3.12: Validate Configuration

Run:

```bash
./mvnw -q -DskipTests compile
```

Then, once database settings are ready:

```bash
./mvnw test
```

If tests fail with:

```text
Failed to determine a suitable driver class
```

Then Spring cannot find a valid datasource configuration or database driver.

Fix by checking:

- [ ] PostgreSQL dependency exists
- [ ] `spring.datasource.url` is set
- [ ] `spring.datasource.username` is set
- [ ] `spring.datasource.password` is set
- [ ] Test profile is not missing database config

If tests fail with:

```text
Connection refused
```

Then PostgreSQL is not running at the configured address.

Fix by:

- [ ] Starting PostgreSQL
- [ ] Correcting `DB_URL`
- [ ] Using Testcontainers for tests

### Phase 3 Definition Of Done

Phase 3 is complete when:

- [ ] `application.yml` exists
- [ ] Database settings are environment-based
- [ ] JPA uses `ddl-auto: validate`
- [ ] Flyway is enabled
- [ ] JWT settings are configured without committing secrets
- [ ] AI service URL is configurable
- [ ] Actuator health is configured
- [ ] Resilience4j settings are present
- [ ] `.env.example` exists
- [ ] Test config exists
- [ ] Backend can compile successfully

## Combined Phase 1-3 Completion Checklist

- [ ] Application code lives in `src/main/java`
- [ ] Test code lives in `src/test/java`
- [ ] Package structure is clean
- [ ] Naming is consistent
- [ ] `pom.xml` includes backend dependencies
- [ ] Unused dependencies are removed
- [ ] `application.yml` replaces `application.properties`
- [ ] PostgreSQL config is present
- [ ] Flyway config is present
- [ ] JWT config is present
- [ ] AI service config is present
- [ ] Actuator config is present
- [ ] Resilience4j config is present
- [ ] `.env.example` exists
- [ ] `.env` is ignored
- [ ] `./mvnw -q -DskipTests compile` succeeds

## Recommended Next File After This

After Phases 1-3, create a second guide for:

```text
docs/backend-phases-4-6.md
```

That guide should cover:

- Flyway schema design
- entity implementation
- DTOs
- repositories
- service layer
- controller layer
- validation
- error handling

