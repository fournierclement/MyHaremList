//Récuperation des modes.
var express = require('express');
var cookie = require('cookie-session');// Charge le middleware de sessions
var bodyParser = require('body-parser');// Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var mysql= require("mysql");

var app = express();
var SGBD = mysql.createConnection({
    host : 'localhost',
    user : 'HML',
    password : "lol",
    datebase : "MyHaremList",
    charset : "utf8"
});
SGBD.connect();

//Getting started
app.use(cookie({
    name:"Knock",
    keys:['Knock','Knock']
}))

.use(function(req,res,next){
    if (typeof(req.session.log) == 'undefined') {
        req.session.log = 'invité';
    }
    next();
});

//Show my you you are

app.get('/', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs');
});

app.get('/login', function(req, res){
    res.setHeader("content-Type","text/html");
    res.render("login.ejs");
});

app.post('/login/submit', function(req, res){
    SGBD.query("INSERT INTO users (email,nickname,passWord,gender,birth) VALUES(?,?,?,?,?)",
                [req.body.email,req.body.nickname,req.body.password,
                req.body.gender,req.body.birth],
                function(error, results, fields){

                });
});
/*
app.get('/user', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs');
});
app.get('/user/:userName', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs');
});
app.get('/character', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs');
});
app.get('/character/:charName:chaId', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs');
});
*/


//ASSETS DIRECTIONS
app.use(express.static("assets"));

//404 NOT FOUND
app.use(function(req, res, next){
    res.setHeader('content-Type', 'text/html');
    res.status(404).send('<h1>Page not Found</h1>'+'<a href="/">Back to the homepage</a>');
});

app.listen(8080);
SGBD.end(function(err){

});