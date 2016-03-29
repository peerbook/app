var app = angular.module('peerbook', ['ionic', 'ngMaterial', 'ngCordova', 'peerbook.services', 'peerbook.directives'])
.config(function ($stateProvider, $urlRouterProvider, $mdThemingProvider, InitAppProvider) {
    InitAppProvider.init();
    
    var initResolve = {
        beforeStart: function () {
            return InitAppProvider.isReady();
        }
    };
    
    $stateProvider
    .state('home', {
        url: "/",
        templateUrl: "views/home.html",
        resolve: initResolve
    })
    .state('profile', {
      url: "/profile/:id",
      templateUrl: "views/profile.html",
      resolve: initResolve
    })
    .state('stats', {
      url: "/stats",
      templateUrl: "views/stats.html",
      resolve: initResolve
    })
    .state('chat', {
      url: "/chat/:id",
      templateUrl: "views/chat.html",
      resolve: initResolve,
      params : {
        interaction : null
      }
    })
    .state('book', {
      url: "/book/:id",
      templateUrl: "views/book.html",
      resolve: initResolve
    })
    .state('updateProfile', {
      url: "/updateProfile",
      templateUrl: "views/updateProfile.html",
      resolve: initResolve
    })
    .state('preview', {
        url: "/preview",
        templateUrl: "views/preview.html",
        resolve: initResolve,
        params: {
            item: {},
            finishPromise: null
        }
    })
    .state('map', {
      url: "/map",
      templateUrl: "views/map.html",
      resolve: initResolve
    });
    
    $urlRouterProvider.otherwise("/");
    
    $mdThemingProvider.theme('default')
        .primaryPalette('blue')
        .accentPalette('pink');

    $mdThemingProvider.theme('tabs')
        .primaryPalette('blue-grey')
        .accentPalette('pink');

})
.run(function ($ionicPlatform, $cordovaGoogleAnalytics, $ionicHistory, $rootScope, InitApp, ErrorLogger, $timeout, $api, $channel, UserLocationService) { 
    
    $ionicPlatform.ready(function () {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }    
        
        InitApp.ready();
        
        // Only on first launch
        InitApp.firstLaunch().then(function () {
            $timeout(function () {
                UserLocationService.updateCurrentLocationInBackground();
                $channel.publish('location:updated');
            }, 1000);
        });
        
        if(window.cordova) {
            $cordovaGoogleAnalytics.startTrackerWithId("UA-1481292-17");
        }
    });
    
    // log all global errors
    window.onerror = function (message, file, line, character) {
        ErrorLogger.log({
            message: message,
            file: file,
            line: line,
            character: character
        });
    };
    
    $rootScope.back = function () {
        $ionicHistory.goBack();
    };
    
    InitApp.init().then(function () {
        
        if(window.cordova) {
            $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
                $cordovaGoogleAnalytics.trackView(fromState+'->'+toState);
            });
        }
        
        $api.get('ping').error(function () {
            ErrorLogger.show('An internet connection is required');
        });
        
    });    
});


app.controller('HomeController', function ($scope, $api, $channel, $mdToast, BookAdditionService, BarcodeScanner) {
    
    $scope.books = [];   
    $scope.localBooks = [];
    
    function loadArea() {
        $api.get('local/userPosition/book').success(function (localBooks) {
            $scope.localBooks = localBooks;
        });
    }
    
    function loadPersonalBooks() {
        $api.get('user/me/book').success(function (books) {
           $scope.books = books;
        });
    }
    
    function init() {
        loadPersonalBooks();
        loadArea();
    };    
    
    $channel.subscribe('location:updated', function () {
        loadArea();
    });
    
    $channel.subscribe('book:added', function (item) {
        if(item) {
            $scope.localBooks.push(item);
        }
    });
    
    $scope.scan = function () {
        BookAdditionService.scan().then(function (item) {
            if(item.ean && !item.alreadyExists) {
                $scope.books = [item].concat($scope.books); // prepend
                
                $channel.publish('book:added', item);
            } else {
                $mdToast.show(
                    $mdToast.simple()
                      .content('Boek was al in je bibliotheek')
                      .position('bottom left')
                      .hideDelay(3000)
                );
            }
        });
    };
    
    // When book is deleted delete from lists
    $scope.$on('bookDeleted', function (event, item) {
        
        var filterListOnItem = function (arr) {
            return arr.filter(function (i) {
                return i.id.$id !== item.id.$id;
            });
        };
        
        $scope.books = filterListOnItem($scope.books);
        $scope.localBooks = filterListOnItem($scope.localBooks);        
    });
    
    // TODO: Cache, loading enz...
    
    init();
});

app.controller('ProfileController', function ($scope, $api, $stateParams) {
    $scope.id = $stateParams.id;
    
    function init() {
        $api.get('user/'+$stateParams.id).success(function (userData) {
            $scope.user = userData;
        });  
    };
        
    init();
});

