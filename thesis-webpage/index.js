const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Welcome to Advanced Musical Understanding\nPlease Log into your Spotify Account to Continue');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
