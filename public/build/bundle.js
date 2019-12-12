
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/ProgressBar.svelte generated by Svelte v3.16.4 */

    const file = "src/components/ProgressBar.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let t0_value = Math.round(/*completedPercentage*/ ctx[0]) + "";
    	let t0;
    	let t1;

    	let t2_value = (Math.round(/*completedPercentage*/ ctx[0]) === 100
    	? "🎉"
    	: "") + "";

    	let t2;
    	let div0_class_value;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text("% ");
    			t2 = text(t2_value);
    			set_style(div0, "width", Math.round(/*completedPercentage*/ ctx[0]) + "%");

    			attr_dev(div0, "class", div0_class_value = "transition-all-4 " + (/*completedPercentage*/ ctx[0] > 67
    			? "bg-green-200"
    			: /*completedPercentage*/ ctx[0] > 34
    				? "bg-yellow-200"
    				: "bg-red-200") + "\n    rounded-lg p-1 " + (/*completedPercentage*/ ctx[0] > 67
    			? "text-green-700"
    			: /*completedPercentage*/ ctx[0] > 34
    				? "text-yellow-600"
    				: "text-red-700"));

    			add_location(div0, file, 7, 2, 193);

    			attr_dev(div1, "class", div1_class_value = "bg-gray-200 mt-4 mb-5 text-3xl " + (Math.round(/*completedPercentage*/ ctx[0]) === 100
    			? "font-semibold"
    			: "") + "\n  text-center rounded-lg");

    			add_location(div1, file, 4, 0, 54);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*completedPercentage*/ 1 && t0_value !== (t0_value = Math.round(/*completedPercentage*/ ctx[0]) + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*completedPercentage*/ 1 && t2_value !== (t2_value = (Math.round(/*completedPercentage*/ ctx[0]) === 100
    			? "🎉"
    			: "") + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*completedPercentage*/ 1) {
    				set_style(div0, "width", Math.round(/*completedPercentage*/ ctx[0]) + "%");
    			}

    			if (dirty[0] & /*completedPercentage*/ 1 && div0_class_value !== (div0_class_value = "transition-all-4 " + (/*completedPercentage*/ ctx[0] > 67
    			? "bg-green-200"
    			: /*completedPercentage*/ ctx[0] > 34
    				? "bg-yellow-200"
    				: "bg-red-200") + "\n    rounded-lg p-1 " + (/*completedPercentage*/ ctx[0] > 67
    			? "text-green-700"
    			: /*completedPercentage*/ ctx[0] > 34
    				? "text-yellow-600"
    				: "text-red-700"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty[0] & /*completedPercentage*/ 1 && div1_class_value !== (div1_class_value = "bg-gray-200 mt-4 mb-5 text-3xl " + (Math.round(/*completedPercentage*/ ctx[0]) === 100
    			? "font-semibold"
    			: "") + "\n  text-center rounded-lg")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { completedPercentage } = $$props;
    	const writable_props = ["completedPercentage"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProgressBar> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("completedPercentage" in $$props) $$invalidate(0, completedPercentage = $$props.completedPercentage);
    	};

    	$$self.$capture_state = () => {
    		return { completedPercentage };
    	};

    	$$self.$inject_state = $$props => {
    		if ("completedPercentage" in $$props) $$invalidate(0, completedPercentage = $$props.completedPercentage);
    	};

    	return [completedPercentage];
    }

    class ProgressBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { completedPercentage: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProgressBar",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*completedPercentage*/ ctx[0] === undefined && !("completedPercentage" in props)) {
    			console.warn("<ProgressBar> was created without expected prop 'completedPercentage'");
    		}
    	}

    	get completedPercentage() {
    		throw new Error("<ProgressBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completedPercentage(value) {
    		throw new Error("<ProgressBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Navbar.svelte generated by Svelte v3.16.4 */

    const file$1 = "src/components/Navbar.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let a;
    	let p;
    	let span0;
    	let t1;
    	let span1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			p = element("p");
    			span0 = element("span");
    			span0.textContent = "undefined";
    			t1 = text("\n      sch001\n      ");
    			span1 = element("span");
    			span1.textContent = "_";
    			attr_dev(span0, "class", "text-black-us");
    			add_location(span0, file$1, 9, 6, 318);
    			attr_dev(span1, "class", "blink");
    			add_location(span1, file$1, 11, 6, 382);
    			attr_dev(p, "class", "font-montserrat font-medium");
    			add_location(p, file$1, 8, 4, 272);
    			attr_dev(a, "href", "https://undefinedschool.io");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener");
    			attr_dev(a, "class", "text-light-gray-us text-s");
    			add_location(a, file$1, 3, 2, 149);
    			attr_dev(div, "class", "bg-white-us fixed top-0 left-0 border-solid border-1\n  border-light-gray-us shadow-md p-3 w-full sm:text-right text-center sm:pr-4");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, p);
    			append_dev(p, span0);
    			append_dev(p, t1);
    			append_dev(p, span1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Title.svelte generated by Svelte v3.16.4 */

    const file$2 = "src/components/Title.svelte";

    function create_fragment$2(ctx) {
    	let h1;
    	let t0;
    	let t1;
    	let span;
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text(/*firstPart*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			t2 = text(/*secondPart*/ ctx[1]);
    			attr_dev(span, "class", "font-semibold text-cyan-us");
    			add_location(span, file$2, 9, 2, 199);
    			attr_dev(h1, "class", "sm:my-12 leading-tight sm:text-3xl text-4xl sm:mb-6 mb-12 text-white-us\n  font-raleway text-center");
    			add_location(h1, file$2, 5, 0, 69);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, span);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*firstPart*/ 1) set_data_dev(t0, /*firstPart*/ ctx[0]);
    			if (dirty[0] & /*secondPart*/ 2) set_data_dev(t2, /*secondPart*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { firstPart } = $$props;
    	let { secondPart } = $$props;
    	const writable_props = ["firstPart", "secondPart"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Title> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("firstPart" in $$props) $$invalidate(0, firstPart = $$props.firstPart);
    		if ("secondPart" in $$props) $$invalidate(1, secondPart = $$props.secondPart);
    	};

    	$$self.$capture_state = () => {
    		return { firstPart, secondPart };
    	};

    	$$self.$inject_state = $$props => {
    		if ("firstPart" in $$props) $$invalidate(0, firstPart = $$props.firstPart);
    		if ("secondPart" in $$props) $$invalidate(1, secondPart = $$props.secondPart);
    	};

    	return [firstPart, secondPart];
    }

    class Title extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { firstPart: 0, secondPart: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Title",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*firstPart*/ ctx[0] === undefined && !("firstPart" in props)) {
    			console.warn("<Title> was created without expected prop 'firstPart'");
    		}

    		if (/*secondPart*/ ctx[1] === undefined && !("secondPart" in props)) {
    			console.warn("<Title> was created without expected prop 'secondPart'");
    		}
    	}

    	get firstPart() {
    		throw new Error("<Title>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set firstPart(value) {
    		throw new Error("<Title>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get secondPart() {
    		throw new Error("<Title>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set secondPart(value) {
    		throw new Error("<Title>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/FullCalendarLink.svelte generated by Svelte v3.16.4 */

    const file$3 = "src/components/FullCalendarLink.svelte";

    function create_fragment$3(ctx) {
    	let p;
    	let a;

    	const block = {
    		c: function create() {
    			p = element("p");
    			a = element("a");
    			a.textContent = "Ver calendario completo";
    			attr_dev(a, "href", "https://trello.com/b/mUf0huXz/undefined-school");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener");
    			add_location(a, file$3, 1, 2, 79);
    			attr_dev(p, "class", "font-light text-sm text-right -mt-1 -mr-1 mb-4 text-gray-us link");
    			add_location(p, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class FullCalendarLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FullCalendarLink",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/WeekInfo.svelte generated by Svelte v3.16.4 */

    const file$4 = "src/components/WeekInfo.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let p;
    	let t3;
    	let t4;
    	let t5;
    	let t6_value = new Date().getFullYear() + "";
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text("Semana ");
    			t1 = text(/*weekNumber*/ ctx[1]);
    			t2 = space();
    			p = element("p");
    			t3 = text("(");
    			t4 = text(/*week*/ ctx[0]);
    			t5 = text(" de ");
    			t6 = text(t6_value);
    			t7 = text(")");
    			attr_dev(span, "class", "text-gray-700 font-semibold text-xl");
    			add_location(span, file$4, 6, 2, 85);
    			attr_dev(p, "class", "text-light-gray-us font-light text-sm");
    			add_location(p, file$4, 7, 2, 164);
    			attr_dev(div, "class", "mb-4");
    			add_location(div, file$4, 5, 0, 64);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*weekNumber*/ 2) set_data_dev(t1, /*weekNumber*/ ctx[1]);
    			if (dirty[0] & /*week*/ 1) set_data_dev(t4, /*week*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { week } = $$props;
    	let { weekNumber } = $$props;
    	const writable_props = ["week", "weekNumber"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WeekInfo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("week" in $$props) $$invalidate(0, week = $$props.week);
    		if ("weekNumber" in $$props) $$invalidate(1, weekNumber = $$props.weekNumber);
    	};

    	$$self.$capture_state = () => {
    		return { week, weekNumber };
    	};

    	$$self.$inject_state = $$props => {
    		if ("week" in $$props) $$invalidate(0, week = $$props.week);
    		if ("weekNumber" in $$props) $$invalidate(1, weekNumber = $$props.weekNumber);
    	};

    	return [week, weekNumber];
    }

    class WeekInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, { week: 0, weekNumber: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WeekInfo",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*week*/ ctx[0] === undefined && !("week" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'week'");
    		}

    		if (/*weekNumber*/ ctx[1] === undefined && !("weekNumber" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'weekNumber'");
    		}
    	}

    	get week() {
    		throw new Error("<WeekInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set week(value) {
    		throw new Error("<WeekInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get weekNumber() {
    		throw new Error("<WeekInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weekNumber(value) {
    		throw new Error("<WeekInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CompletedTasks.svelte generated by Svelte v3.16.4 */

    const file$5 = "src/components/CompletedTasks.svelte";

    function create_fragment$5(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*items*/ ctx[0].filter(func).length + "";
    	let t1;
    	let t2;
    	let t3_value = /*items*/ ctx[0].length + "";
    	let t3;
    	let t4;

    	let t5_value = (Math.round(/*completedPercentage*/ ctx[1]) === 100
    	? "✨"
    	: "") + "";

    	let t5;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Tareas completadas: ");
    			t1 = text(t1_value);
    			t2 = text(" de ");
    			t3 = text(t3_value);
    			t4 = space();
    			t5 = text(t5_value);
    			attr_dev(p, "class", "text-light-gray-us font-light text-sm mb-2");
    			add_location(p, file$5, 5, 0, 74);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*items*/ 1 && t1_value !== (t1_value = /*items*/ ctx[0].filter(func).length + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*items*/ 1 && t3_value !== (t3_value = /*items*/ ctx[0].length + "")) set_data_dev(t3, t3_value);

    			if (dirty[0] & /*completedPercentage*/ 2 && t5_value !== (t5_value = (Math.round(/*completedPercentage*/ ctx[1]) === 100
    			? "✨"
    			: "") + "")) set_data_dev(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = item => item;

    function instance$3($$self, $$props, $$invalidate) {
    	let { items } = $$props;
    	let { completedPercentage } = $$props;
    	const writable_props = ["items", "completedPercentage"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CompletedTasks> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("completedPercentage" in $$props) $$invalidate(1, completedPercentage = $$props.completedPercentage);
    	};

    	$$self.$capture_state = () => {
    		return { items, completedPercentage };
    	};

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("completedPercentage" in $$props) $$invalidate(1, completedPercentage = $$props.completedPercentage);
    	};

    	return [items, completedPercentage];
    }

    class CompletedTasks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, { items: 0, completedPercentage: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CompletedTasks",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*items*/ ctx[0] === undefined && !("items" in props)) {
    			console.warn("<CompletedTasks> was created without expected prop 'items'");
    		}

    		if (/*completedPercentage*/ ctx[1] === undefined && !("completedPercentage" in props)) {
    			console.warn("<CompletedTasks> was created without expected prop 'completedPercentage'");
    		}
    	}

    	get items() {
    		throw new Error("<CompletedTasks>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<CompletedTasks>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get completedPercentage() {
    		throw new Error("<CompletedTasks>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completedPercentage(value) {
    		throw new Error("<CompletedTasks>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TaskLink.svelte generated by Svelte v3.16.4 */

    const file$6 = "src/components/TaskLink.svelte";

    function create_fragment$6(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(/*name*/ ctx[0]);
    			attr_dev(a, "class", "font-medium text-teal-600 link");
    			attr_dev(a, "href", /*src*/ ctx[1]);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener");
    			add_location(a, file$6, 5, 0, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*name*/ 1) set_data_dev(t, /*name*/ ctx[0]);

    			if (dirty[0] & /*src*/ 2) {
    				attr_dev(a, "href", /*src*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { src } = $$props;
    	const writable_props = ["name", "src"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TaskLink> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    	};

    	$$self.$capture_state = () => {
    		return { name, src };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    	};

    	return [name, src];
    }

    class TaskLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, { name: 0, src: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TaskLink",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<TaskLink> was created without expected prop 'name'");
    		}

    		if (/*src*/ ctx[1] === undefined && !("src" in props)) {
    			console.warn("<TaskLink> was created without expected prop 'src'");
    		}
    	}

    	get name() {
    		throw new Error("<TaskLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<TaskLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get src() {
    		throw new Error("<TaskLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<TaskLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Tags/NodeTag.svelte generated by Svelte v3.16.4 */

    const file$7 = "src/components/Tags/NodeTag.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let span;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Node";
    			attr_dev(span, "class", "inline-block border-1 border-green-700 rounded px-2 py-1 text-xs text-green-700 bg-green-300 font-semibold\n    opacity-75");
    			add_location(span, file$7, 5, 2, 79);
    			attr_dev(div, "class", div_class_value = "" + ((/*mr*/ ctx[0] ? /*mr*/ ctx[0] : "") + " -mt-1 mb-4"));
    			add_location(div, file$7, 4, 0, 37);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mr*/ 1 && div_class_value !== (div_class_value = "" + ((/*mr*/ ctx[0] ? /*mr*/ ctx[0] : "") + " -mt-1 mb-4"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { mr } = $$props;
    	const writable_props = ["mr"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NodeTag> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("mr" in $$props) $$invalidate(0, mr = $$props.mr);
    	};

    	$$self.$capture_state = () => {
    		return { mr };
    	};

    	$$self.$inject_state = $$props => {
    		if ("mr" in $$props) $$invalidate(0, mr = $$props.mr);
    	};

    	return [mr];
    }

    class NodeTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, { mr: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NodeTag",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*mr*/ ctx[0] === undefined && !("mr" in props)) {
    			console.warn("<NodeTag> was created without expected prop 'mr'");
    		}
    	}

    	get mr() {
    		throw new Error("<NodeTag>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mr(value) {
    		throw new Error("<NodeTag>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Tags/ExpressTag.svelte generated by Svelte v3.16.4 */

    const file$8 = "src/components/Tags/ExpressTag.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Express";
    			attr_dev(span, "class", "inline-block border-1 border-gray-ddd rounded px-2 py-1 text-xs text-gray-444 bg-gray-eee font-semibold\n    opacity-75");
    			add_location(span, file$8, 1, 2, 33);
    			attr_dev(div, "class", "-mt-1 -mr-1 mb-4");
    			add_location(div, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class ExpressTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExpressTag",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.4 */
    const file$9 = "src/App.svelte";

    function create_fragment$9(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let div9;
    	let t2;
    	let div8;
    	let t3;
    	let t4;
    	let t5;
    	let div7;
    	let div6;
    	let div0;
    	let t6;
    	let t7;
    	let div5;
    	let div1;
    	let label0;
    	let input0;
    	let input0_checked_value;
    	let t8;
    	let span1;
    	let span0;
    	let t10;
    	let span1_class_value;
    	let label0_class_value;
    	let t11;
    	let div2;
    	let label1;
    	let input1;
    	let input1_checked_value;
    	let t12;
    	let span3;
    	let span2;
    	let t14;
    	let span3_class_value;
    	let label1_class_value;
    	let t15;
    	let div3;
    	let label2;
    	let input2;
    	let input2_checked_value;
    	let t16;
    	let span5;
    	let span4;
    	let t18;
    	let span5_class_value;
    	let label2_class_value;
    	let t19;
    	let div4;
    	let label3;
    	let input3;
    	let input3_checked_value;
    	let t20;
    	let span7;
    	let span6;
    	let t22;
    	let span7_class_value;
    	let label3_class_value;
    	let current;
    	let dispose;
    	const navbar = new Navbar({ $$inline: true });

    	const title = new Title({
    			props: {
    				firstPart: "Calendario",
    				secondPart: "semanal."
    			},
    			$$inline: true
    		});

    	const fullcalendarlink = new FullCalendarLink({
    			props: {
    				completedPercentage: /*completedPercentage*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const weekinfo = new WeekInfo({
    			props: {
    				weekNumber: /*weekNumber*/ ctx[2],
    				week: /*week*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const progressbar = new ProgressBar({
    			props: {
    				completedPercentage: /*completedPercentage*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const completedtasks = new CompletedTasks({
    			props: {
    				items: /*items*/ ctx[0],
    				completedPercentage: /*completedPercentage*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const nodetag = new NodeTag({ props: { mr: "mr-1" }, $$inline: true });
    	const expresstag = new ExpressTag({ $$inline: true });

    	const tasklink0 = new TaskLink({
    			props: {
    				name: "Introduction to Express.js",
    				src: "https://www.rithmschool.com/courses/node-express-fundamentals/introduction-to-express"
    			},
    			$$inline: true
    		});

    	const tasklink1 = new TaskLink({
    			props: {
    				name: "Create a Web Server",
    				src: "https://github.com/thejsway/thejsway/blob/master/manuscript/chapter25.md"
    			},
    			$$inline: true
    		});

    	const tasklink2 = new TaskLink({
    			props: {
    				name: "How to Use __dirname in Node.js",
    				src: "https://alligator.io/nodejs/how-to-use__dirname/"
    			},
    			$$inline: true
    		});

    	const tasklink3 = new TaskLink({
    			props: {
    				name: "Notas sobre ExpressJS",
    				src: "https://github.com/undefinedschool/notes-expressjs/"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(title.$$.fragment);
    			t1 = space();
    			div9 = element("div");
    			create_component(fullcalendarlink.$$.fragment);
    			t2 = space();
    			div8 = element("div");
    			create_component(weekinfo.$$.fragment);
    			t3 = space();
    			create_component(progressbar.$$.fragment);
    			t4 = space();
    			create_component(completedtasks.$$.fragment);
    			t5 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			create_component(nodetag.$$.fragment);
    			t6 = space();
    			create_component(expresstag.$$.fragment);
    			t7 = space();
    			div5 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t8 = space();
    			span1 = element("span");
    			span0 = element("span");
    			span0.textContent = "📚🏃Completar el capítulo";
    			t10 = space();
    			create_component(tasklink0.$$.fragment);
    			t11 = space();
    			div2 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t12 = space();
    			span3 = element("span");
    			span2 = element("span");
    			span2.textContent = "📚🏃Completar el capítulo";
    			t14 = space();
    			create_component(tasklink1.$$.fragment);
    			t15 = space();
    			div3 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t16 = space();
    			span5 = element("span");
    			span4 = element("span");
    			span4.textContent = "🏃Ver";
    			t18 = space();
    			create_component(tasklink2.$$.fragment);
    			t19 = space();
    			div4 = element("div");
    			label3 = element("label");
    			input3 = element("input");
    			t20 = space();
    			span7 = element("span");
    			span6 = element("span");
    			span6.textContent = "📚🏃Ver";
    			t22 = space();
    			create_component(tasklink3.$$.fragment);
    			attr_dev(div0, "class", "flex justify-end");
    			add_location(div0, file$9, 77, 10, 2705);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "form-checkbox text-cyan-us transition-all-4");
    			input0.checked = input0_checked_value = /*items*/ ctx[0][0] ? true : false;
    			add_location(input0, file$9, 86, 16, 3015);
    			attr_dev(span0, "class", "font-light");
    			add_location(span0, file$9, 92, 18, 3320);
    			attr_dev(span1, "class", span1_class_value = "" + ((/*items*/ ctx[0][0] ? "opacity-50" : "") + " ml-2"));
    			add_location(span1, file$9, 91, 16, 3251);
    			attr_dev(label0, "class", label0_class_value = "" + ((/*items*/ ctx[0][0] ? "line-through" : "") + " inline-flex items-center"));
    			add_location(label0, file$9, 85, 14, 2925);
    			attr_dev(div1, "class", "task mb-2");
    			add_location(div1, file$9, 84, 12, 2887);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "form-checkbox text-cyan-us transition-all-4");
    			input1.checked = input1_checked_value = /*items*/ ctx[0][1] ? true : false;
    			add_location(input1, file$9, 102, 16, 3790);
    			attr_dev(span2, "class", "font-light");
    			add_location(span2, file$9, 108, 18, 4095);
    			attr_dev(span3, "class", span3_class_value = "" + ((/*items*/ ctx[0][1] ? "opacity-50" : "") + " ml-2"));
    			add_location(span3, file$9, 107, 16, 4026);
    			attr_dev(label1, "class", label1_class_value = "" + ((/*items*/ ctx[0][1] ? "line-through" : "") + " inline-flex items-center"));
    			add_location(label1, file$9, 101, 14, 3700);
    			attr_dev(div2, "class", "task mb-2");
    			add_location(div2, file$9, 100, 12, 3662);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "form-checkbox text-cyan-us transition-all-4");
    			input2.checked = input2_checked_value = /*items*/ ctx[0][2] ? true : false;
    			add_location(input2, file$9, 118, 16, 4545);
    			attr_dev(span4, "class", "font-light");
    			add_location(span4, file$9, 124, 18, 4850);
    			attr_dev(span5, "class", span5_class_value = "" + ((/*items*/ ctx[0][2] ? "opacity-50" : "") + " ml-2"));
    			add_location(span5, file$9, 123, 16, 4781);
    			attr_dev(label2, "class", label2_class_value = "" + ((/*items*/ ctx[0][2] ? "line-through" : "") + " inline-flex items-center"));
    			add_location(label2, file$9, 117, 14, 4455);
    			attr_dev(div3, "class", "task mb-2");
    			add_location(div3, file$9, 116, 12, 4417);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "form-checkbox text-cyan-us transition-all-4");
    			input3.checked = input3_checked_value = /*items*/ ctx[0][3] ? true : false;
    			add_location(input3, file$9, 134, 16, 5263);
    			attr_dev(span6, "class", "font-light");
    			add_location(span6, file$9, 140, 18, 5568);
    			attr_dev(span7, "class", span7_class_value = "" + ((/*items*/ ctx[0][3] ? "opacity-50" : "") + " ml-2"));
    			add_location(span7, file$9, 139, 16, 5499);
    			attr_dev(label3, "class", label3_class_value = "" + ((/*items*/ ctx[0][3] ? "line-through" : "") + " inline-flex items-center"));
    			add_location(label3, file$9, 133, 14, 5173);
    			attr_dev(div4, "class", "task");
    			add_location(div4, file$9, 132, 12, 5140);
    			attr_dev(div5, "class", "sm: leading-snug leading-tight");
    			add_location(div5, file$9, 82, 10, 2829);
    			attr_dev(div6, "class", "border-1 rounded p-3");
    			add_location(div6, file$9, 72, 8, 2518);
    			attr_dev(div7, "class", "sm:h-64 h-auto overflow-scroll");
    			add_location(div7, file$9, 71, 6, 2465);
    			add_location(div8, file$9, 64, 4, 2312);
    			attr_dev(div9, "class", "shadow-md border-2 border-solid border-blue-us rounded h-auto max-w-2xl p-4 bg-white-us");
    			add_location(div9, file$9, 60, 2, 2157);
    			attr_dev(main, "class", "flex flex-col h-screen justify-center items-center p-3 bg-black-us");
    			add_location(main, file$9, 54, 0, 1992);

    			dispose = [
    				listen_dev(input0, "click", /*click_handler*/ ctx[9], false, false, false),
    				listen_dev(input1, "click", /*click_handler_1*/ ctx[10], false, false, false),
    				listen_dev(input2, "click", /*click_handler_2*/ ctx[11], false, false, false),
    				listen_dev(input3, "click", /*click_handler_3*/ ctx[12], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t0);
    			mount_component(title, main, null);
    			append_dev(main, t1);
    			append_dev(main, div9);
    			mount_component(fullcalendarlink, div9, null);
    			append_dev(div9, t2);
    			append_dev(div9, div8);
    			mount_component(weekinfo, div8, null);
    			append_dev(div8, t3);
    			mount_component(progressbar, div8, null);
    			append_dev(div8, t4);
    			mount_component(completedtasks, div8, null);
    			append_dev(div8, t5);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			mount_component(nodetag, div0, null);
    			append_dev(div0, t6);
    			mount_component(expresstag, div0, null);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t8);
    			append_dev(label0, span1);
    			append_dev(span1, span0);
    			append_dev(span1, t10);
    			mount_component(tasklink0, span1, null);
    			append_dev(div5, t11);
    			append_dev(div5, div2);
    			append_dev(div2, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t12);
    			append_dev(label1, span3);
    			append_dev(span3, span2);
    			append_dev(span3, t14);
    			mount_component(tasklink1, span3, null);
    			append_dev(div5, t15);
    			append_dev(div5, div3);
    			append_dev(div3, label2);
    			append_dev(label2, input2);
    			append_dev(label2, t16);
    			append_dev(label2, span5);
    			append_dev(span5, span4);
    			append_dev(span5, t18);
    			mount_component(tasklink2, span5, null);
    			append_dev(div5, t19);
    			append_dev(div5, div4);
    			append_dev(div4, label3);
    			append_dev(label3, input3);
    			append_dev(label3, t20);
    			append_dev(label3, span7);
    			append_dev(span7, span6);
    			append_dev(span7, t22);
    			mount_component(tasklink3, span7, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fullcalendarlink_changes = {};
    			if (dirty[0] & /*completedPercentage*/ 16) fullcalendarlink_changes.completedPercentage = /*completedPercentage*/ ctx[4];
    			fullcalendarlink.$set(fullcalendarlink_changes);
    			const weekinfo_changes = {};
    			if (dirty[0] & /*weekNumber*/ 4) weekinfo_changes.weekNumber = /*weekNumber*/ ctx[2];
    			if (dirty[0] & /*week*/ 2) weekinfo_changes.week = /*week*/ ctx[1];
    			weekinfo.$set(weekinfo_changes);
    			const progressbar_changes = {};
    			if (dirty[0] & /*completedPercentage*/ 16) progressbar_changes.completedPercentage = /*completedPercentage*/ ctx[4];
    			progressbar.$set(progressbar_changes);
    			const completedtasks_changes = {};
    			if (dirty[0] & /*items*/ 1) completedtasks_changes.items = /*items*/ ctx[0];
    			if (dirty[0] & /*completedPercentage*/ 16) completedtasks_changes.completedPercentage = /*completedPercentage*/ ctx[4];
    			completedtasks.$set(completedtasks_changes);

    			if (!current || dirty[0] & /*items*/ 1 && input0_checked_value !== (input0_checked_value = /*items*/ ctx[0][0] ? true : false)) {
    				prop_dev(input0, "checked", input0_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span1_class_value !== (span1_class_value = "" + ((/*items*/ ctx[0][0] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label0_class_value !== (label0_class_value = "" + ((/*items*/ ctx[0][0] ? "line-through" : "") + " inline-flex items-center"))) {
    				attr_dev(label0, "class", label0_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input1_checked_value !== (input1_checked_value = /*items*/ ctx[0][1] ? true : false)) {
    				prop_dev(input1, "checked", input1_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span3_class_value !== (span3_class_value = "" + ((/*items*/ ctx[0][1] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span3, "class", span3_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label1_class_value !== (label1_class_value = "" + ((/*items*/ ctx[0][1] ? "line-through" : "") + " inline-flex items-center"))) {
    				attr_dev(label1, "class", label1_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input2_checked_value !== (input2_checked_value = /*items*/ ctx[0][2] ? true : false)) {
    				prop_dev(input2, "checked", input2_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span5_class_value !== (span5_class_value = "" + ((/*items*/ ctx[0][2] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span5, "class", span5_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label2_class_value !== (label2_class_value = "" + ((/*items*/ ctx[0][2] ? "line-through" : "") + " inline-flex items-center"))) {
    				attr_dev(label2, "class", label2_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input3_checked_value !== (input3_checked_value = /*items*/ ctx[0][3] ? true : false)) {
    				prop_dev(input3, "checked", input3_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span7_class_value !== (span7_class_value = "" + ((/*items*/ ctx[0][3] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span7, "class", span7_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label3_class_value !== (label3_class_value = "" + ((/*items*/ ctx[0][3] ? "line-through" : "") + " inline-flex items-center"))) {
    				attr_dev(label3, "class", label3_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(title.$$.fragment, local);
    			transition_in(fullcalendarlink.$$.fragment, local);
    			transition_in(weekinfo.$$.fragment, local);
    			transition_in(progressbar.$$.fragment, local);
    			transition_in(completedtasks.$$.fragment, local);
    			transition_in(nodetag.$$.fragment, local);
    			transition_in(expresstag.$$.fragment, local);
    			transition_in(tasklink0.$$.fragment, local);
    			transition_in(tasklink1.$$.fragment, local);
    			transition_in(tasklink2.$$.fragment, local);
    			transition_in(tasklink3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(title.$$.fragment, local);
    			transition_out(fullcalendarlink.$$.fragment, local);
    			transition_out(weekinfo.$$.fragment, local);
    			transition_out(progressbar.$$.fragment, local);
    			transition_out(completedtasks.$$.fragment, local);
    			transition_out(nodetag.$$.fragment, local);
    			transition_out(expresstag.$$.fragment, local);
    			transition_out(tasklink0.$$.fragment, local);
    			transition_out(tasklink1.$$.fragment, local);
    			transition_out(tasklink2.$$.fragment, local);
    			transition_out(tasklink3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(title);
    			destroy_component(fullcalendarlink);
    			destroy_component(weekinfo);
    			destroy_component(progressbar);
    			destroy_component(completedtasks);
    			destroy_component(nodetag);
    			destroy_component(expresstag);
    			destroy_component(tasklink0);
    			destroy_component(tasklink1);
    			destroy_component(tasklink2);
    			destroy_component(tasklink3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const LOCAL_STORAGE_ITEMS_KEY = "items";
    const LOCAL_STORAGE_COMPLETED_KEY = "completed";

    function instance$6($$self, $$props, $$invalidate) {
    	let { week } = $$props;
    	let { weekNumber } = $$props;
    	let { items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) || [0, 0, 0, 0] } = $$props;
    	let taskPercentage = parseFloat((100 / items.length).toFixed(2));
    	let completedPercentage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPLETED_KEY)) || 0;

    	function updateItems(index) {
    		const currentValue = items[index];
    		$$invalidate(0, items[index] = 1 - currentValue, items);
    		localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
    	}

    	function addCompletedPercentage() {
    		$$invalidate(4, completedPercentage += taskPercentage);
    		localStorage.setItem(LOCAL_STORAGE_COMPLETED_KEY, JSON.stringify(completedPercentage));
    	}

    	function substractCompletedPercentage() {
    		$$invalidate(4, completedPercentage -= taskPercentage);
    		localStorage.setItem(LOCAL_STORAGE_COMPLETED_KEY, JSON.stringify(completedPercentage));
    	}

    	function handleClick(index) {
    		updateItems(index);

    		items[index]
    		? addCompletedPercentage()
    		: substractCompletedPercentage();
    	}

    	const writable_props = ["week", "weekNumber", "items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => handleClick(0);
    	const click_handler_1 = () => handleClick(1);
    	const click_handler_2 = () => handleClick(2);
    	const click_handler_3 = () => handleClick(3);

    	$$self.$set = $$props => {
    		if ("week" in $$props) $$invalidate(1, week = $$props.week);
    		if ("weekNumber" in $$props) $$invalidate(2, weekNumber = $$props.weekNumber);
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => {
    		return {
    			week,
    			weekNumber,
    			items,
    			taskPercentage,
    			completedPercentage
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("week" in $$props) $$invalidate(1, week = $$props.week);
    		if ("weekNumber" in $$props) $$invalidate(2, weekNumber = $$props.weekNumber);
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("taskPercentage" in $$props) taskPercentage = $$props.taskPercentage;
    		if ("completedPercentage" in $$props) $$invalidate(4, completedPercentage = $$props.completedPercentage);
    	};

    	return [
    		items,
    		week,
    		weekNumber,
    		handleClick,
    		completedPercentage,
    		taskPercentage,
    		updateItems,
    		addCompletedPercentage,
    		substractCompletedPercentage,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$9, safe_not_equal, {
    			week: 1,
    			weekNumber: 2,
    			items: 0,
    			handleClick: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*week*/ ctx[1] === undefined && !("week" in props)) {
    			console.warn("<App> was created without expected prop 'week'");
    		}

    		if (/*weekNumber*/ ctx[2] === undefined && !("weekNumber" in props)) {
    			console.warn("<App> was created without expected prop 'weekNumber'");
    		}
    	}

    	get week() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set week(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get weekNumber() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weekNumber(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get items() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleClick() {
    		return this.$$.ctx[3];
    	}

    	set handleClick(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        week: '16 al 23 de Diciembre',
        weekNumber: 42,
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
