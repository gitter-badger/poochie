//
// Module name:
//
//     dom
//
// Description:
//
//     'dom' is a JavaScript module for creating HTML elements.
//     The module exposes two object constructors, 'createElement' and 'element'.
//     The functions accept the same arguments, an HTML tag name, an attributes
//     object, an array of subelements, and an eventHandlers object.  The
//     difference is that 'element' postpones the creation of an underlying DOM
//     element, whereas 'createElement' creates and returns the DOM element.
//
//     createElement(x) === element(x).render()
//
//     By postponing the creation of the DOM, we can unit test modules
//     that return element objects without requiring a browser or a browser
//     simulator such as JsDom or Zombie.  A bare-bones JavaScript interpreter
//     such as Node.js will suffice.
//
//     Q: What if my application dynamically updates other element attributes?
//
//     A: Instead of setting the attribute directly, express the dependency with
//        an Observable variable.  Your event handler should set the observable
//        variable and your element should be constructed using the observable.  The
//        dom library will detect the observable attribute and update the DOM
//        element any time its value changes.
//
//
//     Q: Why doesn't element() automatically create observables for every element
//        attribute.
//
//     A: If your application is mostly static content, creating the extra
//        objects could delay startup time and consume memory the application
//        doesn't need.
//


var deps = [
    'observable.js'
];

function onReady(observable) {

    // Add style 's' with value 'style[s]' to the DOM element 'e'.
    function addStyle(e, style, s) {
        if (style[s] instanceof observable.Observable) {
            e.style[s] = style[s].get();
            style[s].subscribe(function(obs) {e.style[s] = obs.get();});
        } else {
            e.style[s] = style[s];
        }
    }

    // Add attribute 'k' with value 'v' to the DOM element 'e'.
    function addAttribute(e, k, v) {
        if (v instanceof observable.Observable) {
            e.setAttribute(k, v.get());
            v.subscribe(function(obs) {e[k] = obs.get();});
            if (v.set) {
                 e.addEventListener('change', function(evt) {v.set(evt.target[k]);});
            }
        } else {
            e.setAttribute(k, v);
        }
    }

    function mkSetChildren(e) {
        return function (obs) {
            e.innerHTML = '';
            var xs = obs.get();
            for (var i = 0; i < xs.length; i++) {
                var x = xs[i];
                x = typeof x === 'string' ? document.createTextNode(x) : x;
                e.appendChild(typeof x.render === 'function' ? x.render() : x);
            }
        };
    }


    // Create a DOM element with tag name 'nm', attributes object 'as', style object 'sty',
    // an array of subelements 'xs', and an object of event handlers 'es'.
    function createElement(ps) {

        if (typeof ps === 'string') {
            ps = {name: ps};
        }

        // Create DOM node
        var e = document.createElement(ps.name);

        // Add attributes
        var as = ps.attributes;
        var k;
        if (as) {
            for (k in as) {
                if (as.hasOwnProperty(k) && k !== 'style' && as[k] !== undefined) {
                    addAttribute(e, k, as[k]);
                }
            }
        }

        // Add Style
        var style = ps.style;
        if (style) {
            for (var s in style) {
                if (style.hasOwnProperty(s) && style[s] !== undefined) {
                    addStyle(e, style, s);
                }
            }
        }

        // Add child elements
        var xs = ps.contents;
        if (xs) {
            if (typeof xs === 'string') {
                e.appendChild(document.createTextNode(xs));
            } else {
                if (xs instanceof observable.Observable) {
                    var xsObs = xs;
                    xs = xsObs.get();
                    xsObs.subscribe(mkSetChildren(e));
                }

                for (var i = 0; i < xs.length; i++) {
                    var x = xs[i];
                    x = typeof x === 'string' ? document.createTextNode(x) : x;
                    e.appendChild(typeof x.render === 'function' ? x.render() : x);
                }
            }
        }

        // Add event handlers
        var es = ps.handlers;
        if (typeof es === 'object') {
            for (k in es) {
                if (es.hasOwnProperty(k)) {
                    e.addEventListener(k, es[k]);
                }
            }
        }

        return e;
    }

    // Return the union of 'o1' and 'o2'.  When both contain the
    // same key, the value in 'o2' takes precedence.
    function mixin(o1, o2) {
        var o3 = {};
        var k;
        for (k in o1) {
            if (o1.hasOwnProperty(k)) {
                o3[k] = o1[k];
            }
        }
        for (k in o2) {
            if (o2.hasOwnProperty(k) && o2[k] !== undefined) {
                o3[k] = o2[k];
            }
        }
        return o3;
    }

    // left-fold style objects
    // cascadeStyles(xs) === {} `mixin` xs[0] `mixin` xs[1] `mixin` ... `mixin` xs[-1]
    function cascadeStyles(xs) {
        return xs.reduce(mixin, {});
    }

    //
    // element({name, attributes, style, contents, handlers})
    //
    function Element(as) {

        if (typeof as === 'string') {
            as = {name: as};
        }

        this.name = as.name;

        if (as.attributes !== undefined) { this.attributes = as.attributes; }
        if (as.style      !== undefined) { this.style      = as.style; }
        if (as.contents   !== undefined) { this.contents   = as.contents; }
        if (as.handlers   !== undefined) { this.handlers   = as.handlers; }
    }

    Element.prototype.render = function() {
         return createElement(this);
    };

    function element(as) {
        return new Element(as);
    }

    define({
        createElement: createElement,
        mixin:         mixin,
        cascadeStyles: cascadeStyles,
        Element:       Element,
        element:       element
    });
}

require(deps, onReady);

