
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

    	let t0_value = (Math.round(/*completedPercentage*/ ctx[0]) === 100
    	? "✨"
    	: "") + "";

    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = text(" Ver calendario\n    completo");
    			attr_dev(a, "href", "https://trello.com/b/mUf0huXz/undefined-school");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener");
    			add_location(a, file$3, 5, 2, 133);
    			attr_dev(p, "class", "font-light text-sm text-right -mt-1 -mr-1 mb-4 text-gray-us link");
    			add_location(p, file$3, 4, 0, 54);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, a);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*completedPercentage*/ 1 && t0_value !== (t0_value = (Math.round(/*completedPercentage*/ ctx[0]) === 100
    			? "✨"
    			: "") + "")) set_data_dev(t0, t0_value);
    		},
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { completedPercentage } = $$props;
    	const writable_props = ["completedPercentage"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FullCalendarLink> was created with unknown prop '${key}'`);
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

    class FullCalendarLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { completedPercentage: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FullCalendarLink",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*completedPercentage*/ ctx[0] === undefined && !("completedPercentage" in props)) {
    			console.warn("<FullCalendarLink> was created without expected prop 'completedPercentage'");
    		}
    	}

    	get completedPercentage() {
    		throw new Error("<FullCalendarLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completedPercentage(value) {
    		throw new Error("<FullCalendarLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { week: 0, weekNumber: 1 });

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

    /* src/components/TaskLink.svelte generated by Svelte v3.16.4 */

    const file$5 = "src/components/TaskLink.svelte";

    function create_fragment$5(ctx) {
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
    			add_location(a, file$5, 5, 0, 57);
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
    		id: create_fragment$5.name,
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
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, { name: 0, src: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TaskLink",
    			options,
    			id: create_fragment$5.name
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

    const file$6 = "src/components/Tags/NodeTag.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Node";
    			attr_dev(span, "class", "inline-block border-1 border-green-700 rounded px-2 py-1 text-xs\n    text-green-700 bg-green-300 font-semibold opacity-75");
    			add_location(span, file$6, 1, 2, 50);
    			attr_dev(div, "class", "flex justify-end -mt-1 -mr-1 mb-4");
    			add_location(div, file$6, 0, 0, 0);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class NodeTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NodeTag",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/Tags/CSSTag.svelte generated by Svelte v3.16.4 */

    const file$7 = "src/components/Tags/CSSTag.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "CSS";
    			attr_dev(span, "class", "inline-block border-1 border-blue-500 rounded px-2 py-1 text-xs\n    text-blue-500 bg-blue-200 font-semibold opacity-75");
    			add_location(span, file$7, 1, 2, 50);
    			attr_dev(div, "class", "flex justify-end -mt-1 -mr-1 mb-4");
    			add_location(div, file$7, 0, 0, 0);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class CSSTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CSSTag",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.4 */
    const file$8 = "src/App.svelte";

    function create_fragment$8(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let div9;
    	let t2;
    	let div8;
    	let t3;
    	let t4;
    	let p;
    	let t5;
    	let t6_value = /*items*/ ctx[2].filter(func).length + "";
    	let t6;
    	let t7;
    	let t8_value = /*items*/ ctx[2].length + "";
    	let t8;
    	let t9;
    	let div7;
    	let div3;
    	let t10;
    	let div2;
    	let div0;
    	let label0;
    	let input0;
    	let input0_checked_value;
    	let t11;
    	let span1;
    	let span0;
    	let t13;
    	let span1_class_value;
    	let label0_class_value;
    	let t14;
    	let div1;
    	let label1;
    	let input1;
    	let input1_checked_value;
    	let t15;
    	let span3;
    	let span2;
    	let t17;
    	let span3_class_value;
    	let label1_class_value;
    	let t18;
    	let div6;
    	let t19;
    	let div5;
    	let div4;
    	let label2;
    	let input2;
    	let input2_checked_value;
    	let t20;
    	let span6;
    	let span4;
    	let t22;
    	let t23;
    	let span5;
    	let t24;
    	let em;
    	let span6_class_value;
    	let label2_class_value;
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
    				completedPercentage: /*completedPercentage*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const weekinfo = new WeekInfo({
    			props: {
    				weekNumber: /*weekNumber*/ ctx[1],
    				week: /*week*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const progressbar = new ProgressBar({
    			props: {
    				completedPercentage: /*completedPercentage*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const nodetag = new NodeTag({ $$inline: true });

    	const tasklink0 = new TaskLink({
    			props: {
    				name: "Core Node.js Modules",
    				src: "https://www.rithmschool.com/courses/node-express-fundamentals/core-node-modules"
    			},
    			$$inline: true
    		});

    	const tasklink1 = new TaskLink({
    			props: {
    				name: "learnyounode",
    				src: "https://github.com/workshopper/learnyounode"
    			},
    			$$inline: true
    		});

    	const csstag = new CSSTag({ $$inline: true });

    	const tasklink2 = new TaskLink({
    			props: {
    				name: "Web Typography",
    				src: "https://internetingishard.com/html-and-css/web-typography/"
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
    			p = element("p");
    			t5 = text("Tareas completadas: ");
    			t6 = text(t6_value);
    			t7 = text(" de ");
    			t8 = text(t8_value);
    			t9 = space();
    			div7 = element("div");
    			div3 = element("div");
    			create_component(nodetag.$$.fragment);
    			t10 = space();
    			div2 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t11 = space();
    			span1 = element("span");
    			span0 = element("span");
    			span0.textContent = "📚🏃Completar el capítulo";
    			t13 = space();
    			create_component(tasklink0.$$.fragment);
    			t14 = space();
    			div1 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t15 = space();
    			span3 = element("span");
    			span2 = element("span");
    			span2.textContent = "📚🏃Completar el workshop";
    			t17 = space();
    			create_component(tasklink1.$$.fragment);
    			t18 = space();
    			div6 = element("div");
    			create_component(csstag.$$.fragment);
    			t19 = space();
    			div5 = element("div");
    			div4 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t20 = space();
    			span6 = element("span");
    			span4 = element("span");
    			span4.textContent = "📚🏃Completar el capítulo";
    			t22 = space();
    			create_component(tasklink2.$$.fragment);
    			t23 = space();
    			span5 = element("span");
    			t24 = text("de\n                    ");
    			em = element("em");
    			em.textContent = "Interneting is Hard";
    			attr_dev(p, "class", "text-light-gray-us font-light text-sm mb-2");
    			add_location(p, file$8, 66, 6, 2190);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "form-checkbox text-cyan-us transition-all-4");
    			input0.checked = input0_checked_value = /*items*/ ctx[2][0] ? true : false;
    			add_location(input0, file$8, 81, 16, 2809);
    			attr_dev(span0, "class", "font-light");
    			add_location(span0, file$8, 87, 18, 3114);
    			attr_dev(span1, "class", span1_class_value = "" + ((/*items*/ ctx[2][0] ? "opacity-50" : "") + " ml-2"));
    			add_location(span1, file$8, 86, 16, 3045);
    			attr_dev(label0, "class", label0_class_value = "" + ((/*items*/ ctx[2][0] ? "line-through" : "") + " inline-flex items-center"));
    			add_location(label0, file$8, 80, 14, 2719);
    			attr_dev(div0, "class", "mb-2");
    			add_location(div0, file$8, 79, 12, 2686);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "form-checkbox text-cyan-us transition-all-4");
    			input1.checked = input1_checked_value = /*items*/ ctx[2][1] ? true : false;
    			add_location(input1, file$8, 97, 16, 3554);
    			attr_dev(span2, "class", "font-light");
    			add_location(span2, file$8, 103, 18, 3859);
    			attr_dev(span3, "class", span3_class_value = "" + ((/*items*/ ctx[2][1] ? "opacity-50" : "") + " ml-2"));
    			add_location(span3, file$8, 102, 16, 3790);
    			attr_dev(label1, "class", label1_class_value = "" + ((/*items*/ ctx[2][1] ? "line-through" : "") + " inline-flex items-center"));
    			add_location(label1, file$8, 96, 14, 3464);
    			add_location(div1, file$8, 95, 12, 3444);
    			attr_dev(div2, "class", "sm: leading-snug leading-tight");
    			add_location(div2, file$8, 78, 10, 2629);
    			attr_dev(div3, "class", "border-1 rounded p-3");
    			add_location(div3, file$8, 71, 8, 2419);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "form-checkbox text-cyan-us transition-all-4");
    			input2.checked = input2_checked_value = /*items*/ ctx[2][2] ? true : false;
    			add_location(input2, file$8, 122, 16, 4568);
    			attr_dev(span4, "class", "font-light");
    			add_location(span4, file$8, 128, 18, 4873);
    			attr_dev(em, "class", "font-normal");
    			add_location(em, file$8, 134, 20, 5184);
    			attr_dev(span5, "class", "font-light");
    			add_location(span5, file$8, 132, 18, 5115);
    			attr_dev(span6, "class", span6_class_value = "" + ((/*items*/ ctx[2][2] ? "opacity-50" : "") + " ml-2"));
    			add_location(span6, file$8, 127, 16, 4804);
    			attr_dev(label2, "class", label2_class_value = "" + ((/*items*/ ctx[2][2] ? "line-through" : "") + " inline-flex items-center; justify-content: end"));
    			add_location(label2, file$8, 121, 14, 4456);
    			attr_dev(div4, "class", "mb-2");
    			add_location(div4, file$8, 120, 12, 4423);
    			attr_dev(div5, "class", "sm: leading-snug leading-tight");
    			add_location(div5, file$8, 119, 10, 4366);
    			attr_dev(div6, "id", "css-tasks");
    			attr_dev(div6, "class", "task mt-1 border-1 rounded p-3");
    			add_location(div6, file$8, 111, 8, 4133);
    			attr_dev(div7, "id", "node-tasks");
    			attr_dev(div7, "class", "task sm:h-64 h-auto overflow-scroll");
    			add_location(div7, file$8, 70, 6, 2345);
    			add_location(div8, file$8, 61, 4, 2093);
    			attr_dev(div9, "class", "shadow-md border-2 border-solid border-blue-us rounded h-auto max-w-2xl p-4 bg-white-us");
    			add_location(div9, file$8, 57, 2, 1938);
    			attr_dev(main, "class", "flex flex-col h-screen justify-center items-center p-3 bg-black-us");
    			add_location(main, file$8, 51, 0, 1773);

    			dispose = [
    				listen_dev(input0, "click", /*click_handler*/ ctx[9], false, false, false),
    				listen_dev(input1, "click", /*click_handler_1*/ ctx[10], false, false, false),
    				listen_dev(input2, "click", /*click_handler_2*/ ctx[11], false, false, false)
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
    			append_dev(div8, p);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			append_dev(p, t8);
    			append_dev(div8, t9);
    			append_dev(div8, div7);
    			append_dev(div7, div3);
    			mount_component(nodetag, div3, null);
    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t11);
    			append_dev(label0, span1);
    			append_dev(span1, span0);
    			append_dev(span1, t13);
    			mount_component(tasklink0, span1, null);
    			append_dev(div2, t14);
    			append_dev(div2, div1);
    			append_dev(div1, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t15);
    			append_dev(label1, span3);
    			append_dev(span3, span2);
    			append_dev(span3, t17);
    			mount_component(tasklink1, span3, null);
    			append_dev(div7, t18);
    			append_dev(div7, div6);
    			mount_component(csstag, div6, null);
    			append_dev(div6, t19);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, label2);
    			append_dev(label2, input2);
    			append_dev(label2, t20);
    			append_dev(label2, span6);
    			append_dev(span6, span4);
    			append_dev(span6, t22);
    			mount_component(tasklink2, span6, null);
    			append_dev(span6, t23);
    			append_dev(span6, span5);
    			append_dev(span5, t24);
    			append_dev(span5, em);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fullcalendarlink_changes = {};
    			if (dirty[0] & /*completedPercentage*/ 8) fullcalendarlink_changes.completedPercentage = /*completedPercentage*/ ctx[3];
    			fullcalendarlink.$set(fullcalendarlink_changes);
    			const weekinfo_changes = {};
    			if (dirty[0] & /*weekNumber*/ 2) weekinfo_changes.weekNumber = /*weekNumber*/ ctx[1];
    			if (dirty[0] & /*week*/ 1) weekinfo_changes.week = /*week*/ ctx[0];
    			weekinfo.$set(weekinfo_changes);
    			const progressbar_changes = {};
    			if (dirty[0] & /*completedPercentage*/ 8) progressbar_changes.completedPercentage = /*completedPercentage*/ ctx[3];
    			progressbar.$set(progressbar_changes);
    			if ((!current || dirty[0] & /*items*/ 4) && t6_value !== (t6_value = /*items*/ ctx[2].filter(func).length + "")) set_data_dev(t6, t6_value);
    			if ((!current || dirty[0] & /*items*/ 4) && t8_value !== (t8_value = /*items*/ ctx[2].length + "")) set_data_dev(t8, t8_value);

    			if (!current || dirty[0] & /*items*/ 4 && input0_checked_value !== (input0_checked_value = /*items*/ ctx[2][0] ? true : false)) {
    				prop_dev(input0, "checked", input0_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && span1_class_value !== (span1_class_value = "" + ((/*items*/ ctx[2][0] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && label0_class_value !== (label0_class_value = "" + ((/*items*/ ctx[2][0] ? "line-through" : "") + " inline-flex items-center"))) {
    				attr_dev(label0, "class", label0_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && input1_checked_value !== (input1_checked_value = /*items*/ ctx[2][1] ? true : false)) {
    				prop_dev(input1, "checked", input1_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && span3_class_value !== (span3_class_value = "" + ((/*items*/ ctx[2][1] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span3, "class", span3_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && label1_class_value !== (label1_class_value = "" + ((/*items*/ ctx[2][1] ? "line-through" : "") + " inline-flex items-center"))) {
    				attr_dev(label1, "class", label1_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && input2_checked_value !== (input2_checked_value = /*items*/ ctx[2][2] ? true : false)) {
    				prop_dev(input2, "checked", input2_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && span6_class_value !== (span6_class_value = "" + ((/*items*/ ctx[2][2] ? "opacity-50" : "") + " ml-2"))) {
    				attr_dev(span6, "class", span6_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 4 && label2_class_value !== (label2_class_value = "" + ((/*items*/ ctx[2][2] ? "line-through" : "") + " inline-flex items-center; justify-content: end"))) {
    				attr_dev(label2, "class", label2_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(title.$$.fragment, local);
    			transition_in(fullcalendarlink.$$.fragment, local);
    			transition_in(weekinfo.$$.fragment, local);
    			transition_in(progressbar.$$.fragment, local);
    			transition_in(nodetag.$$.fragment, local);
    			transition_in(tasklink0.$$.fragment, local);
    			transition_in(tasklink1.$$.fragment, local);
    			transition_in(csstag.$$.fragment, local);
    			transition_in(tasklink2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(title.$$.fragment, local);
    			transition_out(fullcalendarlink.$$.fragment, local);
    			transition_out(weekinfo.$$.fragment, local);
    			transition_out(progressbar.$$.fragment, local);
    			transition_out(nodetag.$$.fragment, local);
    			transition_out(tasklink0.$$.fragment, local);
    			transition_out(tasklink1.$$.fragment, local);
    			transition_out(csstag.$$.fragment, local);
    			transition_out(tasklink2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(title);
    			destroy_component(fullcalendarlink);
    			destroy_component(weekinfo);
    			destroy_component(progressbar);
    			destroy_component(nodetag);
    			destroy_component(tasklink0);
    			destroy_component(tasklink1);
    			destroy_component(csstag);
    			destroy_component(tasklink2);
    			run_all(dispose);
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

    const LOCAL_STORAGE_ITEMS_KEY = "items";
    const LOCAL_STORAGE_COMPLETED_KEY = "completed";
    const func = item => item;

    function instance$5($$self, $$props, $$invalidate) {
    	let { week } = $$props;
    	let { weekNumber } = $$props;
    	let items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) || [0, 0, 0];
    	let taskPercentage = parseFloat((100 / items.length).toFixed(2));
    	let completedPercentage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPLETED_KEY)) || 0;

    	function updateItems(index) {
    		const currentValue = items[index];
    		$$invalidate(2, items[index] = 1 - currentValue, items);
    		localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
    	}

    	function addCompletedPercentage() {
    		$$invalidate(3, completedPercentage += taskPercentage);
    		localStorage.setItem(LOCAL_STORAGE_COMPLETED_KEY, JSON.stringify(completedPercentage));
    	}

    	function substractCompletedPercentage() {
    		$$invalidate(3, completedPercentage -= taskPercentage);
    		localStorage.setItem(LOCAL_STORAGE_COMPLETED_KEY, JSON.stringify(completedPercentage));
    	}

    	function handleClick(index) {
    		updateItems(index);

    		items[index]
    		? addCompletedPercentage()
    		: substractCompletedPercentage();
    	}

    	const writable_props = ["week", "weekNumber"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => handleClick(0);
    	const click_handler_1 = () => handleClick(1);
    	const click_handler_2 = () => handleClick(2);

    	$$self.$set = $$props => {
    		if ("week" in $$props) $$invalidate(0, week = $$props.week);
    		if ("weekNumber" in $$props) $$invalidate(1, weekNumber = $$props.weekNumber);
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
    		if ("week" in $$props) $$invalidate(0, week = $$props.week);
    		if ("weekNumber" in $$props) $$invalidate(1, weekNumber = $$props.weekNumber);
    		if ("items" in $$props) $$invalidate(2, items = $$props.items);
    		if ("taskPercentage" in $$props) taskPercentage = $$props.taskPercentage;
    		if ("completedPercentage" in $$props) $$invalidate(3, completedPercentage = $$props.completedPercentage);
    	};

    	return [
    		week,
    		weekNumber,
    		items,
    		completedPercentage,
    		handleClick,
    		taskPercentage,
    		updateItems,
    		addCompletedPercentage,
    		substractCompletedPercentage,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$8, safe_not_equal, { week: 0, weekNumber: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*week*/ ctx[0] === undefined && !("week" in props)) {
    			console.warn("<App> was created without expected prop 'week'");
    		}

    		if (/*weekNumber*/ ctx[1] === undefined && !("weekNumber" in props)) {
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
