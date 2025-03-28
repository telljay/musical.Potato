const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
const morgan = require('morgan')
const port = 1989;
const SpotifyWebApi = require('spotify-web-api-node');
const DBAbstraction = require("./DBAbstraction");
const db = new DBAbstraction(path.join(__dirname,'data',"musicalPotato.sqlite"));
const handlebars = require('express-handlebars').create({}); 

app.engine('handlebars', handlebars.engine); 
app.set('view engine', 'handlebars');

app.use(morgan('dev'));
//Functions to create SQL queries


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

var artistNamesAndID={};

//Middleware
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname,'public')))
//set up the port for the server
db.init() 
    .then(() => { 
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}/`);
          });
    }) 
    .catch(err => { 
        console.log('Problem setting up the database'); 
        console.log(err); 
    });

//Serve the homepage with authorizeURL

app.get('/', (req, res) => {
    res.render('home', {URL: authorizeURL})
    // res.send(`
    //     <!DOCTYPE html>
    //     <html lang="en">
    //     <head>
    //         <meta charset="UTF-8">
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //         <title>Home</title>
    //     </head>
    //     <body>
    //         <h1>Welcome to Advanced Musical Understanding</h1>
    //         <h3>Please login to your Spotify account</h3>
    //         <a id="loginLink" href="${authorizeURL}">Login with Spotify</a>
    //     </body>
    //     </html>
    // `);
});

app.get('/auth', (req, res) => {
   const code = req.query.code; 
   spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        //--
        
        //--
        res.redirect('/search')
    },
    function(err) {
        console.log('Something went wrong!', err);
        res.redirect(`/err`)
    }
  );
});

function QueSearchResult(searchWord) {
    return spotifyApi.searchArtists(searchWord, { limit: 5, offset: 1 })
        .then(function(data) {
            let artistNames = [];
            data.body.artists.items.forEach(artist => {
                //artistNames[name] = artist.id;
                let link = `http://localhost:1989/readytorank?id=${artist.id}&name=${artist.name}`
                artistNames.push({name: artist.name, link: link});

                artistNamesAndID[artist.name] = artist.id;
            });
            return artistNames;
        }, function(err) {
            console.log('Oh no: ', err);
            return [];
        });
}

app.get('/search', (req,res)=>{
    res.render('search');
  //res.sendFile(path.join(__dirname, 'public', 'search.html')); 
});

app.get('/results', async (req, res) => {
    const query = req.query.q;
    console.log("Receive search", query);
    let artists = await QueSearchResult(query);
    console.log(artists);
    res.render('results', {artists})

    // res.send(`
    //     <!DOCTYPE html>
    //     <html lang="en">
    //     <head>
    //         <meta charset="UTF-8">
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //         <title>Results</title>
    //     </head>
    //     <body>
    //         <h1>Results...</h1>
    //         ${artistNames.map(name => `<a id = "artistResultsUrl" href = http://localhost:1989/readytorank?id=${artistNamesAndID[name]}&name=${name}>${name}</a>`).join('<h4></h4>')}
    //     </body>
    //     </html>
    // `);
});
var albumsandId = {};
function GetAlbums(artistID,dbId){
    return spotifyApi.getArtistAlbums(artistID)
        .then(function(data){
            let quedAlbums = []
            data.body.items.forEach(album => {
                let link = `http://localhost:1989/ranking?albumId=${album.id}&artistDBID=${dbId}`
                quedAlbums.push({Title: album.name, Link: link});
                //quedAlbums.push(album.name);
                albumsandId[album.name] = album.id;
            });
            return quedAlbums;
        },function(err){
            console.log("Oops",err);
            return[];
        })   

}
app.get("/readytorank", async (req, res) => {
    let artistID;
    db.insertArtist(req.query.id, req.query.name)
        .then((artistId) => {
            console.log(`Artist ID: ${artistId}`); // Should log the correct artist ID
            artistID = artistId;
        })
        .catch((err) => {
            console.error(`Error: ${err.message}`);
        });
    const albums = await GetAlbums(req.query.id,artistID);
    res.render('albums', {albums});
    // res.send(`
    //     <!DOCTYPE html>
    //     <html lang="en">
    //     <head>
    //         <meta charset="UTF-8">
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //         <title>Ranking Page</title>
    //     </head>
    //     <body>
    //         <h1>Select the Album to begin with...</h1>
    //         <ul id="albumList">
    //             ${albums.map(album => `<a id = "albumNameId" href = http://localhost:1989/ranking?albumId=${albumsandId[album]}&artistDBID=${artistID}>${album}</a> <h3/>`).join('')}
    //         </ul>
    //     </body>
    //     </html>
    // `);
});

app.get('/ranking',async (req,res)=>{
    let albuminfo = await spotifyApi.getAlbum(req.query.albumID)
    await db.insertAlbum(req.query.albumID,albuminfo.name, req.query.artistDBID).then(console.log("success"))
})

app.get('/ranking/:albumID/:songID', (req,res)=>{

})

//app.use('ranking/:albumID/:songID/:prevRanking')

//404 page not found 
app.use((req, res) => { 
    res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p><h3>Please return to the home page</h3><a id="returnURL" href = http://localhost:1989/>Return to Safety</a>`);
});