# FakestNews

This repository holds the code for **FakestNews**, a full-stack mock news and journalism platform built with Node.js, Express, EJS, and MongoDB Atlas.

---

## How to Run This Server

1. **Install Node.js**: Ensure you have the latest version of Node.js installed on your system.
2. **Install Dependencies**: Run the following command in the project root to install all required packages:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   - Create a `.env` file in the root directory (you can copy `.env.example` as a template):
     ```bash
     cp .env.example .env
     ```
   - Configure the required environment variables, specifically your MongoDB Atlas connection string (`DB_URL`).
4. **Start the Server**: Run the following command to start the Express application:
   ```bash
   npm start
   ```
5. **Open in Browser**: Navigate to `http://localhost:<PORT>` in your web browser (default is `http://localhost:3000`).

---

## Environment Variables

All environment variables used by the application are configured via a `.env` file in the root directory:

| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3000` | Port on which the HTTP server listens. |
| `DB_URL` | **Required** | — | MongoDB Atlas connection string (used for Mongoose models and session storage via `connect-mongo`). |
| `SESSION_SECRET` | Optional | `fakestnews_session_secret_key_2026` | Secret encryption key for signing Express session cookies. |
| `OPENWEATHER_API_KEY` | Optional | — | Free [OpenWeatherMap](https://openweathermap.org/api) API key. When omitted, the weather widget displays as unavailable. |
| `WEATHER_CITY` | Optional | `Tel Aviv,IL` | Target city query for the weather widget (e.g. `Tel Aviv,IL`, `New York,US`). |
| `NODE_ENV` | Optional | `development` | Set to `production` to enforce secure session cookies over HTTPS. |

---

## Endpoints

### Articles API (`/api/articles`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/articles` | Public | Fetch published articles with support for pagination, search, and category filters. |
| `GET` | `/api/articles/categories` | Public | Get the list of all available article categories. |
| `GET` | `/api/articles/:id` | Public | Retrieve details of a specific article by ID. |
| `POST` | `/api/articles` | Reporter / Editor / Admin | Create a new article. |
| `PUT` | `/api/articles/:id` | Author / Editor / Admin | Update article content, draft status, or publish status. |
| `DELETE` | `/api/articles/:id` | Author / Admin | Delete an article. |

### Comments API (`/api/articles/:articleId/comments` & `/api/comments`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/articles/:articleId/comments?before=<cursor>&limit=<n>` | Public | Fetch newest-first comments for an article using cursor-based pagination. |
| `POST` | `/api/articles/:articleId/comments` | Public (Rate-limited: 3/min) | Post a comment. Body: `{ "authorName": "...", "content": "..." }`. |
| `GET` | `/api/comments` | Public | List all comments. |
| `GET` | `/api/comments/:id` | Public | Retrieve a single comment by ID. |
| `DELETE` | `/api/comments/:id` | Editor / Admin | Moderate and delete a comment. |

### Editorial Notes API (`/api/notes`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notes` | Public | Retrieve review notes (supports query filtering, e.g. `?articleId=...`). |
| `GET` | `/api/notes/:id` | Public | Retrieve a specific review note by ID. |
| `POST` | `/api/notes` | Editor / Admin | Add an editorial review or revision note to an article. |
| `PUT` | `/api/notes/:id` | Editor / Admin | Update an existing review note. |
| `DELETE` | `/api/notes/:id` | Editor / Admin | Delete a review note. |

### Statistics & Analytics API (`/api/statistics`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/statistics/article/:articleId` | Public | Get view counts and engagement statistics for an article. |

### Users & Authentication API (`/api/users`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/login` | Public | Authenticate user credentials and establish a session. Body: `{ "email": "...", "password": "..." }`. |
| `POST` | `/api/users/logout` | Authenticated | Destroy the active session and log out. |
| `GET` | `/api/users/me` | Authenticated | Get the current logged-in user profile. |
| `GET` | `/api/users/:id` | Self / Editor / Admin | Retrieve a specific user's details. |
| `POST` | `/api/users` | Admin | Create a new staff account (Reporter, Editor, or Admin). |
| `GET` | `/api/users` | Admin | Search and list staff users. |
| `PUT` | `/api/users/:id` | Self / Admin | Update user details or credentials. |
| `DELETE` | `/api/users/:id` | Admin | Delete a staff account. |

### Weather API (`/api/weather`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/weather` | Public | Get cached weather conditions from OpenWeatherMap for the weather widget. |

### Web Views & Staff Hubs
| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` or `/articles` | Public | Public news homepage and article feed. |
| `GET` | `/articles/:id` | Public | Read full article page with interactive comment section. |
| `GET` | `/login` | Public | Staff login interface. |
| `POST` | `/login` | Public | Handle login form submission. |
| `GET` | `/WritersHub` | Reporter / Editor / Admin | Writer dashboard to view drafts, submissions, and rejected notes. |
| `GET` | `/WritersHub/new` | Reporter / Editor / Admin | Article creation page with auto-save support. |
| `GET` | `/WritersHub/edit/:id` | Reporter / Editor / Admin | Edit existing article with review notes feedback. |
| `POST` | `/WritersHub/upload-image` | Reporter / Editor / Admin | Upload article thumbnail image. |
| `POST` | `/WritersHub/remove-image` | Reporter / Editor / Admin | Delete article thumbnail image. |
| `GET` | `/EditorsHub` | Editor / Admin | Editorial review dashboard to approve, reject, or request revisions. |
| `GET` | `/EditorsHub/analytics` | Editor / Admin | Editorial performance and analytics view. |
| `GET` | `/AdminHub` | Admin | Administration console for user management and staff provisioning. |
