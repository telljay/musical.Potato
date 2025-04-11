const sqlite3 = require('sqlite3'); 
 
class DBAbstraction { 
    constructor(fileName) { 
        this.fileName = fileName; 
    } 
 
    //-- 
    init() { 
        return new Promise((resolve, reject) => { 
            this.db = new sqlite3.Database(this.fileName, async (err) => { 
                if(err) { 
                    reject(err); 
                } else { 
                    try { 
                        await this.createTables(); 
                        resolve(); 
                    } catch (err) { 
                        reject(err) 
                    } 
                } 
            }); 
        }); 
    } 
 
    //-- 
    createTables() { 
        const sql1 = ` 
            CREATE TABLE IF NOT EXISTS 'Artists' (  
                'Id' INTEGER,
                'Spotify_Id' TEXT,  
                'Name' TEXT,  
                PRIMARY KEY('Id') 
            );             
        `; 
        const sql2 = `
            CREATE TABLE IF NOT EXISTS 'Albums' (
                'Id' INTEGER,
                'Spotify_Id' TEXT,
                'Title' TEXT,
                'Artist_Id' INTEGER,
                PRIMARY KEY('Id'),
                FOREIGN KEY('Artist_Id') REFERENCES 'Artists'('Id') ON DELETE CASCADE
            );
        `;
        const sql3 = `
            CREATE TABLE IF NOT EXISTS 'Songs' (
                'Id' INTEGER,
                'Spotify_Id' TEXT,
                'Title' TEXT,
                'Album_Id' INTEGER,
                'Track_Number' INTEGER,
                'Url' TEXT,
                PRIMARY KEY('Id'),
                FOREIGN KEY('Album_Id') REFERENCES 'Albums' ('Id') ON DELETE CASCADE
            );
        `;
        const sql4 = `
            CREATE TABLE IF NOT EXISTS 'User' (
                'Id' INTEGER,
                'Spotify_Id' TEXT,
                'CurrentRanking' TEXT,
                PRIMARY KEY('Id')
            );
        `;
        const sql5 = `
            CREATE TABLE IF NOT EXISTS 'UserRanking' (
                'User_Id' INTEGER,
                'Song_Id' INTEGER,
                'Ranking' INTEGER,
                'IsCurrentSong' BOOLEAN,
                FOREIGN KEY ('User_Id') REFERENCES 'User' ('Id') ON DELETE CASCADE,
                FOREIGN KEY ('Song_Id') REFERENCES 'Songs' ('Id') ON DELETE CASCADE
            );
        `;
        const sql6 = `
            CREATE TABLE IF NOT EXISTS 'UserAlbumRanking'(
                'User_Id' INTEGER,
                'Album_Id' INTEGER,
                'FullyRanked' BOOLEAN,
                FOREIGN KEY ('User_Id') REFERENCES 'User' ('Id') ON DELETE CASCADE,
                FOREIGN KEY ('Album_Id') REFERENCES 'Albums' ('Id') ON DELETE CASCADE
            )`

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(sql1);
                this.db.run(sql2);
                this.db.run(sql3);
                this.db.run(sql4);
                this.db.run(sql5);
                this.db.run(sql6, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    } 
 
    //returns false or the database Id
    isArtistInDB(spotifyId){
        const sql = `            
            SELECT Id
            FROM Artists
            WHERE Spotify_Id = ? COLLATE NOCASE;
            `
        return new Promise ((resolve, reject)=>{
            this.db.get(sql,[spotifyId],(err,row)=>{
                if(err){
                    reject(new Error(`Database error while checking artist: ${err.message}`));
                } else if(row){
                    resolve(row.Id);
                } else {
                    resolve(false);
                }
                
            })
        })
    }

    //returns false or the database Id
    isSongInDB(spotifyId){
        const sql = `            
            SELECT Id
            FROM Songs
            WHERE Spotify_Id = ? COLLATE NOCASE;
            `
        return new Promise ((resolve, reject)=>{
            this.db.get(sql,[spotifyId],(err,row)=>{
                if(err){
                    reject(new Error(`Database error while checking song: ${err.message}`));
                } else if(row){
                    resolve(row.Id);
                } else {
                    resolve(false);
                }
                
            })
        })
    }

    //returns false or the database Id
    isAlbumInDB(spotifyId){
        const sql = `            
            SELECT Id
            FROM Albums
            WHERE Spotify_Id = ? COLLATE NOCASE;
            `
        return new Promise ((resolve, reject)=>{
            this.db.get(sql,[spotifyId],(err,row)=>{
                if(err){
                    reject(new Error(`Database error while checking album: ${err.message}`));
                } else if(row){
                    resolve(row.Id);
                } else {
                    resolve(false);
                }
                
            })
        })
    }

    //returns false or the database Id
    isUserInDB(spotifyId){
        const sql = `            
        SELECT Id
        FROM User
        WHERE Spotify_Id = ? COLLATE NOCASE;
        `
    return new Promise ((resolve, reject)=>{
        this.db.get(sql,[spotifyId],(err,row)=>{
            if(err){
                reject(new Error(`Database error while checking user: ${err.message}`));
            } else if(row){
                resolve(row.Id);
            } else {
                resolve(false);
            }
            
        })
    })
    }
    //-- 
    isRanking(userId,songId){
        const sql=`
        SELECT User_Id, Song_Id
        FROM UserRanking
        WHERE User_Id = ?
        AND Song_Id = ?`
        return new Promise((resolve,reject)=>{
            this.db.get(sql,[userId, songId],(err,row)=>{
                if(err){
                    reject(new Error(`Error Checking for ranking: ${err.message}`))
                }else if(row){
                    resolve({
                        User_Id: row.User_Id,
                        Song_Id: row.Song_Id
                    });
                } else{
                    resolve(false);
                }
            })
        })
    }
    //--

    isAlbumRanking(userId,albumId){
        const sql=`
        SELECT *
        FROM UserAlbumRanking 
        WHERE User_Id = ?
        AND Album_Id = ?`
        return new Promise((resolve,reject)=>{
            this.db.get(sql,[userId, albumId],(err,row)=>{
                if(err){
                    reject(new Error(`Error Checking for album ranking: ${err.message}`))
                }else if(row){
                    resolve({
                        User_Id: row.User_Id,
                        Album_Id: row.Album_Id,
                        FullyRanked: row.FullyRanked
                    });
                } else{
                    resolve(false);
                }
            })
        })
    }
    //returns artist Id or err
    insertArtist(spotifyId, name) {
        return this.isArtistInDB(spotifyId).then((isArtist) => {
            if (!isArtist) {
                const sql = `INSERT INTO Artists (Spotify_Id, Name) VALUES (?, ?)`; 
                return new Promise((resolve, reject) => {
                    this.db.run(sql, [spotifyId, name], (err) => {
                        if (err) {
                            reject(new Error(`Error inserting artist into the database: ${err}`));
                        } else {
                            // After inserting, fetch the artist ID
                            this.isArtistInDB(spotifyId).then(resolve).catch(reject);
                        }
                    });
                });
            } else {
                // Artist already exists, resolve with the existing artist ID
                return isArtist;
            }
        });
    }

    //Takes spotifyId, Title, and the Album_id(from isAlbum()) and returns songID
    insertSong(spotifyId, title, albumId,track_number,url) {
        return this.isSongInDB(spotifyId).then((isSong) => {
            if (!isSong) {
                const sql = `INSERT INTO Songs (Spotify_Id, Title, Album_Id,Track_Number,Url) VALUES (?,?, ?,?,?)`;
                return new Promise((resolve, reject) => {
                    this.db.run(sql, [spotifyId, title,albumId,track_number,url], (err) => {
                        if (err) {
                            reject(new Error(`Error inserting song into the database: ${err.message}`));
                        } else {
                            // After inserting, fetch the artist ID
                            this.isSongInDB(spotifyId).then(resolve).catch(reject);
                        }
                    });
                });
            } else {
                // Artist already exists, resolve with the existing artist ID
                return isSong; // Return the ID from the resolved row
            }
        });
    } 

    insertAlbum(spotifyId, title, artistId){
        return this.isAlbumInDB(spotifyId).then((isAlbum)=>{
            if(!isAlbum){
                const sql = `INSERT INTO Albums (Spotify_Id, Title, Artist_Id) VALUES (?, ?, ?)`; 
                return new Promise((resolve,reject)=>{
                    this.db.run(sql,[spotifyId,title,artistId],(err)=>{
                        if(err){
                            reject(new Error(`Error inserting album into database: ${err.message}`))
                        } else{
                            this.isAlbumInDB(spotifyId).then(resolve).catch(reject);
                        }

                    })
                });
            } else{
                return isAlbum;
            }
        });
    }

    insertUser(spotifyId){
        return this.isUserInDB(spotifyId).then((isUser)=>{
            if(!isUser){
                const sql = `INSERT INTO User (Spotify_Id) VALUES (?)`;
                return new Promise((resolve,reject) =>{
                    this.db.run(sql,[spotifyId],(err) =>{
                        if(err){
                            reject(new Error(`Error inserting user into the database: ${err.message}`));
                        }else{
                            this.isUserInDB(spotifyId).then(resolve).catch(reject);
                        }
                    })
                })
            } else{
                return isUser;
            }
        });
    }
    //-- 

    insertUserRanking(userId, songId){
        return this.isRanking(userId,songId).then((isRanking)=>{
            if(!isRanking){
                const sql = `INSERT INTO UserRanking (User_Id, Song_Id,IsCurrentSong) VALUES (?,?,?)`;
                return new Promise((resolve,reject)=>{
                    this.db.run(sql,[userId,songId,true],(err)=>{
                        if(err){
                            reject(new Error(`Error adding ranking to database ${err.message}`))
                        }else{
                            this.isRanking(userId,songId).then(resolve).catch(reject);
                        }
                    })
                })
            } else{
                return isRanking;
            }
        })
    }
    //--

    insertUserAlbumRanking(userId, albumId){
        return this.isAlbumRanking(userId,albumId).then((isRanking)=>{
            if(!isRanking){
                const sql = `INSERT INTO UserAlbumRanking (User_Id, Album_Id,FullyRanked) VALUES (?,?,?)`;
                return new Promise((resolve,reject)=>{
                    this.db.run(sql,[userId,albumId,false],(err)=>{
                        if(err){
                            reject(new Error(`Error adding ranking to database ${err.message}`))
                        }else{
                            this.isRanking(userId,albumId).then(resolve).catch(reject);
                        }
                    })
                })
            } else{
                return isRanking;
            }
        })
    }
    //--

    updateRanking(userId,songId,score){
        const sql =`
        UPDATE UserRanking
        SET Ranking = ?, IsCurrentSong = false
        WHERE User_Id = ?
        AND Song_Id = ?`
        return new Promise((resolve,reject)=>{
            this.db.run(sql, [score,userId,songId],(err)=>{
                if(err){
                    reject(new Error(`Error updating the ranking ${err.message}`))
                } else{
                    resolve();
                }
            })
        })
    }
    //--- 

    setFullyRanked(userId, albumId, torf){
        const sql =`
        UPDATE UserAlbumRanking
        SET FullyRanked = ?
        WHERE User_Id = ?
        AND Album_Id = ?`
        return new Promise((resolve,reject)=>{
            this.db.run(sql, [torf,userId,albumId],(err)=>{
                if(err){
                    reject(new Error(`Error Setting fully ranked album ${err.message}`));
                }else{
                    resolve();
                }
            })
        })
    }

    getAllSongs(albumId){
        const sql =`
            SELECT *
            FROM Songs
            WHERE Album_Id = ?`
            return new Promise((resolve,reject)=>{
                this.db.all(sql,[albumId],(err,rows)=>{
                    if(err){
                        reject(new Error(`Error getting all songs: ${err.message}`))
                    } else{
                        resolve(rows)
                    }
                })
            })
    }
    //-- 

    getAllSongsInDB(){
        const sql =`
            SELECT *
            FROM Songs`
            return new Promise((resolve,reject)=>{
                this.db.all(sql,[albumId],(err,rows)=>{
                    if(err){
                        reject(new Error(`Error getting all songs in the database: ${err.message}`))
                    } else{
                        resolve(rows)
                    }
                })
            })
    }
    //--
    getAllAlbumsInDB(){
        const sql =`
            SELECT *
            FROM Albums`
            return new Promise((resolve,reject)=>{
                this.db.all(sql,[albumId],(err,rows)=>{
                    if(err){
                        reject(new Error(`Error getting all albums in the database: ${err.message}`))
                    } else{
                        resolve(rows)
                    }
                })
            })
    }
    //--

    getAllAlbums(artistId){
        const sql =`
            SELECT *
            FROM Albums
            WHERE Artist_Id = ?`
            return new Promise((resolve,reject)=>{
                this.db.all(sql,[artistId],(err,rows)=>{
                    if(err){
                        reject(new Error(`Error getting all albums: ${err.message}`))
                    } else{
                        resolve(rows)
                    }
                })
            })
    }
    //-- 

    getAllArtist(){
        const sql =`
            SELECT *
            FROM Artists`
            return new Promise((resolve,reject)=>{
                this.db.all(sql,(err,rows)=>{
                    if(err){
                        reject(new Error(`Error getting all artists: ${err.message}`))
                    } else{
                        resolve(rows)
                    }
                })
            })
    }
    //-- 
    getSongByTrackNumber(albumId,tracknum){
        const sql = `
            SELECT *
            FROM Songs
            WHERE Album_Id = ?
            AND Track_Number = ?`
            return new Promise((resolve,reject)=>{
                this.db.get(sql,[albumId,tracknum],(err,row)=>{
                    if(err){
                        reject(new Error(`Error getting song by track number: ${err.message}`));
                    }else{
                        resolve(row);
                    }
                })
            })
    }
    //-- 
    getUserDbIdFromUserId(userId){
        const sql = `
        SELECT *
        FROM User
        WHERE Spotify_Id = ?`
        return new Promise((resolve,reject)=>{
            this.db.get(sql,[userId],(err,row)=>{
                if(err){
                    reject(new Error(`Error getting the user's database Id: ${err.message}`));
                }else{
                    resolve(row.Id);
                }
            })
        })
    }
    //-- 
    getUserCurrentRanking(userId){
        const sql = `
        SELECT *
        FROM User
        WHERE Id = ?`
        return new Promise((resolve,reject)=>{
            this.db.get(sql,[userId],(err,row)=>{
                if(err){
                    reject(new Error(`Error getting the user's current position: ${err.message}`));
                }else{
                    resolve(row.CurrentRanking);
                }
            })
        })
    }
    //-- 
    getRanking(userId,songId){
        const sql = `
        SELECT *
        FROM UserRanking
        WHERE User_Id = ?
        AND Song_Id = ?`
        return new Promise((resolve, reject)=>{
            this.db.get(sql, [userId,songId],(err,row)=>{
                if(err){
                    reject(new Error(`Error getting ranking: ${err.message}`));
                } else if (row){
                    resolve(row);
                }
                else{
                    resolve(false);
                }
            })
        })
    }
    updateCurrentRanking(userId,url){
        const sql = `
        UPDATE User
        SET CurrentRanking = ?
        WHERE Id = ?`;
        return new Promise((resolve,reject)=>{
            this.db.run(sql,[url,userId],(err)=>{
                if(err){
                    reject(new Error(`Error updating the last ranking`));
                }
                else{
                    resolve();
                }
            })
        })
    }

    isFullyRanked(albumId) {
        const sql = `
            SELECT FullyRanked
            FROM Albums
            WHERE Id = ?`;
        return new Promise((resolve, reject) => {
            this.db.get(sql, [albumId], (err, row) => {
                if (err) {
                    reject(new Error(`Error checking if album is fully ranked: ${err.message}`));
                } else if (!row) {
                    resolve(false); // Return false if the album does not exist
                } else {
                    resolve(row.FullyRanked);
                }
            });
        });
    }

    debugClearDatabase() {
        const sqls = [
            "DELETE FROM UserRanking;",
            "DELETE FROM UserAlbumRanking;"
        ];
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                sqls.forEach((sql) => this.db.run(sql));
                this.db.run("VACUUM;", (err) => {
                    if (err) {
                        reject(new Error(`Error clearing the database: ${err.message}`));
                    } else {
                        resolve();
                    }
                });
            });
        });
    }
   
} 
 
module.exports = DBAbstraction;