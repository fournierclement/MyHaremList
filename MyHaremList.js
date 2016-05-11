//GET THE MODES
var express = require('express');
var cookie = require('cookie-session');// Charge le middleware de sessions
var bodyParser = require('body-parser');// Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var bcrypt = require('bcrypt');
var pg = require('pg');

//INIT
var app = express();
app.set('port', (process.env.PORT || 5000));
pg.defaults.ssl = true;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~WELCOME STRANGER~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Obvious cookie format
app.use(cookie({
    name:"Knock",
    keys:['SayMyName']
}))
//If you are noone, be our guest.
.use(function(req,res,next){
    if (typeof(req.session.logged) == undefined) {
        req.session.logged = false;
        req.session.login = "Visitor";
    }
    next();
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~WELCOME HOME~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get('/', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs', {logged: req.session.logged, login:req.session.login});
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~SIGNING UP/FILL THE DATABASE~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Get the form page
app.get('/user', function(req,res){
    res.setHeader("content-Type","text/html");
    res.render("user.ejs", {logged: req.session.logged, login:req.session.login});
});

//Post the user
app.post('/user', urlencodedParser, function(req,res){
    var subs = req.body;
    var message ="";
    //Hash to ash
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(subs.password, salt, function(err, hash) {
            subs.password = hash;
            //post it in the rdbsm
            pg.connect(process.env.DATABASE_URL, function (err,client,done) {
               //Handle connection to psql errors
                if(err) {
                    done(client);
                    console.log(err);
                    return res.render("user.ejs",
                            {logged: req.session.logged, login:req.session.login, error:"Connection to database failed, try later."},
                            function(err, html){
                            res.status(500).send(html);
                        });
                }
                //Check nickname and email before insert
                var query = client.query("SELECT nickname,email FROM users WHERE nickname = $1 OR email=$2",
                    [subs.nickname,subs.email]);
                query.on('error', function(error){
                    if(error) {return}
                });
                //Does it already exist ? make it human acknowlageable.
                query.on('row', function(row){
                    if(subs.nickname == row.nickname){
                        message += "Nickname already taken.\n"
                    } else if (subs.email == row.email){
                        message += "Email already use."
                    }
                });
                query.on('end', function(){
                    if(message != ""){
                        //need to send the message in the user form but also the 400 bad request code.
                        done(client);
            //MUST FOUND A WAY TO SEND THE TWO OF THOSE BACK
                        res.render("user.ejs", {logged: req.session.logged, login:req.session.login, error:message},
                            function(err, html){
                            res.status(400).send(html);
                        });
                    }
                    else{
                        // Else insert the user into the DB
                        client.query("INSERT INTO users(nickname, email, gender, birth, password) VALUES ($1,$2,$3,$4,$5)",
                            [subs.nickname,subs.email,subs.gender,subs.birth,subs.password],
                        function(err){
                            if(err) {
                                done(client);
                                //errors still possible
                                return res.render("user.ejs", {logged: req.session.logged, login:req.session.login, error:"Something went bad, contact fournier.clt@gmail.com."},
                                    function(err, html){
                                    res.status(400).send(html);
                                });
                            }
                            //free the client
                            done(client);
                            //give him a cookie
                            req.session.logged = true;
                            req.session.login = req.body.nickname;
                            //Then respond it was created
                            res.render("user.ejs", {logged: req.session.logged, login:req.session.login},
                                function(err, html){
                                res.status(202).send(html);
                            });
                        });
                    }
                });
            });
        });
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~LOGGING IN / CHECKING DATABASE~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// "Create" a connection
app.post('/login', urlencodedParser, function(req,res){

    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done(client);
          console.log(err);
          return res.sendStatus(500);
        }
        //Querying the password
        var query = client.query("SELECT userid, password FROM users WHERE nickname = $1",
            [req.body.nickname]);

        query.on('error', function(error) {
            if(error) {
                console.log(error);
                return res.render("user.ejs",
                        {logged: req.session.logged, login:req.session.login, error:"Connection to database failed, try later."},
                        function(err, html){
                        res.status(500).send(html);
                    });
            }
        });
        var result;
        var test;
        query.on('row', function(row){
            //taking the line (should be alone anyway)
            result = row;
        }),
        query.on('end', function(){
            bcrypt.compare(req.body.password,result.password, function(err, test) {
                done(client);
                if( test == true ) {
                    //success cookie time
                    req.session.logged = true;
                    req.session.login = req.body.nickname;
                    //Then respond
                    res.status(200).redirect(req.referer || "/");
                }
                else if (test == false) {
                    //fail go back to the kitchen
                    res.status(400).redirect(req.referer || "/");
                }
            });
        });
    });
});

//"GET" a deconnection (yeah, i fixed it.)
app.get('/logout', function(req,res){
    req.session.logged=false;
    req.session.login="Visitor";
    res.status(200).redirect(req.referer || "/");
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~Testouillons~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/user/truc",function(req,res){
    res.status(200).render("index.ejs",{logged: req.session.logged, login:req.session.login, error:"Connection to database failed, try later."});
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~ASSETS DIRECTIONS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.use(express.static(__dirname+"/assets"));
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~404 NOT FOUND~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.use(function(req, res, next){
    res.setHeader('content-Type', 'text/html');
    res.status(404).send('<h1>Page not Found</h1>'+'<a href="/">Back to the homepage</a>');
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});