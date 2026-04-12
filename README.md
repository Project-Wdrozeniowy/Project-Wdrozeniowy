# 🚀 Project Name

## 📌 Overview

This project is a **full-stack monorepo** consisting of:

* Frontend built with Next.js (React)
* Backend built with Spring Boot (Java)
* API Gateway built with Node.js

The architecture separates concerns between UI, business logic, and request routing.

---

## 🏗️ Monorepo Structure

```
/frontend   → Next.js application (React-based UI)
/backend    → Spring Boot REST API (Java)
/gateway    → Node.js API Gateway (Express)
```

---

## ⚙️ Tech Stack

### Frontend

* Next.js
* React
* Tailwind CSS

### Backend

* Spring Boot
* Spring Web
* Spring Data JPA
* Maven

### Gateway

* Node.js
* Express

---

## 🚀 Getting Started

### 1. Clone the repository

```
git clone https://github.com/Dzmitry-Voronka/Project-Wdrozeniowy.git
cd project-name
```

---

## ▶️ Run Frontend

```
cd frontend
npm install
npm run dev
```

Runs on: http://localhost:3000

---

## ▶️ Run Backend

```
cd backend
./mvnw spring-boot:run
```

Runs on: http://localhost:8080

---

## ▶️ Run Gateway

```
cd gateway
npm install
node index.js
```

Runs on: http://localhost:3001 (example)

---

## 🔀 Git Workflow

We follow a simplified Git Flow strategy:

* `main` → production-ready code
* `develop` → integration branch
* `feature/*` → feature branches

### Example:

```
git checkout develop
git checkout -b feature/login-page
git commit -m "Add login page"
git push origin feature/login-page
```

Then create a Pull Request into `develop`.

---

## 📡 Architecture Overview

```
Frontend (Next.js)
        ↓
Gateway (Node.js)
        ↓
Backend (Spring Boot)
        ↓
Database
```

---

## 📄 Environment Variables

Each module may require its own `.env` file.

Example:

```
# frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🧪 Testing

Backend tests:

```
cd backend
./mvnw test
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    users {
        bigserial id PK
        varchar(50) username UK
        varchar(100) email UK
        varchar(255) password_hash
        user_role role
        timestamptz created_at
        timestamptz updated_at
    }

    refresh_tokens {
        bigserial id PK
        bigint user_id FK
        varchar(64) token UK
        timestamptz expires_at
        timestamptz created_at
    }

    posts {
        bigserial id PK
        bigint user_id FK
        varchar(255) title
        text content
        timestamptz created_at
        timestamptz updated_at
    }

    comments {
        bigserial id PK
        bigint post_id FK
        bigint user_id FK
        text content
        timestamptz created_at
        timestamptz updated_at
    }

    tags {
        bigserial id PK
        varchar(50) name UK
        varchar(50) slug UK
    }

    post_tags {
        bigint post_id FK
        bigint tag_id FK
    }

    votes {
        bigserial id PK
        bigint user_id FK
        bigint post_id FK
        bigint comment_id FK
        vote_type vote_type
        timestamptz created_at
    }

    user_activity_events {
        bigserial id PK
        bigint user_id FK
        varchar(50) event_type
        varchar(50) entity_type
        bigint entity_id
        jsonb metadata
        timestamptz created_at
    }

    users ||--o{ refresh_tokens : "has"
    users ||--o{ posts : "creates"
    users ||--o{ comments : "writes"
    users ||--o{ votes : "casts"
    users ||--o{ user_activity_events : "generates"
    posts ||--o{ comments : "has"
    posts ||--o{ post_tags : "tagged with"
    tags ||--o{ post_tags : "applied to"
    posts ||--o{ votes : "receives"
    comments ||--o{ votes : "receives"
```

---

## 📦 Future Improvements

* CI/CD pipeline (GitHub Actions)
* API documentation (Swagger)

---

## 👥 Team




---

# Project-Wdrozeniowy