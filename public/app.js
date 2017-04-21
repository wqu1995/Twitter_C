var app = angular.module('app',['ui.router', 'ui.bootstrap', 'ngRoute']);


app.config(["$routeProvider", "$locationProvider", function($routeProvider, $locationProvider){
    $routeProvider
	.when("/", {
		templateUrl: "index.html",
		controller: "mainCtrl"
	})
	.when("/login", {
		templateUrl: "login.html",
		controller: "loginCtrl"
	})
    .when("/adduser",{
      templateUrl: "signUp.html",
      controller: "adduserCtrl"
    })

}]);
/*
app.config(['$urlRouterProvider','$stateProvider'],function($urlRouterProvider,$stateProvider){
	$urlRouterProvider.otherwise('/');

	$stateProvider
		.state('home',{
			url:'/',
			templateUrl:'partials/login.html'
		})

});*/




app.controller("mainCtrl",function($scope,$location,$http,$uibModal,srvShareData){

	//$http.get('/getAllTweets').success(function(res){
	//	$scope.tweets = res;
	//})


	$scope.getItem = function(){
		query = '/item/'+$scope.tweetId;
		var result = [];
		$http.get(query).success(function(res){
			result.push(res.item);
			$scope.tweets = result;

		})
	}
	$scope.searchTweets = function(){
		var time, lim;
		if($scope.searchTweet ===""){
			$scope.searchTweet = null;
		}
		if($scope.limit ===""){
			$scope.limit = null;
		}
		if(!angular.isUndefined($scope.searchTweet)){
			time = parseInt($scope.searchTweet);
		}

		var jsonPost = {
			timestamp: time,
			limit: $scope.searchLimit
		}
		console.log(jsonPost);
		$http.post('/search',jsonPost).success(function(res){
			console.log(res);
			$scope.tweets = res.items;
		})
	}

	$scope.logout = function(){
		$http.post('/logout').success(function(res){
			if(res.status === "OK"){
				window.location.href = "/";
			}

		})
	}

	$scope.deleteTweet = function(){
		console.log("DELETE TWEET CALLED")
		var query = '/item/' + $scope.deleteTweetId;
		$http.delete(query).success(function(res){
			if(res.status == "OK"){
				alert("TWEET DELETED");
			}
		})
	}

	$scope.additem = function(){
			var jsonToPost = {
			content: $scope.tweet,
			parent: 'none'
		};

		$http.post('/additem',jsonToPost).success(function(res){
			if(res.status === "OK"){
			 alert("Tweet id: "+res.id+ "was posted");
			}
			else{
				alert("Fail");
			}
		})
	}

	$scope.follow = function(){
		var jsonToPost = {
			username: $scope.userToFollow,
			follow: true
		}

		$http.post('/follow',jsonToPost).success(function(res){
			if (res.status === "OK"){
				alert("FOLLOWED");
			}
			else{
				alert("Fail");
			}
		})
	}

	$scope.unfollow = function(){
		var jsonToPost = {
			username: $scope.userToUnFollow,
			follow: false
		}

		$http.post('/follow',jsonToPost).success(function(res){
			if(res.status === "OK"){
				alert("UNFOLLOWED");
			}
			else{
				alert("Fail");
			}
		})
	}


	$scope.openSearch = function(){
		var modalInstance = $uibModal.open({
			templateUrl: '/searchModal.html',
			controller: 'searchCtrl'
		})
		modalInstance.result.then(function (data) {
                $scope.tweets = data.items;
            })
	}

	$scope.getUserFollowers = function(){
		$http.get('/user/' + $scope.usernameFollowers + '/followers').success(function(res){
			console.log(res);
			var modalInstance = $uibModal.open({
				templateUrl: '/followers.html',
				controller: 'followersCtrl',
				 resolve: {
                    followers: function(){
                        return res.users;
                    }
                }
			})
		})
	}

	$scope.getUserFollowings = function(){
		$http.get('/user/' + $scope.usernameFollowing + '/following').success(function(res){
			console.log(res);
			var modalInstance = $uibModal.open({
				templateUrl: '/following.html',
				controller: 'followingCtrl',
				resolve:{
					following: function(){
						return res.users;
					}
				}
			})
		})
	}

	$scope.searchUser = function(){
		console.log("HIT THIS")
		var search = $scope.userToSearch;
		var modalInstance = $uibModal.open({
			templateUrl:'/profile.html',
			controller:'profileCtrl',
			resolve:{
				user: function(){
					return search;
				}
			}
		})

	}
})

