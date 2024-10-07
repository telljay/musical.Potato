import spotipy
from spotipy.oauth2 import SpotifyOAuth
#--
import sqlite3
from sqlite3 import Error
#--
import sys
#--
from flask import Flask
from flask import request
from flask import current_app
from flask import abort
app = Flask(__name__)
#--
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id="e3d6ae52792d4f6bb286ef14c6ee270c",
client_secret="6214d65c3e454af6aa92c0ab49d14915",
redirect_uri="http://127.0.0.1:5000/",
scope="user-library-read"))
#--
SPOTIPY_CLIENT_ID = 'e3d6ae52792d4f6bb286ef14c6ee270c'
SPOTIPY_CLIENT_SECRET = '6214d65c3e454af6aa92c0ab49d14915'
SPOTIPY_REDIRECT_URI = 'http://127.0.0.1:5000/'
@app.route("/")
def opening_screen():
    return "Welcome to Advanced Musical Understanding\nPlease Log into your Spotify Account to Continue"
#--
def approve_login():
    
    return False
#--
@app.route("/search", methods= ["POST"])
def basic_search():
    jsonPostData = request.get_json()
    searchCriteria = jsonPostData["searchBarResults"]
    results = sp.search(q=searchCriteria, type='artist', limit=5)
    # Print out the results
    for artist in results['artists']['items']:
        print(f"Artist Name: {artist['name']}, Popularity: {artist['popularity']}, Followers: {artist['followers']['total']}")
    return  results
#--
def get_allAlbums(artist):
    artist_name = artist
    result = sp.search(q='artist:' + artist_name, type='artist')
    artist_id = result['artists']['items'][0]['id']

    albums = sp.artist_albums(artist_id, album_type='album')
    all_albums = albums['items']

    return all_albums
#--
def rank_songs(artist):
    try:
        entity = []
        conn = sqlite3.connect("./musicalMaddnessDatabase")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        artistAlbums = get_allAlbums(artist)
        for album in artistAlbums:
            album_id = album['id']
            tracks = sp.album_tracks(album_id)['items']
            for track in tracks:
                print(f"Current Song: {track['name']}")
                ranking = input("Please rank this song 1-10: ")
                if ranking > 10 or ranking < 1:
                    print("INVALID RANKING")
                    print(f"Current Song: {track['name']}")
                    ranking = input("Please rank this song 1-10: ")

    except Error as e:
        print (f"Error opening database: {e}")
#--
def main():
    rank_songs("Taylor Swift")
#--
main()