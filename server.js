var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();
var serveStatic = require('serve-static');
var session = require('cookie-session');
var crypto = require('crypto');
var cryptoRandomString = require('crypto-random-string');
var nodemailer = require('nodemailer');
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var fileupload = require('express-fileupload');
var cassandra = require('cassandra-driver');
var amqpRec = require('amqplib/callback_api');
var amqpDel = require('amqplib/callback_api');
var amqpConn, chanRec, chanDel;
var exchange = 'twitter';
var mongoDB;



var cassandraClient = new cassandra.Client({
	contactPoints: ['52.3.230.248'],
	keyspace: 'media'
},function(err){
	if(err)
		console.log(err);
	else
		console.log("connected to cassandra")
})

var url = 'mongodb://172.31.1.118:27017/Twitter';



mongoClient.connect(url,function(err,db){
	if(err){
		console.log(err)
	}else{
		console.log("CONNECTION SUCCESS");
		mongoDB = db;
	}
	})




var mail = nodemailer.createTransport({
	service: 'gmail',
	auth:{
		user: 'twittercse356@gmail.com',
		pass: 'cse356666'
	}
});

app.use(session({
	name: 'chicken',
	secret: 'no secret',
	saveUninitialized: true,
	resave: false,
	maxAge: 24 * 60 * 60 * 1000

}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(fileupload());
app.get('/', function(req,res){
	if(typeof req.session.user === 'undefined'){
		res.redirect('/login');
	}else{
		res.sendFile('/index.html',{root: __dirname + '/public'});
	}
})

app.use('/',express.static(__dirname + '/public',{

}));

app.get('/adduser', function(req,res){
	res.sendFile('signUp.html',{root: __dirname+'/public'});
})
app.post('/adduser', function(req,res){
	var hash = crypto.createHash('md5').update(req.body.email).digest('hex');
	var params = {
		'username': req.body.username,
			'password': req.body.password,
			'email': req.body.email,
			'enabled': false,
			'verify': hash
	}

	mongoDB.collection('Users').insert(params, function(err,records){
		if(err){
			console.log(err)
		}else{
			res.send({
				status: "OK"
			})
		}
	})

})

app.get('/login', function(req,res){
	res.sendFile('login.html',{root: __dirname+'/public'});
})
app.post('/login', function(req,res){

	var params = {
		'username': req.body.username,
		'password': req.body.password
	}
	//console.log(params);
	mongoDB.collection('Users').findOne(params, function(err,records){
		//console.log(records);
		if(records.enabled == false){
			res.send({
					status: "error",
							error: "Unactivated account!"
				})
		}else{
			req.session.user = req.body.username;

						res.send({
							status: "OK"
						})
		}
	})
	

})

app.post('/logout',function(req,res){
	if(typeof req.session.user != 'undefined'){
		req.session = null;
		res.send({status: "OK"});
	}else{
		res.send({
			status: "error",
			error: "You are not logged in as any user!"
		})
	}
})

app.get('/verify',function(req,res){
	//console.log("get+"+[req.query.email, req.query.key])
	if(req.query.key === 'abracadabra'){
		cassandraClient.execute('SELECT username FROM Users WHERE email = ?',[req.query.email],function(err,result){
			if(err){
				res.send({
					status: "error",
					error: err
				});
			}
			else{
				if(result.rows.length === 1){
					cassandraClient.execute('UPDATE Users SET enabled = true WHERE username = ?',[result.rows[0].username],function(err,result){
						if(err){
							res.send({
								status: "error",
								error: err
							});
						}else{
							res.send({
								status: "OK"
							});
						}
					})
				}
				else{
					res.send({
						status: "error",
						error: "Fail finding user!"
					})
				}
			}
		})
	}
	
})
app.post('/verify',function(req,res){
	if(req.body.key === 'abracadabra'){
		var con = {
			"email": req.body.email
		}
		var update = {
			$set: {"enabled" : true}
					}
		mongoDB.collection('Users').findOne(con, function(err,records){
			if(err){
				console.log(err)
			}
			else{
				mongoDB.collection('Users').updateOne({'username':records.username}, update, function(err,result){
					if(err){
						console.log(err)
					}
					else{
						res.send({
					status:"OK"
				})
					}
				})

			}
		})
		
	}


})

app.post('/additem', function(req,res){
	if(typeof req.session.user == 'undefined'){
		res.send({
			status: "error",
			error: "You are not logged in as any user!"
		})
	}
	else{

var timestamp = Math.floor(Date.now()/1000);
var postid = crypto.createHash('md5').update(req.body.content+cryptoRandomString(10)).digest('hex');

		var params = {
			"id": postid,
			"content": req.body.content,
						"username": req.session.user,
						"timestamp": timestamp,
						"parent": req.body.parent,
						"media": req.body.media,
						"likes": 0
		};
		
		mongoDB.collection('Tweets').insertOne(params, function(err,records){
			if(err){
				console.log(err)
			}else{
				//console.log(params._id)
				res.send({
					status:"OK",
					id: postid
				})
			}
		})
		
	}

})

app.get('/item/:id',function(req,res){

	var params = {
		'id': req.params.id
	}

	mongoDB.collection('Tweets').findOne(params, function(err,records){
		if(err){
			console.log(err);
		}else{
		//	console.log(records)
		if(records == null){
			res.send({
				status:"error",
				error: "no item found"
			})
		}
		else{
			res.send({
				status:"OK",
				item: records
			})
		}
		}

	})
	
})

app.get('/getAllTweets',function(req,res){
	mongoClient.connect(url,function(err,db){
		assert.equal(null,err);

		db.collection('tweets').find().toArray(function(err,doc){
			res.send(doc);
			db.close();
		})
	})
})

app.post('/searchTweets',function(req,res){
	var newStamp = Number(req.body.timestamp);
		mongoClient.connect(url,function(err,db){
		assert.equal(null,err);
		var query = {
			timestamp: {
				$lte:newStamp
			}
		}
		db.collection('tweets').find(query).toArray(function(err,doc){
			if (doc != null){
				res.send(doc)
				//console.log(doc)
				db.close();
			}
		})

	})
})




app.post('/searchDefaultTweets',function(req,res){
	var newStamp  = req.body.timestamp || Date.now();
	var followCon = {
		'user1': req.session.user
	}
	mongoDB.collection('Follow').find(followCon).toArray(function(err,records){
	if(err){
		console.log(err)
	}
	else{
		//console.log(records);
		var following = [];
		for(var i = 0; i<records.length; i++){
			following.push(records[i].user2);
		}
	var query = {
		timestamp:{
			$lte:newStamp
		},
		username:{$in:following}
	}
	mongoDB.collection('Tweets').find(query).limit(10).sort({'timestamp':-1}).toArray(function(err,records1){
		if(err){
			console.log(err)
		}
		else{
			res.send({
				status:"OK",
				items:records1
			})
		}
	})
	}
})
})

app.post('/search', function(req,res){
	var newStamp = req.body.timestamp || Date.now();
	if(req.body.q == null && req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == false && req.body.limit !=null){
		//console.log(1);
		var con = {
			'timestamp':{ $lt: newStamp}
		}
		mongoDB.collection('Tweets').find(con).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{

				res.send({
					status:"OK",
					items:records
				})
			}
		})

	}
	else if(req.body.q == null && req.body.username != null && req.body.rank != null && req.body.limit !=null && req.body.replies == true && req.body.following == false){
		//console.log(2)
		var con = {
			'timestamp': {$lt: newStamp},
			'username' : req.body.username
		}
		mongoDB.collection('Tweets').find(con).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
			if(err){
				console.log(err)
			}else{

				res.send({
					status:"OK",
					items:records
				})
			}
		})
	}
	else if(req.body.q == null &&req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == true && req.body.limit !=null){
		//console.log(3);
		var followCon = {
			'user1' : req.session.user

		}
		var following = []
		mongoDB.collection('Follow').find(followCon).limit(req.body.limit).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{
				for(var i = 0; i<records.length; i++){
					following.push(records[i].user2);
				}
				var params = {
					'timestamp': {$lt: newStamp},
					'username' : {$in : following}
				}
				mongoDB.collection('Tweets').find(params).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
					if(err){
						console.log(err)
					}else{

				res.send({
					status:"OK",
					items:records
				})
					}
				})
			}
		})
	}

	else if(req.body.q != null && req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == false && req.body.limit !=null){
		//console.log(4)
		var conn = {
			'timestamp':{ $lt: newStamp},
			$text: {$search: req.body.q}
		}
		mongoDB.collection('Tweets').find(con).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{

				res.send({
					status:"OK",
					items:records
				})
			}
		})
	}
	else if(req.body.q != null && req.body.username != null && req.body.rank != null && req.body.limit !=null && req.body.replies == true && req.body.following == false){
		//console.log(5)
		var con = {
			'timestamp': {$lt: newStamp},
			'username' : req.body.username,
			$text: {$search: req.body.q}
		}
		mongoDB.collection('Tweets').find(con).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
			if(err){
				//console.log(err)
			}else{

				res.send({
					status:"OK",
					items:records
				})
			}
		})
	}
	else if(req.body.q != null &&req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == true && req.body.limit !=null){
		cnsole.log(6)
		var followCon = {
			'user1' : req.session.user

		}
		var following = []
		mongoDB.collection('Follow').find(followCon).limit(req.body.limit).toArray(function(err,records){
			if(err){
				//console.log(err)
			}
			else{
				for(var i = 0; i<records.length; i++){
					following.push(records[i].user2);
				}
				var params = {
					'timestamp': {$lt: newStamp},
					'username' : {$in : following},
					$text: {$search: req.body.q}
				}
				mongoDB.collection('Tweets').find(params).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
					if(err){
						//console.log(err)
					}else{

				res.send({
					status:"OK",
					items:records
				})
					}
				})
			}
		})
	}
	else{
		//console.log(req.body)
	}

})


