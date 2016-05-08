//Récuperation des modes.
var express = require('express');
var cookie = require('cookie-session');// Charge le middleware de sessions
var bodyParser = require('body-parser');// Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var pg = require('pg');

//init
var app = express();
app.set('port', (process.env.PORT || 5000));
//Welcome Stranger
app.use(cookie({
    name:"Knock",
    keys:['SayMyName']
}))

.use(function(req,res,next){
    if (typeof(req.session.logged) == 'undefined') {
        req.session.logged = false;
        req.session.login = "Visitor";
    }
    next();
});

//Home

app.get('/', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs', {logged: req.session.logged, login:req.session.login});
});

//Don't be a stranger anymore.
app.get('/signup', function(req,res){
    res.setHeader("content-Type","text/html");
    res.render("signUp.ejs", {logged: req.session.logged, login:req.session.login});
});

app.post('/signup/submit', urlencodedParser, function(req,res){
    req.session.login = req.body.nickname;
    req.session.logged = true;
    res.setHeader("code",201)
    res.redirect("/");
});

/*
app.get('/login', function(req, res){
    res.setHeader("content-Type","text/html");
    res.render("loginPanel.ejs");
});
*/
app.post('/login/submit', urlencodedParser, function(req,res){
    req.session.logged = true;
    req.session.login = req.body.nickname;
    res.setHeader("code", 302)
    res.redirect(req.referer || '/');
});

app.post('/login/logout', function(req,res){
    req.session.logged=false;
    req.session.login="Visitor";
    res.setHeader('code', 302);
    res.redirect(req.referer || '/')
});

//User and users.
/*
app.get('/users', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs');
});
app.get('/users/:userName', function(req, res) {
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

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});