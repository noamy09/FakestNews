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
| `WEATHER_CITY` | City for the weather widget, e.g. `Tel Aviv,IL` (default). |

### Endpoints
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/articles/:articleId/comments?before=<cursor>&limit=<n>` | Public | Newest-first comments, cursor paginated (`limit` max 50; `before` is the `nextCursor` from the previous page) |
| `POST` | `/api/articles/:articleId/comments` | Public, rate-limited | Body: `{ "authorName": "...", "content": "..." }` |
| `DELETE` | `/api/comments/:id` | Editor/Admin | Delete a comment (the article page shows a Delete button to moderators) |
| `GET` | `/api/weather` | Public | Cached weather for the weather widget |

### Quick checks
```bash
# Rate limit: 4th request inside a minute returns 429
for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code}\n" -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" -d '{"authorName":"Test","content":"Hello"}' \
  http://localhost:3000/api/articles/<articleId>/comments; done

# Weather: second call is served from cache (check the server log, only one refresh line)
curl -s http://localhost:3000/api/weather
```
