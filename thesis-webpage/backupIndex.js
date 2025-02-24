const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
const port = 3000;

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Welcome to Advanced Musical Understanding\nPlease Log into your Spotify Account to Continue');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

app.use(express.static(path.join(__dirname,'public')))

app.get('/results/{query}',(req, res) =>{
  const query =  req.body.results;
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
  console.log("Receive search", query);
  res.sendStatus(200);
});

app.get('/search', (req, res) => {
   const query = req.query.q; 
   res.sendFile(path.join(__dirname, 'public', 'search.html'));
});