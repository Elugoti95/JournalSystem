/** 
 *****************************************************************************
 *              THE FOLLOWING PROGRAM IMPLEMENTS AN ONLINE JOURNAL           *
 *****************************************************************************
 * IT HAS FOUR MAIN FUNCTIONS(REGISTRATION, LOGIN, JOURNAL ENTRY AND JOURNAL EDIT)
 * THIS FILE INCLUDES A FEW PHASES
 *****************************************************************************
 *                      INITIAL SETUP OF THE DATABASE                        *
 *****************************************************************************
 * Here we create the database and the necessary tables if they do not exist
 * DATABASE: journal_db
 * TABLES: 
 * users(id(primary), username, email, password, phone, logged), 
 * journals(id(primary), user_id(foreign), date, description, location, mood, goals_and_intentions, people_contacts)
 *****************************************************************************
 *                                  ROUTING                                  *
 *****************************************************************************
 * This section involves performing several functions based on the route the user submitted data through
 * There are four routes(/register, /login, /logout, /journal_add, /journal_edit)
 * 
 *****************************************************************************
 *                       SECURITY FEATURES IMPLEMENTED                       *           
 *****************************************************************************
 * 1. CORS - a security measure to prevent unauthorized access to data across different origins (domains).
 * 2. RATE LIMITING - This prevents an attacker from flooding your server with an excessive number of requests
 *   - It prevents DoS, brute force, scraping and data harvesting and API abuse 
 * 3. PASSWORD ENCRYPTION - cryptographic hashing functionality to prevent attacks
 * 4. PARAMETERIZED QUERIES - Against SQL injection 
 */
const express = require('express');
const { exec } = require('child_process');
const { createConnection } = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { rateLimit } = require("express-rate-limit");
const cors = require('cors');

const app = express();
app.set("port", process.env.PORT || 3009);
app.use(express.json());

