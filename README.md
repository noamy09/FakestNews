# FakestNews
this Repo holds the code for a news site named FakestNews. It's a project by several students. 

## How to run this server:
1. Ensure you have the latest version of Node.js installed.
2. Run npm install in the terminal to install all the required packages.
3. Ensure you have a MongoDB database user configured in the shared MongoDB Atlas cluster0 and update the connection string under the <DB_URL> parameter in the .env file (see the .env.example file for reference).
4. In the same .env file you'll see a <PORT> parameter. Make sure you've configured it according to your preferences. Otherwise it will be up on port 3000 by default.
5. Run npm start in the terminal to start the server.
6. Open your browser and go to http://localhost:<PORT> (the port number you set in the .env file in the previous step).