require('dotenv').config();
const express = require('express');
const status = require('http-status');
const app = express();

const { init, getAds, getAd, deleteAd, addAd, updateAd } = require('./db');

app.use(express.json());

init().then(() => {
    app.get('/ads', async (req, res) => {
        const ads = await getAds();
        res.send(ads);
    });

    app.get('/ads/:id', async (req, res) => {
        const { id } = req.params;
            try {
                // checking for bad token
                const ad = await getAd(id);
                res.send(ad);
            } catch (error) {
                res.statusCode = status.NOT_FOUND;
                res.send();
            };
    });

    app.post('/ads', async (req, res) => {
        const newAd = req.body;
        // checking propertis newAd, code 400 if something is missing
        if (!newAd.title || !newAd.description || !newAd.author || !newAd.tags ||
            !newAd.category || !newAd.price || !newAd.location || !newAd.contact){
            res.statusCode = status.BAD_REQUEST;
            res.send();
        } else {
        // have nessesary propertis
            const result = await addAd(newAd);
            if (result.insertedCount === 1) {
                res.statusCode = status.CREATED;
            } else {
                res.statusCode = status.INTERNAL_SERVER_ERROR;
            }
            res.send();
        };
    });

    app.delete('/ads/:id', async (req, res) => {
        const { id } = req.params;
        const result = await deleteAd(id);

        if (result.deletedCount == 1){
            res.statusCode = status.NO_CONTENT;
        } else {
            res.statusCode = status.NOT_FOUND;
        }
        res.send();
    });

    app.patch('/ads/:id', async (req, res) => {
        const { id } = req.params;
        const modifiedAd = req.body;
        let selectedAd;

        try {
            // checking for bad token
            selectedAd = await getAd(id);
        } catch (error) {
            res.statusCode = status.NOT_FOUND;
            res.send();
        };
        console.log(selectedAd);
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
                        res.send(); 
                        return
                }
            };

        // the same data, nothing to update
        if ( modifiedCount === 0 ){ 
            console.log("Nothing to update")
            res.statusCode = status.CONFLICT 
            res.send();
        } else {
        // update
            console.log(modifiedCount)
            const result = await updateAd( id, modifiedAd );
            res.statusCode = status.ACCEPTED;
            res.send();
        }

    });
})

.finally(() => {
    app.get('/heartbeat', (req, res) => {
        res.send(new Date());
    });
    
    app.listen(process.env.PORT, () => console.log('server started'));
});
