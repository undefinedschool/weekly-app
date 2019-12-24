
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
    	let t2;
    	let div0_class_value;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text("% ");
    			t2 = text(/*completed*/ ctx[4]);
    			set_style(div0, "width", Math.round(/*completedPercentage*/ ctx[0]) + "%");
    			attr_dev(div0, "class", div0_class_value = "transition-all-4 " + /*progressBackgroundColor*/ ctx[2] + " rounded-lg p-1 " + /*progressTextColor*/ ctx[3]);
    			add_location(div0, file, 12, 2, 564);
    			attr_dev(div1, "class", div1_class_value = "bg-gray-200 mt-2 mb-8 mb-0 text-xl " + /*fullBar*/ ctx[1] + " text-center rounded-lg");
    			add_location(div1, file, 11, 0, 480);
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
    			if (dirty[0] & /*completed*/ 16) set_data_dev(t2, /*completed*/ ctx[4]);

    			if (dirty[0] & /*completedPercentage*/ 1) {
    				set_style(div0, "width", Math.round(/*completedPercentage*/ ctx[0]) + "%");
    			}

    			if (dirty[0] & /*progressBackgroundColor, progressTextColor*/ 12 && div0_class_value !== (div0_class_value = "transition-all-4 " + /*progressBackgroundColor*/ ctx[2] + " rounded-lg p-1 " + /*progressTextColor*/ ctx[3])) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty[0] & /*fullBar*/ 2 && div1_class_value !== (div1_class_value = "bg-gray-200 mt-2 mb-8 mb-0 text-xl " + /*fullBar*/ ctx[1] + " text-center rounded-lg")) {
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
    		return {
    			completedPercentage,
    			fullBar,
    			progressBackgroundColor,
    			progressTextColor,
    			completed
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("completedPercentage" in $$props) $$invalidate(0, completedPercentage = $$props.completedPercentage);
    		if ("fullBar" in $$props) $$invalidate(1, fullBar = $$props.fullBar);
    		if ("progressBackgroundColor" in $$props) $$invalidate(2, progressBackgroundColor = $$props.progressBackgroundColor);
    		if ("progressTextColor" in $$props) $$invalidate(3, progressTextColor = $$props.progressTextColor);
    		if ("completed" in $$props) $$invalidate(4, completed = $$props.completed);
    	};

    	let fullBar;
    	let progressBackgroundColor;
    	let progressTextColor;
    	let completed;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*completedPercentage*/ 1) {
    			 $$invalidate(1, fullBar = Math.round(completedPercentage) === 100
    			? "font-semibold"
    			: "");
    		}

    		if ($$self.$$.dirty[0] & /*completedPercentage*/ 1) {
    			 $$invalidate(2, progressBackgroundColor = completedPercentage > 67
    			? "bg-green-200"
    			: completedPercentage > 34
    				? "bg-yellow-200"
    				: "bg-red-200");
    		}

    		if ($$self.$$.dirty[0] & /*completedPercentage*/ 1) {
    			 $$invalidate(3, progressTextColor = completedPercentage > 67
    			? "text-green-700"
    			: completedPercentage > 34
    				? "text-yellow-600"
    				: "text-red-700");
    		}

    		if ($$self.$$.dirty[0] & /*completedPercentage*/ 1) {
    			 $$invalidate(4, completed = Math.round(completedPercentage) === 100 ? "🎉" : "");
    		}
    	};

    	return [
    		completedPercentage,
    		fullBar,
    		progressBackgroundColor,
    		progressTextColor,
    		completed
    	];
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
    			add_location(span0, file$1, 3, 6, 255);
    			attr_dev(span1, "class", "blink font-normal text-cyan-us");
    			add_location(span1, file$1, 5, 6, 319);
    			attr_dev(p, "class", "font-montserrat font-medium");
    			add_location(p, file$1, 2, 4, 209);
    			attr_dev(a, "href", "https://undefinedschool.io");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener");
    			attr_dev(a, "class", "text-light-gray-us text-s");
    			add_location(a, file$1, 1, 2, 102);
    			attr_dev(div, "class", "bg-white-us fixed top-0 left-0 shadow-md p-2 w-full sm:text-right text-center sm:pr-4");
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
    			add_location(span, file$2, 7, 2, 191);
    			attr_dev(h1, "class", "mt-20 sm:mb-4 mb-6 leading-tight sm:text-3xl text-4xl text-white-us font-raleway text-center");
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

    /* src/components/WeekInfo.svelte generated by Svelte v3.16.4 */

    const file$3 = "src/components/WeekInfo.svelte";

    // (47:4) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let span;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Ya estamos en la\n        ");
    			span = element("span");
    			span.textContent = "clase siguiente.";
    			attr_dev(span, "class", "font-medium");
    			add_location(span, file$3, 49, 8, 1460);
    			attr_dev(p, "class", "text-teal-600");
    			add_location(p, file$3, 47, 6, 1401);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, span);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(47:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:34) 
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let span;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Te queda\n        ");
    			span = element("span");
    			t1 = text(/*daysRemaining*/ ctx[1]);
    			t2 = text("\n        día para completar estas tareas");
    			attr_dev(span, "class", "font-medium");
    			add_location(span, file$3, 43, 8, 1283);
    			attr_dev(p, "class", "text-red-500");
    			add_location(p, file$3, 41, 6, 1233);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, span);
    			append_dev(span, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*daysRemaining*/ 2) set_data_dev(t1, /*daysRemaining*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(41:34) ",
    		ctx
    	});

    	return block;
    }

    // (35:32) 
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let span;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Te quedan\n        ");
    			span = element("span");
    			t1 = text(/*daysRemaining*/ ctx[1]);
    			t2 = text("\n        días para completar estas tareas");
    			attr_dev(span, "class", "font-medium");
    			add_location(span, file$3, 37, 8, 1091);
    			add_location(p, file$3, 35, 6, 1061);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, span);
    			append_dev(span, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*daysRemaining*/ 2) set_data_dev(t1, /*daysRemaining*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(35:32) ",
    		ctx
    	});

    	return block;
    }

    // (30:4) {#if daysRemaining > 0 && Math.round(completedPercentage) === 100}
    function create_if_block(ctx) {
    	let p;
    	let span;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span = element("span");
    			span.textContent = "¡Excelente!";
    			t1 = text("\n        Estás al día 💪");
    			attr_dev(span, "class", "font-medium");
    			add_location(span, file$3, 31, 8, 942);
    			add_location(p, file$3, 30, 6, 930);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span);
    			append_dev(p, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(30:4) {#if daysRemaining > 0 && Math.round(completedPercentage) === 100}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let p1;
    	let show_if;

    	function select_block_type(ctx, dirty) {
    		if (show_if == null || dirty[0] & /*daysRemaining, completedPercentage*/ 3) show_if = !!(/*daysRemaining*/ ctx[1] > 0 && Math.round(/*completedPercentage*/ ctx[0]) === 100);
    		if (show_if) return create_if_block;
    		if (/*daysRemaining*/ ctx[1] > 1) return create_if_block_1;
    		if (/*daysRemaining*/ ctx[1] === 1) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(/*weekTitle*/ ctx[2]);
    			t1 = text(" semana");
    			t2 = space();
    			p1 = element("p");
    			if_block.c();
    			attr_dev(p0, "class", "text-gray-700 font-semibold text-lg mb-6 -ml-3 -mr-3 -mt-3 py-4 px-3 bg-gray-50 rounded-t border-b-gray-200");
    			add_location(p0, file$3, 23, 2, 580);
    			attr_dev(p1, "class", "font-light text-sm text-light-gray-us");
    			add_location(p1, file$3, 28, 2, 803);
    			add_location(div, file$3, 22, 0, 572);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(div, t2);
    			append_dev(div, p1);
    			if_block.m(p1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*weekTitle*/ 4) set_data_dev(t0, /*weekTitle*/ ctx[2]);

    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
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

    function getDaysRemainingToNextWeek(today, nextWeek) {
    	const diffTime = nextWeek - today;
    	const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    	return remainingDays;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { nextWeek } = $$props;
    	let { completedPercentage } = $$props;
    	let { isCurrentWeek } = $$props;
    	const today = new Date().setHours(18);
    	let daysRemaining = getDaysRemainingToNextWeek(today, nextWeek);

    	setInterval(
    		() => {
    			$$invalidate(1, daysRemaining = getDaysRemainingToNextWeek(today, nextWeek));
    		},
    		1000 * 60
    	);

    	const writable_props = ["nextWeek", "completedPercentage", "isCurrentWeek"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WeekInfo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("nextWeek" in $$props) $$invalidate(3, nextWeek = $$props.nextWeek);
    		if ("completedPercentage" in $$props) $$invalidate(0, completedPercentage = $$props.completedPercentage);
    		if ("isCurrentWeek" in $$props) $$invalidate(4, isCurrentWeek = $$props.isCurrentWeek);
    	};

    	$$self.$capture_state = () => {
    		return {
    			nextWeek,
    			completedPercentage,
    			isCurrentWeek,
    			daysRemaining,
    			weekTitle
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("nextWeek" in $$props) $$invalidate(3, nextWeek = $$props.nextWeek);
    		if ("completedPercentage" in $$props) $$invalidate(0, completedPercentage = $$props.completedPercentage);
    		if ("isCurrentWeek" in $$props) $$invalidate(4, isCurrentWeek = $$props.isCurrentWeek);
    		if ("daysRemaining" in $$props) $$invalidate(1, daysRemaining = $$props.daysRemaining);
    		if ("weekTitle" in $$props) $$invalidate(2, weekTitle = $$props.weekTitle);
    	};

    	let weekTitle;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*isCurrentWeek*/ 16) {
    			 $$invalidate(2, weekTitle = isCurrentWeek ? "Esta" : "Próxima");
    		}
    	};

    	return [completedPercentage, daysRemaining, weekTitle, nextWeek, isCurrentWeek];
    }

    class WeekInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {
    			nextWeek: 3,
    			completedPercentage: 0,
    			isCurrentWeek: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WeekInfo",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*nextWeek*/ ctx[3] === undefined && !("nextWeek" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'nextWeek'");
    		}

    		if (/*completedPercentage*/ ctx[0] === undefined && !("completedPercentage" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'completedPercentage'");
    		}

    		if (/*isCurrentWeek*/ ctx[4] === undefined && !("isCurrentWeek" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'isCurrentWeek'");
    		}
    	}

    	get nextWeek() {
    		throw new Error("<WeekInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nextWeek(value) {
    		throw new Error("<WeekInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get completedPercentage() {
    		throw new Error("<WeekInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set completedPercentage(value) {
    		throw new Error("<WeekInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isCurrentWeek() {
    		throw new Error("<WeekInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isCurrentWeek(value) {
    		throw new Error("<WeekInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CompletedTasks.svelte generated by Svelte v3.16.4 */

    const file$4 = "src/components/CompletedTasks.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let p;
    	let span0;
    	let t0;
    	let t1;
    	let span1;
    	let t3;
    	let t4_value = /*items*/ ctx[0].length + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			span0 = element("span");
    			t0 = text(/*numberOfCompletedTasks*/ ctx[1]);
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "/";
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = text(" tareas completadas");
    			attr_dev(span0, "class", "font-semibold");
    			add_location(span0, file$4, 8, 4, 173);
    			attr_dev(span1, "class", "opacity-75");
    			add_location(span1, file$4, 9, 4, 237);
    			attr_dev(p, "class", "text-light-gray-us font-light text-xs mb-1");
    			add_location(p, file$4, 7, 2, 114);
    			add_location(div, file$4, 6, 0, 106);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, span0);
    			append_dev(span0, t0);
    			append_dev(p, t1);
    			append_dev(p, span1);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*numberOfCompletedTasks*/ 2) set_data_dev(t0, /*numberOfCompletedTasks*/ ctx[1]);
    			if (dirty[0] & /*items*/ 1 && t4_value !== (t4_value = /*items*/ ctx[0].length + "")) set_data_dev(t4, t4_value);
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
    	let { items } = $$props;
    	const writable_props = ["items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CompletedTasks> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => {
    		return { items, numberOfCompletedTasks };
    	};

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("numberOfCompletedTasks" in $$props) $$invalidate(1, numberOfCompletedTasks = $$props.numberOfCompletedTasks);
    	};

    	let numberOfCompletedTasks;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*items*/ 1) {
    			 $$invalidate(1, numberOfCompletedTasks = items.filter(item => item).length);
    		}
    	};

    	return [items, numberOfCompletedTasks];
    }

    class CompletedTasks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CompletedTasks",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*items*/ ctx[0] === undefined && !("items" in props)) {
    			console.warn("<CompletedTasks> was created without expected prop 'items'");
    		}
    	}

    	get items() {
    		throw new Error("<CompletedTasks>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<CompletedTasks>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
    			attr_dev(a, "class", "font-medium link");
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
    			attr_dev(span, "class", "inline-block rounded px-2 py-1 text-xs text-green-800 bg-green-300 font-semibold opacity-75");
    			add_location(span, file$6, 1, 2, 33);
    			attr_dev(div, "class", "-mt-1 -mr-1 mb-4");
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

    /* src/components/Tags/ExpressTag.svelte generated by Svelte v3.16.4 */

    const file$7 = "src/components/Tags/ExpressTag.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Express";
    			attr_dev(span, "class", "inline-block rounded px-2 py-1 text-xs text-gray-444 bg-gray-eee font-semibold opacity-75");
    			add_location(span, file$7, 1, 2, 33);
    			attr_dev(div, "class", "-mt-1 -mr-1 mb-4");
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

    class ExpressTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExpressTag",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/References.svelte generated by Svelte v3.16.4 */

    const file$8 = "src/components/References.svelte";

    function create_fragment$8(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let a;
    	let t1;
    	let div1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let li2;
    	let t7;
    	let li3;
    	let t9;
    	let li4;
    	let t11;
    	let li5;
    	let t13;
    	let li6;
    	let t15;
    	let li7;
    	let t17;
    	let li8;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			a = element("a");
    			a.textContent = "Cerrar";
    			t1 = space();
    			div1 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "📝 Técnicas de estudio";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "💻 Setup";
    			t5 = space();
    			li2 = element("li");
    			li2.textContent = "📚 Teoría";
    			t7 = space();
    			li3 = element("li");
    			li3.textContent = "🏃 Ejercicios";
    			t9 = space();
    			li4 = element("li");
    			li4.textContent = "🚧 Mini-proyecto";
    			t11 = space();
    			li5 = element("li");
    			li5.textContent = "👫 Soft Skills / Metodologías Ágiles";
    			t13 = space();
    			li6 = element("li");
    			li6.textContent = "👷 Proyecto";
    			t15 = space();
    			li7 = element("li");
    			li7.textContent = "📹 Charla";
    			t17 = space();
    			li8 = element("li");
    			li8.textContent = "📻 Podcast";
    			attr_dev(a, "href", "#");
    			attr_dev(a, "title", "Close");
    			attr_dev(a, "class", "text-xs text-light-gray-us link p-2 no-underline");
    			add_location(a, file$8, 6, 6, 295);
    			attr_dev(div0, "class", "mb-4 flex justify-end");
    			add_location(div0, file$8, 5, 4, 253);
    			add_location(li0, file$8, 12, 8, 590);
    			add_location(li1, file$8, 13, 8, 630);
    			add_location(li2, file$8, 14, 8, 656);
    			add_location(li3, file$8, 15, 8, 683);
    			add_location(li4, file$8, 16, 8, 714);
    			add_location(li5, file$8, 17, 8, 748);
    			add_location(li6, file$8, 18, 8, 802);
    			add_location(li7, file$8, 19, 8, 831);
    			add_location(li8, file$8, 20, 8, 858);
    			attr_dev(ul, "class", "text-sm font-light list-none");
    			add_location(ul, file$8, 11, 6, 540);
    			add_location(div1, file$8, 10, 4, 528);
    			attr_dev(div2, "class", "max-w-xs p-3 rounded shadow absolute bg-white-us w-full top-50 left-50");
    			add_location(div2, file$8, 4, 2, 164);
    			attr_dev(div3, "id", "references");
    			attr_dev(div3, "class", "invisible modal-window top-0 right-0 bottom-0 left-0 opacity-0 fixed z-10 pointer-events-none transition-all-4\n  bg-black-us-80");
    			add_location(div3, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, a);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(ul, t7);
    			append_dev(ul, li3);
    			append_dev(ul, t9);
    			append_dev(ul, li4);
    			append_dev(ul, t11);
    			append_dev(ul, li5);
    			append_dev(ul, t13);
    			append_dev(ul, li6);
    			append_dev(ul, t15);
    			append_dev(ul, li7);
    			append_dev(ul, t17);
    			append_dev(ul, li8);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
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

    class References extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "References",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/ReferencesLink.svelte generated by Svelte v3.16.4 */

    const file$9 = "src/components/ReferencesLink.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let span0;
    	let a0;
    	let t1;
    	let span1;
    	let a1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			a0 = element("a");
    			a0.textContent = "Referencias";
    			t1 = text("\n  |\n  ");
    			span1 = element("span");
    			a1 = element("a");
    			a1.textContent = "Clases anteriores";
    			attr_dev(a0, "href", "#references");
    			add_location(a0, file$9, 2, 4, 99);
    			attr_dev(span0, "class", "link");
    			add_location(span0, file$9, 1, 2, 75);
    			attr_dev(a1, "href", "https://trello.com/b/mUf0huXz/undefined-school");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener");
    			add_location(a1, file$9, 6, 4, 189);
    			attr_dev(span1, "class", "link font-medium");
    			add_location(span1, file$9, 5, 2, 153);
    			attr_dev(div, "class", "font-light text-xs text-right p-3 -mt-2 mb-4 text-white-us");
    			add_location(div, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, a0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, a1);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class ReferencesLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ReferencesLink",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.4 */
    const file$a = "src/App.svelte";

    function create_fragment$a(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let div15;
    	let div14;
    	let div13;
    	let t2;
    	let t3;
    	let t4;
    	let div12;
    	let div5;
    	let div0;
    	let t5;
    	let div4;
    	let div1;
    	let label0;
    	let input0;
    	let input0_checked_value;
    	let t6;
    	let span1;
    	let span0;
    	let t8;
    	let t9;
    	let span1_class_value;
    	let label0_class_value;
    	let t10;
    	let div2;
    	let label1;
    	let input1;
    	let input1_checked_value;
    	let t11;
    	let span3;
    	let span2;
    	let t13;
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
    	let t19;
    	let span5_class_value;
    	let label2_class_value;
    	let t20;
    	let div11;
    	let div6;
    	let t21;
    	let div10;
    	let div7;
    	let label3;
    	let input3;
    	let input3_checked_value;
    	let t22;
    	let span7;
    	let span6;
    	let t24;
    	let t25;
    	let span7_class_value;
    	let label3_class_value;
    	let t26;
    	let div8;
    	let label4;
    	let input4;
    	let input4_checked_value;
    	let t27;
    	let span9;
    	let span8;
    	let t29;
    	let t30;
    	let span9_class_value;
    	let label4_class_value;
    	let t31;
    	let div9;
    	let label5;
    	let input5;
    	let input5_checked_value;
    	let t32;
    	let span11;
    	let span10;
    	let t34;
    	let t35;
    	let span11_class_value;
    	let label5_class_value;
    	let t36;
    	let t37;
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

    	const weekinfo = new WeekInfo({
    			props: {
    				completedPercentage: /*completedPercentage*/ ctx[3],
    				nextWeek: /*nextWeek*/ ctx[1],
    				isCurrentWeek: true
    			},
    			$$inline: true
    		});

    	const progressbar = new ProgressBar({
    			props: {
    				completedPercentage: /*completedPercentage*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const completedtasks = new CompletedTasks({
    			props: { items: /*items*/ ctx[0] },
    			$$inline: true
    		});

    	const nodetag = new NodeTag({ $$inline: true });

    	const tasklink0 = new TaskLink({
    			props: {
    				name: "How to Use __dirname in Node.js",
    				src: "https://alligator.io/nodejs/how-to-use__dirname/"
    			},
    			$$inline: true
    		});

    	const tasklink1 = new TaskLink({
    			props: {
    				name: "ejercicios de Node",
    				src: "https://github.com/undefinedschool/notes-nodejs/blob/master/README.md#ejercicios-1"
    			},
    			$$inline: true
    		});

    	const tasklink2 = new TaskLink({
    			props: {
    				name: "Proyecto 4: Node Jokes",
    				src: "https://github.com/undefinedschool/project-4-node-jokes"
    			},
    			$$inline: true
    		});

    	const expresstag = new ExpressTag({ $$inline: true });

    	const tasklink3 = new TaskLink({
    			props: {
    				name: "Introduction to Express.js",
    				src: "https://www.rithmschool.com/courses/node-express-fundamentals/introduction-to-express"
    			},
    			$$inline: true
    		});

    	const tasklink4 = new TaskLink({
    			props: {
    				name: "Serving JSON with Express.js",
    				src: "https://www.rithmschool.com/courses/node-express-fundamentals/json-with-express"
    			},
    			$$inline: true
    		});

    	const tasklink5 = new TaskLink({
    			props: {
    				name: "Notas sobre ExpressJS",
    				src: "https://github.com/undefinedschool/notes-expressjs/"
    			},
    			$$inline: true
    		});

    	const referenceslink = new ReferencesLink({ $$inline: true });
    	const references = new References({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(title.$$.fragment);
    			t1 = space();
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			create_component(weekinfo.$$.fragment);
    			t2 = space();
    			create_component(progressbar.$$.fragment);
    			t3 = space();
    			create_component(completedtasks.$$.fragment);
    			t4 = space();
    			div12 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			create_component(nodetag.$$.fragment);
    			t5 = space();
    			div4 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t6 = space();
    			span1 = element("span");
    			span0 = element("span");
    			span0.textContent = "Ver";
    			t8 = space();
    			create_component(tasklink0.$$.fragment);
    			t9 = text("\n                    🏃");
    			t10 = space();
    			div2 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t11 = space();
    			span3 = element("span");
    			span2 = element("span");
    			span2.textContent = "Completar los";
    			t13 = space();
    			create_component(tasklink1.$$.fragment);
    			t14 = text("\n                    🏃");
    			t15 = space();
    			div3 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t16 = space();
    			span5 = element("span");
    			span4 = element("span");
    			span4.textContent = "Completar el";
    			t18 = space();
    			create_component(tasklink2.$$.fragment);
    			t19 = text("\n                    👷");
    			t20 = space();
    			div11 = element("div");
    			div6 = element("div");
    			create_component(expresstag.$$.fragment);
    			t21 = space();
    			div10 = element("div");
    			div7 = element("div");
    			label3 = element("label");
    			input3 = element("input");
    			t22 = space();
    			span7 = element("span");
    			span6 = element("span");
    			span6.textContent = "Completar el capítulo";
    			t24 = space();
    			create_component(tasklink3.$$.fragment);
    			t25 = text("\n                    📚🏃");
    			t26 = space();
    			div8 = element("div");
    			label4 = element("label");
    			input4 = element("input");
    			t27 = space();
    			span9 = element("span");
    			span8 = element("span");
    			span8.textContent = "Completar el capítulo";
    			t29 = space();
    			create_component(tasklink4.$$.fragment);
    			t30 = text("\n                    📚🏃");
    			t31 = space();
    			div9 = element("div");
    			label5 = element("label");
    			input5 = element("input");
    			t32 = space();
    			span11 = element("span");
    			span10 = element("span");
    			span10.textContent = "Ver";
    			t34 = space();
    			create_component(tasklink5.$$.fragment);
    			t35 = text("\n                    📚🏃");
    			t36 = space();
    			create_component(referenceslink.$$.fragment);
    			t37 = space();
    			create_component(references.$$.fragment);
    			attr_dev(div0, "class", "flex justify-end mb-2");
    			add_location(div0, file$a, 71, 12, 2539);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "form-checkbox text-cyan-us transition-all-4");
    			input0.checked = input0_checked_value = /*items*/ ctx[0][0] ? true : false;
    			add_location(input0, file$a, 79, 18, 2837);
    			attr_dev(span0, "class", "font-light");
    			add_location(span0, file$a, 85, 20, 3175);
    			attr_dev(span1, "class", span1_class_value = "" + ((/*items*/ ctx[0][0] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"));
    			add_location(span1, file$a, 84, 18, 3083);
    			attr_dev(label0, "class", label0_class_value = "" + ((/*items*/ ctx[0][0] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label0, file$a, 78, 16, 2732);
    			attr_dev(div1, "class", "task mb-2");
    			add_location(div1, file$a, 77, 14, 2692);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "form-checkbox text-cyan-us transition-all-4");
    			input1.checked = input1_checked_value = /*items*/ ctx[0][1] ? true : false;
    			add_location(input1, file$a, 96, 18, 3645);
    			attr_dev(span2, "class", "font-light");
    			add_location(span2, file$a, 102, 20, 3983);
    			attr_dev(span3, "class", span3_class_value = "" + ((/*items*/ ctx[0][1] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"));
    			add_location(span3, file$a, 101, 18, 3891);
    			attr_dev(label1, "class", label1_class_value = "" + ((/*items*/ ctx[0][1] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label1, file$a, 95, 16, 3540);
    			attr_dev(div2, "class", "task mb-2");
    			add_location(div2, file$a, 94, 14, 3500);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "form-checkbox text-cyan-us transition-all-4");
    			input2.checked = input2_checked_value = /*items*/ ctx[0][2] ? true : false;
    			add_location(input2, file$a, 113, 18, 4479);
    			attr_dev(span4, "class", "font-light");
    			add_location(span4, file$a, 119, 20, 4817);
    			attr_dev(span5, "class", span5_class_value = "" + ((/*items*/ ctx[0][2] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"));
    			add_location(span5, file$a, 118, 18, 4725);
    			attr_dev(label2, "class", label2_class_value = "" + ((/*items*/ ctx[0][2] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label2, file$a, 112, 16, 4374);
    			attr_dev(div3, "class", "task");
    			add_location(div3, file$a, 111, 14, 4339);
    			attr_dev(div4, "class", "sm:leading-snug leading-tight");
    			add_location(div4, file$a, 75, 12, 2633);
    			attr_dev(div5, "class", "border-1 rounded p-3 mb-2 shadow bg-white");
    			add_location(div5, file$a, 70, 10, 2471);
    			attr_dev(div6, "class", "flex justify-end mb-2");
    			add_location(div6, file$a, 131, 12, 5249);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "form-checkbox text-cyan-us transition-all-4");
    			input3.checked = input3_checked_value = /*items*/ ctx[0][3] ? true : false;
    			add_location(input3, file$a, 139, 18, 5550);
    			attr_dev(span6, "class", "font-light");
    			add_location(span6, file$a, 145, 20, 5888);
    			attr_dev(span7, "class", span7_class_value = "" + ((/*items*/ ctx[0][3] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"));
    			add_location(span7, file$a, 144, 18, 5796);
    			attr_dev(label3, "class", label3_class_value = "" + ((/*items*/ ctx[0][3] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label3, file$a, 138, 16, 5445);
    			attr_dev(div7, "class", "task mb-2");
    			add_location(div7, file$a, 137, 14, 5405);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "form-checkbox text-cyan-us transition-all-4");
    			input4.checked = input4_checked_value = /*items*/ ctx[0][4] ? true : false;
    			add_location(input4, file$a, 156, 18, 6410);
    			attr_dev(span8, "class", "font-light");
    			add_location(span8, file$a, 162, 20, 6748);
    			attr_dev(span9, "class", span9_class_value = "" + ((/*items*/ ctx[0][4] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"));
    			add_location(span9, file$a, 161, 18, 6656);
    			attr_dev(label4, "class", label4_class_value = "" + ((/*items*/ ctx[0][4] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label4, file$a, 155, 16, 6305);
    			attr_dev(div8, "class", "task mb-2");
    			add_location(div8, file$a, 154, 14, 6265);
    			attr_dev(input5, "type", "checkbox");
    			attr_dev(input5, "class", "form-checkbox text-cyan-us transition-all-4");
    			input5.checked = input5_checked_value = /*items*/ ctx[0][5] ? true : false;
    			add_location(input5, file$a, 173, 18, 7261);
    			attr_dev(span10, "class", "font-light");
    			add_location(span10, file$a, 179, 20, 7599);
    			attr_dev(span11, "class", span11_class_value = "" + ((/*items*/ ctx[0][5] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"));
    			add_location(span11, file$a, 178, 18, 7507);
    			attr_dev(label5, "class", label5_class_value = "" + ((/*items*/ ctx[0][5] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label5, file$a, 172, 16, 7156);
    			attr_dev(div9, "class", "task");
    			add_location(div9, file$a, 171, 14, 7121);
    			attr_dev(div10, "class", "sm:leading-snug leading-tight");
    			add_location(div10, file$a, 135, 12, 5346);
    			attr_dev(div11, "class", "border-1 rounded p-3 shadow mb-1 bg-white");
    			add_location(div11, file$a, 130, 10, 5181);
    			attr_dev(div12, "class", "h-64 overflow-y-auto");
    			add_location(div12, file$a, 68, 8, 2425);
    			add_location(div13, file$a, 61, 6, 2250);
    			attr_dev(div14, "class", "shadow-md rounded p-3 bg-white-us z-10");
    			add_location(div14, file$a, 59, 4, 2190);
    			attr_dev(div15, "class", "max-w-5xl");
    			add_location(div15, file$a, 58, 2, 2162);
    			attr_dev(main, "class", "flex flex-col h-screen justify-center items-center p-3 bg-black-us");
    			add_location(main, file$a, 52, 0, 1997);

    			dispose = [
    				listen_dev(input0, "click", /*click_handler*/ ctx[9], false, false, false),
    				listen_dev(input1, "click", /*click_handler_1*/ ctx[10], false, false, false),
    				listen_dev(input2, "click", /*click_handler_2*/ ctx[11], false, false, false),
    				listen_dev(input3, "click", /*click_handler_3*/ ctx[12], false, false, false),
    				listen_dev(input4, "click", /*click_handler_4*/ ctx[13], false, false, false),
    				listen_dev(input5, "click", /*click_handler_5*/ ctx[14], false, false, false)
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
    			append_dev(main, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			mount_component(weekinfo, div13, null);
    			append_dev(div13, t2);
    			mount_component(progressbar, div13, null);
    			append_dev(div13, t3);
    			mount_component(completedtasks, div13, null);
    			append_dev(div13, t4);
    			append_dev(div13, div12);
    			append_dev(div12, div5);
    			append_dev(div5, div0);
    			mount_component(nodetag, div0, null);
    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t6);
    			append_dev(label0, span1);
    			append_dev(span1, span0);
    			append_dev(span1, t8);
    			mount_component(tasklink0, span1, null);
    			append_dev(span1, t9);
    			append_dev(div4, t10);
    			append_dev(div4, div2);
    			append_dev(div2, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t11);
    			append_dev(label1, span3);
    			append_dev(span3, span2);
    			append_dev(span3, t13);
    			mount_component(tasklink1, span3, null);
    			append_dev(span3, t14);
    			append_dev(div4, t15);
    			append_dev(div4, div3);
    			append_dev(div3, label2);
    			append_dev(label2, input2);
    			append_dev(label2, t16);
    			append_dev(label2, span5);
    			append_dev(span5, span4);
    			append_dev(span5, t18);
    			mount_component(tasklink2, span5, null);
    			append_dev(span5, t19);
    			append_dev(div12, t20);
    			append_dev(div12, div11);
    			append_dev(div11, div6);
    			mount_component(expresstag, div6, null);
    			append_dev(div11, t21);
    			append_dev(div11, div10);
    			append_dev(div10, div7);
    			append_dev(div7, label3);
    			append_dev(label3, input3);
    			append_dev(label3, t22);
    			append_dev(label3, span7);
    			append_dev(span7, span6);
    			append_dev(span7, t24);
    			mount_component(tasklink3, span7, null);
    			append_dev(span7, t25);
    			append_dev(div10, t26);
    			append_dev(div10, div8);
    			append_dev(div8, label4);
    			append_dev(label4, input4);
    			append_dev(label4, t27);
    			append_dev(label4, span9);
    			append_dev(span9, span8);
    			append_dev(span9, t29);
    			mount_component(tasklink4, span9, null);
    			append_dev(span9, t30);
    			append_dev(div10, t31);
    			append_dev(div10, div9);
    			append_dev(div9, label5);
    			append_dev(label5, input5);
    			append_dev(label5, t32);
    			append_dev(label5, span11);
    			append_dev(span11, span10);
    			append_dev(span11, t34);
    			mount_component(tasklink5, span11, null);
    			append_dev(span11, t35);
    			append_dev(div15, t36);
    			mount_component(referenceslink, div15, null);
    			append_dev(div15, t37);
    			mount_component(references, div15, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const weekinfo_changes = {};
    			if (dirty[0] & /*completedPercentage*/ 8) weekinfo_changes.completedPercentage = /*completedPercentage*/ ctx[3];
    			if (dirty[0] & /*nextWeek*/ 2) weekinfo_changes.nextWeek = /*nextWeek*/ ctx[1];
    			weekinfo.$set(weekinfo_changes);
    			const progressbar_changes = {};
    			if (dirty[0] & /*completedPercentage*/ 8) progressbar_changes.completedPercentage = /*completedPercentage*/ ctx[3];
    			progressbar.$set(progressbar_changes);
    			const completedtasks_changes = {};
    			if (dirty[0] & /*items*/ 1) completedtasks_changes.items = /*items*/ ctx[0];
    			completedtasks.$set(completedtasks_changes);

    			if (!current || dirty[0] & /*items*/ 1 && input0_checked_value !== (input0_checked_value = /*items*/ ctx[0][0] ? true : false)) {
    				prop_dev(input0, "checked", input0_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span1_class_value !== (span1_class_value = "" + ((/*items*/ ctx[0][0] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label0_class_value !== (label0_class_value = "" + ((/*items*/ ctx[0][0] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label0, "class", label0_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input1_checked_value !== (input1_checked_value = /*items*/ ctx[0][1] ? true : false)) {
    				prop_dev(input1, "checked", input1_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span3_class_value !== (span3_class_value = "" + ((/*items*/ ctx[0][1] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span3, "class", span3_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label1_class_value !== (label1_class_value = "" + ((/*items*/ ctx[0][1] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label1, "class", label1_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input2_checked_value !== (input2_checked_value = /*items*/ ctx[0][2] ? true : false)) {
    				prop_dev(input2, "checked", input2_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span5_class_value !== (span5_class_value = "" + ((/*items*/ ctx[0][2] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span5, "class", span5_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label2_class_value !== (label2_class_value = "" + ((/*items*/ ctx[0][2] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label2, "class", label2_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input3_checked_value !== (input3_checked_value = /*items*/ ctx[0][3] ? true : false)) {
    				prop_dev(input3, "checked", input3_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span7_class_value !== (span7_class_value = "" + ((/*items*/ ctx[0][3] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span7, "class", span7_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label3_class_value !== (label3_class_value = "" + ((/*items*/ ctx[0][3] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label3, "class", label3_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input4_checked_value !== (input4_checked_value = /*items*/ ctx[0][4] ? true : false)) {
    				prop_dev(input4, "checked", input4_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span9_class_value !== (span9_class_value = "" + ((/*items*/ ctx[0][4] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span9, "class", span9_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label4_class_value !== (label4_class_value = "" + ((/*items*/ ctx[0][4] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label4, "class", label4_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && input5_checked_value !== (input5_checked_value = /*items*/ ctx[0][5] ? true : false)) {
    				prop_dev(input5, "checked", input5_checked_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && span11_class_value !== (span11_class_value = "" + ((/*items*/ ctx[0][5] ? "opacity-50" : "") + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span11, "class", span11_class_value);
    			}

    			if (!current || dirty[0] & /*items*/ 1 && label5_class_value !== (label5_class_value = "" + ((/*items*/ ctx[0][5] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label5, "class", label5_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(title.$$.fragment, local);
    			transition_in(weekinfo.$$.fragment, local);
    			transition_in(progressbar.$$.fragment, local);
    			transition_in(completedtasks.$$.fragment, local);
    			transition_in(nodetag.$$.fragment, local);
    			transition_in(tasklink0.$$.fragment, local);
    			transition_in(tasklink1.$$.fragment, local);
    			transition_in(tasklink2.$$.fragment, local);
    			transition_in(expresstag.$$.fragment, local);
    			transition_in(tasklink3.$$.fragment, local);
    			transition_in(tasklink4.$$.fragment, local);
    			transition_in(tasklink5.$$.fragment, local);
    			transition_in(referenceslink.$$.fragment, local);
    			transition_in(references.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(title.$$.fragment, local);
    			transition_out(weekinfo.$$.fragment, local);
    			transition_out(progressbar.$$.fragment, local);
    			transition_out(completedtasks.$$.fragment, local);
    			transition_out(nodetag.$$.fragment, local);
    			transition_out(tasklink0.$$.fragment, local);
    			transition_out(tasklink1.$$.fragment, local);
    			transition_out(tasklink2.$$.fragment, local);
    			transition_out(expresstag.$$.fragment, local);
    			transition_out(tasklink3.$$.fragment, local);
    			transition_out(tasklink4.$$.fragment, local);
    			transition_out(tasklink5.$$.fragment, local);
    			transition_out(referenceslink.$$.fragment, local);
    			transition_out(references.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(title);
    			destroy_component(weekinfo);
    			destroy_component(progressbar);
    			destroy_component(completedtasks);
    			destroy_component(nodetag);
    			destroy_component(tasklink0);
    			destroy_component(tasklink1);
    			destroy_component(tasklink2);
    			destroy_component(expresstag);
    			destroy_component(tasklink3);
    			destroy_component(tasklink4);
    			destroy_component(tasklink5);
    			destroy_component(referenceslink);
    			destroy_component(references);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const LOCAL_STORAGE_ITEMS_KEY = "items";
    const LOCAL_STORAGE_COMPLETED_KEY = "completed";

    function instance$5($$self, $$props, $$invalidate) {
    	let { nextWeek } = $$props;
    	const keys = [LOCAL_STORAGE_ITEMS_KEY, LOCAL_STORAGE_COMPLETED_KEY];
    	let { items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) || new Array(6).fill(0) } = $$props;
    	let taskPercentage = parseFloat((100 / items.length).toFixed(2));
    	let completedPercentage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPLETED_KEY)) || 0;

    	function updateItems(index) {
    		const currentValue = items[index];
    		$$invalidate(0, items[index] = 1 - currentValue, items);
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

    	const writable_props = ["nextWeek", "items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => handleClick(0);
    	const click_handler_1 = () => handleClick(1);
    	const click_handler_2 = () => handleClick(2);
    	const click_handler_3 = () => handleClick(3);
    	const click_handler_4 = () => handleClick(4);
    	const click_handler_5 = () => handleClick(5);

    	$$self.$set = $$props => {
    		if ("nextWeek" in $$props) $$invalidate(1, nextWeek = $$props.nextWeek);
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => {
    		return {
    			nextWeek,
    			items,
    			taskPercentage,
    			completedPercentage
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("nextWeek" in $$props) $$invalidate(1, nextWeek = $$props.nextWeek);
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("taskPercentage" in $$props) taskPercentage = $$props.taskPercentage;
    		if ("completedPercentage" in $$props) $$invalidate(3, completedPercentage = $$props.completedPercentage);
    	};

    	return [
    		items,
    		nextWeek,
    		handleClick,
    		completedPercentage,
    		keys,
    		taskPercentage,
    		updateItems,
    		addCompletedPercentage,
    		substractCompletedPercentage,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$a, safe_not_equal, { nextWeek: 1, items: 0, handleClick: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*nextWeek*/ ctx[1] === undefined && !("nextWeek" in props)) {
    			console.warn("<App> was created without expected prop 'nextWeek'");
    		}
    	}

    	get nextWeek() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nextWeek(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get items() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleClick() {
    		return this.$$.ctx[2];
    	}

    	set handleClick(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        nextWeek: new Date('12/23/2019, 18:00'),
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
