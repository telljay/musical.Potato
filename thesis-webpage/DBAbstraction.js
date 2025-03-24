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
 
    //--
    isArtistInDB(spotifyId){
        sql = `            
            SELECT Name
            FROM Artists
            WHERE Spotify_Id = ? COLLATE NOCASE
            `
        new Promise ((resolve, reject)=>{
            this.db.all(sql,[spotifyId],(err,rows)=>{
                if(err){
                    reject(err);
                } else if(rows){
                    return true
                } else {
                    return false;
                }
                
            })
        })
    }

    //--
    isSongInDB(spotifyId){

    }

    //--
    isAlbumInDB(spotifyId){

    }

    //--
    isUserInDB(spotifyId){

    }

    //--
    insertCourse(courseCode, title, semesterOffered, yearOffered,professorName,grade) { 
        const sql = 'INSERT INTO Courses (CourseCode, Title, SemesterOffered, YearOffered, ProfessorName, GradeEarned) VALUES (?, ?, ?,?,?,?);'; 
        return new Promise((resolve, reject) => { 
            this.db.run(sql, [courseCode, title, semesterOffered, yearOffered, professorName, grade], (err) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(); 
                } 
            }); 
        }); 
    } 

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

    getCoursesBySemesterAndYear(semester,year) {
        const sql = `
            SELECT CourseCode, Title, SemesterOffered, YearOffered, ProfessorName, GradeEarned
            FROM Courses
            WHERE SemesterOffered = ? COLLATE NOCASE
            AND YearOffered = ? COLLATE NOCASE;
        `;
        return new Promise((resolve, reject)=>{
            this.db.all(sql, [semester,year], (err,rows)=>{
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