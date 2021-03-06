'use strict';

/**
 * ScreenDirectiveCtrl
 * 
 * extends LayoutBlockBase & LayoutDisplayBase
 * 
 */
function ScreenDirectiveCtrl($scope, $element, $attrs, augmentController){
  var self = this,
      screen = this.layoutScope,
      trans = this.transition,
      locals,
      extCtrl = $attrs["withController"];
  // 
  this.addReflowWatcher("displaying()");
  this.addReflowWatcher("calculateHeight()");
  this.addReflowWatcher("calculateWidth()");
  // 
  $element.css("width","100%");
  $element.css("display","block");
  $element.css("position","absolute");
  ////////////////
  // setup the screen api
  //
  screen.calculateHeight = function(args){
    return screen.displaying() ? screen.height : 0;
  }
  // 
  screen.calculateWidth = function(args){
    return screen.displaying() ? screen.width : 0;
  }
  // 
  screen.show = function(name){
    var name = name || screen.name;
    $scope._block.currentScreen = name;
  }
  // 
  screen.hide = function(){
    if(screen.displaying()){
      $scope._block.currentScreen = null;
    }
  }
  // 
  screen.displaying = function(){
    return ($scope._block.currentScreen == screen.name);
  }
  // 
  this.refreshContentHeight = function(){
    screen.height = screen.contentHeight;
  }
  // 
  this.refreshContentWidth = function(){
    screen.width = screen.contentWidth;
  }
  // init function get called during linking phase
  this.init = function(_block, _layout){
    // augment controller
    if(angular.isString(extCtrl) && extCtrl.length > 0) {
      locals = { $scope: $scope, 
                 $element: $element, 
                 $attrs: $attrs, 
                 _trans: trans,
                 _screen: screen,
                 _block: _block,
                 _layout: _layout };
      augmentController(extCtrl, this, locals);
    }
    screen.$broadcast("init");
  }
  // 
  // make it easier to override these functions
  var __super = this._super || {};
  this._super = angular.extend({}, __super, {
    refreshContentHeight: self.refreshContentHeight, 
    refreshContentWidth: self.refreshContentWidth
    // add any instance methods as properties of this hash
  });
}
ScreenDirectiveCtrl.$inject = ["$scope", "$element", "$attrs", "augmentController"]
ScreenDirectiveCtrl = extendLayoutCtrl(LayoutBlockBase, LayoutDisplayBase, ScreenDirectiveCtrl);

/**
 * aScreen Directive
 * 
 */
 
 var aScreenDirective = [ "$compile", "$jQuery", function($compile, $jQuery) {
   return {
     restrict:"EA",
     scope:true,
     require:["^aLayout", "^aBlock", "aScreen"],
     controller: ScreenDirectiveCtrl,
     //////////////////
     // COMPILE
     compile:function(element, attr){
       var template = '<div class="a-screen-content" style="overflow: auto; width: 100%;">'+element.html()+"</div>";
       // var template = element.html();
       element.html("");
       //////////////
       // LINK
       return function(scope, iElement, iAttrs, controllers){
        // properties
        var screen  = controllers[2],
            block   = controllers[1],
            layout  = controllers[0],
            screenScope = scope._screen = screen.layoutScope,
            blockScope  = scope._block  = block.layoutScope,
            layoutScope = scope._layout  = layout.layoutScope,
            name = screenScope.name = block.addChild(screenScope, iAttrs.withName),
            childScope,
            displaying = false;
        //
        // Watchers and Listeners
        // add/remove template 
        screenScope.$watch("displaying()", function(newval, oldval){
                          if(newval === displaying) return;
                          if(newval && !(/In$/).test(screenScope.transState)) {
                            toggleContent(true);
                            screen.transitionIn();
                          } else if(!newval && !(/Out$/).test(screenScope.transState)){
                            toggleContent(false);
                            screen.transitionOut();
                          }
                          displaying = newval;
                        });
        // watch the height of the element
        screenScope.$watch( function(){ return $jQuery(iElement).children(".a-screen-content").height(); },
                      function(newval){ 
                        // screenScope.height = newval;
                        screenScope.contentHeight = newval;
                        screen.refreshContentHeight();
                      } );
        // watch the width of the element
        screenScope.$watch( function(){ return $jQuery(iElement).children(".a-screen-content").width(); },
                      function(newval){ 
                        // screenScope.width = newval;
                        screenScope.contentWidth = newval;
                        screen.refreshContentWidth();
                      } );
        // listeners
        screenScope.$watch("transState", function(val){
          switch(val){
            case "transitionedOut":
              clearContent();
              break;
          }
        });
        // 
        // Init
        // if this is first screen registered, show it
        screen.init( blockScope, layoutScope);
        
        var dereg = blockScope.$on("init",function(){
          if(!blockScope.currentScreen) {
            screenScope.show();
          }
          toggleContent(screenScope.displaying());
          if(screenScope.displaying()) screen.transitionIn();
        })
        
        // dispose
        scope.$on("$destroy", function(){
          screen = block = layout = null;
          screenScope = blockScope = layoutScope = null;
          scope._layout = scope._block = scope._screen = null;
          dereg();
        });
        // 
        // private
        function toggleContent (show) {
          if(show) {
            if(childScope){
              childScope.$destroy();
            }
            childScope = scope.$new();
            iElement.html(template);
            $compile(iElement.contents())(childScope);
            // screen.transitionIn();
          } else {
            // screen.transitionOut();
          }
        }
        function clearContent(){
          if (childScope) {
            childScope.$destroy();
            childScope = null;
          }
          iElement.html('');
        };
       }
     }
   } 
 }]
 
 