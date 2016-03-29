var directives = angular.module('peerbook.directives', []);

directives.directive('updateCurrentPosition', function (UserLocationService) {
    return {
        restrict : 'E',
        template : '<md-button ng-click="update($event)" class="md-accent md-raised">Stel huidige locatie in als Thuis</md-button>',
        link : function ($scope, element, attr) {
            $scope.update = function ($event) {
                UserLocationService.updateCurrentLocation($event);
            };
        }
    };
});

directives.directive('directFocus', function ($timeout) {
    return {
        restrict : 'A',
        link : function ($scope, element, attr) {
            
            element.on('change', function () {
                $timeout(function(){
                    element.focus();
                }, 200);
            });
            
        }
    };
});

directives.directive("bookCard", function ($api, Copy, $state, $mdToast) {
   return {
       restrict : 'E',
       scope : {
           item : '=',
           mode : '@'
       },
       templateUrl : 'bookCard.html',
       link : function ($scope, element, attr) {

            $scope.chat = function (item) {
                Copy.go(item.id.$id).then(function (params) {
                    $state.go('chat', params);
                });
            };

            $scope.lent = function (item) {
                if($scope.mode === 'me') {
                    $api.put("user/me/book/"+item.id.$id, {
                        lended : !item.lended
                    }).success(function () {
                        var text = !item.lended ? "Boek is uitgeleend" : "Boek is weer beschikbaar";
                        item.lended = !item.lended;
                        $mdToast.show(
                            $mdToast.simple()
                              .content(text)
                              .position('bottom left')
                              .hideDelay(3000)
                        );
                    });
                }
            };

            $scope.remove = function (item) {
                
                if($scope.mode === 'me') {
                 
                    $api.delete('user/me/book/'+item.id.$id).success(function () {
                        
                        $mdToast.show(
                            $mdToast.simple()
                              .content('Succesvol verwijderd')
                              .position('bottom left')
                              .hideDelay(3000)
                        );
                
                        $scope.$emit('bookDeleted', item);
                    });
                    
                    // error handling
                    
                }
                
            };

       }
   }; 
});
directives.directive('attachKeyboard', function ($window) {
    
    return {
        restrict : 'A',
        link : function ($scope, element, attr) {
            
            $window.addEventListener('native.keyboardshow', function () {
                element.addClass('keyboard-open');
            });
            $window.addEventListener('native.keyboardhide', function () {
                element.removeClass('keyboard-open');
            });
            
            $scope.$on('$destroy', function () {
                $window.removeEventListener('native.keyboardhide');
                $window.removeEventListener('native.keyboardshow');
            });
        }
    };
});

directives.directive('bookCover', function () {
    return {
        restrict : 'E',
        scope : {
            image : '=',
            title : '='
        },
        template : 
                '<div class="imageScaler"><img ng-show="hasImage" class="bookCoverImage" ng-src="{{image}}" alt="{{title}}"></div>'+
                '<div ng-hide="hasImage" class="placeholder">'+
                '<img src="img/missingbook.svg" title="Placeholder">'+
                '<p>{{title}}</p>'+
                '</div>',
                
        link : function ($scope, element) {
            
      
            $scope.hasImage = true;

            var image = element[0].querySelector('.bookCoverImage');
            if(image) {
                image.onerror = function () {
                    $scope.$apply(function () {
                        $scope.hasImage = false;
                    });
                };
            }            
        }
    };
});

directives.directive('backgroundImage', function () {
    return {
        restrict : 'A',
        scope : {
            image : '@backgroundImage'
        },
        link : function ($scope, element) {
            
            var watcher = $scope.$watch('image', function (newImageUrl) {
                if(newImageUrl) {
                    element.css({
                        'background-image' : 'url('+newImageUrl+')',
                        'background-repeat' : 'no-repeat',
                        'background-position' : 'center center',
                        'background-size' : 'cover'
                    });
                }
            });
            
            $scope.$on('$destroy', function () {
                watcher(); // unregister watcher
            });
            
        }
    };
});

directives.directive('humanPosition', function () {
    return {
        restrict : 'A',
        scope : {
            index : '@humanPosition'
        },
        link : function ($scope, element, attr) {
            
            var index = $scope.index*1 + 1;
            
            var callers = {
                '1' : 'ste',
                '8' : 'ste',
                '20' : 'ste',
                '30' : 'ste',
                '40' : 'ste',
                '50' : 'ste',
                '60' : 'ste'
            };
            
            var numerator = callers[index] ? callers[index] : 'de';
            element.text(index + '' + numerator);
        }
    };
});

directives.directive("userHeader", function ($state) {
   return {
       restrict : 'E',
       scope : {
           user : '=',
           sub : '=',
           onClick : '&'
       },
       templateUrl : 'userHeader.html',
       link : function ($scope, element, attr) {
           
           $scope.go = function ($event) {
               $event.stopPropagation();
               if(attr.onClick) {
                   $scope.onClick();
               } else {
                   $state.go('profile', {id: $scope.user.id.$id } );
               }
           };
           
       }
   }; 
});

directives.directive('fullHeight', function ($timeout, $window) {
    return {
        restrict : 'A',
        link : function ($scope, element, attr) {
            
            var offset = attr.fullHeightOffset ? parseInt(attr.fullHeightOffset) : 0;
            
            function calculate(dynamicOffset) {
                
                if(!dynamicOffset)
                    dynamicOffset = 0;
                
                if(attr.fullHeight === 'parent.parent') {
                    element.css('min-height', (0 + dynamicOffset + offset + element.parent().parent()[0].clientHeight) + 'px');   
                } else if(attr.fullHeight === 'parent.parent.parent') {
                    element.css('min-height', (0 + dynamicOffset + offset + element.parent().parent().parent()[0].clientHeight) + 'px');       
                } else if(attr.fullHeight === 'parent.parent.parent.parent') {
                    element.css('height', (0 + dynamicOffset + offset + element.parent().parent().parent().parent()[0].clientHeight) + 'px');       
                 }else {
                    element.css('min-height', (0 + dynamicOffset + offset + element.parent()[0].clientHeight) +'px');         
                }
            }
            
            $timeout(calculate, 100); 
            
            angular.element($window).on('resize', function () {
                calculate();
            });
            
            $scope.$on('$destroy', function () {
                angular.element($window).off('resize');
            });
        }
    };
});

directives.directive('onEnter', function ($timeout) {
    return {
        restrict: 'A',
        scope : {
            'onEnter' : '&'
        },
        link : function ($scope, element, attr) {
            
            var hasSend = false;
            
            element.on('keyup', function (event) {
                if(event.keyCode === 13 && !hasSend) {
                    $scope.onEnter();
                    hasSend = true;
                    
                    $timeout(function () {
                        hasSend = false;
                    }, 500); // debounce of half a sec
                    
                }
            });
            
        }
    };
});