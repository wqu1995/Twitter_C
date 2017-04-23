var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();
var serveStatic = require('serve-static');
var session = require('cookie-session');
//var mysql = require('mysql');
var crypto = require('crypto');
var cryptoRandomString = require('crypto-random-string');
var nodemailer = require('nodemailer');
//var FileStore = require('session-file-store')(session);
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
const dateTime = Date.now();
var fileupload = require('express-fileupload');
var cassandra = require('cassandra-driver');
var amqpRec = require('amqplib/callback_api');
var amqpDel = require('amqplib/callback_api');
var amqpConn, chanRec, chanDel;
var exchange = 'twitter';
var mongoDB;

amqpRec.connect('amqp://test:test@54.236.241.144', function(err,conn){
	amqpConn = conn;
	chanRec = conn.createChannel(function(err,ch){
		ch.assertExchange('twitter', 'direct');
	})
	console.log("connected to amqp");
})
amqpDel.connect('amqp://test:test@34.205.29.145', function(err,conn){
	amqpConn = conn;
	chanDel = conn.createChannel(function(err,ch){
		ch.assertExchange('twitter', 'direct');
	})
	console.log("connected to amqp");
})

var cassandraClient = new cassandra.Client({
	contactPoints: ['52.3.230.248'],
	keyspace: 'twitter'
},function(err){
	if(err)
		console.log(err);
	else
		console.log("connected to cassandra")
})

var url = 'mongodb://34.205.39.47:27017/Twitter';
//var url = 'mongodb://localhost:27017/twitter';



mongoClient.connect(url,function(err,db){
	if(err){
		console.log(err)
	}else{
		console.log("CONNECTION SUCCESS");
		mongoDB = db;
	}
	//db.tweets.createIndex({"content": "text"});
	})


/*var connection = mysql.createConnection({
	host: '52.87.157.232',
	user: 'root',
	password: 'cse356',
	database: 'Twitter2'
});*/

/*
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'root',
	database: 'twitter'
})*/

/*connection.connect(function(err){
	if(err){
		console.log(err);
	}
	else{
		console.log("connected to mysql");
	}
});*/