app.controller('PreviewController', function ($scope, BookAdditionService, $state, $api, Location, ErrorLogger, $stateParams) {
    
    // can only be called with $stateParams.item
    $scope.item = $stateParams.item;
    var def = $stateParams.finishPromise;
    
    $scope.add = function () {
        $api.post('user/me/book', {
            ean : $scope.item.ean
        }).success(function (newly_added_item) {
            def.resolve(newly_added_item);
            $state.go('home');
        }).catch(function (error) {
            ErrorLogger.show('Book cannot be added', error);
        });
    };

    $scope.again = function () {
        $state.go('home');
        BookAdditionService.rescan();
    };

    $scope.closeDialog = function() {
        def.reject({
            type : 'cancelled',
            action : 'button'
        });
        $state.go('home');
    };
    
});

app.controller('StatsController', function ($scope, $api) {
    
    $scope.users = [];
    
    function init() {
        $api.get('local/userPosition/stats').success(function (users) {
            $scope.users = users;
        });
    }
    
    init();    
});

app.controller('ProfileUpdateController', function ($scope, $mdToast, $api, PeerbookUser, $state) {
    $scope.data = PeerbookUser.get();
    
    $scope.save = function() {
        $api.put('user/me', {
            displayName : $scope.data.displayName
        }).success(function (data) {
            PeerbookUser.set(data);
            $state.go('profile',{id:'me'});
            $mdToast.show(
                $mdToast.simple()
                  .content('Succesvol opgeslagen')
                  .position('bottom left')
                  .hideDelay(3000)
            );
        });
    };       
});

app.controller('BookController', function ($scope, $state, Copy, $stateParams, $api) {
    
    $scope.item = {};
    $scope.users = [];
    
    $scope.chat = function (item) {
        Copy.go(item.id.$id).then(function (state_params) {
            $state.go('chat', state_params);
        });
    };
    
    function init() {
        $api.get('book/'+$stateParams.id).success(function (data) {
            $scope.item = data;
        });
         $api.get('local/userPosition/book?ean='+$stateParams.id).success(function (data) {
            $scope.users = data;
        });
    };
    
    init();
});


app.controller('ChatsController', function ($scope, $channel, $state, Copy, $api) {
    
    $scope.chats = {};
    $scope.support = [];
    
    $scope.chat = function (_id, mode) {
        
        if(mode === 'copy') {
            Copy.go(_id).then(function (resulting_object) {
                $state.go('chat', resulting_object);
            });
        } else {
            $state.go('chat', {
                id: _id
            });
        }            
    };
    
    $channel.subscribe('chat:added', function (new_interaction) {
        $scope.chats.push(new_interaction);
    });
    
    function init() {
        $api.get('interaction').success(function (data) {
            $scope.chats = data;
        });
        $api.get('chat').success(function (data) {
            $scope.support = data;
        });
    };
    
    init();
});

app.controller('ChatController', function ($scope, Scroll, $api, $timeout, PeerbookUser, $stateParams, $interval) {
    $scope.id = $stateParams.id;
    $scope.item = {};
    $scope.form = {};
    $scope.me = PeerbookUser.get();
    
    var Chat = function (config) {
        var interval;
        var $this = this;
        this.config = angular.extend({
            timing : 1000,
            url : '',
            action : function () {}
        }, config);
        
        this.poll = function () {
            $api.get($this.config.url).success(function (data) {
                $this.config.action(data);
            });
        };  
        
        this.start = function () {
            interval = $interval($this.poll, $this.config.timing);
        };
        
        this.stop = function () {
            $interval.cancel(interval);
        };
        
    };
    
    var scroll = new Scroll(angular.element(document.getElementById("chatScroll")));
    var interactionChat = new Chat({
        url : 'interaction/'+$stateParams.id+'/message',
        action : function (data) {
            $scope.messages = data;
            scroll.scrollTo('bottom');
        }
    });  
    interactionChat.start();
    
    function addMessage(message) {
        $scope.messages.messages.push(message);
        $timeout(function () {
            scroll.scrollTo('bottom');
        }, 10);
    }
    // send once
    
    // What to do when sending
    
    $scope.send = function () {
        var msg = $scope.form.msg;
        if(msg && msg.length > 0) {
            
            $scope.form.msg = "";
            
            return $api.post('interaction/'+$stateParams.id+'/message',{
                message : msg
            }).success(function (msgObject) {
                addMessage(msgObject);
            });
        }
    };
    
    $scope.$on("$destroy", function() {
        interactionChat.stop();
    });
    
    function init() {
        
        var batch = $api.batch();
        
        if(!$stateParams.interaction) {
            batch.call('interaction/'+$stateParams.id, "GET").then(function (data) {
                $scope.item = data;
            });
        } else
            $scope.item = $stateParams.interaction;
        
        
        batch.call('interaction/'+$stateParams.id+'/message', "GET").then(function (data) {           
            $scope.messages = data;
            
            $timeout(function () {
                scroll.scrollTo('bottom');
            }, 100);
            
        });
        
        batch.execute();
    };
    
    init();
});