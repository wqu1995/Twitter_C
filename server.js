var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();
var serveStatic = require('serve-static');
var session = require('cookie-session');
var mysql = require('mysql');
var crypto = require('crypto');
var cryptoRandomString = require('crypto-random-string');
var nodemailer = require('nodemailer');
//var FileStore = require('session-file-store')(session);
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
const dateTime = Date.now();
var fileupload = require('express-fileupload');
var cassandra = require('cassandra-driver');
var amqp = require('amqplib/callback_api');
var amqpConn, chan;
var exchange = 'twitter';

/*amqp.connect('amqp://test:test@54.234.28.240', function(err,conn){
	amqpConn = conn;
	chan = conn.createChannel(function(err,ch){
		ch.assertExchange('twitter', 'direct');
	})
	console.log("connected to amqp");
})*/

var cassandraClient = new cassandra.Client({
	contactPoints: ['54.164.116.15'],
	keyspace: 'twitter'
},function(err){
	if(err)
		console.log(err);
	else
		console.log("connected to cassandra")
})

//var url = 'mongodb://52.90.176.234:27017/twitter';
//var url = 'mongodb://localhost:27017/twitter';


/*
mongoClient.connect(url,function(err,db){
	assert.equal(null,err);
	console.log("CONNECTION SUCCESS");
	//db.tweets.createIndex({"content": "text"});
	})*/


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
	var post = [req.body.username,req.body.password,req.body.email,false,hash];

	cassandraClient.execute('INSERT INTO Users (username, password, email, enabled, verify) VALUES (?,?,?,?,?)', post, function(err,result){
		if(err){
			res.send({
				status: "error",
				error: err
			});
		}
		else{
			res.send({status: "OK"});
		}
	})
		
})

