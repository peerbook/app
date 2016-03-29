
var services = angular.module('peerbook.services', []);

services.filter('ago', function ($filter) {
    
    return function (time) {
        var now = new Date();
        var then = new Date(time);
        var diff = Math.abs(now - then) / 1000;
        
        var format = "s's'";
        if(diff > 60*60*24) {
            format = "d'd'";
        } else if(diff > 60*60) {
            format = "h'h'";
        } else if(diff > 60) {
            format = "m'm'";  
        }
            
        return $filter('date')(diff*1000, format);
    };
});

services.service('$channel', [function () {
        var sub = {};
        return {
            subscribe: function (channel, callback) {
                if (!sub[channel])
                    sub[channel] = [];

                sub[channel].push(callback);
            },
            publish: function (channel, message) {
                angular.forEach(sub[channel], function (caller) {
                    caller(message || undefined);
                });
            }
        };
    }]);

services.factory('Copy', function ($api, $q, $channel) {
    return {
        go : function (id) {
            var def = $q.defer();
            
            $api.post('interaction', {
                copy_id : id
            }).success(function (object) {
                
                // publish a new chat
                if(object.new) {
                    $channel.publish('chat:added', object);
                }
                
                def.resolve({
                    id : object.id.$id,
                    interaction : object
                });
                
            }).catch(def.reject);
            
            return def.promise;
        }
    };
});

services.factory('BarcodeScanner', function ($q) {
    
    var running = false;
    
    return {
        scan: function () {

            var def = $q.defer();

            if (!running && window.cordova && window.cordova.plugins.barcodeScanner) {
                running = true;
                window.cordova.plugins.barcodeScanner.scan(
                        function (result) {
                            running = false;
                            if(result.cancelled)
                                def.reject({
                                    type : 'cancelled',
                                    action : 'scanner'
                                });
                            else 
                                def.resolve(result);
                        },
                        function (error) {
                            running = false;
                            def.reject({
                                type : 'not_recognized',
                                error : error
                            });
                        }
                );
            } else if(!running) {
                def.reject({
                    type : 'not_installed'
                });
            } else {
                def.reject({
                    type : 'camera_running'
                });
            }

            return def.promise;
        }
    };
});

services.factory('Scroll', function($timeout) {
   var Scroll = function (element) {
        
        var el = element[0];
        
        this.scrollTo = function (mode) {
            if(mode === 'bottom') {
                el.scrollTop = el.scrollHeight;
            } else if (mode === 'top') {
                el.scrollTop = 0;
            } else {
                el.scrollTop = mode;
            }
        };
    };
    
    return Scroll;
});

services.factory('ImageLoader', function ($q) {
   
    var loadImage = function (url) {
        var def = $q.defer();
        var image = new Image();
        image.onload = function () {
            def.resolve(this);
        };
        image.onerror = function () {
            def.reject();
        };
        image.src = url;
        
        return def.promise;
    };
    
    var getCanvas = function (w, h) {
        var cv = document.getElementById("imageLoader");
        if(cv) {
            return cv;
        } else {
            var canvas = document.createElement('canvas');
            canvas.id     = "imageLoader";
            canvas.className = "hiddenCanvas";
            canvas.width  = w;
            canvas.height = h;
            canvas.style.visibility = 'hidden';
            document.body.appendChild(canvas);

            return canvas;
        }
    };
    
    return {
        get : function (url) {
            var imageDef = $q.defer();
            
            loadImage(url).then(function (image) {
                var cv = getCanvas(image.width, image.height);
                var ct = cv.getContext("2d");
                ct.drawImage(image, 0, 0);
                imageDef.resolve(cv.toDataURL());
            }, function () {
                imageDef.reject();
            });
                
            return imageDef.promise;
        }
        
        /* function handleImage(e){
    var reader = new FileReader();
    reader.onload = function(event){
        var img = new Image();
        img.onload = function(){
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img,0,0);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);     
}*/
        
    };
    
});

services.factory('ErrorLogger', function ($mdDialog, $api, $location) {
   return {
       log : function (data) {
            $api.post('error', angular.extend({
                location : $location.path()
            }, data));
       },
       show : function (message, object) {
           
           this.log({
                message : message,
                object: object
           });
           
           $mdDialog.show(
                $mdDialog.alert()
                  .parent(angular.element(document.body))
                  .clickOutsideToClose(true)
                  .title('Error')
                  .content(message)
                  .ariaLabel('Error dialog')
                  .ok('Got it!')
              );
       }
   }; 
});


