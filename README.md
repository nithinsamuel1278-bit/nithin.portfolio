## Client portal setup

The site now includes a Node.js and MySQL-backed client portal.

1. Install Node.js LTS, then run `npm install` in this folder.
2. Copy `.env.example` to `.env` and set your MySQL credentials and a long `SESSION_SECRET`.
3. Run `schema.sql` in MySQL.
4. Start the site with `npm start` and open `http://localhost:3000`.

The portal creates accounts with bcrypt-hashed passwords and loads projects assigned to the signed-in user. Add project records in MySQL using the user's `id`:

```sql
INSERT INTO projects (user_id, name, progress, status_label)
VALUES (1, 'Portfolio website', 72, 'Building interactions');
```

The current session store is suitable for local development. Production deployment should use a persistent session store and HTTPS.

