const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
const port = 3000;
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
  redirectUri = 'http://localhost:3000/search',
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

//Middleware
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname,'public')))

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

app.get('/results',(req, res) =>{
  const query =  req.body.results;
  console.log("Receive search", query);
  res.sendStatus(200);
});

app.get('/search', (req, res) => {
   const code = req.query.code; 
   spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      console.log('The token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      console.log('The refresh token is ' + data.body['refresh_token']);
  
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);

      const results = "taylor";
      spotifyApi.searchArtists(results,{limit:5,offset:1})
      .then(function(data){
           console.log(data.body.artists.href);
      }, function(err){
           console.log('Oh fuck',err);
      })
    },
    function(err) {
      console.log('Something went wrong!', err);
    }
  );
   res.sendFile(path.join(__dirname, 'public', 'search.html'));

});