var mail = nodemailer.createTransport({
	//host: 'smtp.gmail.com',
	//port: 465,
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
//app.use(require('morgan')('dev'));
app.use(fileupload());
app.get('/', function(req,res){
	if(typeof req.session.user === 'undefined'){
		res.redirect('/login');
	}else{
		//console.log('in here');
		//console.log(req.session.user);
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
	//var post = [req.body.username,req.body.password,req.body.email,false,hash];
	var params = {
		'username': req.body.username,
			'password': req.body.password,
			'email': req.body.email,
			'enabled': false,
			'verify': hash
	}
	/*cassandraClient.execute('INSERT INTO Users (username, password, email, enabled, verify) VALUES (?,?,?,?,?)', post, function(err,result){
		if(err){
			res.send({
				status: "error",
				error: err
			});
		}
		else{
			res.send({status: "OK"});
		}
	})*/
	/*docClient.put(params, function(err,data){
		if(err){
			res.send({
				status: "error",
				error: err
			})
		}else{
			res.send({
				status: "OK"
			})
		}
	})*/
	mongoDB.collection('Users').insert(params, function(err,records){
		if(err){
			console.log(err)
		}else{
			res.send({
				status: "OK"
			})
			//mongoDB.close();
		}
	})
		
})

app.get('/login', function(req,res){
	res.sendFile('login.html',{root: __dirname+'/public'});
})
app.post('/login', function(req,res){
	//console.log([req.body.username, req.body.password])
	
	var params = {
		'username': req.body.username,
		'password': req.body.password
	}
	mongoDB.collection('Users').findOne(params, function(err,records){
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
	/*docClient.query(params, function(err,data){
		if(err){
			console.log(err);
		}else{
			if(data.Items[0].enabled ==="false"){
				res.send({
					status: "error",
							error: "Unactivated account!"
				})
			}else{
						
					}
		}
	})*/
	/*cassandraClient.execute('SELECT * FROM Users WHERE Username = ? AND password = ? ALLOW FILTERING', [req.body.username, req.body.password], function(err, result){
			if(err){
				//console.log("IN HERE ");
				res.send({
					status: "error",
					error: err
				});
			}else{
				//console.log("IN ASDFFEASD=================");
				if(result.rows.length===1){
					if(result.rows[0].enabled === false){
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
					
				}
				else{
					res.send({
							status: "error",
							error: "Can not find account!"
						})
				}
			}
		})*/

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
	console.log("get+"+[req.query.email, req.query.key])
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
	/*else{
		var query = connection.query('SELECT username FROM Users WHERE email = ? AND verify ='+mysql.escape(req.query.email)
			+' AND verify = '+mysql.escape(req.query.key), function(err,result){
			if(err){
				res.send({
					status: "error",
					error: err
				});
			}
			else{
				if(result.length ===1){
					var query = connection.query('UPDATE Users SET enabled = true WHERE username = '+mysql.escape(result[0].username), function(err,result){
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
				}else{
					res.send({
						status: "error",
						error: "Fail finding user!"
					});
				}
			}
		})
	}*/
})
app.post('/verify',function(req,res){
	//console.log([req.body.email, req.body.key])
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
				//console.log(records);
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
		/*docClient.scan(params, function(err, data){
			if(err){
				console.log("in 1");
				console.log(err)
			}
			else{
				//console.log(data);
				var params = {
					TableName: 'Users',
					Key: {
						"username": data.Items[0].username
					},
					UpdateExpression: "set enabled = :t",
					ExpressionAttributeValues:{
						":t": "true"
					}
				};
				docClient.update(params, function(err,result){
					if(err){
						console.log(err);
					}else{
						res.send({
							status : "OK"
						})
					}
				})
			}
		})*/

		/*cassandraClient.execute('SELECT username FROM Users WHERE email = ? ALLOW FILTERING', [req.body.email],function(err,result){
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
		})*/
	}
	/*else{
		var query = connection.query('SELECT username FROM Users WHERE email = '+mysql.escape(req.body.email)
			+' AND verify = '+mysql.escape(req.body.key), function(err,result){
			if(err){
				res.send({
					status: "error",
					error: err
				});
			}
			else{
				if(result.length ===1){
					var query = connection.query('UPDATE Users SET enabled = true WHERE username = '+mysql.escape(result[0].username), function(err,result){
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
				}else{
					res.send({
						status: "error",
						error: "Fail finding user!"
					});
				}
			}
		})
	}*/

})

app.post('/additem', function(req,res){
	if(typeof req.session.user == 'undefined'){
		res.send({
			status: "error",
			error: "You are not logged in as any user!"
		})
	}
	else{

var timestamp = Math.floor(dateTime/1000);	
//var postid = crypto.createHash('md5').update(req.body.content+cryptoRandomString(10)).digest('hex');
		
		var params = {
			"content": req.body.content,
						"username": req.session.user,
						"timestamp": timestamp,
						"parent": req.body.parent,
						"media": req.body.media,
						"likes": 0
		};
		/*if(req.body.parent != null && req.body.parent != ""){
			if(req.body.media !=null && req.body.media != ""){
			//	post = [postid,req.body.content,req.session.user,timestamp,req.body.parent,req.body.media.toString(),0]
				params = {
						"content": req.body.content,
						"username": req.session.user,
						"timestamp": timestamp,
						"parent": req.body.parent,
						"media": req.body.media,
						"likes": 0
					}

			}
			else{
			//	post = [postid,req.body.content,req.session.user,timestamp,req.body.parent,null,0]
				params = {
						"content": req.body.content,
						"username": req.session.user,
						"timestamp": timestamp,
						"parent": req.body.parent,
						"media": null,
						"likes": 0
					}
			}
		}
			
		else{
			if(req.body.media !=null && req.body.media != ""){
				//post = [postid,req.body.content,req.session.user,timestamp,null,req.body.media.toString(),0]
				params = {

						"content": req.body.content,
						"username": req.session.user,
						"timestamp": timestamp,
						"parent": null,
						"media": req.body.media,
						"likes": 0
					}
			}
			else{
				//post = [postid,req.body.content,req.session.user,timestamp,null,null,0]
				params = {

						"content": req.body.content,
						"username": req.session.user,
						"timestamp": timestamp,
						"parent": null,
						"media": null,
						"likes": 0
					}

			}
		}*/
		mongoDB.collection('Tweets').insertOne(params, function(err,records){
			if(err){
				console.log(err)
			}else{
				//console.log(params._id)
				res.send({
					status:"OK",
					id: params._id
				})
			}
		})
		/*docClient.put(params, function(err,data){
			if(err){
				console.log(err);
			}else{
				res.send({
					status: "OK",
					id: postid
				})
			}
		})*/
		/*cassandraClient.execute('INSERT INTO Tweets (id, content, username, timestamp, parent, media, likes) VALUES (?,?,?,?,?,?,?)', post,function(err, result){
			if(err){
				console.log(post);
				console.log(err);
				res.send({
					status:"error",
					error: err
				})
			}else{
				res.send({
					status: "OK",
					id: postid
				})
			}
		})*/
	}

})

app.get('/item/:id',function(req,res){

	var params = {
		'_id': require('mongodb').ObjectId(req.params.id)
	}

	/*docClient.query(params,function(err,data){
		if(err){
			console.log(err);
		}
		else{
			res.send({
				status: "OK",
				item: data.Items[0]
			})
		}
	})*/
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
	/*cassandraClient.execute('SELECT * FROM Tweets WHERE id = ?',[req.params.id], function(err,result){
		if(err){
			console.log(err)
			res.send({
					status:"error",
					error: err
				})
		}else{
			if(result.rows.length != 0){
			//	console.log(result);
			res.send({
				status : "OK",
				item: JSON.parse(JSON.stringify(result.rows[0]))
			})
		}else{

			res.send({
					status:"error",
					error: err
				})
		}
		}
	})*/
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
	//console.log(req.body);
	var newStamp = Number(req.body.timestamp);
	//console.log("this is time stamp" + newStamp)
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
/*app.post('/search',function(req,res){
 	//console.log(req.body);
 	var newStamp = req.body.timestamp || dateTime;
 	var q = req.body.q;
 	var following = req.body.following;
 	var username = req.body.username;
 	if (req.body.limit != null && req.body.limit != ""){
 		if(q != null && following == true && username != null){
 			res.send({
 				status: "OK",
 				items: []
 			})
 		}
 		else if(q != null && following == true && username == null){
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT ? allow filtering',
 				[req.session.user, q, newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log(err)
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q != null && following ==false && username != null){
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT ? allow filtering'
 				[username, q, newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q != null && following ==false && username == null){
 			
 			cassandraClient.execute('SELECT * FROM Tweets WHERE content LIKE \'%?%\' AND timestamp <= ?  ORDER BY timestamp DESC LIMIT ? allow filtering', 
 				[q, newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q == null && following != null && username != null){
 			res.send({
 				status: "OK",
 				items: []
 			})
 		}
 		else if(q == null && following == true && username == null){
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ? allow filtering',
 			[req.session.user, newStamp,req.body.limit], function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q == null && following == false && username != null){
 			
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ? allow filtering',[username, newStamp, req.body.limit],function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q == null && following ==false && username == null){
 			
 			cassandraClient.execute('SELECT * FROM Tweets WHERE timestamp <= ?  ORDER BY timestamp DESC LIMIT ? allow filtering', [newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 	}else{
 		if(q != null && following == true && username != null){
 			res.send({
 				status: "OK",
 				items: []
 			})
 		}
 		else if(q != null && following == true && username == null){
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25 allow filtering',
 				[req.session.user, q, newStamp],function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q != null && following ==false && username != null){
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25 allow filtering'
 				[username, q, newStamp],  function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q != null && following ==false && username == null){
 			cassandraClient.execute('SELECT * FROM Tweets WHERE content LIKE \'%?%\' AND timestamp <= ?  ORDER BY timestamp DESC LIMIT 25 allow filtering', 
 				[q, newStamp], function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q == null && following != null && username != null){
 			res.send({
 				status: "OK",
 				items: []
 			})
 		}
 		else if(q == null && following == true && username == null){
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25 allow filtering',
 			[req.session.user, newStamp],function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q == null && following == false && username != null){
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25 allow filtering',[username, newStamp],function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 		else if(q == null && following ==false && username == null){
 			cassandraClient.execute('SELECT * FROM Tweets WHERE timestamp <= ?  ORDER BY timestamp DESC LIMIT 25 allow filtering', [newStamp], function(err, result){
 					if(err){
 						console.log(err)
 
 						res.send({
 							status: "error",
 							error: err
 						})
 					}else{
 						var response = {
 							status: "OK",
 							items: []
 						}
 						for(var i = 0; i< result.rows.length; i++){
 							response.items.push(JSON.parse(JSON.stringify(result.rows[i])))
 						}
 						res.send(response);
 					}
 				})
 		}
 
 	}
 })
*/
var sort_by = function(field, reverse, primer){

   var key = primer ? 
       function(x) {return primer(x[field])} : 
       function(x) {return x[field]};

   reverse = !reverse ? 1 : -1;

   return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
     } 
}
/*app.post('/search', function(req,res){
	console.log(req.body);
	var newStamp = req.body.timestamp || dateTime;
 	var q = req.body.q;
 	var following = req.body.following;
 	var username = req.body.username;
 	var params;
 	if(req.body.limit != null && req.body.limit != "" && req.body.rank == 'time' 
 		&& req.body.replies == true && following == false && q == null){
 		params = {
 			TableName: "Tweets",
 			Limit : req.body.limit,
 			FilterExpression: "#timestamp <= :time",
 			ExpressionAttributeNames:{
 				"#timestamp" : "timestamp"
 			},
 			ExpressionAttributeValues:{
 				":time": newStamp
 			}
 		}
 		docClient.scan(params,function(err,data){
 			if(err){
 				console.log(err)
 			}
 			else{
 				res.send({
 					status: "OK",
 					items: data.Items.sort(sort_by('timestamp', true, parseInt))
 				})
 			}
 		})
 	}
})
app.post('/searchx',function(req,res){
	console.log(req.body);
	var params = {
		TableName: "Tweets",
		FilterExpression: "contains(#content, :content)",
		ExpressionAttributeNames:{
			"#content":"content"
		},
		ExpressionAttributeValues:{
			":content": "hi"
		}
	}

	docClient.scan(params, function(err, data){
		if(err){
			console.log(err)
		}else{

			console.log(data.Items.sort(sort_by('timestamp', true, parseInt)));
		}
	})
})*/
app.post('/search', function(req,res){
	var newStamp = req.body.timestamp || dateTime;
	//console.log(req.body)
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
				var response = [];
				for(var i = 0; i<records.length; i++){
					var temp = {
						id : records[i]._id,
						content: records[i].content,
						username: records[i].username,
						timestamp: records[i].timestamp,
						parent: records[i].parent,
						media: records[i].media,
						likes: records[i].likes
					}
					response.push(temp);
				}
				res.send({
					status:"OK",
					items:response
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
				var response = [];
				for(var i = 0; i<records.length; i++){
					var temp = {
						id : records[i]._id,
						content: records[i].content,
						username: records[i].username,
						timestamp: records[i].timestamp,
						parent: records[i].parent,
						media: records[i].media,
						likes: records[i].likes
					}
					response.push(temp);
				}
				res.send({
					status:"OK",
					items:response
				})
			}
		})
	}
	else if(req.body.q == null &&req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == true && req.body.limit !=null){
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
						var response = [];
						for(var i = 0; i<records.length; i++){
							var temp = {
								id : records[i]._id,
								content: records[i].content,
								username: records[i].username,
								timestamp: records[i].timestamp,
								parent: records[i].parent,
								media: records[i].media,
								likes: records[i].likes
							}
							response.push(temp);
						}
						res.send({
							status:"OK",
							items:response
						})
					}
				})
			}
		})
	}

	else if(req.body.q != null && req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == false && req.body.limit !=null){
		var conn = {
			'timestamp':{ $lt: newStamp},
			$text: {$search: req.body.q}
		}
		mongoDB.collection('Tweets').find(con).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
			if(err){
				console.log(err)
			}
			else{
				var response = [];
				for(var i = 0; i<records.length; i++){
					var temp = {
						id : records[i]._id,
						content: records[i].content,
						username: records[i].username,
						timestamp: records[i].timestamp,
						parent: records[i].parent,
						media: records[i].media,
						likes: records[i].likes
					}
					response.push(temp);
				}
				res.send({
					status:"OK",
					items:response
				})
			}
		})
	}
	else if(req.body.q != null && req.body.username != null && req.body.rank != null && req.body.limit !=null && req.body.replies == true && req.body.following == false){
		var con = {
			'timestamp': {$lt: newStamp},
			'username' : req.body.username,
			$text: {$search: req.body.q}
		}
		mongoDB.collection('Tweets').find(con).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
			if(err){
				console.log(err)
			}else{
				var response = [];
				for(var i = 0; i<records.length; i++){
					var temp = {
						id : records[i]._id,
						content: records[i].content,
						username: records[i].username,
						timestamp: records[i].timestamp,
						parent: records[i].parent,
						media: records[i].media,
						likes: records[i].likes
					}
					response.push(temp);
				}
				res.send({
					status:"OK",
					items:response
				})
			}
		})
	}
	else if(req.body.q != null &&req.body.username == null && req.body.rank != null && req.body.replies == true && req.body.following == true && req.body.limit !=null){
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
					'username' : {$in : following},
					$text: {$search: req.body.q}
				}
				mongoDB.collection('Tweets').find(params).limit(req.body.limit).sort({'timestamp':-1}).toArray(function(err,records){
					if(err){
						console.log(err)
					}else{
						var response = [];
						for(var i = 0; i<records.length; i++){
							var temp = {
								id : records[i]._id,
								content: records[i].content,
								username: records[i].username,
								timestamp: records[i].timestamp,
								parent: records[i].parent,
								media: records[i].media,
								likes: records[i].likes
							}
							response.push(temp);
						}
						res.send({
							status:"OK",
							items:response
						})
					}
				})
			}
		})
	}
	else{
		console.log(req.body)
	}

})