services.factory('$localstorage', ['$window', function ($window) {
    return {
        set: function (key, value) {
            $window.localStorage[key] = value;
        },
        get: function (key, defaultValue) {
            return $window.localStorage[key] || defaultValue;
        },
        setObject: function (key, value) {
            $window.localStorage[key] = JSON.stringify(value);
        },
        getObject: function (key) {
            return JSON.parse($window.localStorage[key] || '{}');
        }
    };
}]);


services.provider('PeerbookUser', function () {
    var $this = this;
    this.data = {};
    
    this.init = function () {
        if(window.localStorage['userInfo'])
            this.data = JSON.parse(window.localStorage['userInfo']);
    };
    
    this.setData = function (data) {
        this.data = data;
        window.localStorage['userInfo'] = JSON.stringify(data);
    };
    
    this.$get = function () {
        return {
            get : function () {
                return $this.data;
            },
            set : function (v) {
                $this.setData(v);
            }
        };
    };
    
});

services.factory('Location', function ($cordovaGeolocation, $q) {

    return {
        getCurrentPosition: function () {
            var def = $q.defer();
            var posOptions = {timeout: 10000, enableHighAccuracy: true};
            
            // debug
            if(window.location.hostname === 'localhost') {
                def.resolve({
                    longitude : 6.9010189999999998, 
                    latitude : 52.2218329999999970,
                    accuracy : 0
                });
            } else {
            
                $cordovaGeolocation          
                    .getCurrentPosition(posOptions)
                    .then(function (position) {
                        def.resolve(position.coords);
                    }, function (err) {
                        def.reject(err);
                    });       
            }
                
            return def.promise;
        },
        
        convert : function (coords) {
            return {
                longitude : coords.longitude,
                latitude : coords.latitude,
                accuracy : coords.accuracy
            };
        }
    };

});


services.factory('BatchCall', ['$http', '$q', function ($http, $q) {
    
    var bc = function (config) {
        var $this = this;
        var calls = [];
        var returnKeyCounter = 0;
        
        this.config = angular.extend({
            host : '',
            token : null
        }, config);
        
        var findCallByKey = function (returnKey) {
            var result = null;
            
            angular.forEach(calls, function (value) {
                if(value.callObject.returnKey === returnKey)
                    result = value;
            });
            
            return result;
        };
        
        var handleResponse = function (def, data) {
            // is error, http status code is different than 200
            if(data.code && data.code !== 200) {
                def.reject(data);
            } else {
                def.resolve(data);
            }
        };
        
        this.execute = function () {
            var def = $q.defer();
            
            var sendArray = [];
            angular.forEach(calls, function (value) {
                sendArray.push(value.callObject);
            });
            
            $http.post($this.config.host+'/api/batch', sendArray).success(function (data, status, headers, config) {
                
                for(var returnKey in data) {
                    var foundObject = findCallByKey(returnKey);
                    if(foundObject) {
                        handleResponse(foundObject.promise, data[returnKey]);
                    }
                }
                
                def.resolve();
            }).catch(function (data, status, headers, config) {
                def.reject(data);
            });
            
            return def.promise;
        };
        
        this.call = function (url, method, params, data) {  
            method = method || "GET";
            if(!url) 
                throw new "URL or Method cannot be empty";
            
            var newDef = $q.defer();
            
            var callObject = {
                method : method,
                url : url,
                data : data ? data : null,
                params : params ? params : null,
                returnKey : 'rk'+(returnKeyCounter++)
            };
            
            calls.push({
                promise : newDef,
                callObject : callObject
            });
            
            return newDef.promise;
        };
        
    };
    
    return bc;
    
}]);

services.provider('$api', function ($httpProvider) {
        
    var $this = this;
    this.config = {
        host : 'http://peerbieb.com',
        token : null
    };
    
    this.setConfig = function (config) {
        angular.extend($this.config, config);
    };
    
    this.setUserToken = function (token) {
        $this.config.token = token;
        $httpProvider.defaults.headers.common.PeerbookToken = token;
    };
    
    function createUrl (url) {
        return $this.config.host + '/api/' + url; 
    };
    
    this.init = function () {
        
    };
    
    this.$get = function ($http, BatchCall) {
        
        function handle(req) {        
            return req;
        };
    
        
        return {
            batch : function () {
                return new BatchCall($this.config);
            },
            get : function (url) {
                return handle($http.get(createUrl(url)));
            },
            post : function (url, data) {
                return handle($http.post(createUrl(url), data));
            },
            'delete' : function (url) {
                return handle($http.delete(createUrl(url)));
            },
            put : function (url, data) {
                return handle($http.put(createUrl(url), data));
            }
        };
        
    };
    
    this.init();
    
});

