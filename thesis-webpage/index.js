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
require('dotenv').config();
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
  clientId = process.env.SPOTIFY_CLIENT_ID,
  clientSecret = process.env.SPOTIFY_CLIENT_SECRET,
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
app.use(bodyParser.urlencoded({ extended: true })); // Add this line to parse form data
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
async function getUserId() {
  let userId=await spotifyApi.getMe();
  return userId = await db.getUserDbIdFromUserId(userId.body.id);
}
app.get('/', (req, res) => {
  res.render('home', {URL: authorizeURL})
});
//--

app.get('/auth', async (req, res) => {
   const code = req.query.code; 
   spotifyApi.authorizationCodeGrant(code).then(
    async function(data) {
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        //--
        let userId = await spotifyApi.getMe();
        await db.insertUser(userId.body.id);
        //--
        res.redirect('/stats')
    },
    function(err) {
        console.log('Something went wrong!', err);
        res.redirect(`/err`)
    }
  );
});
//--

function QueSearchResult(searchWord) {
    return spotifyApi.searchArtists(searchWord, { limit: 5 })
        .then(function(data) {
            let artistNames = [];
            data.body.artists.items.forEach(artist => {
                let link = `/albums?id=${artist.id}&name=${artist.name}`
                artistNames.push({name: artist.name, link: link,SpotifyId:artist.id});
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
    const query = req.query.query;
    let artists = await QueSearchResult(query);
    res.render('results', {artists})
  }
  else{
    res.redirect('/')
  }

});
//--

function GetAlbums(artistID,dbId){
    return spotifyApi.getArtistAlbums(artistID,{include_groups:'album', limit:'50'})
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

app.get('/resultstoalbums',async (req,res)=>{
  if(spotifyApi.getAccessToken()){
    const query = req.query.query;
    let artists = await QueSearchResult(query);
    res.redirect(`/albums?id=${artists[0].SpotifyId}&name=${artists[0].name}`)
  }
  else{
    res.redirect('/')
  }
})
//--

app.get("/albums", async (req, res) => {
  if(spotifyApi.getAccessToken()){
    db.insertArtist(req.query.id, req.query.name)
    .then(async (artistId) => {
      const artistID = artistId;
      const albums = await GetAlbums(req.query.id,artistID);
      albums.reverse();
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
      AlbumId: albumId,
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
    let albumDatabase = await db.insertAlbum(albuminfo.AlbumId, albuminfo.AlbumName, req.query.artistDBID);
    await db.updateCurrentRanking(await getUserId(),`/ranking?artistDBID=${req.query.artistDBID}&albumId=${req.query.albumId}`)
    await db.insertUserAlbumRanking(await getUserId(), albumDatabase)
    let songs =[];
    for(let i =0;i<albuminfo.Tracks.length;i++){
      let isSong=await db.isSongInDB(albuminfo.Tracks[i].id);
      if(isSong){
        songs.push({
          Title: albuminfo.Tracks[i].name,
          Url: albuminfo.Tracks[i].external_urls.spotify,
          AlbumCover: albuminfo.AlbumCover.url,
          SpotifyId: albuminfo.Tracks[i].id,
          Tracknum: albuminfo.Tracks[i].track_number,
          AlbumDatabaseId: albumDatabase,
          SongDatabaseId: isSong
        })
        break;
      }
      let songDbId = await db.insertSong(albuminfo.Tracks[i].id,albuminfo.Tracks[i].name,albumDatabase, albuminfo.Tracks[i].track_number, albuminfo.Tracks[i].external_urls.spotify);
      songs.push({
        Title: albuminfo.Tracks[i].name,
        Url: albuminfo.Tracks[i].external_urls.spotify,
        AlbumCover: albuminfo.AlbumCover.url,
        SpotifyId: albuminfo.Tracks[i].id,
        Tracknum: albuminfo.Tracks[i].track_number,
        AlbumDatabaseId: albumDatabase,
        SongDatabaseId: songDbId
      })
    }
    let currentSongFound = false;
    for(let i = 0;i<songs.length;i++){
      let row = await db.getRanking(await getUserId(),songs[i].SongDatabaseId);
      if(row==undefined){
        break;
      }
      else if(row.IsCurrentSong){
        currentSongFound = songs[i];
        break;
      }
    }
    if(currentSongFound){
      res.render('ranking',currentSongFound)
    }
    else{
      let song = await db.getSongByTrackNumber(songs[0].AlbumDatabaseId,songs[0].Tracknum);
      await db.insertUserRanking(await getUserId(),song.Id)
      res.render('ranking', songs[0])
    }
  }
  else{
    res.redirect('/')
  }
})
//--

//Possibly add functionality to manage current song queue and skip and play current ranking song
app.post('/ranking', async (req, res) => {
  let userId=await spotifyApi.getMe();
  userId = userId.body.id; 
  userId = await db.getUserDbIdFromUserId(userId);
  let songId = await db.getSongByTrackNumber(parseInt(req.query.albumId), parseInt(req.query.prev_tracknum));
  await db.updateRanking(userId, songId.Id, req.body.Ranking);
  let newSong = await db.getSongByTrackNumber(parseInt(req.query.albumId), parseInt(req.query.prev_tracknum) + 1);
  if(newSong ==undefined){
    await db.updateCurrentRanking(userId,"/stats")
    await db.setFullyRanked(await getUserId(),req.query.albumId,true);
    res.redirect("/stats");
  }
  else {
    await db.insertUserRanking(userId, newSong.Id);
    let data = {
      AlbumCover: (req.body.AlbumCover),
      AlbumDatabaseId: req.query.albumId,
      Tracknum: parseInt(req.query.prev_tracknum) + 1,
      Url: newSong.Url,
      Title: newSong.Title
    };
    res.render("ranking", data);
  }
});
//--
//the holy data retrival funciton
async function getStats(userId) {
  let allArtists = await db.getAllArtist();
  let artistArray = [];
  let allSongInfo=[];
  let allAlbumInfo=[];

  for (const artist of allArtists) {
    let artistAverage = 0;
    let albumArray = [];
    let artistSongs = [];
    let allAlbums = await db.getAllAlbums(artist.Id);

    for (const album of allAlbums) {
      let songArray = [];
      let albumAverage = 0;
      let allSongs = await db.getAllSongs(album.Id);
      let isAlbum = await db.isAlbumRanking(userId,album.Id);
      if(isAlbum.FullyRanked==1){
        for (const song of allSongs) {
          let ranking = await db.getRanking(userId, song.Id);
          if (ranking&&!ranking.IsCurrentSong) {
            songArray.push({
              SongId: song.Id,
              SongTitle: song.Title,
              Ranking: ranking.Ranking
            });
            allSongInfo.push({
              SongId: song.Id,
              SongTitle: song.Title,
              Ranking: ranking.Ranking
            });
            artistSongs.push({
              SongId: song.Id,
              SongTitle: song.Title,
              Ranking: ranking.Ranking
            });
            albumAverage += parseInt(ranking.Ranking);
          }
        }
        albumArray.push({
          AlbumDatabaseId: album.Id,
          AlbumSpotifyId: album.Spotify_Id,
          ArtistDatabaseId: artist.Id,
          AlbumTitle: album.Title,
          AlbumAverage: songArray.length ? albumAverage / songArray.length : 0,
          Songs: songArray
        });
        allAlbumInfo.push({
          AlbumDatabaseId: album.Id,
          AlbumSpotifyId: album.Spotify_Id,
          ArtistDatabaseId: artist.Id,
          AlbumTitle: album.Title,
          AlbumAverage: songArray.length ? albumAverage / songArray.length : 0,
          Songs: songArray
        });
        artistAverage += songArray.length ? albumAverage / songArray.length : 0;
      }
    }
    if(albumArray.length!=0){
    albumArray.sort((a,b)=> b.AlbumAverage-a.AlbumAverage)
    artistSongs.sort((a,b)=>b.Ranking-a.Ranking);
    while(artistSongs.length>25){
      artistSongs.pop();
    }
    artistArray.push({
      ArtistSpotifyId: artist.Spotify_Id,
      ArtistName: artist.Name,
      ArtistAverage: albumArray.length ? artistAverage / albumArray.length : 0,
      Albums: albumArray,
      AllSongs: artistSongs
    });
  }
  }
  artistArray.sort((a,b)=> b.ArtistAverage-a.ArtistAverage);
  allSongInfo.sort((a,b)=>b.Ranking-a.Ranking);
  allAlbumInfo.sort((a,b)=>b.AlbumAverage-a.AlbumAverage);
  while(allSongInfo.length>25){
    allSongInfo.pop();
  }
  return {
    ArtistInfo: artistArray,
    AlbumInfo: allAlbumInfo,
    SongInfo: allSongInfo
  };
}
//--

app.get('/stats', async (req, res) => {
  if (spotifyApi.getAccessToken()) {
    let info = await getStats(await getUserId());
    let lastPlace = await db.getUserCurrentRanking(await getUserId())
    res.render('stats', {info,lastPlace});
  } else {
    res.redirect('/');
  }
});
//--

app.get('/specificStats', async(req,res)=>{
  if(spotifyApi.getAccessToken()){
    const artistId = req.query.id
    let info = await getStats(await getUserId())
    let artistInfo;
    for(const artist of info.ArtistInfo){
      if(artistId == artist.ArtistSpotifyId){
        artistInfo = artist;
      }
    }
    res.render('stats',{info:{
      ArtistInfo: [artistInfo],
      AlbumInfo: artistInfo.Albums,
      SongInfo: artistInfo.AllSongs,
      BacktoStats: '/stats'
    }})
  }
})
//--
app.get('/autocomplete', async (req, res) => {
  const query = req.query.query;
  if (!query || query.length < 3) {
    return res.json([]);
  }

  try {
    const data = await spotifyApi.searchArtists(query, { limit: 5 });
    const artists = data.body.artists.items.map(artist => ({
      name: artist.name,
      id: artist.id
    }));
    res.json(artists);
  } catch (err) {
    console.error('Error fetching artist suggestions:', err);
    res.status(500).json([]);
  }
});
//--
//DEBUG METHOD
app.get('/clear',async(req,res)=>{
if(spotifyApi.getAccessToken()){
  await db.debugClearDatabase();
  res.redirect('/');}
})
//404 page not found 
app.use((req, res) => { 
    res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p><h3>Please return to the home page</h3><a id="returnURL" href = http://localhost:1989/>Return to Safety</a>`);
});