app.post('/item/:id/like',function(req,res){
	//console.log('in here');
	if(req.body.like == true){
		var con = {
			'_id': require('mongodb').ObjectId(req.params.id)
		}
		var update = {
			$inc: {'likes': 1}
		}
		/*docClient.update(params, function(err,data){
			if(err){
				console.log(err);
			}else{
				res.send({
					status: "OK"
				});
			}
		})*/
		mongoDB.collection('Tweets').updateOne(con, update, function(err,result){
			if(err){
				console.log(err)
			}else{
				res.send({
					status:"OK"
				})
			}
		})
		//console.log("in true");
		/*cassandraClient.execute('UPDATE Tweets SET like = like + 1 WHERE id = ?',[req.params.id],function(err,result){
			if(err){
				var jsonToSend = {
					status: "error"
				}
				res.send(jsonToSend);
			}
			else{
				var jsonToSend = {
					status: "OK"
				}
				res.send(jsonToSend);
			}
		})*/
	}else if(req.body.like == false){
		var con = {
			'_id': require('mongodb').ObjectId(req.params.id)
		}
		var update = {
			$inc: {'likes': -1}
		}
		/*docClient.update(params, function(err,data){
			if(err){
				console.log(err);
			}else{
				res.send({
					status: "OK"
				});
			}
		})*/
		mongoDB.collection('Tweets').updateOne(con, update, function(err,result){
			if(err){
				console.log(err)
			}else{
				res.send({
					status:"OK"
				})
			}
		})
		/*cassandraClient.execute('UPDATE Tweets SET like = like - 1 WHERE id = ?',[req.params.id],function(err,result){
			if(err){
				var jsonToSend = {
					status: "error"
				}
				res.send(jsonToSend);
			}
			else{
				var jsonToSend = {
					status: "OK"
				}
				res.send(jsonToSend);
			}
		})*/
	}
	else{
		res.send("???")
	}
})

