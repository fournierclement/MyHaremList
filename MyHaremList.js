//GET THE MODES
var express = require('express');
var cookie = require('cookie-session');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var favicon = require('serve-favicon');
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
    //THOSE ARE COOKIES
    if (typeof(req.session.logged) == 'undefined') {
        req.session.logged = false;
        req.session.login = "Visitor";
        req.session.maxAge = 3600000;
    }
    next();
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~WELCOME HOME~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get('/', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs', {logs: req.session});
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~SIGNING UP/FILL THE DATABASE~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Get the form page
app.get('/user', function(req,res){
    res.setHeader("content-Type","text/html");
    res.render("user.ejs", {logs: req.session});
});

//Post the user
app.post('/user', urlencodedParser, function(req,res){
    //ending response if everything is aw... alright
    var goodresponse = function(req,res) {
        req.session.logged = true;
        req.session.login = req.body.nickname;
        //Then respond it was created
        return res.render("user.ejs", {logs: req.session},
            function(err, html){
            res.status(202).send(html);
        });
    }
    //Checking if the name's already in the DB (because i didn't made a parsing function in case of insert error)
    var checkname = function (req,res,client,done,callback) {
        client.query("SELECT nickname,email FROM users WHERE nickname = $1 OR email=$2",
                    [req.body.nickname, req.body.email], function(err, result){
            if(err) {
                done(client);
                //errors still possible
                return res.render("user.ejs", {logs: req.session, error:"Something went bad, contact fournier.clt@gmail.com."},
                    function(err, html){
                    res.status(400).send(html);
                });
            }
            var message = "";
            for ( i = 0 ; i < result.rows.length ; i++) {
                if(req.body.nickname == result.rows[i].nickname){ message += "Nickname already taken.\n" ; }
                else if (req.body.email == result.rows[i].email){ message += "Email already use." ; }
            }
            return callback(req, res, client, done, message);
        });
    }
    var insertname = function(req,res,client,done,callback){
        client.query("INSERT INTO users (nickname, email, password) VALUES ($1,$2,$3)",
            [req.body.nickname,req.body.email,req.body.password],
            function(err,result) {
            if(err) {
                done(client);
                console.log(err);
                //errors still possible
                return res.render("user.ejs", {logs: req.session, error:"Server Fail"},
                    function(err, html){
                    res.status(500).send(html);
                });
            }
            //free the client
            done(client);
            return callback(req,res);
        });
    }
//Script it before stocking it.
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            req.body.password = hash;
            //post it in the rdbsm
            pg.connect(process.env.DATABASE_URL, function (err,client,done) {
               //Handle connection to psql errors
                if(err) {
                    done(client);
                    console.log(err);
                    return res.render("user.ejs",
                            {logs: req.session, error:"Connection to database failed, try later."},
                            function(err, html){
                            res.status(500).send(html);
                        });
                }
                //Check it
                checkname(req,res, client,done,function(req,res,client,done,message){
                    if( message != "" ) {
                        done(client);
                        return res.render("user.ejs",
                                {logs: req.session, error:message},
                                function(err, html){
                                res.status(400).send(html);
                        });
                    }
                    //let it flow.
                    return insertname(req,res,client,done,goodresponse);
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
        var query = client.query("SELECT password FROM users WHERE nickname = $1",
            [req.body.nickname]);

        query.on('error', function(error) {
            if(error) {
                console.log(error);
                return res.render("user.ejs",
                        {logs: req.session, error:"Connection to database failed, try later."},
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
//~~~~~~~~~~~~~~~~SEARCH "ENGINE"~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/search",function(req,res){
    res.status(200).render("search.ejs",
        {logs: req.session,
         research:{
            "word":"",
            "type":null,
            "name":[]
         }
     });
});
//"create" a research
app.post("/search", urlencodedParser, function(req,res){
    //variable time 
    var research = {
        "word": req.body.word,
        "type": req.body.type,
        "name":[],
        "path":[]
    }


    //must manage every kind of research
    var querySearch = function(client,done,research,callback){
        //characters research
        if ( research.type == "characs" ){
            client.query("SELECT charId, charName FROM characs WHERE charName LIKE $1",
                ['%'+research.word+'%'], function(err, result){
                //error handling
                if(err) {
                  done(client);
                  console.log(err);
                  return res.sendStatus(500);
                }
                //push it in
                for (var i = 0; i < result.rows.length; i++) {
                    research.name.push(result.rows[i].charname);
                    research.path.push(result.rows[i].charid)
                }
                //then respond
                return callback(research);
            });
        //users research
        } else if ( research.type == "user" ){
            client.query("SELECT nickname FROM users WHERE nickname LIKE $1",
                ['%'+research.word+'%'], function(err, result){
                //error handy
                if(err) {
                  done(client);
                  console.log(err);
                  return res.sendStatus(500);
                }
                //push it to the max
                for (var i = 0; i < result.rows.length; i++) {

                    research.name.push(result.rows[i].nickname);
                    research.path.push(result.rows[i].nickname);
                }
                //back to watt
                return callback(research);
            });
        //univers
        }else if ( research.type == "univers" ){
            client.query("SELECT universNbr, universName FROM univers WHERE universName LIKE $1",
                ['%'+research.word+'%'], function(err, result){
                //errors ?
                if(err) {
                  done(client);
                  console.log(err);
                  return res.sendStatus(500);
                }
                //arraying isn't a verb
                for (var i = 0; i < result.rows.length; i++) {
                    research.name.push(result.rows[i].universname);
                    research.path.push(result.rows[i].universnbr);
                }
                //responding
                return callback(research);
            });
        }else{ return res.status(400).send("This is not in my base"); }
    }
        //connect the DB
    pg.connect(process.env.DATABASE_URL, function(err, client, done){
        //handle err
        if(err) {
          done(client);
          console.log(err);
          return res.sendStatus(500);
        }
        //query the research
        querySearch( client, done, research, function(research){
            done(client);
            res.render("search.ejs", {logs: req.session, research:research},
                function(err, html){
                res.status(202).send(html);
            });
        });
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GETTING SERIOUS :~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~UNIVERS FORM~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~(first try)~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/univers", function(req,res){
    res.setHeader("content-Type","text/html");
    res.render('univers.ejs', {logs: req.session});
});
app.post("/univers", urlencodedParser, function(req,res){
    var universData = {
        "name" : req.body.universName,
        "desc" : req.body.universDesc
    }
    //caring about the univers.
    var queryUniv = function(universDate, client, done, callback){
        client.query("INSERT INTO univers (universName,universDesc) VALUES ($1,$2) RETURNING universNbr",
            [universData.name, universData.desc],
            function(err,result){
            if(err) {
                done(client);
                //errors if already exist
                return res.status(400)
                    .render('univers.ejs',
                        {logs: req.session, error:"Name already taken."});
            }
            return callback(result.rows[0].universnbr);
        });
    }
    pg.connect(process.env.DATABASE_URL, function(err, client, done){
        //handle error
        if(err) {
            done(client);
            console.log(err);
            return res.sendStatus(500);
        }
        queryUniv(universData, client, done , function(universnbr){
            done(client);
            var urlUniv = "/univers/" + universnbr;
            res.status(202)
            .set({"location" : urlUniv })
            .render('univers.ejs',
                {logs: req.session, redirect:urlUniv});
        });
    });

});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~TYPE PAGE~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/:itemtype/:itemid", function(req,res,next){
    //The object we're stocking data into
    var itemData = {
        "Type"  : req.params.itemtype, //string for users, id for others.
        "Id"    : req.params.itemid, //in character, user, univers.
        "Name"  : ""
    }
    var queryUniv = function(itemData, client, done, callback){
        client.query("SELECT universName, universDesc FROM univers WHERE universnbr = $1",
            [itemData.Id],
            function(err,result){
            done(client);
            if(err) {
                return res.status(500).send("Oops, internal error.");
            }
            itemData.Name = result.rows[0].universname;
            itemData.Desc = result.rows[0].universdesc;
            return callback(itemData);
        });
    }

    var queryUser = function(itemData, client, done, callback){
        client.query("SELECT email FROM users WHERE nickname = $1",
            [itemData.Id],
            function(err,result){
            done(client);
            if(err) {
                console.log(err);
                return res.status(500).send("Oops, internal error.");
            }
            itemData.Name   += itemData.Id;
            itemData.Email  = result.rows[0].email;
            return callback(itemData);
        });
    }

    var queryChar = function(itemData, client, done, callback){
        client.query("SELECT charname, alternames, chargender, chardesc, univers.universname, universnbr FROM characs, univers WHERE charid = $1 AND characs.universname = univers.universname",
            [itemData.Id],
            function(err,result){
            if(err) {
                return res.status(500).send("Oops, internal error.");
            }
            itemData.Name   = result.rows[0].charname;
            itemData.AlterNames = result.rows[0].alternames;
            itemData.Gender = result.rows[0].chargender;
            itemData.Desc   = result.rows[0].chardesc;
            itemData.Parent = result.rows[0].universname;
            itemData.IdParent = result.rows[0].universnbr;
            return callback(itemData);
        });
    }

    var responding = function(itemData){
        return res.render((itemData.Type+"Page.ejs"),
            {logs: req.session, itemData:itemData},function(err,html){
                if(err) {console.log(err); res.sendStatus(500);}
                return res.status(200).send(html);
            });
    }
    pg.connect(process.env.DATABASE_URL, function(err, client, done){
        if(err) {
            done(client);
            console.log(err);
            return res.sendStatus(500);
        }
        if (itemData.Type == "characs") {
            queryChar(itemData, client, done, responding);
        }
        else if (itemData.Type == "user") {
            queryUser(itemData, client, done, responding);
        }
        else if (itemData.Type == "univers") {
            queryUniv(itemData, client, done, responding);
        }else { done(client) ; return next() ; }
    })
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~ASSETS DIRECTIONS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.use(favicon(__dirname + '/assets/favicon.ico'));
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