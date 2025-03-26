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
                PRIMARY KEY('Id'),
                FOREIGN KEY('Album_Id') REFERENCES 'Albums' ('Id') ON DELETE CASCADE
            );
        `;
        const sql4 = `
            CREATE TABLE IF NOT EXISTS 'User' (
                'Id' INTEGER,
                'Spotify_Id' TEXT,
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
        return new Promise((resolve, reject) => { 
            this.db.run(sql1, [], (err) => {                 
                if (err) { 
                    reject(err); 
                } else { 
                    this.db.run(sql2, [], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this.db.run(sql3, [], (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    this.db.run(sql4, [], (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            this.db.run(sql5, [], (err) => {
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    resolve();
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
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
    insertSong(spotifyId, title, albumId) {
        return this.isSongInDB(spotifyId).then((isSong) => {
            if (!isSong) {
                const sql = `INSERT INTO Songs (Spotify_Id, Title, Album_Id) VALUES (?, ?,?)`;
                return new Promise((resolve, reject) => {
                    this.db.run(sql, [spotifyId, title,albumId], (err) => {
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

    /*
                CREATE TABLE IF NOT EXISTS 'UserRanking' (
                'User_Id' INTEGER,
                'Song_Id' INTEGER,
                'Ranking' INTEGER,
                'IsCurrentSong' BOOLEAN,
                FOREIGN KEY ('User_Id') REFERENCES 'User' ('Id') ON DELETE CASCADE,
                FOREIGN KEY ('Song_Id') REFERENCES 'Songs' ('Id') ON DELETE CASCADE
            );
    */
    //-- REFERENCE -------------------------------------------------------------------------------REFERENCE --//
    getAllCourses(){
        const sql = `
            SELECT CourseCode, Title, SemesterOffered, YearOffered, ProfessorName, GradeEarned
            FROM Courses;
        `;
        return new Promise((resolve, reject)=>{
            this.db.all(sql, (err,rows)=>{
                if(err){
                    reject(err);
                } else{
                    resolve(rows);
                }
            })
        })
    }

    getGPA(){
        const sql = `
            SELECT GradeEarned
            FROM Courses;
        `
        return new Promise((resolve, reject)=>{
            this.db.all(sql, [], (err,rows)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(rows);
                }
            })
        })
    }

} 
 
module.exports = DBAbstraction;