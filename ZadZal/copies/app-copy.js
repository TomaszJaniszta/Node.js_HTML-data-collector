require('dotenv').config();

const express = require('express');
const status = require('http-status');
const app = express();
const users = require('./users');
const { init, getAds, getAd, deleteAd, addAd, updateAd } = require('./db');
const fs = require("fs");

const authMiddleware = (req, res, next) => {
    if(req.method === "PATCH" || req.method === "DELETE"){
        const token = req.get("authorization");
        const checkTokenAndLogin = (token) => {
            if(!token || !token.includes(':')){ return false };
            const [login, password] = token.split(':');
            if(!users.some((user) => user.login === login && user.password === password)){ 
                return false } else {
                     return true };
            };
        
        if(checkTokenAndLogin(token)){
                next(); // authorization
            } else { 
                    console.log("Wrong token or no token. Unauthorized. Error: "+ res.statusCode);
                    res.status(401);
                    res.send("Wrong token or no token. Unauthorized. Error: "+ res.statusCode);
                    };
        } else {next()}; // not patch/delete method
    };		

const delPatchOwnOnly = (adLogin, login) => {
    let status = false;	
    let authorizedLogins = [];
    users.forEach((u) => authorizedLogins.push(Object.entries(u)[0][1]));
    for (let i = 0; i < authorizedLogins.length; i++) {							
        let auth = authorizedLogins[i];							
        if (auth === login) {		
            if(adLogin === login){ 
                status = true;
                break;				
                }
            }
        }
        return status
    };
    
let debugOn;
if(process.argv[2]=='debug'){debugOn = true}else{debugOn = false};
const debugMiddleware = (req, res, next) => {
    if (debugOn){
        const data = new Date() + " " + req.method + " " + req.path;
        const file = 'debug.txt';
        function debugFile(data, file) {
            fs.appendFile(file, data, "utf8", (err) => {
            if (err) { throw err; }
            });
        };   
        debugFile(data  + "\n", file);
        next();
    } else {
    next();
    };
};
        
// app.use(express.json(), authMiddleware, debugMiddleware);
app.use(express.json(), debugMiddleware);

init().then(() => {
    app.get('/ads', async (req, res) => {
        let ads = await getAds();
        // searching filters
        if(req.query.author){ads = ads.filter((ad) => ad.author == req.query.author)};
        if(req.query.title){ads = ads.filter((ad) => ad.title.includes(req.query.title))};
        if(req.query.tags){ads = ads.filter((ad) => ad.tags.includes(req.query.tags))};
        if(req.query.minprice && req.query.maxprice){
            ads = ads.filter((ad) => (ad.price >= req.query.minprice & ad.price <=  req.query.maxprice))
            };
        if(req.query.minprice && req.query.maxprice){
            ads = ads.filter((ad) => (
                Number(ad.price)>=req.query.minprice & 
                Number(ad.price)<=req.query.maxprice
                ))
            };
        if (req.query.minyear && req.query.maxyear){
            ads = ads.filter((ad) => (
                parseInt(ad.createdTime.substr(0,4))>=req.query.minyear &
                parseInt(ad.createdTime.substr(0,4))<=req.query.maxyear 
                ))
            };

        if (ads.length === 0) {
            res.statusCode = status.NOT_FOUND;
            res.sendFile(__dirname + '/404.jpg');
        } else {res.send(ads)};
    });

    app.get('/ads/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const ad = await getAd(id);
                res.send(ad);
            } catch (error) {
                res.statusCode = status.NOT_FOUND;
                console.log(error)
                res.send("Id not found. Error: "+ res.statusCode);
            };
        });

    app.post('/ads', async (req, res) => {
        const newAd = req.body;
        // checking propertis newAd, code 400 if something is missing
        if (!newAd.title || !newAd.description || !newAd.author || !newAd.tags ||
            !newAd.category || !newAd.price || !newAd.location || !newAd.contact){
            res.statusCode = status.BAD_REQUEST;
            res.send("Bad data sent. Error: "+ res.statusCode);
        } else {
        // have nessesary propertis
            const result = await addAd(newAd);
            if (result.insertedCount === 1) {
                res.statusCode = status.CREATED;
                res.send("Ad succesfully added. Code: "+ res.statusCode);
            } else {
                res.statusCode = status.INTERNAL_SERVER_ERROR;
                res.send("INTERNAL_SERVER_ERROR. Error: "+ res.statusCode);
            }
        };
    });

    app.delete('/ads/:id', async (req, res) => {
        const { id } = req.params;
        const ad = await getAd(id);
        const adLogin = ad.author;
        const login = req.get("authorization").split(':')[0];
        
        if(!delPatchOwnOnly(login) || adLogin !== login ){
            res.statusCode = status.CONFLICT;
            res.send("Not authorized to delete. Error: "+ res.statusCode);
        };
        
        const result = await deleteAd(id);
        if (result.deletedCount == 1){
            res.statusCode = status.NO_CONTENT;
            res.send("Content deleted. Code: "+ res.statusCode);
        } else {
            res.statusCode = status.NOT_FOUND;
            res.send("Not found. Error: "+ res.statusCode);
        }
    });

    app.patch('/ads/:id', async (req, res) => {
        const { id } = req.params;

        let selectedAd;
        try {
            selectedAd = await getAd(id);
        } catch (error) {
            res.statusCode = status.NOT_FOUND;
            console.log(error)
            res.send("Id not found. Error: "+ res.statusCode);
            };

        const adLogin = selectedAd.author;
        const login = req.get("authorization").split(':')[0];

        if(!delPatchOwnOnly(login) || adLogin !== login ){
            res.statusCode = status.CONFLICT;
            res.send("Not authorized to delete. Error: "+ res.statusCode);
        };

        const modifiedAd = req.body;
        let modifiedCount = 0;
        // checking parameters and data
            for(let i = 1; i < (Object.keys(selectedAd).length -1); i++){
                // console.log(Object.entries(selected)[0][0]); // other option
                if( Object.keys(selectedAd)[i] === Object.keys(modifiedAd)[i] ){
                    if( Object.values(selectedAd)[i] !== Object.values(modifiedAd)[i]){ 
                        console.log(Object.values(selectedAd)[i], Object.values(modifiedAd)[i]);
                        modifiedCount++ };
                    } else {
                        console.log("Bad data entries")
                        res.statusCode = status.BAD_REQUEST 
                        console.log(BAD_REQUEST, res.statusCode )
                        res.send("Bad data entries. Different key fields. Error: "+ res.statusCode);
                        return
                }
            };

        // the same data, nothing to update
        if ( modifiedCount === 0 ){ 
            res.statusCode = status.CONFLICT 
            res.send("Bad data entries. Nothing to update. Error: "+ res.statusCode);
        } else {
        // update
            console.log(res);
            const result = await updateAd( id, modifiedAd );
            res.statusCode = status.ACCEPTED;
            res.send("Ad was modified succesfully. Code: "+ res.statusCode);
        }
    });

    app.get('/heartbeat', (req, res) => {
        res.send(new Date());
    });

})

.finally(() => {
    app.all('*', (req, res) => {		
        res.statusCode = status.NOT_FOUND;
        res.sendFile(__dirname + '/404.jpg');
    });	
    app.listen(process.env.PORT, () => console.log('server started'));
})