services.factory('UserLocationService', function ($q, $api, ErrorLogger, Location, $mdToast, $mdDialog) {
    
    var updateUserPosition = function (position) {
        return $api.put('user/me', {
            position : Location.convert(position)
        });
    };
    
    var updateLocation = function () {
        var def = $q.defer();
        Location.getCurrentPosition().then(function (position) {
            return updateUserPosition(position);
        }).catch(function (error){
            def.reject(error);
        });
        return def.promise;
    };
    
    return {
        updateCurrentLocationInBackground : function () {
            return updateLocation();
        },
        updateCurrentLocation : function ($event) {
            var _position;
            Location.getCurrentPosition().then(function (position) {
                _position = position;
                return $api.post('location', {position: Location.convert(position)});
            }).then(function (data) {
                var confirm = $mdDialog.confirm()
                    .title('Is dit adres Thuis?')
                    .content(data.data.streetName+', '+data.data.locality)
                    .ariaLabel('Confirm')
                    .targetEvent($event)
                    .ok('Ja')
                    .cancel("Cancel");
                return $mdDialog.show(confirm);
            }).then(function () {
                return updateUserPosition(_position);
            }).then(function () {
                $mdToast.show(
                    $mdToast.simple()
                      .content('Succesvol opgeslagen')
                      .position('bottom left')
                      .hideDelay(3000)
                );
            }).catch(function (error) {
                if(error)
                    ErrorLogger.show("Locatie kon niet bepaald of opgeslagen worden", error);
            });
            
        }
    };
});

services.factory('BookAdditionService', function ($q, $state, $mdDialog, $api, DeviceUser, BarcodeScanner, ErrorLogger) {

    var $this = {};
    
    var currentScanPromise = null;
    var scanIsRunning = false;
    
    var debugEanScanner = function () {
        
        return $mdDialog.show({
            parent: angular.element(document.body),
            clickOutsideToClose : true,
            template:
            '<md-dialog aria-label="Confirm">' +
            '  <md-dialog-content>' +
            '   <md-input-container> '+
            '   <label>EAN</label>'+
            '   <input ng-model="obj.ean" type="text">'+
            '   </md-input-container> '+
            '  </md-dialog-content>' +
            '  <div class="md-actions">' +
            '    <md-button ng-click="oke()" class="md-primary md-raised">' +
            '      Toevoegen' +
            '    </md-button>' +          
            '   <md-button ng-click="closeDialog()">' +
            '      Cancel' +
            '    </md-button>' +
            '  </div>' +
            '</md-dialog>',
            controller: ['$scope', '$mdDialog', function ($scope, $mdDialog) {
                $scope.obj = {ean:''};
                
                $scope.oke = function () {
                    $mdDialog.hide({
                        format : 'ean_13',
                        text : $scope.obj.ean
                    });
                };
                
                $scope.closeDialog = function () {
                    $mdDialog.cancel();
                };
                
            }]
        });
        
    };
    
    var searchBook = function (res) {
        var intdef = $q.defer();
        
        // res = { format: 'ean_13', text: 'code' }
        $api.get('search/' + res.text).success(function (data) {
            intdef.resolve(data);
        }).catch(function (error) {
            intdef.reject({
                type : 'not_found',
                q : res.text,
                error : error
            });
        });        
        
        return intdef.promise;
    };
    
    var confirm = function (search_item) {      
        var def = $q.defer();
        
        $state.go('preview', {
            item : search_item,
            finishPromise : def
        });
        
        return def.promise;
    };
    
    $this.scan = function () {
        
        if(scanIsRunning)
            return;
        
        scanIsRunning = true;
        
        // set current scanning def, when resolved is reset
        if(currentScanPromise) {
            var def = currentScanPromise;
        } else {
            var def = $q.defer();
            currentScanPromise = def;
        }
        
        var scanPromise;
        if(DeviceUser.isDevice()) {
            scanPromise = BarcodeScanner.scan();
        } else {
            scanPromise = debugEanScanner();
        }
        
        scanPromise.then(function (scan_object) {
                    scanIsRunning = false;
                    return scan_object;
                })
                .then(searchBook)
                .then(confirm)
                .then(function (data) {
                    currentScanPromise = null;
                    return data;
                })
                .then(def.resolve)
                .catch(function (error) {
                    if(error.type === 'not_installed') {
                        ErrorLogger.show('No camera installed', error);
                    } else if(error.type === 'not_recognized') {
                        ErrorLogger.show('Boek niet herkend', error);
                    } else if(error.type === 'not_found') {
                        ErrorLogger.show('Sorry, boek is niet in onze database', error);
                    }
                });
        
        return def.promise;
    };
    
    $this.rescan = function () {
        return $this.scan();
    };
        
    return $this;
});

