var mongoClient = require('mongodb').MongoClient;

var url = 'mongodb://34.205.39.47:27017/Twitter';
mongoClient.connect(url,function(err,db){
	console.log(err)
	console.log("CONNECTION SUCCESS");
	//db.tweets.createIndex({"content": "text"});
	})