app.post('/item/:id/like',function(req,res){
	if(req.body.like == true){
		var con = {
			'id': req.params.id
		}
		var update = {
			$inc: {'likes': 1}
		}

		mongoDB.collection('Tweets').updateOne(con, update, function(err,result){
			if(err){
				console.log(err)
			}else{
				res.send({
					status:"OK"
				})
			}
		})
	
	}else if(req.body.like == false){
		var con = {
			'id': req.params.id
		}
		var update = {
			$inc: {'likes': -1}
		}

		mongoDB.collection('Tweets').updateOne(con, update, function(err,result){
			if(err){
				console.log(err)
			}else{
				res.send({
					status:"OK"
				})
			}
		})
	
	}
	else{
		res.send("???")
	}
})

app.delete('/item/:id',function(req,res){

	var find = {
		'id': req.params.id
	}
	
	mongoDB.collection('Tweets').findOne(find, function(err,records){

		if(records !=null){
		if(records.media !=null){
			for(var i = 0; i < records.media; i++){
				cassandraClient.execute('DELETE FROM media WHERE id = ?', [records.media[i]], function(err,result){
					if(err){
						console.log(err);
					}
				})
			}
			mongoDB.collection('Tweets').deleteMany(find, function(err,records){
				if(err){
					console.log(err)
				}else{
					res.send({
						status:"OK"
					})
				}
			})
			


		}
	}
	})



})

