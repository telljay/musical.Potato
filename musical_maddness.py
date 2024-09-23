import spotipy
from spotipy.oauth2 import SpotifyOAuth
import sqlite3
from sqlite3 import Error

import sys

from flask import Flask
from flask import request
from flask import current_app
from flask import abort
app = Flask(__name__)
import json

SPOTIPY_CLIENT_ID = 'e3d6ae52792d4f6bb286ef14c6ee270c'
SPOTIPY_CLIENT_SECRET = '6214d65c3e454af6aa92c0ab49d14915'
SPOTIPY_REDIRECT_URI = 'http://127.0.0.1:5000/'

def opening_screen():
    return "Welcome to Advanced Musical Understanding\nPlease Log into your Spotify Account to Continue"
#--
def approve_login():
    
    return False
#--
def main():

    return 0
    