app.delete('/item/:id',function(req,res){

	var find = {
		'_id': require('mongodb').ObjectId(req.params.id)
	}
	mongoDB.collection('Tweets').findOne(find, function(err,records){

		//console.log(records);
		if(records.media !=null){
			//console.log(records.media)
			//chanDel.publish(exchange, 'delete', new Buffer("[\""+records.media.toString()+"\"]"));
			mongoDB.collection('media').deleteMany({'id':{$in : records.media}}, function(err,records){
				if(err){
					console.log(err)
				}else{
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
			})
			
			
		}
	})
	/*docClient.query(params, function(err,data){
		if(err){
			console.log(err);
		}else{
			console.log(data);
			if(data.Items[0].media != " "){
				cassandraClient.execute('DELETE FROM Media WHERE id = ?', [data.Items[0].media[0]],function(err,result){
					if(err){
						console.log(err)
					}
				})
			}
		}
	})*/
	/*cassandraClient.execute('SELECT media FROM Tweets WHERE id = ?',[req.params.id], function(err,result){
		if(err){
			res.send({
				status: "error",
				error: err
			})
		}else{
			if(result.rows.length!=0 && result.rows[0].media != null){
			//	console.log("[\""+result[0].media.toString()+"\"]")
				cassandraClient.execute('DELETE FROM Media WHERE id = ?', [result.rows[0].media],function(err,result){
					if(err){
						console.log(err)
					}
				})
			}
		}
	})*/

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
			//console.log(records)
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
	
	

	/*docClient.scan(params, function(err,data){
		if(err){
			console.log(err)
		}else{
			email = data.Items[0].email;
			var params ={
				TableName: "Following",
				Limit : req.body.limit,
				FilterExpression: "#user2 = :user2",
				ExpressionAttributeNames:{
					"#user2" : "user2"
				},
				ExpressionAttributeValues:{
					":user2": req.params.username
				}
			}
			docClient.scan(params,function(err, data){
				if(err){
					console.log(err);
				}else{
					following = data.Items.length

					var params ={
						TableName: "Following",
						Limit : req.body.limit,
						FilterExpression: "#user1 = :user1",
						ExpressionAttributeNames:{
							"#user1" : "user1"
						},
						ExpressionAttributeValues:{
							":user1": req.params.username
						}
					}
					docClient.scan(params,function(err, data){
						follower = data.Items.length;
						if(err){
							console.log(err);
						}else{
							
						}
				})

				}
			})

		}
	})*/
	/*cassandraClient.execute('SELECT email FROM Users WHERE username = ? allow filtering',[req.params.username], function(err,result){
		if(err){
			res.send({
					status: "error",
					error: err
			})
		}else{
			email = result.rows[0].email;
			console.log(result.rows[0].email);
			cassandraClient.execute('SELECT COUNT(User2) AS Following FROM Following WHERE User1 = ? allow filtering',[req.params.username], function(err, result){
				if(err){
					res.send({
					status: "error",
					error: err
				})
				}else{
					following = result.rows[0].following;
					console.log(result.rows[0]);
					cassandraClient.execute('SELECT COUNT(User1) AS Follower FROM Following WHERE User2 = ? allow filtering',[req.params.username], function(err, result){
						if(err){
							res.send({
					status: "error",
					error: err
				})
						}else{
							follower = result.rows[0].follower;
							console.log(result.rows[0]);
							var response = {
								email : email,
								followers : follower,
								following : following
							}
							console.log(response);
							//console.log(response);
							res.send({
								status : "OK",
								user: response
							})
						}
					})
				}
			})
		}
	})*/
})

app.get('/user/:username/followers',function(req,res){
	//console.log(req.params.username)
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
		/*docClient.scan(params,function(err, data){
			if(err){
				console.log(err);
			}else{
				res.send({
					status: "OK",
					users: data.Items
				})
			}
		})*/
		/*cassandraClient.execute('SELECT User1 From Following where User2 =? LIMIT ? allow filtering', [req.params.username, req.body.limit] ,function(err,result){
			if(err){
				console.log(err);
			}
			else{
				//console.log(result)
				res.send({status:"OK"});
			}
		})*/
	}
	else{
		/*cassandraClient.execute('SELECT User1 From Following where User2 = ? LIMIT 50 allow filtering',[req.params.username], function(err,result){
			if(err){
				console.log(err);
			}
			else{
				var response = {
					status: "OK",
					users: result.rows
				}
				res.send(response);
			}
		})*/
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
	//console.log(req.params.username)
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
		/*cassandraClient.execute('SELECT User2 From Following where User1 = ? LIMIT ? allow filtering', [req.params.username, req.body.limit],function(err,result){
			if(err){
				console.log(err);
			}
			else{
				//console.log(result)
				res.send({status:"OK"});
			}
		})*/
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
		/*cassandraClient.execute('SELECT User2 From Following where User1 = ? LIMIT 50 allow filtering',[req.params.username], function(err,result){
			if(err){
				console.log(err);
			}
			else{
				var response = {
					status: "OK",
					users: result.rows
				}
				res.send(response);
			}
		})*/
	}
})





