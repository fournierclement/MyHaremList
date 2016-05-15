//GET THE MODES
var express = require('express');
var cookie = require('cookie-session');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var bcrypt = require('bcrypt');
var pg = require('pg');

//Get my modes
var user = require('MHLusers');
var harem = require('MHLharems');
var universe =require('MHLuniverse');
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
    //Those are cookies
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
//~~~~~~~~~~~~~~~SIGNING UP user~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST/GET/PUT/DELETE "/user"~~~~~~~~~~~~~~~
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
//update the user
app.put('/user/:iduser', urlencodedParser, function(req,res){
    req.body.nickname = req.params.iduser;
    return user.logUser(req,res,function(req,res,test){
        if(test){
            return user.editUser(req,res,function(req,res){
                return res.sendStatus(202);
            });
        }
        else{ return res.sendStatus(401) ;}
    });
});
//delete the user
app.delete('/user/:iduser', urlencodedParser, function(req,res){
    req.body.nickname = req.params.iduser;
    return user.logUser(req,res,function(req,res,test){
        if(test){
            return user.deleteUser(req,res,function(req,res){
                return res.sendStatus(202);
            });
        }
        else{ return res.sendStatus(401) ;}
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~LOGGING IN ~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~loggin out~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//"Create" a connection/cookie/passcard
app.post('/log', urlencodedParser, function(req,res){
    return user.logUser(req,res,function(req,res,test){
        if (test == true) {
            req.session.logged = true;
            req.session.login = req.body.nickname;
            return res.status(302).redirect(req.referer || "/");
        }
        else return res.status(400).redirect(req.referer || "/");
    });
});

//"Delete" a connection
app.delete('/log', function(req,res){
    req.session.logged=false;
    req.session.login="Visitor";
    return res.sendStatus(200);
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~HAREM LISTS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GET/POST/DELETE)~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~"/user/username/harem"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST "/user/user(/harem")~~~~~~~~~~~~~~~
app.post("/user/:iduser",urlencodedParser, function(req,res){
    return harem.insertHarem(req,res, function(req,res,idharem){
        return res.set({
            "code":202,
            "location":("/user/"+req.params.iduser+"/"+idharem)
            })
            .redirect(("/user/"+req.params.iduser));
    });
});
//~~~~~~~~~~~~~~~Get /user/user/harem~~~~~~~~~~~~~~~
app.get("/user/:iduser/:idharem", function(req,res,next){
    return harem.getHaremById(req,res,function(req,res,harem,weddings){
        if (harem[0] != 'undefined') {
            res.render("harem.ejs",{logs:req.session,harem:harem,weddings:weddings}
                ,function(err,html){
                if(err){
                    console.log(err);
                    return res.sendStatus(500);
                }
                return res.status(200).send(html);
            });
        }else { return next(); }
    });
});
//delete /user/user/harem
app.delete("/user/:iduser/:idharem", function(req,res,next){
    return harem.deleteHarem(req,res,function(req,res){
        return res.sendStatus(202);
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST/DELETE WEDDINGS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST "/user/user/harem/(idchar)"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.post("/user/:iduser/:idharem", urlencodedParser, function(req,res){
    return harem.insertWedding(req,res,function(req,res,idwedding){
        return res.set({
            "code":202,
            "location":("/user/"+req.params.iduser+"/"+req.params.idharem+"/"+idwedding)
            })
            .redirect(("/user/"+req.params.iduser+"/"+req.params.idharem));
    });
});
app.delete("/user/:iduser/:idharem/:idwedding", urlencodedParser, function(req,res){
    return harem.deleteWedding(req,res,function(req,res){
        return res.sendStatus(202);
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~UNIVERS FORM~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GET/POST "/universe"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~Get universe~~~~~~~~~~~~~~~
app.get("/universe", function(req,res){
    res.setHeader("content-Type","text/html");
    res.render('universe.ejs', {logs: req.session});
});
//~~~~~~~~~~~~~~~POST universe~~~~~~~~~~~~~~~
app.post("/universe", urlencodedParser, function(req,res){
    return universe.insertUniverse(req,res,function(req,res,universenbr){
        res.render("universe.ejs",{logs: req.session, redirect:("/universe/" + universenbr)},
            function(err,html){
            return res.status(202)
                .set({"location":("/universe/" + universenbr)}).send(html);
        });
    });
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~POST /CHARACS~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.post('/characs', urlencodedParser, function(req,res){
    return universe.insertChar(req,res,function(req,res,charid){
        return res.set({
            "code":202,
            "location":("/characs/"+charid)
            })
            .redirect(("/characs/"+charid));
    });
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
    var querySearch = function(req,res,research,callback){
        //characters research
        if ( research.type == "characs" ){
            return universe.getCharactersByName(req,res,function(req,res,characters){
                for (var i = 0; i < characters.length; i++) {
                    research.name.push(characters[i].charname);
                    research.path.push(characters[i].charid)
                }
                return callback(req,res,research);
            });
        //users research
        } else if ( research.type == "user" ){
            return user.getUsersByName(req,res,function(req,res,users){
                for (var i = 0; i < users.length; i++) {
                    research.name.push(users[i].nickname);
                    research.path.push(users[i].nickname);
                }
                //back to watt
                return callback(req,res,research);
            });
        //universe
        }else if ( research.type == "universe" ){
            return universe.getUniversesByName(req,res,function(req,res,universes){
                for (i = 0 ; i < universes.length ; i++){
                    research.name.push(universes[i].universename);
                    research.path.push(universes[i].universenbr)
                }
                return callback(req,res,research);
            });
        }else{ return res.status(400).send("This is not in my base"); }
    }
    //query the research
    return querySearch(req,res,research, function(req,res,research){
        return res.render("search.ejs", {logs: req.session, research:research},
            function(err, html){
                if(err){console.log(err);return res.sendStatus(500);}
            res.status(202).send(html);
        });
    });
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~TYPE PAGE~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~GET "/type/ressource"~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~for characters/universe/users~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/:itemtype/:itemid", function(req,res,next){
    //The object we're stocking data into
    var itemData = {
        "Type"  : req.params.itemtype, //string for users, id for others.
        "Id"    : req.params.itemid, //in character, user, universe.
        "Name"  : ""
    }
    var queryUniv = function(itemData, client, done, callback){
        client.query("SELECT universe.universeName, universeDesc FROM universe WHERE universenbr = $1",
            [itemData.Id],
            function(err,result){
            if(err) {
                return res.status(500).send("Oops, internal error.");
            }else if (typeof(result.rows[0])!='undefined') {
                itemData.Name = result.rows[0].universename;
                itemData.Desc = result.rows[0].universedesc;
                return queryCharas(itemData,client,done,callback);
            }else {return res.status(404).send("This universe doesn't exist")}
        });
    }
    var queryCharas = function(itemData,client,done,callback){
        client.query("SELECT charid,charname FROM characs WHERE universename=$1",
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
        client.query("SELECT charname, alternames, chargender, chardesc, universe.universename, universenbr FROM characs, universe WHERE charid = $1 AND characs.universename = universe.universename",
            [itemData.Id],
            function(err,result){
            if(err) {
                return res.status(500).send("Oops, internal error.");
            } else if (typeof(result.rows[0])!='undefined') {
                itemData.Name   = result.rows[0].charname;
                itemData.AlterNames = result.rows[0].alternames;
                itemData.Gender = result.rows[0].chargender;
                itemData.Desc   = result.rows[0].chardesc;
                itemData.Parent = result.rows[0].universename;
                itemData.IdParent = result.rows[0].universenbr;
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
        else if (itemData.Type == "universe") {
            queryUniv(itemData, client, done, responding);
        }else { done(client) ; return next() ; }
    })
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