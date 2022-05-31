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
            if(!users.some((user) => user.login === login &&
                user.password === password)){ 
                return false} else {return true 
            };
        };
        // authorization
        if(checkTokenAndLogin(token)){ next() } else { 
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
            if (adLogin === login) {
                status = true;
                break;
            }
        }
    }
    return status
};

let debugOn;
if (process.argv[2] == 'debug') { debugOn = true } else { debugOn = false };
const debugMiddleware = (req, res, next) => {
    if (debugOn) {
        const data = new Date() + " " + req.method + " " + req.path;
        const file = 'debug.txt';
        function debugFile(data, file) {
            fs.appendFile(file, data, "utf8", (err) => {
                if (err) { throw err; }
            });
        };
        debugFile(data + "\n", file);
        next();
    } else {
        next();
    };
};

app.use(express.json(), authMiddleware, debugMiddleware);
// app.use(express.json(), debugMiddleware);

init().then(() => {
    app.get('/ads', async (req, res) => {
        try {
            let ads = await getAds();
            // searching filters
            if (req.query.author) { ads = ads.filter((ad) => ad.author == req.query.author) } else if 
                (req.query.title) { ads = ads.filter((ad) => ad.title.includes(req.query.title)) } else if
                (req.query.tags) { ads = ads.filter((ad) => ad.tags.includes(req.query.tags)) } else if
                (req.query.minprice && req.query.maxprice) {
                    ads = ads.filter((ad) => (ad.price >= req.query.minprice & ad.price <= req.query.maxprice))
                } else if
                (req.query.minprice && req.query.maxprice) {
                ads = ads.filter((ad) => (
                    Number(ad.price) >= req.query.minprice &
                    Number(ad.price) <= req.query.maxprice
                ))
                } else if
                // console.log((ads[0].createdTime.toString()).substr(11,4));
                (req.query.minyear && req.query.maxyear) {
                    ads = ads.filter((ad) => (
                    parseInt(ad.createdTime.toString().substr(11, 4)) >= req.query.minyear &
                    parseInt(ad.createdTime.toString().substr(11, 4)) <= req.query.maxyear
                ))
            };
            if (ads.length === 0) {
                res.statusCode = status.NO_CONTENT;
                console.log("No content. Check filters. Error: " + res.statusCode);
                res.send();
            } else {
                res.statusCode = status.OK;
                res.send(ads)
            };
        } catch (error) {
            res.statusCode = status.INTERNAL_SERVER_ERROR;
            console.log(new Date() + " " + error);
            res.send("INTERNAL_SERVER_ERROR. Error: " + res.statusCode);
        };
    });

    app.get('/ads/:id', async (req, res) => {
        let ad;
        try {
            const { id } = req.params;
            try { ad = await getAd(id) }
            finally {
                if (!ad) {
                    res.statusCode = status.BAD_REQUEST;
                    console.log("Bad data sent. Error: " + res.statusCode);
                    res.send("Bad data sent. Error: " + res.statusCode);
                    return
                };
                if (id == ad._id) { res.send(ad) };
            };
        } catch (error) {
            res.statusCode = status.INTERNAL_SERVER_ERROR;
            console.log(new Date() + " " + error);
            res.send("INTERNAL_SERVER_ERROR. Error: " + res.statusCode);
        };
    });

    app.post('/ads', async (req, res) => {
        try {
            const newAd = req.body;
            if (!newAd.title || !newAd.description || !newAd.author || !newAd.tags ||
                !newAd.category || !newAd.price || !newAd.location || !newAd.contact) {
                res.statusCode = status.BAD_REQUEST;
                console.log("Bad data sent. Error: " + res.statusCode);
                res.send("Bad data sent. Error: " + res.statusCode);
            } else {
                const result = await addAd(newAd);
                if (result.insertedCount === 1) {
                    res.statusCode = status.CREATED;
                    res.send("Ad succesfully added. Code: " + res.statusCode);
                };
            };
        } catch (error) {
            res.statusCode = status.INTERNAL_SERVER_ERROR;
            console.log(new Date() + " " + error);
            res.send("INTERNAL_SERVER_ERROR. Error: " + res.statusCode);
        };
    });

    app.delete('/ads/:id', async (req, res) => {
        let ad;
        let login;
        try {
            const { id } = req.params;
            try { ad = await getAd(id);
                login = req.get("authorization").split(':')[0];
            }
            finally {
                if (!ad || !login) {
                    res.statusCode = status.BAD_REQUEST;
                    console.log("Bad data sent. Error: " + res.statusCode);
                    res.send("Bad data sent. Error: " + res.statusCode);
                    return
                };
            };
            const adLogin = ad.author;
            if (!delPatchOwnOnly(adLogin, login) ) {
                res.statusCode = status.CONFLICT;
                console.log("Not authorized to delete. Error: " + res.statusCode);
                res.send("Not authorized to delete. Error: " + res.statusCode);
                return
            };
            const result = await deleteAd(id);
            if (result.deletedCount == 1) {
                res.statusCode = status.NO_CONTENT;
                console.log("Content deleted. Code: " + res.statusCode);
                res.send("Content deleted. Code: " + res.statusCode);
            }
        } catch (error) {
            res.statusCode = status.INTERNAL_SERVER_ERROR;
            console.log(new Date() + " " + error);
            res.send();
        };
    });

    app.patch('/ads/:id', async (req, res) => {
        try {
            let selectedAd;
            let login;
            const { id } = req.params;
            try { selectedAd = await getAd(id);
                login = req.get("authorization").split(':')[0];
            }
            finally {
                if (!selectedAd || !login) {
                    res.statusCode = status.BAD_REQUEST;
                    console.log("Bad data sent. Error: " + res.statusCode);
                    res.send("Bad data sent. Error: " + res.statusCode);
                    return
                };
            };
            // authorization - only own can be modified
            const adLogin = selectedAd.author;
            if (!delPatchOwnOnly(adLogin, login) || adLogin !== login) {
                res.statusCode = status.CONFLICT;
                console.log("Not authorized to update. Error: " + res.statusCode);
                res.send("Not authorized to update. Error: " + res.statusCode);
                return
            };
            const modifiedAd = req.body;
            let modifiedCount = 0;
            // checking parameters and data, without id and time
            for (let i = 1; i < (Object.keys(selectedAd).length - 1); i++) {
                // console.log(Object.entries(selected)[0][0]); // other option
                if (Object.keys(selectedAd)[i] === Object.keys(modifiedAd)[i]) {
                    if (Object.values(selectedAd)[i] !== Object.values(modifiedAd)[i]) {
                        modifiedCount++
                    };
                } else {
                    res.statusCode = status.BAD_REQUEST;
                    console.log("Bad data sent. Error: " + res.statusCode);
                    res.send("Bad data sent. Error: " + res.statusCode);
                    return
                }
            };
            if (modifiedCount === 0) {
                res.statusCode = status.CONFLICT
                console.log("Nothing to update. Error: " + res.statusCode);
                res.send("Nothing to update. Error: " + res.statusCode);
            } else {
                const result = await updateAd(id, modifiedAd);
                res.statusCode = status.ACCEPTED;
                res.send("Ad was modified succesfully. Code: " + res.statusCode);
            }
        } catch (error) {
            res.statusCode = status.INTERNAL_SERVER_ERROR;
            console.log(new Date() + " " + error);
            res.send("INTERNAL_SERVER_ERROR. Error: " + res.statusCode);
        };
    });

    app.get('/heartbeat', (req, res) => {
        res.send(new Date());
    });
})

    .finally(() => {
        app.all('*', (req, res) => {
            res.statusCode = status.NOT_FOUND;
            console.log("Not found. Error: " + res.statusCode);
            res.sendFile(__dirname + '/404.jpg');
        });
        app.listen(process.env.PORT, () => console.log('server started'));
    })
