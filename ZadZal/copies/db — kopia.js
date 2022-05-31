const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');

const url = process.env.MONGODB_CONNECTION;

const adsCollectionName = 'adds';

let db;

let adsCollection;

const init = () =>
    MongoClient.connect(url, { useUnifiedTopology: true, useNewUrlParser: true })
        .then((client) => {
            db = client.db(process.env.MONGODB_DBNAME);
            adsCollection = db.collection(adsCollectionName);
        })
        .catch(error => console.log(error));

const getAds= () => {
    return adsCollection.find().toArray();
}

const getAd = (id) => {
    return adsCollection.findOne({ _id: new ObjectId(id) });
}

const deleteAd = (id) => {
    return adsCollection.deleteOne({ _id: new ObjectId(id) });
}

const addAd = (newAdd) => {
    let ad ={};
    ad.title = newAdd.title;
    ad.description = newAdd.description;
    ad.author = newAdd.author;
    ad.category = newAdd.category;
    ad.tags = newAdd.tags;
    ad.price = newAdd.price;
    ad.location = newAdd.location;
    ad.contact = newAdd.contact;
    ad.createdTime = new Date();
    return adsCollection.insertOne(ad);
}

const updateAd = (id, modifiedAd) => {
    return adsCollection.updateOne(
        { _id: new ObjectId(id)},
        { $set: { "title": (modifiedAd.title), 
                    "description": (modifiedAd.description),
                    // "author": (modifiedAd.author), 
                    "category": (modifiedAd.category),
                    "tags": (modifiedAd.tags), 
                    "price": (modifiedAd.price), 
                    "location": (modifiedAd.location) }}
    );
}

module.exports = { init, getAds, getAd, deleteAd, addAd, updateAd };