const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
const port = 1989;
const SpotifyWebApi = require('spotify-web-api-node');

//Function to generate random string for the state
function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//Create port for spotify access
var scopes = ['user-read-private', 'user-read-email'],
  redirectUri = 'http://localhost:1989/auth',
  clientId = 'e3d6ae52792d4f6bb286ef14c6ee270c',
  clientSecret = '6214d65c3e454af6aa92c0ab49d14915'
  state = generateRandomString(16);

var spotifyApi = new SpotifyWebApi({
    redirectUri: redirectUri,
    clientId: clientId,
    clientSecret: clientSecret
});
//--
var authorizeURL = spotifyApi.createAuthorizeURL(scopes,state);
var artistNames=[];

//Middleware
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname,'public')))

//set up the port for the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
//Serve the homepage with authorizeURL
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Home</title>
        </head>
        <body>
            <h1>Welcome to Advanced Musical Understanding</h1>
            <h3>Please login to your Spotify account</h3>
            <a id="loginLink" href="${authorizeURL}">Login with Spotify</a>
        </body>
        </html>
    `);
});

app.get('/auth', (req, res) => {
   const code = req.query.code; 
   console.log(req.query)
   spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      console.log('The token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      console.log('The refresh token is ' + data.body['refresh_token']);
  
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
      //--

      //--
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  );
  var searchURL = "http://localhost:1989/search"
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Home2</title>
    </head>
    <body>
        <h1>Welcome to Advanced Musical Understanding</h1>
        <h3>Please Go to Search</h3>
        <a id="searchUrl" href="${searchURL}">Go To Search</a>
    </body>
    </html>
`);
});

function QueSearchResult(searchWord) {
    return spotifyApi.searchArtists(searchWord, { limit: 5, offset: 1 })
        .then(function(data) {
            let artistNames = [];
            data.body.artists.items.forEach(artist => {
                console.log(artist.name, "'s Spotify ID is ",artist.id);
                artistNames.push(artist.name);
            });
            return artistNames;
        }, function(err) {
            console.log('Oh no: ', err);
            return [];
        });
}

app.get('/search', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'search.html')); 
});

app.get('/results', async (req, res) => {
    const query = req.query.q;
    console.log("Receive search", query);
    const artistNames = await QueSearchResult(query);
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Results</title>
        </head>
        <body>
            <h1>Results...</h1>
            ${artistNames.map(name => `<h3>${name}</h3>`).join('')}
        </body>
        </html>
    `);
});

app.get("/results/:name", (req,res) =>{

});