app.get('/login', function(req,res){
	res.sendFile('login.html',{root: __dirname+'/public'});
})
app.post('/login', function(req,res){
	//console.log([req.body.username, req.body.password])
	cassandraClient.execute('SELECT * FROM Users WHERE Username = ? AND password = ? ALLOW FILTERING', [req.body.username, req.body.password], function(err, result){
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
	console.log([req.body.email, req.body.key])
	if(req.body.key === 'abracadabra'){
		cassandraClient.execute('SELECT username FROM Users WHERE email = ? ALLOW FILTERING', [req.body.email],function(err,result){
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
	/*	mongoClient.connect(url,function(err,db){
	assert.equal(null,err);
	//console.log(req.body);
	
	var newDoc = {
		content: req.body.content,
		parent: req.body.parent,
		username: req.session.user,
		timestamp: timestamp
	}
	db.collection('tweets').insertOne(newDoc,function(err,result){
		assert.equal(null,err);
		db.close();
		var resultToSend = {
			status: "OK",
			id: newDoc._id,
		}
		res.send(resultToSend);
	})
})*/
//console.log('in add item')
/*	if(req.body.content.substring(0,3)=="RT "){
		connection.query('SELECT id FROM Tweets where content = '+ mysql.escape(req.body.content.substring(3,req.body.content.length)), function(err,result){
			if(err){
				console.log("in additem error");
			}else{
				connection.query('UPDATE Data SET RTCounter = RTCounter +1 WHERE id = '+mysql.escape(result[0].id),function(err,result){
					if(err){
						console.log("in additem error2");
					}
				})
			}
		})
		/*connection.query('UPDATE Tweets SET RTCounter = RTCounter + 1 WHERE content = ' + 
			mysql.escape(req.body.content.substring(3,req.body.content.length)), function(err,result){
				if(err){
					console.log(err);
				}
			})
	}*/
var timestamp = Math.floor(dateTime/1000);	
var postid = crypto.createHash('md5').update(req.body.content+cryptoRandomString(10)).digest('hex');
		var post;
		if(req.body.parent != null && req.body.parent != ""){
			if(req.body.media !=null && req.body.media != ""){
				post = [postid,req.body.content,req.session.user,timestamp,req.body.parent,req.body.media.toString(),0]

			}
			else{
				post = [postid,req.body.content,req.session.user,timestamp,req.body.parent,null,0]
			}
		}
			
		else{
			if(req.body.media !=null && req.body.media != ""){
				post = [postid,req.body.content,req.session.user,timestamp,null,req.body.media.toString(),0]

			}
			else{
				post = [postid,req.body.content,req.session.user,timestamp,null,null,0]

			}
		}

		cassandraClient.execute('INSERT INTO Tweets (id, content, username, timestamp, parent, media, likes) VALUES (?,?,?,?,?,?,?)', post,function(err, result){
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
		})
	}

})

app.get('/item/:id',function(req,res){
	cassandraClient.execute('SELECT * FROM Tweets WHERE id = ?',[req.params.id], function(err,result){
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
 app.post('/search',function(req,res){
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
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?',
 				[req.session.user, q, newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log("472")
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
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?'
 				[username, q, newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log("494")
 
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
 			
 			cassandraClient.execute('SELECT * FROM Tweets WHERE content LIKE \'%?%\' AND timestamp <= ?  ORDER BY timestamp DESC LIMIT ?', 
 				[q, newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log("516")
 
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
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?',
 			[req.session.user, newStamp,req.body.limit], function(err, result){
 					if(err){
 						console.log("545")
 
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
 			
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?',[username, newStamp, req.body.limit],function(err, result){
 					if(err){
 						console.log("568")
 
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
 			
 			cassandraClient.execute('SELECT * FROM Tweets WHERE timestamp <= ?  ORDER BY timestamp DESC LIMIT ?', [newStamp, req.body.limit], function(err, result){
 					if(err){
 						console.log("590")
 
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
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25',
 				[req.session.user, q, newStamp],function(err, result){
 					if(err){
 						console.log("619")
 
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
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND content LIKE \'%?%\' AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25'
 				[username, q, newStamp],  function(err, result){
 					if(err){
 						console.log("641")
 
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
 			cassandraClient.execute('SELECT * FROM Tweets WHERE content LIKE \'%?%\' AND timestamp <= ?  ORDER BY timestamp DESC LIMIT 25', 
 				[q, newStamp], function(err, result){
 					if(err){
 						console.log("662")
 
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
 			cassandraClient.execute('SELECT T.* FROM Tweets T, Following F WHERE T.username = F.User2 AND F.User1 = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25',
 			[req.session.user, newStamp],function(err, result){
 					if(err){
 						console.log("690")
 
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
 			cassandraClient.execute('SELECT * FROM Tweets WHERE username = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 25',[username, newStamp],function(err, result){
 					if(err){
 						console.log("712")
 
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
 			cassandraClient.execute('SELECT * FROM Tweets WHERE timestamp <= ?  ORDER BY timestamp DESC LIMIT 25', [newStamp], function(err, result){
 					if(err){
 						console.log("733")
 
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



app.delete('/item/:id',function(req,res){
	//console.log(req.params.id);
	/*var id = require('mongodb').ObjectId(req.params.id);
	mongoClient.connect(url,function(err,db){
	assert.equal(null,err);
	db.collection('tweets').remove({'_id': id},function(err,doc){
		if (err){
			//console.log(err)
			res.send({
				status : "error"
			});
		}
		else{
			//console.log("TWEET DELETED");
			res.send({
				status : "OK"
			})
		}
	})
})*/
//console.log("in delete item")
	cassandraClient.execute('SELECT media FROM Tweets WHERE id = ?',[req.params.id], function(err,result){
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
	})
	cassandraClient.execute('DELETE FROM Tweets WHERE id = ?',[req.params.id], function(err,result){
		if(err){
			res.send({
				status : "error",
				error : err
			})
		}else{
			res.send({
				status : "OK"
			})
		}
	})
})

app.get('/user/:username',function(req,res){
	var email, follower, following;
	cassandraClient.execute('SELECT email FROM Users WHERE username = ? allow filtering',[req.params.username], function(err,result){
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
	})
})

app.get('/user/:username/followers',function(req,res){
	//console.log(req.params.username)
	if(req.body.limit != null && req.body.limit != ""){
		cassandraClient.execute('SELECT User1 From Following where User2 =? LIMIT ? allow filtering', [req.params.username, req.body.limit] ,function(err,result){
			if(err){
				console.log(err);
			}
			else{
				//console.log(result)
				res.send({status:"OK"});
			}
		})
	}
	else{
		cassandraClient.execute('SELECT User1 From Following where User2 = ? LIMIT 50 allow filtering',[req.params.username], function(err,result){
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
		})
	}
})

app.get('/user/:username/following',function(req,res){
	//console.log(req.params.username)
	if(req.body.limit != null && req.body.limit != ""){
		cassandraClient.execute('SELECT User2 From Following where User1 = ? LIMIT ? allow filtering', [req.params.username, req.body.limit],function(err,result){
			if(err){
				console.log(err);
			}
			else{
				//console.log(result)
				res.send({status:"OK"});
			}
		})
	}
	else{
		cassandraClient.execute('SELECT User2 From Following where User1 = ? LIMIT 50 allow filtering',[req.params.username], function(err,result){
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
		})
	}
})

app.post('/item/:id/like',function(req,res){
	//console.log('in here');
	if(req.body.like == true){
		//console.log("in true");
		cassandraClient.execute('UPDATE Tweets SET like = like + 1 WHERE id = ?',[req.params.id],function(err,result){
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
		})
	}else if(req.body.like == false){
		console.log("in false");

		cassandraClient.execute('UPDATE Tweets SET like = like - 1 WHERE id = ?',[req.params.id],function(err,result){
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
		})
	}
	else{
		res.send("???")
	}
})



app.post('/follow',function(req,res){
	//console.log(req.body);
	if(req.body.follow == true){
		//console.log("TRUE???")
		cassandraClient.execute('INSERT INTO Following (User1, User2) VALUES (?, ?)', [req.session.user, req.body.username], function(err,result){
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
	})
	}
	else{
		//console.log("FOLLOW IS NOT TRUE");
		cassandraClient.execute('DELETE FROM Following WHERE User1 = ? AND User2 = ?', [req.session.user, req.body.username], function(err,result){
			if(err){
				res.send({
				status: "error",
				error: err
			});
			}else{
				//console.log(req.session.user +'has unfollow '+req.body.username);
				res.send({status: "OK"});
			}
		})
	}
})

app.post('/addmedia', function(req,res){
	var id = crypto.createHash('md5').update(req.files.content.name+cryptoRandomString(10)).digest('hex');
	var data = [id, req.files.content.data];
	cassandraClient.execute('INSERT INTO Media (id, content) VALUES (?, ?)',data, function(err, result){
		if(err){
			res.send({
				status: "error",
				error: err
			});
		}
		else{
			res.send({
				status: "OK",
				id: id
			});
		}
	})

})

app.get('/media/:id',function(req,res){
	//console.log(req.params.id);
	var query = 'SELECT content FROM Media WHERE id = ?';
	var par = [req.params.id.toString()];
	cassandraClient.execute(query, par, function(err,result){
		if(err){
			res.send({
				status: "error",
				error: err
			})
		}else if(result.rows.length == 0){
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


app.listen(8080, "172.31.25.137",function(){
	console.log("Server listening on port " + 9000);
})
