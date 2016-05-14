//GET THE MODES
var express = require('express');
var cookie = require('cookie-session');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var favicon = require('serve-favicon');
var bcrypt = require('bcrypt');
var pg = require('pg');

//Get my modes
var user = require('MHLusers');
var harem = require('MHLharems');

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
//~~~~~~~~~~~~~~~GET "/"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get('/', function(req, res) {
    res.setHeader("content-Type","text/html");
    res.render('index.ejs', {logs: req.session});
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~SIGNING UP/FILL THE DATABASE~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST/GET "/user"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Get the form page
app.get('/user', function(req,res){
    res.setHeader("content-Type","text/html");
    res.render("user.ejs", {logs: req.session});
});

//Post the user
app.post('/user', urlencodedParser, function(req,res){
    return user.postUser(req,res,function(req,res){
        //ending response if everything is aw... alright
        req.session.logged = true;
        req.session.login = req.body.nickname;
        //Then respond it was created
        return res.render("user.ejs", {logs: req.session},
            function(err, html){
            res.status(202).send(html);
        });
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~LOGGING IN / CHECKING DATABASE~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST LOGIN / GET LOGOUT~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//"Create" a connection 
app.post('/log', urlencodedParser, function(req,res){
    return user.logUser(req,res,function(req,res,test){
        if (test == true) {
            req.session.logged = true;
            req.session.login = req.body.nickname;
            return res.status(302).redirect(req.referer || "/");
        }
        else return res.sendStatus(400).redirect(req.referer || "/");
    });
});

//"Delete" a connection
app.delete('/log', function(req,res){
    req.session.logged=false;
    req.session.login="Visitor";
    return res.sendStatus('Ok');
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~SEARCH "ENGINE"~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GET/POST "/search"~~~~~~~~~~~~~~~
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
            client.query("SELECT charId, charName FROM characs WHERE charName ILIKE $1",
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
//~~~~~~~~~~~~~~~UNIVERS FORM~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GET/POST "/univers"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~Get univers~~~~~~~~~~~~~~~
app.get("/univers", function(req,res){
    res.setHeader("content-Type","text/html");
    res.render('univers.ejs', {logs: req.session});
});
//~~~~~~~~~~~~~~~POST univers~~~~~~~~~~~~~~~
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
//~~~~~~~~~~~~~~~GET "/type/ressource"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~for characters/univers/users~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/:itemtype/:itemid", function(req,res,next){
    //The object we're stocking data into
    var itemData = {
        "Type"  : req.params.itemtype, //string for users, id for others.
        "Id"    : req.params.itemid, //in character, user, univers.
        "Name"  : ""
    }
    var queryUniv = function(itemData, client, done, callback){
        client.query("SELECT univers.universName, universDesc FROM univers WHERE universnbr = $1",
            [itemData.Id],
            function(err,result){
            if(err) {
                return res.status(500).send("Oops, internal error.");
            }else if (typeof(result.rows[0])!='undefined') {
                itemData.Name = result.rows[0].universname;
                itemData.Desc = result.rows[0].universdesc;
                return queryCharas(itemData,client,done,callback);
            }else {return res.status(404).send("This univers doesn't exist")}
        });
    }
    var queryCharas = function(itemData,client,done,callback){
        client.query("SELECT charid,charname FROM characs WHERE universname=$1",
            [itemData.Name],function(err,result){
            done(client);
            if (err){
                console.log(err);
                return res.sendStatus(500);
            }
            itemData.Characs = result.rows
            return callback(itemData)
        });
    }

    var queryUser = function(itemData, client, done, callback){
        client.query("SELECT email FROM users WHERE nickname = $1",
            [itemData.Id],
            function(err,result){
            if(err) {
                console.log(err);
                return res.status(500).send("Oops, internal error.");
            } else if (typeof(result.rows[0])!='undefined'){
                itemData.Name   += itemData.Id;
                itemData.Email  = result.rows[0].email;
                return callback(itemData,client,done);
            } else { return res.status(404).send("This user doesn't exist") }
        });
    }
    var queryChar = function(itemData, client, done, callback){
        client.query("SELECT charname, alternames, chargender, chardesc, univers.universname, universnbr FROM characs, univers WHERE charid = $1 AND characs.universname = univers.universname",
            [itemData.Id],
            function(err,result){
            if(err) {
                return res.status(500).send("Oops, internal error.");
            } else if (typeof(result.rows[0])!='undefined') {
                itemData.Name   = result.rows[0].charname;
                itemData.AlterNames = result.rows[0].alternames;
                itemData.Gender = result.rows[0].chargender;
                itemData.Desc   = result.rows[0].chardesc;
                itemData.Parent = result.rows[0].universname;
                itemData.IdParent = result.rows[0].universnbr;
                return callback(itemData,client,done);
            } else { return res.status(404).send("This character doesn't exist") }
        });
    }
    var queryHarem = function(owner,itemData,client,done,callback){
        client.query("SELECT haremid,haremname,haremdesc FROM harems WHERE nickname=$1",
            [owner],function(err,result){
            done(client);
            if (err){
                console.log(err);
                return res.sendStatus(500);
            }
            itemData.harems = result.rows
            return callback(itemData)
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
            queryChar(itemData, client, done,function(itemData,client,done){
                //we want to show the harems of the logged user
                //from here, he could add characters to his lists.
                if (req.session.logged==true){
                    return queryHarem(req.session.login,itemData,client,done,responding);
                }else{
                    //else, we must close the client and respond.
                    done(client);
                    return responding(itemData);
                }
            });
        }
        else if (itemData.Type == "user") {
            queryUser(itemData, client, done, function(itemData,client,done){
                //we want to show harems of the user.
                return queryHarem(itemData.Id,itemData,client,done,responding);
            });
        }
        else if (itemData.Type == "univers") {
            queryUniv(itemData, client, done, responding);
        }else { done(client) ; return next() ; }
    })
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~HAREM LISTS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GET/POST(/PUT/DELETE)~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~"/user/username/harem"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~Get /user/user/harem~~~~~~~~~~~~~~~
app.get("/user/:iduser/:idharem", function(req,res,next){
    var queryHarem = function(req,res,client,done,callback){
        client.query("SELECT nickname,haremname,haremdesc FROM harems WHERE nickname=$1 AND haremid=$2",
            [req.params.iduser,req.params.idharem],function(err,result){
            if (err){
                done(client);
                console.log(err);
                return res.sendStatus(500);
            }
            return callback(result,req,res,client,done)
        });
    }
    var queryWeddings = function(data,req,res,client,done,callback){
        client.query("SELECT characs.charname, characs.charid, weddesc,favorite FROM weddings, characs WHERE haremid = $1 AND weddings.charid = characs.charid",
            [req.params.idharem],function(err,result){
            done(client);
            if (err){
                console.log(err);
                return res.sendStatus(500);
            }
            data.weddings = result.rows;
            return callback(data,req,res);
        });
    }
    var responding = function(data,req,res){
        res.render("harem.ejs",{logs:req.session,harem:data},function(err,html){
            if(err){
                console.log(err);
                return res.sendStatus(500);
            }
            res.status(200).send(html);
        });
    }
    pg.connect(process.env.DATABASE_URL, function(err,client,done){
        if (err) {
            done(client);
            console.log(err);
            return res.sendStatus(500);
        }
        queryHarem(req,res,client,done,function(result,req,res,client,done){
            if (typeof(result.rows[0])=='undefined'){
                done(client);
                return next();
            }else{
                var data = {
                    haremowner:result.rows[0].nickname,
                    haremname:result.rows[0].haremname,
                    haremdesc:result.rows[0].haremdesc
                }
                return queryWeddings(data,req,res,client,done,responding)
            }
        });
    });
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST "/user/user(/harem")~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.post("/user/:iduser",urlencodedParser, function(req,res){
    return harem.insertHarem(req,res, function(req,res,idharem){
        return res.set({
            "code":202,
            "location":("/user/"+req.params.iduser+"/"+idharem)
            })
            .redirect(("/user/"+req.params.iduser));
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST WEDDINGS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST "/user/user/harem/(idchar)"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.post("/user/:iduser/:idharem", urlencodedParser, function(req,res){
    return harem.insertWedding(req,res,function(req,res,idwedding){
        return res.set({
            "code":202,
            "location":("/user/"+req.params.iduser+"/"+req.params.idharem+"/"+idwedding)
            })
            .redirect(("/user/"+req.params.iduser+"/"+req.params.idharem));
    })
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST /CHARACS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.post('/characs', urlencodedParser, function(req,res){
    var insertChar = function(req,res,client,done,callback){
        client.query("INSERT INTO characs (charname,alternames, chargender,chardesc,universname) VALUES ($1,$2,$3,$4,$5) RETURNING charId",
            [req.body.CharName, req.body.AlterNames, req.body.CharGender, req.body.CharDesc, req.body.UniversName],
            function(err,result){
            done(client);
            if (err) {
                console.log(err);
                return res.sendStatus(500);
            }
            return callback(result.rows[0].charid,req,res);
        });
    }
    var responding = function(charid,req,res){

        return res.set({
            "code":202,
            "location":("/characs/"+charid)
        })
        .redirect(("/characs/"+charid));
    }

    pg.connect(process.env.DATABASE_URL, function(err,client,done){
        if (err) {
                console.log(err);
                return res.sendStatus(500);
        }
        return insertChar(req,res,client,done,responding);
    });
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