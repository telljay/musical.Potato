import spotipy
from spotipy.oauth2 import SpotifyOAuth
#--
import sqlite3
from sqlite3 import Error
#--
import subprocess
import requests
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
    return ""
#--
def approve_login():
    
    return False
#--
@app.route("/search", methods= ["POST"])
def basic_search():
    jsonPostData = request.get_json()
    searchCriteria = jsonPostData["searchBarResults"]
    results = sp.search(q=searchCriteria, type='artist', limit=5)
    artistIDArray=[]
    for artist in results['artists']['items']:
        print(f"Artist Name: {artist['name']}, Popularity: {artist['popularity']}, Followers: {artist['followers']['total']}")

    selectedArtist = int(input(f"select 1-5 to select the artist to rank"))

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
def get_ID(check_name):
    results = sp.search(q=check_name, type='track,artist,album')

    if results['tracks']['items']:
        track_id = results['tracks']['items'][0]['id']
        return track_id
    elif results['artists']['items']:
        artist_id = results['artists']['items'][0]['id']
        return artist_id
    elif results['albums']['items']:
        album_id = results['albums']['items'][0]['id']
        return album_id
    else:
        raise ValueError("No matching results found")
def rank_songs(artist):
    try:
        entity = []
        conn = sqlite3.connect("./musicalMaddnessDatabase.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        artistAlbums = get_allAlbums(artist)
        artistAlbums.reverse()
        cursor.execute("""INSERT INTO Artist (name) VALUES (?) """, (artist,))
        conn.commit()
        cursor.execute("""SELECT artist_ID FROM Artist WHERE name = ?""", (artist,))
        row = cursor.fetchone()
        artist_loc = row[0]
        for album in artistAlbums:
            album_id = album['id']

            tracks = sp.album_tracks(album_id)['items']

            average=0.0

            cursor.execute("""INSERT INTO Album (title, releaseDate, artist_ID) VALUES (?,?,?)""", (album['name'], album['release_date'],artist_loc,))
            conn.commit()
            cursor.execute("""SELECT album_ID FROM Album WHERE title = ?""", (album['name'],))
            row2 = cursor.fetchone
            album_loc=row2[0]

            for track in tracks:
                print(f"Current Song: {track['name']}")
                ranking = input("Please rank this song 1-10: ")
                cursor.execute("""INSERT INTO Song (title, album_ID) VALUES (?,?)""", (track['name'],album_loc,))
                conn.commit()
                if int(ranking) <= 10 or int(ranking) >= 1:
                    ranking = int(ranking)
                    average+=ranking

                else:
                    print("INVALID RANKING")
                    print(f"Current Song: {track['name']}")
                    ranking = ("Please rank this song 1-10: ")
                    ranking = int(ranking)
                    average+=ranking

            print(f"{average/len(tracks)}")

    except Error as e:
        print (f"Error opening database: {e}")
#--
def main():
    #basic_search()
    rank_songs("Taylor Swift")
#--
main()