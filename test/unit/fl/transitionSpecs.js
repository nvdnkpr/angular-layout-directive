'use strict';


describe("transition", function() {
  var transition, 
      localTrans, 
      scope, 
      element,
      consnt;
  beforeEach(function() {
    module("flLayout");
    inject(function($injector) {
      transition = $injector.get('transition');
      scope = $injector.get("$rootScope");
    });
    element = jasmine.createSpyObj("element", ["css"]);
    localTrans = transition(scope, element);
  });
  
  it("should provide the transition service and create an instance", function() {
    expect(transition).not.toBeNull();
    expect(transition).toBeDefined();
    expect(localTrans).not.toBeNull();
    expect(localTrans).toBeDefined();
  });
  
  it("should bind to a scope property", function() {
    spyOn(scope, "$watch").andCallFake(function(prop,func){
      expect(prop).toEqual("property");
      expect(angular.isFunction(func)).toBeTruthy();
    });
    localTrans.bind("property", "trans-property")
    expect(scope.$watch).toHaveBeenCalled();
  });
  
  it("should handle it if bind receives a hash", function() {
    spyOn(scope, "$watch").andCallFake(function(prop,func){
      expect(prop).toEqual("property");
      expect(angular.isFunction(func)).toBeTruthy();
    });
    localTrans.bind({"property":"trans-property"})
    expect(scope.$watch).toHaveBeenCalled();
  });
  
  it("should raise an exception if it receives invalid bind params", function() {
    expect(function(){localTrans.bind(123);}).toThrow("Cannot bind scope property '123'");
    expect(function(){localTrans.bind("123",123);}).toThrow("Cannot bind transition property '123'");
    expect(function(){localTrans.bind("");}).toThrow("Cannot bind scope property ''");
    expect(function(){localTrans.bind("123","");}).toThrow("Cannot bind transition property ''");
    expect(function(){localTrans.bind({"123":{}});}).toThrow("Cannot bind transition property '[object Object]'");
  });
  
  it("should not call $watch twice on the same property", function() {
    spyOn(scope, "$watch");
    localTrans.bind("property", "trans-property");
    localTrans.bind("property", "different-trans-property");
    expect(scope.$watch.callCount).toEqual(1);
  });
  
  it("should apply a hash of changes to a scope", function() {
    localTrans.apply({x:123,y:"100%"});
    expect(scope.x).toEqual(123);
    expect(scope.y).toEqual("100%");
  });
  
  it("should configure and apply states", function() {
    localTrans.state.config("state1", {x:123,y:"100%"});
    localTrans.state("state1");
    expect(scope.x).toEqual(123);
    expect(scope.y).toEqual("100%");
  });
  
  it("should trigger states multiple times", function() {
    spyOn(localTrans, "apply");
    localTrans.state.config("state1", {x:123,y:"100%"}, {param: "value"});
    localTrans.state("state1");
    localTrans.state("state1");
    expect(localTrans.apply).toHaveBeenCalledWith({x:123,y:"100%"}, {param: "value"});
    expect(localTrans.apply.callCount).toEqual(2);
  });
  
  it("should call unwatch functions when the scope dispatches $destroy", function() {
    var unwatcherSpy = jasmine.createSpy("unwatch function");
    spyOn(scope, "$watch").andReturn(unwatcherSpy);
    localTrans.bind("x","x");
    scope.$digest();
    scope.$emit("$destroy");
    expect(unwatcherSpy).toHaveBeenCalled();
  });
  
  describe("TransitionSuite", function() {
    var aniPropSpy,
        fireSpy;
        
    beforeEach(function() {
      aniPropSpy = jasmine.createSpy("test propery");
      fireSpy = jasmine.createSpy("test fire");
      function TestSuite () {
        this.register("test", aniPropSpy);
        this.fire = fireSpy;
      }
      localTrans.addSuite(TestSuite);
      localTrans.bind("prop", "test");
    });
    
    it("should add a transition suite which is invoked to extend a base class", function() {
      var constWasCalled = false;
      function TestRunSuite () {
        expect(this.register).toBeDefined();
        expect(angular.isFunction(this.register)).toBeTruthy();
        expect(this.testVal).toEqual("testValue");
        expect(this.transitionProps).toEqual({});
        constWasCalled = true;
        this.fire = function(){};
      }
      TestRunSuite.prototype.testVal = "testValue";
      localTrans.addSuite( TestRunSuite );
      expect(constWasCalled).toBeTruthy();
    });
    
    it("should instanciate a transition suite injecting dependencies", function() {
      var transService;
      function TestSuite (trans) {
        transService = trans;
        this.fire = angular.noop;
      }
      TestSuite.$inject = ["transition"]
      localTrans.addSuite( TestSuite );
      expect(transService).toEqual(transition);
    });
    
    it("should call the bound transition property functions", function() {
      scope.prop = 0;
      scope.$digest();
      scope.prop = 1;
      scope.$digest();
      scope.prop = 2;
      scope.$digest();
      expect(aniPropSpy).toHaveBeenCalledWith(2,1);
    });

    it("should fire the animation only in digests where something has changed", function() {
      scope.$digest();
      scope.prop = 10;
      scope.$digest();
      scope.prop = 3;
      scope.$digest();
      scope.$digest();
      scope.$digest();
      expect(aniPropSpy.callCount).toEqual(3);
      expect(fireSpy.callCount).toEqual(3);
    });
    
    it("should trim binding string values", function() {
      localTrans.bind(" test2 ", " test ");
      scope.test2 = "testValue";
      scope.$digest();
      expect(aniPropSpy).toHaveBeenCalledWith("testValue", "testValue");
    });
    
    it("should halt the firing of transition bindings", function() {
       localTrans.halt();
       scope.$digest();
       expect(aniPropSpy).not.toHaveBeenCalled();
    });
    
    it("should resume the firing of transition bindings", function() {
       localTrans.halt();
       localTrans.resume();
       scope.$digest();
       expect(aniPropSpy).toHaveBeenCalled();
    });
    
    it("should apply element and parameters hash to the fire function", function() {
      localTrans.state.config("test2", {prop:123}, {a: "value2"});
      scope.$digest();
      // expect(fireSpy).toHaveBeenCalledWith("Anything at all");
      localTrans.apply({prop: 654},{a: "value1"});
      scope.$digest();
      expect(fireSpy).toHaveBeenCalledWith(element, {a: "value1"});
      scope.prop = 12345;
      scope.$digest();
      expect(fireSpy).toHaveBeenCalledWith(element, undefined);
      localTrans.state("test2");
      scope.$digest();
      expect(fireSpy.callCount).toEqual(4);
      expect(fireSpy).toHaveBeenCalledWith(element, {a: "value2"});
    });
    
    it("should pass state fire params multiple times", function() {
      spyOn(localTrans, "apply").andCallThrough();
      localTrans.state.config("test", {prop:123}, {a: "value"});
      localTrans.state("test");
      scope.$digest();
      localTrans.state("test");
      scope.$digest();
      expect(localTrans.apply.callCount).toBe(2);
      expect(fireSpy.callCount).toBe(2)
    });
    
    it("should call a function when it is passed to apply", function() {
      var spy = jasmine.createSpy("apply function spy").andReturn("abc");
      localTrans.apply(spy);
      expect(spy).toHaveBeenCalled();
      localTrans.apply({test: spy});
      expect(scope.test).toEqual("abc");
    });
    
    it("should have a default transition suite applied", function() {
      localTrans.bind("x","css-x");
      localTrans.bind("y","css-y");
      localTrans.bind("width","css-width");
      localTrans.bind("height","css-height");
      localTrans.bind("opacity","css-opacity");
      localTrans.apply({x: 1, y: 2, width: "100%", height: 200, opacity: 0.5});
      scope.$digest();
      expect(element.css).toHaveBeenCalledWith({left: "1px", 
                                                top: "2px", 
                                                width: "100%", 
                                                height: "200px",
                                                opacity: 0.5, 
                                                "-moz-opacity": 0.5, 
                                                filter: "alpha(opacity=50)"});
    });
    
    it("should hide an element using the hidden transition binding", function() {
      element.css.andReturn("inline");
      localTrans.bind("hidden", "css-hidden");
      scope.hidden = true;
      scope.$digest();
      scope.hidden = false;
      scope.$digest();
      expect(element.css).toHaveBeenCalledWith({display: "none"});
      expect(element.css).toHaveBeenCalledWith({display: "inline"});
    });
    
    it("should apply transition properties in a last defined first preference order", function() {
      var aniPropSpy2 = jasmine.createSpy("Animation Property Spy 2");
      function TestSuite2 () {
        this.register("test", aniPropSpy2);
        this.fire = function(){};
      }
      localTrans.addSuite(TestSuite2);
      scope.prop = 123;
      scope.$digest();
      expect(aniPropSpy).not.toHaveBeenCalled();
      expect(aniPropSpy2).toHaveBeenCalled();
    });
    
    it("should raise an error when you try to register a reserved transition property", function() {
      function TestSuite2 () {
        this.register("noop", angular.noop);
        this.fire = function(){};
      }
      expect(function(){localTrans.addSuite(TestSuite2);}).toThrow("Cannot register transition property 'noop' it is reserved.");
    });
    
    it("should not fire a transition suite when the triggered listener returns false", function() {
      var fireSpy = jasmine.createSpy("Fire Spy")
      function TestSuite2 () {
        this.register("test", function(){return false;});
        this.fire = fireSpy;
      }
      localTrans.addSuite(TestSuite2);
      localTrans.bind("tester", "test");
      scope.tester = 123;
      scope.$digest();
      expect(fireSpy).not.toHaveBeenCalled();
    });
    
    it("should call an afterFire function if supplied in the config params", function() {
      var afterFireSpy = jasmine.createSpy("After Fire Spy");
      localTrans.apply({prop: "value"}, {afterFire: afterFireSpy})
      scope.$digest();
      expect(afterFireSpy).toHaveBeenCalled();
    });
    
    it("should unbind", function() {
      scope.$digest();
      expect(fireSpy.callCount).toEqual(1);
      localTrans.unbind("prop");
      scope.prop = "123";
      scope.$digest();
      expect(fireSpy.callCount).toEqual(1);
    });
    
    it("should call dispose on a suite instance", function() {
      var disposeSpy = jasmine.createSpy("Dispose Transition Suite Spy")
      function TestSuite2 () {
        this.fire = function(){};
        this.dispose = disposeSpy;
      }
      localTrans.addSuite(TestSuite2);
      localTrans.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });
    
    
    describe("DefaultTransitionSuite", function() {
      it("should call an onComplete method supplied to config params", function() {
        var completeSpy = jasmine.createSpy("CSS on complete spy");
        localTrans.bind("x","css-x")
        localTrans.apply({x: "value"}, {onComplete:completeSpy });
        scope.$digest();
        expect(completeSpy).toHaveBeenCalled();
      });
    });
  });
});
