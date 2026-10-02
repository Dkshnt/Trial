# Personal portfolio

This portfolio runs locally. The server keeps editable portfolio content in `data/portfolio.json` and uploaded files in `uploads/`. The current public portfolio content and assets are included in the repository; `.env` remains private.

## Run it

1. Install Node.js, then run `npm install`.
2. Copy `.env.example` to `.env` and set a strong `ADMIN_PASSWORD`.
3. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).
4. Open [http://localhost:3000/admin](http://localhost:3000/admin) to sign in, add files, and edit portfolio content.

Files uploaded from the admin page are stored on this computer. Visitors can download linked files while the local server is running. Back up `data/` and `uploads/` to preserve your content and files.

This setup is intended for local use on the same computer. It does not sync files to a hosted website or other devices.

## Publishing to GitHub

The repository includes the public portfolio configuration and download assets so a new checkout works as expected. Before running the contact form, copy `.env.example` to `.env` and add your own Gmail app password. Never commit `.env`.

GitHub Pages cannot run this Express server or the contact-email route. Use a Node-capable host such as Render, Railway, or Vercel for a public live site.