app.post('/follow',function(req,res){
	//console.log(req.body);
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
		/*docClient.put(params,function(err,data){
			if(err){
				console.log(err);
			}else{
				res.send({status: "OK"});
			}
		})*/
		//console.log("TRUE???")
	/*cassandraClient.execute('INSERT INTO Following (User1, User2) VALUES (?, ?)', [req.session.user, req.body.username], function(err,result){
		if(err){
			console.log(err);
			res.send({
				status: "error",
				error: err
			});
		}
		else{
			res.send({status: "OK"});
		}
	})*/
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
		/*docClient.delete(params, function(err,data){
			if(err){
				console.log(err);
			}else{
				res.send({status: "OK"});
			}
		})*/
		//console.log("FOLLOW IS NOT TRUE");
		/*cassandraClient.execute('DELETE FROM Following WHERE User1 = ? AND User2 = ?', [req.session.user, req.body.username], function(err,result){
			if(err){
				res.send({
				status: "error",
				error: err
			});
			}else{
				//console.log(req.session.user +'has unfollow '+req.body.username);
				res.send({status: "OK"});
			}
		})*/
	}
})

app.post('/addmedia', function(req,res){


	var id = crypto.createHash('md5').update(req.files.content.name).digest('hex');
	//var data = [id, req.files.content.data];
	var params = {
			'id': id,
			'content': req.files.content.data
		};
		mongoDB.collection('media').insertOne(params, function(err,records){
			if(err){
				console.log(err)
			}
			else{
				res.send({
					status:"OK",
					id: id
				})
			}
		})
//	console.log(id);
//	console.log(data);
//	chanRec.publish(exchange, 'add', data);

	/*var params = {
		TableName: "Media",
		Item:{
			"id": id,
			"content": data 
		}
	}

	docClient.put(params, function(err,data){
		if(err){
			console.log(err)
		}else{
			res.send({
				status: "OK",
				id: id
			})
		}
	})*/
	/*cassandraClient.execute('INSERT INTO media (id, content) VALUES (?, ?)',data, function(err, result){
		if(err){
			console.log(err);
		}else{
				res.send({
		status:"OK",
		id: id
	})
		}
	})*/

})

app.get('/media/:id',function(req,res){
	var params = {
		'id': req.params.id
	}
	mongoDB.collection('media').findOne(params, function(err,records){
		if(err){
			res.send({
				status: "error",
				error: err
			})
		}
		else{
			//console.log(records.id);
			if(records == null){
			//	console.log(records);
				res.send({
				status: "error",
				error: "no item found"
			})
			}
			else{
			//	console.log(records.id);
				res.writeHead(200,{'content-type': 'image/png'});
			res.write(new Buffer(records.content), 'binary');
			res.end();
				}
		}
	})
	//console.log(req.params.id);
	/*var params = {
		TableName: "Media",
		KeyConditionExpression: "#id = :id",
		ExpressionAttributeNames: {
			"#id": "id" 
		},
		ExpressionAttributeValues:{
			":id": req.params.id
		}
	}

	docClient.query(params, function(err,data){
		if(err){
			console(err);
		}else{
			res.writeHead(200,{'content-type': 'image/png'});
			res.write(new Buffer(data.Items[0].content), 'binary');
			res.end();
		}
	})*/
	/*var query = 'SELECT content FROM media WHERE id = ?';
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
	})*/

})


app.listen(8080, "172.31.1.118",function(){
	console.log("Server listening on port " + 9000);
})