app.controller("loginCtrl",function($scope,$location,$http,$uibModal){

	$scope.login = function(){
		var data  = {
			username : $scope.login.username,
			password : $scope.login.password
		}

		$http.post('/login', data).success(function(res){
			if(res.status ==="OK"){
				window.location.href = "/";
			}
			else{
				console.log(res)
				$scope.loginInfo = "Fail to login";
			}
		})
	}

	$scope.signUpButton = function(){
		    var modalInstance = $uibModal.open({
            templateUrl: '/adduser',
            controller: 'adduserCtrl',

        });


	}
})

app.controller("adduserCtrl",function($scope,$location,$http, $uibModalInstance){
	$scope.ok = function(){
		var data = {
			username : $scope.adduser.username,
			password : $scope.adduser.password,
			email : $scope.adduser.email
		}
		$http.post('/adduser',data).success(function(res){
			if(res.status ==="OK"){
				console.log(res)
				$scope.adduserInfo = "Please verify your account"
			}else{
				console.log(res)
				
				$scope.adduserInfo = "Fail to signup"
			}
		})
	}

	$scope.cancel = function(){
		$uibModalInstance.close();
	}
})

app.controller("searchCtrl", function($scope,$location,$http,$uibModalInstance){
	$scope.options = ["true", "false"];
	$scope.ok = function(){
		var selection;
		if ($scope.selectedFollowing == "true"){
			console.log("TRUEEEE");
			selection = true;
		}
		else{
			selection = false;
		}
		if($scope.timestamp === "")
			$scope.timestamp = null;
		if($scope.limit === "")
			$scope.limit = null;
		if($scope.q === "")
			$scope.q = null;
		if($scope.username === "")
			$scope.username = null;
		
		var data = {
			timestamp : $scope.timestamp,
			limit: $scope.limit,
			q: $scope.q,
			username: $scope.username,
			following: selection
		}
		console.log("THIS IS DATA")
		console.log(data);
		$http.post('/search',data).success(function(res){
			if(res.status == "OK"){
				console.log(res);
				$uibModalInstance.close(res);
			}
			else{
				console.log(res);
			}
		})
	}

	$scope.cancel = function(){
		$uibModalInstance.close();
	}
})

app.controller("followersCtrl",function($scope,$location,$http,$uibModalInstance,followers){
	$scope.follows = followers;
	$scope.ok = function(){
		$uibModalInstance.close();
	}
	$scope.cancel = function(){
		$uibModalInstance.close();
	}
})

app.controller("followingCtrl",function($scope,$location,$http,$uibModalInstance,following){
	$scope.follows = following;
	$scope.ok = function(){
		$uibModalInstance.close();
	}
	$scope.cancel = function(){
		$uibModalInstance.close();
	}
})

app.controller("profileCtrl",function($scope,$location,$http,user){
	$scope.currentUser = user;


	$http.get('/user/' + user + '/followers').success(function(res){
		$scope.followers = res.users;
		if(res.users.indexOf(req.session.user) > -1){
			console.log("THIS IS TRUEEEEEEE");
		}		
	})

	$http.get('/user/'  + user + '/following').success(function(res){
		$scope.following  = res.users;
	})


})


app.service('srvShareData', function($window) {
          var KEY = 'App.SelectedValue';

        var addData = function(newObj) {
            var mydata = $window.sessionStorage.getItem(KEY);
            if (mydata) {
                mydata = JSON.parse(mydata);
            } else {
                mydata = [];
            }
            mydata[0] = newObj;
            $window.sessionStorage.setItem(KEY, JSON.stringify(mydata));
        };

        var getData = function(){
            var mydata = $window.sessionStorage.getItem(KEY);
            if (mydata) {
                mydata = JSON.parse(mydata);
            }
            return mydata || [];
        };

        return {
            addData: addData,
            getData: getData,
        };
    });


