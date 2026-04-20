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
        varchar_50 username UK
        varchar_100 email UK
        varchar_255 password_hash
        varchar_100 display_name
        varchar_500 avatar_url
        text bio
        user_role role
        user_status status
        text ban_reason
        timestamptz email_verified_at
        int post_count
        int comment_count
        timestamptz created_at
        timestamptz updated_at
    }

    refresh_tokens {
        bigserial id PK
        bigint user_id FK
        varchar_64 token UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }

    categories {
        bigserial id PK
        varchar_100 name UK
        varchar_100 slug UK
        text description
        int display_order
        boolean is_visible
        timestamptz created_at
    }

    posts {
        bigserial id PK
        bigint user_id FK
        bigint category_id FK
        varchar_255 title
        varchar_300 slug UK
        text content
        post_status status
        boolean is_pinned
        int view_count
        int vote_score
        int comment_count
        timestamptz last_activity_at
        timestamptz created_at
        timestamptz updated_at
    }

    comments {
        bigserial id PK
        bigint post_id FK
        bigint user_id FK
        bigint parent_id FK
        text content
        comment_status status
        int vote_score
        smallint depth
        timestamptz created_at
        timestamptz updated_at
    }

    tags {
        bigserial id PK
        varchar_50 name UK
        varchar_50 slug UK
        int post_count
    }

    post_tags {
        bigint post_id FK
        bigint tag_id FK
        timestamptz created_at
    }

    votes {
        bigserial id PK
        bigint user_id FK
        bigint post_id FK
        bigint comment_id FK
        vote_type vote_type
        timestamptz created_at
    }

    notifications {
        bigserial id PK
        bigint recipient_id FK
        bigint sender_id FK
        notification_type type
        varchar_50 entity_type
        bigint entity_id
        text message
        boolean is_read
        timestamptz created_at
    }

    post_subscriptions {
        bigint user_id FK
        bigint post_id FK
        timestamptz created_at
    }

    activity_events {
        bigserial id PK
        bigint user_id FK
        varchar_50 event_type
        varchar_50 entity_type
        bigint entity_id
        jsonb metadata
        inet ip_address
        timestamptz created_at
    }

    users ||--o{ refresh_tokens : "has"
    users ||--o{ posts : "creates"
    users ||--o{ comments : "writes"
    users ||--o{ votes : "casts"
    users ||--o{ notifications : "receives"
    users o|--o{ notifications : "sends"
    users ||--o{ post_subscriptions : "subscribes"
    users o|--o{ activity_events : "generates"
    categories o|--o{ posts : "contains"
    posts ||--o{ comments : "has"
    posts ||--o{ post_tags : "tagged with"
    posts ||--o{ votes : "receives"
    posts ||--o{ post_subscriptions : "subscribed by"
    tags ||--o{ post_tags : "applied to"
    comments o|--o{ comments : "replied to"
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