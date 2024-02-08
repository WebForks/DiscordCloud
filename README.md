# DiscordCloud

Use Discord As a Storage

1. cd frontend/apps/web-db

   - ./pocketbase serve
   - add smtp (https://app.brevo.com/) and change application name

2. cd frontend/apps/web

   - npm i
   - npm run dev

3. run db-creator.py to edit or create sqlite3 db

4. add DISCORD_TOKEN, Channel ID, and DB path to frontend/apps/web/.env