const corsOptions = {
    origin: 'http://localhost',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const rateLimiter = rateLimit({
    max: 3,
    windowMs: 5 * 60 * 1000,
    handler: (req, res) => {
        console.log('Rate limit reached. Please try again after 5 mins.');
        res.status(429).json({ error: 'Rate limit reached. Please try again after 5 mins.' });
    },
});
app.use("/login", rateLimiter);
app.use("/adminLogin", rateLimiter);

/**
 *****************************************************************************
 *                      INITIAL SETUP OF THE DATABASE                        *
 *****************************************************************************
 */
let connection;

createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
}).then(async (conn) => {
    connection = conn;

    await connection.query('CREATE DATABASE IF NOT EXISTS journal_assist_db;');
    await connection.query('USE journal_assist_db;');

    await connection.query(`
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT UNIQUE,
        username VARCHAR(50),
        password VARCHAR(100),
        logged BOOLEAN DEFAULT FALSE
    );`);

    await connection.query(`
    INSERT INTO admins (admin_id, username, password, logged)
    SELECT * FROM (SELECT 1001 AS admin_id, 'admin1' AS username, 
    '$2b$10$Wr8uyxzeVh3O6ukw1WZ.LuSg9T5Ac0lfQY.cM0PwQIwOAw.A.2dBq' 
    AS password, FALSE AS logged) AS tmp
    WHERE NOT EXISTS (
        SELECT admin_id FROM admins WHERE admin_id = 1001
    ) LIMIT 1;
    
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(25) NOT NULL UNIQUE,
            email VARCHAR(25) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            logged BOOLEAN DEFAULT FALSE
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            location VARCHAR(255),
            mood VARCHAR(100),
            goals_and_intentions TEXT,
            people_contacts TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);


}).catch(error => {
    console.error('Error connecting to the database:', error.message);
});
function openBrowser(url) {
    exec(`start ${url}`, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
}
async function isAuthenticated(req, res) {
    try {
        const [result] = await connection.query('SELECT logged FROM users WHERE id = ?', [req.body.user_id]);

        if (result.length > 0) {
            if (result[0].logged == true) {
                return true;
            } else {
                console.error('You need to login');
                res.status(401).json({ error: 'You need to login' });
            }
        } else {
            console.error('Unauthorized: Check again your credentials');
            res.status(401).json({ error: 'Unauthorized: Check again your credentials' });
        }
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
    return false;
}
/**
 *****************************************************************************
 *                                  ROUTING                                  *
 *****************************************************************************
 */
app.post('/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    try {
        await connection.query('INSERT INTO users (username, email, password, phone) VALUES (?, ?, ?, ?)', [username, email, bcrypt.hashSync(password, 10), phone]);
        console.log("REGISTRATION SUCCESSFUL");
        res.status(200).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/adminLogin', async (req, res) => {
    
    const { adminId, password } = req.body;
    try {
        const [result] = await connection.query('SELECT * FROM admins WHERE admin_id = ?', [adminId]);
        if (result.length > 0) {
            const hashedPassword = result[0].password;
            if (bcrypt.compareSync(password, hashedPassword)) {
                await connection.query('UPDATE admins SET logged = TRUE WHERE admin_id = ?', [adminId]);
                // const [record] = await connection.query('SELECT * FROM users;');
                const [record] = await connection.query(`
                SELECT u.id, u.username, u.email, u.phone, CASE WHEN u.logged = 1 THEN 'yes' ELSE 'no' END AS logged_status, COUNT(j.id) AS journals FROM users AS u LEFT JOIN journal_entries AS j ON u.id = j.user_id GROUP BY u.id, u.username, u.email, u.phone, u.logged;
                `);
                res.status(200).json({ message: 'Admin: Login successful', users: record });
            } else {
                console.error('Admin: Wrong password');
                res.status(401).json({ error: 'Wrong password' });
            }
        } else {
            console.error('Admin: Invalid id or password');
            res.status(401).json({ error: 'Invalid id or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/login', async (req, res) => {
    
    const { email, password } = req.body;
    try {
        const [result] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        if (result.length > 0) {
            const hashedPassword = result[0].password;
            if (bcrypt.compareSync(password, hashedPassword)) {
                await connection.query('UPDATE users SET logged = TRUE WHERE id = ?', [result[0].id]);
                const [record] = await connection.query('SELECT * FROM journal_entries WHERE user_id = ?', [result[0].id]);
                console.log("LOGIN SUCCESSFUL");
                res.status(200).json({ message: 'Login successful', journal: record.length < 1 ? { user_id: result[0].id } : record });
            } else {
                console.error('User: Invalid password');
                res.status(401).json({ error: 'Wrong password' });
            }
        } else {
            console.error('User: Invalid email or password');
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/logout', async (req, res) => {
    try {
        await connection.query('UPDATE users SET logged = FALSE WHERE id = ?', [req.body.user_id]);
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error logging out:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/adminLogout', async (req, res) => {
    try {
        await connection.query('UPDATE admins SET logged = FALSE WHERE id = 1;');
        console.log('Admin: Logout successful');
        res.status(200).json({ message: 'Admin: Logout successful' });
    } catch (error) {
        console.error('Error logging out:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/journal_save', async (req, res) => {
    logged = await isAuthenticated(req, res);
    console.log("logged=" + logged)
    if (logged) {
        console.log("saving")
        const { user_id, date, description, location, mood, goals_and_intentions, people_contacts } = req.body;
        try {
            await connection.query('INSERT INTO journal_entries (user_id, date, description, location, mood, goals_and_intentions, people_contacts) VALUES (?, ?, ?, ?, ?, ?, ?)', [user_id, date, description, location, mood, goals_and_intentions, people_contacts]);
            const [record] = await connection.query('SELECT * FROM journal_entries WHERE user_id = ?', [user_id]);
            res.status(200).json({ message: 'Journal entry submitted successfully', journal: record });
        } catch (error) {
            console.error('Error submitting journal entry:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});


app.put('/journal_edit', async (req, res) => {
    logged = await isAuthenticated(req, res);
    console.log("logged=" + logged)
    if (logged) {
        console.log("editing")
        const { id, user_id, date, description, location, mood, goals_and_intentions, people_contacts } = req.body;
        try {
            await connection.query('UPDATE journal_entries SET date = ?, description = ?, location = ?, mood = ?, goals_and_intentions = ?, people_contacts = ? WHERE id = ?;', [date, description, location, mood, goals_and_intentions, people_contacts, id]);
            const [record] = await connection.query('SELECT * FROM journal_entries WHERE user_id = ?', [user_id]);
            res.status(200).json({ message: 'Journal entry updated successfully', journal: record });
        } catch (error) {
            console.error('Error updating journal entry:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        console.error('Internal server error');
    }

});

// Start the NodeJS server
app.listen(app.get("port"), () => {
    //openBrowser(`http://localhost/journal/login.html`);// launch the frontend of this app
    //openBrowser('http://localhost/phpmyadmin/');// launch the database viewerza
    console.log(`Server is running on http://localhost:${app.get("port")}`);
});