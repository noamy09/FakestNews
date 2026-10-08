# FakestNews
this Repo holds the code for a news site named FakestNews. It's a project by several students. 

## How to run this server:
1. Ensure you have the latest version of Node.js installed.
2. Run npm install in the terminal to install all the required packages.
3. Ensure you have a MongoDB database user configured in the shared MongoDB Atlas cluster0 and update the connection string under the <DB_URL> parameter in the .env file (see the .env.example file for reference).
4. In the same .env file you'll see a <PORT> parameter. Make sure you've configured it according to your preferences. Otherwise it will be up on port 3000 by default.
5. Run npm start in the terminal to start the server.
6. Open your browser and go to http://localhost:<PORT> (the port number you set in the .env file in the previous step).
## Comments, Spam Protection & Weather

### Environment variables
| Variable | Purpose |
| :--- | :--- |
| `OPENWEATHER_API_KEY` | Free [OpenWeatherMap](https://openweathermap.org/api) key (sign-up, no credit card). Without it the widget shows "unavailable". |
| `WEATHER_CITY` | City for the sidebar widget, e.g. `Tel Aviv,IL` (default). |

### Endpoints
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/articles/:articleId/comments?before=<cursor>&limit=<n>` | Public | Newest-first comments, cursor paginated (`limit` max 50; `before` is the `nextCursor` from the previous page) |
| `POST` | `/api/articles/:articleId/comments` | Public, rate-limited | Body: `{ "authorName": "...", "content": "..." }` |
| `GET` | `/api/weather` | Public | Cached weather for the sidebar widget |

### How it works
- **Comments** — the first 20 comments are rendered server-side in `views/article.ejs`, so they are in the initial HTML. New comments are posted with `fetch` and prepended immediately (optimistic UI); on failure the comment is removed and the typed text is restored. Comments are stored as plain text and rendered with EJS escaping / `textContent`, never as HTML, which prevents XSS. Only published articles accept comments.
- **Spam protection** (`middlewares/commentRateLimiter.js`) — sliding window of **3 comments per minute** per device (anonymous `fn_did` cookie, issued when an article page is opened) or per logged-in user. Requests that arrive without the cookie (curl, cleared cookies) share a 3/minute bucket per IP, and every IP has a backstop of 10/minute for clients that forge fresh cookies. Violations get **HTTP 429** with a `Retry-After` header and a message; the form shows a countdown.
- **Weather** (`services/weatherService.js`) — one in-memory cache entry with a **15-minute TTL**. Concurrent requests on a cache miss share a single API call; if OpenWeatherMap fails, the last good reading is served (marked `stale`) and retries back off for 60 s. The cache is warmed on server start.

### Quick checks
```bash
# Rate limit: 4th request inside a minute returns 429
for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code}\n" -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" -d '{"authorName":"Test","content":"Hello"}' \
  http://localhost:3000/api/articles/<articleId>/comments; done

# Weather: second call is served from cache (check the server log, only one refresh line)
curl -s http://localhost:3000/api/weather
```