services.factory('DeviceUser', function ($cordovaDevice) {
    return {
        isDevice : function () {
            return !!window.device;
        },
        id : function () {
           
            return this.deviceId();
                // TODO Naar echt ID
        },
        deviceId: function () {
            if (window.device)
                return $cordovaDevice.getPlatform() + "_" + $cordovaDevice.getUUID();
            else
                return 'browser_' + window.navigator.userAgent;
        }
    };
});

services.factory('$deviceIdentity', function (DeviceUser, $q, $cordovaContacts) {
    
    var getDeviceUser = function () {
        
        var defUser = $q.defer();
        
        if(window.plugins && window.plugins.accountmanager) {  
            var am = window.plugins.accountmanager;
            am.getAccountsByType('com.google', function(error, accounts) {
                if(!error && accounts[0])
                    defUser.resolve(accounts[0]);
                else
                    defUser.reject({
                        error : 'error',
                        data : error
                    });
            });
        } else
            defUser.reject({
                error : 'not_supported'
            });
        
        return defUser.promise;
    };
    
    var getDeviceContact = function (q) {
        var def = $q.defer();
        var fields = ['displayName', 'name', 'emails','nickname','photos','urls','addresses', 'phoneNumbers'];
        $cordovaContacts.find({
            filter : q,
            multiple: true,
            fields:  ['displayName', 'name', 'emails'],
            desiredFields: fields
        }).then(function (contacts) { 
            if(contacts[0]) {
                
                var contact = {};
                fields.forEach(function (field) {
                    contact[field] = contacts[0][field];
                });
                
                def.resolve(contact);
            } else
                def.reject({
                    error : 'not_found',
                    q : q
                });
        });
        
        return def.promise;
    };
    
    return {
        get : function () {                   
            return getDeviceUser().then(function (account) {
                return getDeviceContact(account.name);
            }).catch(function (object) {
                var email = null;
                if(object.error === 'not_found') {
                    email = object.q;
                }
                
                return $q.when({
                   name : {
                       familyName: "family",
                       formatted: "Peerbook family",
                       givenName: "Peerbook gebruiker"
                   },
                   image : null,
                   emails : email !== null ? [email] : [],
                   photos : [],
                   displayName : 'Peerbook gebruiker'
                });
            });
        }
    };
});

services.provider('InitApp', function ($apiProvider, PeerbookUserProvider) {
        
    var q;
    var readyDefer;
    var initDefer;
    var firstLaunchDefer;
    
    this.init = function () {
        var injector = window.angular.injector(['ng']);
        q = injector.get('$q');
        
        readyDefer = q.defer();
        initDefer = q.defer();
        firstLaunchDefer = q.defer();
    };

    this.isReady = function () { 
        return initDefer.promise;
    };
    
    this.$get = function ($deviceIdentity, DeviceUser, ErrorLogger, $http, ImageLoader) {
        
        var createUser = function () {

            $deviceIdentity.get().then(function (device_user) {
                var def = q.defer();

                if (device_user.photos[0] && device_user.photos[0].value) {
                    ImageLoader.get(device_user.photos[0].value).then(function (data) {
                        device_user.imageData = data;
                        def.resolve(device_user);
                    }).catch(function () {
                        def.resolve(device_user);
                    });
                } else
                    def.resolve(device_user);

                return def.promise;
            }).then(function (device_user) {
                return $http.post($apiProvider.config.host + '/api/auth', {
                    uid: DeviceUser.id(),
                    device_user: device_user
                });
            }).then(function (data) {
                var user_info = data.data;
                
                PeerbookUserProvider.setData(user_info);
                $apiProvider.setUserToken(user_info.token);
                window.localStorage['userToken'] = user_info.token;
                initDefer.resolve();

                firstLaunchDefer.resolve(user_info);                
            }).catch(function (error) {
                
                if(error) {
                    ErrorLogger.show('Some operation is not supported', error);
                } else
                    ErrorLogger.show('An internet connection is required');
                
                initDefer.reject(error);
            });

        };
        
        var initUser = function () {
            
            if(window.localStorage['userToken']) {
                $apiProvider.setUserToken(window.localStorage['userToken']);
                PeerbookUserProvider.init();
                initDefer.resolve();
            } else {
                createUser();
            }
        };
        
        return {
            firstLaunch : function () {
                return firstLaunchDefer.promise;
            },
            ready : function () {
                readyDefer.resolve();
            },
            init : function () {
                readyDefer.promise.then(function () {
                    if(!DeviceUser.isDevice()) {
                        console.info('Browser mode!');
                        $apiProvider.setConfig({
                            host: 'http://peerbieb.plank.nl'
                        });
                    }
                    
                }).then(initUser);
                
                return initDefer.promise;
            }
        };
        
    };
    
});