app.get('/user/:username',function(req,res){
	var email, follower, following;
	var params = {
		'username':req.params.username
	}
	mongoDB.collection('Users').findOne(params,function(err,records){
		if(err){


		}else{
			email = records.email;
			var followingcon = {
		'user1': req.params.username
	}
	mongoDB.collection('Follow').find(followingcon).toArray(function(err,records){
		if(err){
			console.log(err)

		}else{
			following = records.length
			var followercon = {
		'user2': req.params.username
	}
	mongoDB.collection('Follow').find(followercon).toArray(function(err,records){
		if(err){
			console.log(err)
		}else{
			follower = records.length;
			var response = {
								email : email,
								followers : follower,
								following : following
							}
			res.send({
				status: "OK",
				user: response
			})
		}


	})
		}
	})
		}

	})



	
})

app.get('/user/:username/followers',function(req,res){
	if(req.body.limit != null && req.body.limit != ""){
		var params ={
			'user2': req.params.username
		}
		mongoDB.collection('Follow').find(params, {'user1':1},{limit: req.body.limit}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK",
					users: records
				})
			}
		})
		
	}
	else{
		
		var params ={
			'user2': req.params.username
		}
		mongoDB.collection('Follow').find(params, {'user1':1},{limit: 50}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK",
					users: records
				})
			}
		})
	}
})

app.get('/user/:username/following',function(req,res){
	if(req.body.limit != null && req.body.limit != ""){
		var params ={
			'user1': req.params.username
		}
		mongoDB.collection('Follow').find(params, {'user2':1},{limit: req.body.limit}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK",
					users: records
				})
			}
		})
	
	}
	else{
		var params ={
			'user1': req.params.username
		}
		mongoDB.collection('Follow').find(params, {'user2':1},{limit: 50}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK",
					users: records
				})
			}
		})

	}
})





app.post('/follow',function(req,res){
	if(req.body.follow == true){
		var params = {
			'user1': req.session.user,
			'user2': req.body.username
		};
		mongoDB.collection('Follow').insertOne(params, function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK"
				})
			}
		})
	
	}
	else{

		var params = {
			'user1': req.session.user,
			'user2': req.body.username
		};
		mongoDB.collection('Follow').deleteMany(params, function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK"
				})
			}
		})
	
	}
})

app.post('/addmedia', function(req,res){
	//console.log("WAS CALLED");

	var id = crypto.createHash('md5').update(req.files.content.name+cryptoRandomString(10)).digest('hex');
	var data = [id, req.files.content.data];




	cassandraClient.execute('INSERT INTO media (id, content) VALUES (?, ?)',data, function(err, result){
		if(err){
			console.log(err);
		}else{
				res.send({
		status:"OK",
		id: id
	})
		}
	})

})

app.get('/media/:id',function(req,res){

	var query = 'SELECT content FROM media WHERE id = ?';
	var par = [req.params.id]
	cassandraClient.execute(query, par, function(err,result){
		if(err){
			res.send({
				status: "error",
				error: err
			})
		}else if(result.rows.length == 0){
			//res.set({'content-type': 'image/png'});
			res.send({
				status: "error",
				error: "no item found"
			})
		}else{
			res.writeHead(200,{'content-type': 'image/png'});
			res.write(new Buffer(result.rows[0].content), 'binary');
			res.end();
		}
	})

})


app.listen(8080, "172.31.1.118",function(){
	console.log("Server listening on port " + 9000);
})

