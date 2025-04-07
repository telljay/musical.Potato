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
    const base62Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += base62Chars.charAt(Math.floor(Math.random() * base62Chars.length));
    }
    return result;
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
//Serve the homepage with authorizeURL if the database sets up

app.get('/', (req, res) => {
    res.render('home', {URL: authorizeURL})
});
//--

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
//--

function QueSearchResult(searchWord) {
    return spotifyApi.searchArtists(searchWord, { limit: 5, offset: 1 })
        .then(function(data) {
            let artistNames = [];
            data.body.artists.items.forEach(artist => {
                let link = `http://localhost:1989/albums?id=${artist.id}&name=${artist.name}`
                artistNames.push({name: artist.name, link: link});
            });
            return artistNames;
        }, function(err) {
            console.log('Oh no: ', err);
            return [];
        });
}
//--

app.get('/search', (req,res)=>{
  if(spotifyApi.getAccessToken()){
    res.render('search');
  }
  else{
    res.redirect('/')
  }
});
//--

app.get('/results', async (req, res) => {
  if(spotifyApi.getAccessToken()){
      const query = req.query.query ;
    let artists = await QueSearchResult(query);
    res.render('results', {artists})
  }
  else{
    res.redirect('/')
  }

});
//--

function GetAlbums(artistID,dbId){
    return spotifyApi.getArtistAlbums(artistID)
        .then(function(data){
            let quedAlbums = []
            data.body.items.forEach(album => {
              quedAlbums.push({Title: album.name, ArtistDBId: dbId, Id:album.id});
            });
            return quedAlbums;
        },function(err){
            console.log("Oops",err);
            return[];
        })   

}
//--

app.get("/albums", async (req, res) => {
  if(spotifyApi.getAccessToken()){
    db.insertArtist(req.query.id, req.query.name)
    .then(async (artistId) => {
      const artistID = artistId;
      const albums = await GetAlbums(req.query.id,artistID);
      res.render('albums', {albums}); // Should log the correct artist ID
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`);
    });

  }
  else{
    res.redirect('/')
  }
});
//--

function getAlbumInfo(albumId){
  return spotifyApi.getAlbum(albumId)
  .then(function(data){
    return { 
      AlbumCover: data.body.images[0],
      AlbumId: data.id,
      AlbumName: data.body.name,
      ArtistSpotifyId: data.body.artists[0].name,
      Tracks: data.body.tracks.items
    }
  },function(err){
    console.log("Oops",err);
})}
//--

app.get('/ranking',async (req,res)=>{
  if(spotifyApi.getAccessToken()){
    let albuminfo = await getAlbumInfo(req.query.albumId);
    let albumDatabase = await db.insertAlbum(albuminfo.AlbumID, albuminfo.AlbumName, req.query.artistDBID);
    let songs =[];
    for(let i =0;i<albuminfo.Tracks.length;i++){
      songs.push({
        Title: albuminfo.Tracks[i].name,
        AlbumCover: albuminfo.AlbumCover,
        SpotifyId: albuminfo.Tracks[i].id,
        Tracknum: albuminfo.Tracks[i].track_number,
        AlbumDatabaseId: albumDatabase
      })
    }
    console.log(songs);
    await db.insertSong(songs[0].SpotifyId,songs[0].Title,songs[0].AlbumDatabaseId);
    res.render('ranking',songs[0]);
  }
  else{
    res.redirect('/')
  }
})
//--

app.post('/ranking/:albumID/:songID', (req,res)=>{
  
})
//--

//app.use('ranking/:albumID/:songID/:prevRanking')

//404 page not found 
app.use((req, res) => { 
    res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p><h3>Please return to the home page</h3><a id="returnURL" href = http://localhost:1989/>Return to Safety</a>`);
});