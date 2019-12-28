
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
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

    /* src/components/Navbar.svelte generated by Svelte v3.16.4 */

    const file = "src/components/Navbar.svelte";

    function create_fragment(ctx) {
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
    			add_location(span0, file, 3, 6, 276);
    			attr_dev(span1, "class", "blink font-normal text-cyan-us");
    			add_location(span1, file, 5, 6, 340);
    			attr_dev(p, "class", "font-montserrat font-medium");
    			add_location(p, file, 2, 4, 230);
    			attr_dev(a, "href", "https://undefinedschool.io");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener");
    			attr_dev(a, "class", "text-light-gray-us text-s");
    			add_location(a, file, 1, 2, 123);
    			attr_dev(div, "class", "bg-white-us fixed top-0 left-0 shadow-md p-2 w-full sm:text-right text-center sm:pr-4");
    			set_style(div, "height", "40px");
    			add_location(div, file, 0, 0, 0);
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/components/Title.svelte generated by Svelte v3.16.4 */

    const file$1 = "src/components/Title.svelte";

    function create_fragment$1(ctx) {
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
    			add_location(span, file$1, 7, 2, 191);
    			attr_dev(h1, "class", "mt-16 sm:mb-4 mb-6 leading-tight sm:text-3xl text-4xl text-white-us font-raleway text-center");
    			add_location(h1, file$1, 5, 0, 69);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
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
    		init(this, options, instance, create_fragment$1, safe_not_equal, { firstPart: 0, secondPart: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Title",
    			options,
    			id: create_fragment$1.name
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

    /* src/components/References.svelte generated by Svelte v3.16.4 */

    const file$2 = "src/components/References.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(a, file$2, 6, 6, 295);
    			attr_dev(div0, "class", "mb-4 flex justify-end");
    			add_location(div0, file$2, 5, 4, 253);
    			add_location(li0, file$2, 12, 8, 590);
    			add_location(li1, file$2, 13, 8, 630);
    			add_location(li2, file$2, 14, 8, 656);
    			add_location(li3, file$2, 15, 8, 683);
    			add_location(li4, file$2, 16, 8, 714);
    			add_location(li5, file$2, 17, 8, 748);
    			add_location(li6, file$2, 18, 8, 802);
    			add_location(li7, file$2, 19, 8, 831);
    			add_location(li8, file$2, 20, 8, 858);
    			attr_dev(ul, "class", "text-sm font-light list-none");
    			add_location(ul, file$2, 11, 6, 540);
    			add_location(div1, file$2, 10, 4, 528);
    			attr_dev(div2, "class", "max-w-xs p-3 rounded shadow absolute bg-white-us w-full top-50 left-50");
    			add_location(div2, file$2, 4, 2, 164);
    			attr_dev(div3, "id", "references");
    			attr_dev(div3, "class", "invisible modal-window top-0 right-0 bottom-0 left-0 opacity-0 fixed z-10 pointer-events-none transition-all-4\n  bg-black-us-80");
    			add_location(div3, file$2, 0, 0, 0);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class References extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "References",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/ReferencesLink.svelte generated by Svelte v3.16.4 */

    const file$3 = "src/components/ReferencesLink.svelte";

    function create_fragment$3(ctx) {
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
    			a1.textContent = "Ver clases";
    			attr_dev(a0, "href", "#references");
    			add_location(a0, file$3, 2, 4, 94);
    			attr_dev(span0, "class", "link");
    			add_location(span0, file$3, 1, 2, 70);
    			attr_dev(a1, "href", "https://trello.com/b/mUf0huXz/undefined-school");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noopener");
    			add_location(a1, file$3, 6, 4, 184);
    			attr_dev(span1, "class", "link font-medium");
    			add_location(span1, file$3, 5, 2, 148);
    			attr_dev(div, "class", "font-light text-xs text-right p-3 -mt-2 text-white-us");
    			add_location(div, file$3, 0, 0, 0);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class ReferencesLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ReferencesLink",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Tags/ExpressTag.svelte generated by Svelte v3.16.4 */

    const file$4 = "src/components/Tags/ExpressTag.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Express";
    			attr_dev(span, "class", "inline-block rounded px-2 py-1 text-xs text-gray-444 bg-gray-eee font-semibold opacity-75");
    			add_location(span, file$4, 1, 2, 33);
    			attr_dev(div, "class", "-mt-1 -mr-1 mb-4");
    			add_location(div, file$4, 0, 0, 0);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class ExpressTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExpressTag",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Tags/MiscTag.svelte generated by Svelte v3.16.4 */

    const file$5 = "src/components/Tags/MiscTag.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Misc";
    			attr_dev(span, "class", "inline-block rounded px-2 py-1 text-xs text-teal-600 bg-teal-100 font-semibold opacity-75");
    			add_location(span, file$5, 1, 2, 33);
    			attr_dev(div, "class", "-mt-1 -mr-1 mb-4");
    			add_location(div, file$5, 0, 0, 0);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class MiscTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MiscTag",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Tags/CSSTag.svelte generated by Svelte v3.16.4 */

    const file$6 = "src/components/Tags/CSSTag.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "CSS";
    			attr_dev(span, "class", "inline-block rounded px-2 py-1 text-xs text-blue-600 bg-blue-200 font-semibold opacity-75");
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

    class CSSTag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CSSTag",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/TaskLink.svelte generated by Svelte v3.16.4 */

    const file$7 = "src/components/TaskLink.svelte";

    function create_fragment$7(ctx) {
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
    			add_location(a, file$7, 5, 0, 57);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$1, create_fragment$7, safe_not_equal, { name: 0, src: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TaskLink",
    			options,
    			id: create_fragment$7.name
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

    /* src/components/WeekInfo.svelte generated by Svelte v3.16.4 */

    const file$8 = "src/components/WeekInfo.svelte";

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
    			add_location(span, file$8, 49, 8, 1463);
    			attr_dev(p, "class", "text-teal-600");
    			add_location(p, file$8, 47, 6, 1404);
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
    			add_location(span, file$8, 43, 8, 1286);
    			attr_dev(p, "class", "text-red-500");
    			add_location(p, file$8, 41, 6, 1236);
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
    			add_location(span, file$8, 37, 8, 1094);
    			add_location(p, file$8, 35, 6, 1064);
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

    // (30:4) {#if Math.round(completedPercentage) === 100 && daysRemaining > 0}
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
    			add_location(span, file$8, 31, 8, 945);
    			add_location(p, file$8, 30, 6, 933);
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
    		source: "(30:4) {#if Math.round(completedPercentage) === 100 && daysRemaining > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div;
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let p1;
    	let show_if;

    	function select_block_type(ctx, dirty) {
    		if (show_if == null || dirty[0] & /*completedPercentage, daysRemaining*/ 3) show_if = !!(Math.round(/*completedPercentage*/ ctx[0]) === 100 && /*daysRemaining*/ ctx[1] > 0);
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
    			add_location(p0, file$8, 23, 2, 583);
    			attr_dev(p1, "class", "font-light text-sm text-light-gray-us");
    			add_location(p1, file$8, 28, 2, 806);
    			add_location(div, file$8, 22, 0, 575);
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
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getDaysRemainingToNextWeek(today, dueDate) {
    	const diffTime = dueDate - today;
    	const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    	return remainingDays;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { dueDate } = $$props;
    	let { completedPercentage } = $$props;
    	let { isCurrentWeek = false } = $$props;
    	const today = new Date().setHours(18);
    	let daysRemaining = getDaysRemainingToNextWeek(today, dueDate);

    	setInterval(
    		() => {
    			$$invalidate(1, daysRemaining = getDaysRemainingToNextWeek(today, dueDate));
    		},
    		1000 * 60
    	);

    	const writable_props = ["dueDate", "completedPercentage", "isCurrentWeek"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WeekInfo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("dueDate" in $$props) $$invalidate(3, dueDate = $$props.dueDate);
    		if ("completedPercentage" in $$props) $$invalidate(0, completedPercentage = $$props.completedPercentage);
    		if ("isCurrentWeek" in $$props) $$invalidate(4, isCurrentWeek = $$props.isCurrentWeek);
    	};

    	$$self.$capture_state = () => {
    		return {
    			dueDate,
    			completedPercentage,
    			isCurrentWeek,
    			daysRemaining,
    			weekTitle
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("dueDate" in $$props) $$invalidate(3, dueDate = $$props.dueDate);
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

    	return [completedPercentage, daysRemaining, weekTitle, dueDate, isCurrentWeek];
    }

    class WeekInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$8, safe_not_equal, {
    			dueDate: 3,
    			completedPercentage: 0,
    			isCurrentWeek: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WeekInfo",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*dueDate*/ ctx[3] === undefined && !("dueDate" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'dueDate'");
    		}

    		if (/*completedPercentage*/ ctx[0] === undefined && !("completedPercentage" in props)) {
    			console.warn("<WeekInfo> was created without expected prop 'completedPercentage'");
    		}
    	}

    	get dueDate() {
    		throw new Error("<WeekInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dueDate(value) {
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

    /* src/components/ProgressBar.svelte generated by Svelte v3.16.4 */

    const file$9 = "src/components/ProgressBar.svelte";

    function create_fragment$9(ctx) {
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
    			add_location(div0, file$9, 12, 2, 564);
    			attr_dev(div1, "class", div1_class_value = "bg-gray-200 mt-2 mb-8 mb-0 text-xl " + /*fullBar*/ ctx[1] + " text-center rounded-lg");
    			add_location(div1, file$9, 11, 0, 480);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$9, safe_not_equal, { completedPercentage: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProgressBar",
    			options,
    			id: create_fragment$9.name
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

    /* src/components/CompletedTasks.svelte generated by Svelte v3.16.4 */

    const file$a = "src/components/CompletedTasks.svelte";

    function create_fragment$a(ctx) {
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
    			add_location(span0, file$a, 8, 4, 173);
    			attr_dev(span1, "class", "opacity-75");
    			add_location(span1, file$a, 9, 4, 237);
    			attr_dev(p, "class", "text-light-gray-us font-light text-xs mb-1");
    			add_location(p, file$a, 7, 2, 114);
    			add_location(div, file$a, 6, 0, 106);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$a, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CompletedTasks",
    			options,
    			id: create_fragment$a.name
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

    /* src/components/Task.svelte generated by Svelte v3.16.4 */
    const file$b = "src/components/Task.svelte";

    function create_fragment$b(ctx) {
    	let div;
    	let label;
    	let input;
    	let t0;
    	let span1;
    	let span0;
    	let t1;
    	let t2;
    	let span1_class_value;
    	let label_class_value;
    	let current;
    	let dispose;

    	const tasklink = new TaskLink({
    			props: {
    				name: /*taskName*/ ctx[3],
    				src: /*taskSrc*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			span1 = element("span");
    			span0 = element("span");
    			t1 = text(/*taskPre*/ ctx[2]);
    			t2 = space();
    			create_component(tasklink.$$.fragment);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "form-checkbox text-cyan-us transition-all-4");
    			input.checked = /*_isChecked*/ ctx[5];
    			add_location(input, file$b, 15, 4, 386);
    			attr_dev(span0, "class", "font-light");
    			add_location(span0, file$b, 21, 6, 599);
    			attr_dev(span1, "class", span1_class_value = "" + (/*grayedOut*/ ctx[6] + " ml-2 text-sm text-gray-us"));
    			add_location(span1, file$b, 20, 4, 540);
    			attr_dev(label, "class", label_class_value = "" + ((/*isChecked*/ ctx[0] ? "line-through text-gray-us" : "") + " inline-flex items-center"));
    			add_location(label, file$b, 14, 2, 294);
    			add_location(div, file$b, 13, 0, 286);
    			dispose = listen_dev(input, "click", /*handleClick*/ ctx[1], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, input);
    			append_dev(label, t0);
    			append_dev(label, span1);
    			append_dev(span1, span0);
    			append_dev(span0, t1);
    			append_dev(span1, t2);
    			mount_component(tasklink, span1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*_isChecked*/ 32) {
    				prop_dev(input, "checked", /*_isChecked*/ ctx[5]);
    			}

    			if (!current || dirty[0] & /*taskPre*/ 4) set_data_dev(t1, /*taskPre*/ ctx[2]);
    			const tasklink_changes = {};
    			if (dirty[0] & /*taskName*/ 8) tasklink_changes.name = /*taskName*/ ctx[3];
    			if (dirty[0] & /*taskSrc*/ 16) tasklink_changes.src = /*taskSrc*/ ctx[4];
    			tasklink.$set(tasklink_changes);

    			if (!current || dirty[0] & /*grayedOut*/ 64 && span1_class_value !== (span1_class_value = "" + (/*grayedOut*/ ctx[6] + " ml-2 text-sm text-gray-us"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (!current || dirty[0] & /*isChecked*/ 1 && label_class_value !== (label_class_value = "" + ((/*isChecked*/ ctx[0] ? "line-through text-gray-us" : "") + " inline-flex items-center"))) {
    				attr_dev(label, "class", label_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tasklink.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tasklink.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(tasklink);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { isChecked } = $$props;
    	let { handleClick } = $$props;
    	let { taskPre = "" } = $$props;
    	let { taskName } = $$props;
    	let { taskSrc = "#" } = $$props;
    	const writable_props = ["isChecked", "handleClick", "taskPre", "taskName", "taskSrc"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Task> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("isChecked" in $$props) $$invalidate(0, isChecked = $$props.isChecked);
    		if ("handleClick" in $$props) $$invalidate(1, handleClick = $$props.handleClick);
    		if ("taskPre" in $$props) $$invalidate(2, taskPre = $$props.taskPre);
    		if ("taskName" in $$props) $$invalidate(3, taskName = $$props.taskName);
    		if ("taskSrc" in $$props) $$invalidate(4, taskSrc = $$props.taskSrc);
    	};

    	$$self.$capture_state = () => {
    		return {
    			isChecked,
    			handleClick,
    			taskPre,
    			taskName,
    			taskSrc,
    			_isChecked,
    			grayedOut
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("isChecked" in $$props) $$invalidate(0, isChecked = $$props.isChecked);
    		if ("handleClick" in $$props) $$invalidate(1, handleClick = $$props.handleClick);
    		if ("taskPre" in $$props) $$invalidate(2, taskPre = $$props.taskPre);
    		if ("taskName" in $$props) $$invalidate(3, taskName = $$props.taskName);
    		if ("taskSrc" in $$props) $$invalidate(4, taskSrc = $$props.taskSrc);
    		if ("_isChecked" in $$props) $$invalidate(5, _isChecked = $$props._isChecked);
    		if ("grayedOut" in $$props) $$invalidate(6, grayedOut = $$props.grayedOut);
    	};

    	let _isChecked;
    	let grayedOut;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*isChecked*/ 1) {
    			 $$invalidate(5, _isChecked = isChecked ? true : false);
    		}

    		if ($$self.$$.dirty[0] & /*isChecked*/ 1) {
    			 $$invalidate(6, grayedOut = isChecked ? "opacity-50" : "");
    		}
    	};

    	return [isChecked, handleClick, taskPre, taskName, taskSrc, _isChecked, grayedOut];
    }

    class Task extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$b, safe_not_equal, {
    			isChecked: 0,
    			handleClick: 1,
    			taskPre: 2,
    			taskName: 3,
    			taskSrc: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Task",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*isChecked*/ ctx[0] === undefined && !("isChecked" in props)) {
    			console.warn("<Task> was created without expected prop 'isChecked'");
    		}

    		if (/*handleClick*/ ctx[1] === undefined && !("handleClick" in props)) {
    			console.warn("<Task> was created without expected prop 'handleClick'");
    		}

    		if (/*taskName*/ ctx[3] === undefined && !("taskName" in props)) {
    			console.warn("<Task> was created without expected prop 'taskName'");
    		}
    	}

    	get isChecked() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isChecked(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleClick() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleClick(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get taskPre() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set taskPre(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get taskName() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set taskName(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get taskSrc() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set taskSrc(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CurrentWeek.svelte generated by Svelte v3.16.4 */
    const file$c = "src/components/CurrentWeek.svelte";

    function create_fragment$c(ctx) {
    	let div15;
    	let t0;
    	let t1;
    	let t2;
    	let div14;
    	let div4;
    	let div0;
    	let t3;
    	let div3;
    	let div1;
    	let t4;
    	let div2;
    	let t5;
    	let div9;
    	let div5;
    	let t6;
    	let div8;
    	let div6;
    	let t7;
    	let div7;
    	let t8;
    	let div13;
    	let div10;
    	let t9;
    	let div12;
    	let div11;
    	let current;

    	const weekinfo = new WeekInfo({
    			props: {
    				dueDate: /*currentWeek*/ ctx[0],
    				completedPercentage: /*currentCompletedPercentage*/ ctx[2],
    				isCurrentWeek: true
    			},
    			$$inline: true
    		});

    	const progressbar = new ProgressBar({
    			props: {
    				completedPercentage: /*currentCompletedPercentage*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const completedtasks = new CompletedTasks({
    			props: { items: /*currentWeekProgress*/ ctx[1] },
    			$$inline: true
    		});

    	const expresstag = new ExpressTag({ $$inline: true });

    	const task0 = new Task({
    			props: {
    				isChecked: /*currentWeekProgress*/ ctx[1][0],
    				handleClick: /*func*/ ctx[8],
    				taskPre: "Completar el capítulo",
    				taskName: "Express Router 🏃",
    				taskSrc: "https://www.rithmschool.com/courses/node-express-fundamentals/express-router"
    			},
    			$$inline: true
    		});

    	const task1 = new Task({
    			props: {
    				isChecked: /*currentWeekProgress*/ ctx[1][1],
    				handleClick: /*func_1*/ ctx[9],
    				taskPre: "Completar el tutorial",
    				taskName: "ExpressJS Project Structure 🏃",
    				taskSrc: "https://www.brianemilius.com/expressjs-structure/"
    			},
    			$$inline: true
    		});

    	const misctag = new MiscTag({ $$inline: true });

    	const task2 = new Task({
    			props: {
    				isChecked: /*currentWeekProgress*/ ctx[1][2],
    				handleClick: /*func_2*/ ctx[10],
    				taskName: "Local Node Environment Variables with DotEnv 🏃",
    				taskSrc: "https://www.youtube.com/watch?v=i14ekt_DAt0"
    			},
    			$$inline: true
    		});

    	const task3 = new Task({
    			props: {
    				isChecked: /*currentWeekProgress*/ ctx[1][3],
    				handleClick: /*func_3*/ ctx[11],
    				taskName: "How to Improve Your Developer Resume Bullets 🏃",
    				taskSrc: "https://dev.to/stetsenko_me/how-to-improve-your-junior-developer-resume-bullets-34cm"
    			},
    			$$inline: true
    		});

    	const csstag = new CSSTag({ $$inline: true });

    	const task4 = new Task({
    			props: {
    				isChecked: /*currentWeekProgress*/ ctx[1][4],
    				handleClick: /*func_4*/ ctx[12],
    				taskName: "Next-generation web styling (Chrome Dev Summit 2019) 📹",
    				taskSrc: "https://www.youtube.com/watch?v=-oyeaIirVC0"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div15 = element("div");
    			create_component(weekinfo.$$.fragment);
    			t0 = space();
    			create_component(progressbar.$$.fragment);
    			t1 = space();
    			create_component(completedtasks.$$.fragment);
    			t2 = space();
    			div14 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			create_component(expresstag.$$.fragment);
    			t3 = space();
    			div3 = element("div");
    			div1 = element("div");
    			create_component(task0.$$.fragment);
    			t4 = space();
    			div2 = element("div");
    			create_component(task1.$$.fragment);
    			t5 = space();
    			div9 = element("div");
    			div5 = element("div");
    			create_component(misctag.$$.fragment);
    			t6 = space();
    			div8 = element("div");
    			div6 = element("div");
    			create_component(task2.$$.fragment);
    			t7 = space();
    			div7 = element("div");
    			create_component(task3.$$.fragment);
    			t8 = space();
    			div13 = element("div");
    			div10 = element("div");
    			create_component(csstag.$$.fragment);
    			t9 = space();
    			div12 = element("div");
    			div11 = element("div");
    			create_component(task4.$$.fragment);
    			attr_dev(div0, "class", "flex justify-end mb-2");
    			add_location(div0, file$c, 50, 6, 1936);
    			attr_dev(div1, "class", "task mb-3");
    			add_location(div1, file$c, 55, 8, 2067);
    			attr_dev(div2, "class", "task mb-3");
    			add_location(div2, file$c, 64, 8, 2428);
    			attr_dev(div3, "class", "sm:leading-snug leading-tight");
    			add_location(div3, file$c, 54, 6, 2015);
    			attr_dev(div4, "class", "border-1 rounded p-3 shadow mb-3 bg-white");
    			add_location(div4, file$c, 49, 4, 1874);
    			attr_dev(div5, "class", "flex justify-end mb-2");
    			add_location(div5, file$c, 76, 6, 2857);
    			attr_dev(div6, "class", "task mb-3");
    			add_location(div6, file$c, 81, 8, 2985);
    			attr_dev(div7, "class", "task mb-3");
    			add_location(div7, file$c, 89, 8, 3295);
    			attr_dev(div8, "class", "sm:leading-snug leading-tight");
    			add_location(div8, file$c, 80, 6, 2933);
    			attr_dev(div9, "class", "border-1 rounded p-3 shadow mb-3 bg-white");
    			add_location(div9, file$c, 75, 4, 2795);
    			attr_dev(div10, "class", "flex justify-end mb-2");
    			add_location(div10, file$c, 100, 6, 3728);
    			attr_dev(div11, "class", "task mb-3");
    			add_location(div11, file$c, 105, 8, 3855);
    			attr_dev(div12, "class", "sm:leading-snug leading-tight");
    			add_location(div12, file$c, 104, 6, 3803);
    			attr_dev(div13, "class", "border-1 rounded p-3 shadow mb-1 bg-white");
    			add_location(div13, file$c, 99, 4, 3666);
    			attr_dev(div14, "class", "max-h-64 overflow-y-auto");
    			add_location(div14, file$c, 47, 2, 1830);
    			add_location(div15, file$c, 40, 0, 1586);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			mount_component(weekinfo, div15, null);
    			append_dev(div15, t0);
    			mount_component(progressbar, div15, null);
    			append_dev(div15, t1);
    			mount_component(completedtasks, div15, null);
    			append_dev(div15, t2);
    			append_dev(div15, div14);
    			append_dev(div14, div4);
    			append_dev(div4, div0);
    			mount_component(expresstag, div0, null);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			mount_component(task0, div1, null);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			mount_component(task1, div2, null);
    			append_dev(div14, t5);
    			append_dev(div14, div9);
    			append_dev(div9, div5);
    			mount_component(misctag, div5, null);
    			append_dev(div9, t6);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			mount_component(task2, div6, null);
    			append_dev(div8, t7);
    			append_dev(div8, div7);
    			mount_component(task3, div7, null);
    			append_dev(div14, t8);
    			append_dev(div14, div13);
    			append_dev(div13, div10);
    			mount_component(csstag, div10, null);
    			append_dev(div13, t9);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			mount_component(task4, div11, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const weekinfo_changes = {};
    			if (dirty[0] & /*currentWeek*/ 1) weekinfo_changes.dueDate = /*currentWeek*/ ctx[0];
    			if (dirty[0] & /*currentCompletedPercentage*/ 4) weekinfo_changes.completedPercentage = /*currentCompletedPercentage*/ ctx[2];
    			weekinfo.$set(weekinfo_changes);
    			const progressbar_changes = {};
    			if (dirty[0] & /*currentCompletedPercentage*/ 4) progressbar_changes.completedPercentage = /*currentCompletedPercentage*/ ctx[2];
    			progressbar.$set(progressbar_changes);
    			const completedtasks_changes = {};
    			if (dirty[0] & /*currentWeekProgress*/ 2) completedtasks_changes.items = /*currentWeekProgress*/ ctx[1];
    			completedtasks.$set(completedtasks_changes);
    			const task0_changes = {};
    			if (dirty[0] & /*currentWeekProgress*/ 2) task0_changes.isChecked = /*currentWeekProgress*/ ctx[1][0];
    			task0.$set(task0_changes);
    			const task1_changes = {};
    			if (dirty[0] & /*currentWeekProgress*/ 2) task1_changes.isChecked = /*currentWeekProgress*/ ctx[1][1];
    			task1.$set(task1_changes);
    			const task2_changes = {};
    			if (dirty[0] & /*currentWeekProgress*/ 2) task2_changes.isChecked = /*currentWeekProgress*/ ctx[1][2];
    			task2.$set(task2_changes);
    			const task3_changes = {};
    			if (dirty[0] & /*currentWeekProgress*/ 2) task3_changes.isChecked = /*currentWeekProgress*/ ctx[1][3];
    			task3.$set(task3_changes);
    			const task4_changes = {};
    			if (dirty[0] & /*currentWeekProgress*/ 2) task4_changes.isChecked = /*currentWeekProgress*/ ctx[1][4];
    			task4.$set(task4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(weekinfo.$$.fragment, local);
    			transition_in(progressbar.$$.fragment, local);
    			transition_in(completedtasks.$$.fragment, local);
    			transition_in(expresstag.$$.fragment, local);
    			transition_in(task0.$$.fragment, local);
    			transition_in(task1.$$.fragment, local);
    			transition_in(misctag.$$.fragment, local);
    			transition_in(task2.$$.fragment, local);
    			transition_in(task3.$$.fragment, local);
    			transition_in(csstag.$$.fragment, local);
    			transition_in(task4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(weekinfo.$$.fragment, local);
    			transition_out(progressbar.$$.fragment, local);
    			transition_out(completedtasks.$$.fragment, local);
    			transition_out(expresstag.$$.fragment, local);
    			transition_out(task0.$$.fragment, local);
    			transition_out(task1.$$.fragment, local);
    			transition_out(misctag.$$.fragment, local);
    			transition_out(task2.$$.fragment, local);
    			transition_out(task3.$$.fragment, local);
    			transition_out(csstag.$$.fragment, local);
    			transition_out(task4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    			destroy_component(weekinfo);
    			destroy_component(progressbar);
    			destroy_component(completedtasks);
    			destroy_component(expresstag);
    			destroy_component(task0);
    			destroy_component(task1);
    			destroy_component(misctag);
    			destroy_component(task2);
    			destroy_component(task3);
    			destroy_component(csstag);
    			destroy_component(task4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const LS_CURRENT_WEEK_KEY = "currentWeekProgress";
    const LS_CURRENT_COMPLETED_KEY = "currentCompleted";

    function instance$6($$self, $$props, $$invalidate) {
    	let { currentWeek } = $$props;
    	const currentWeekProgress = JSON.parse(localStorage.getItem(LS_CURRENT_WEEK_KEY)) || new Array(5).fill(0);
    	const taskPercentage = parseFloat((100 / currentWeekProgress.length).toFixed(2));
    	let currentCompletedPercentage = JSON.parse(localStorage.getItem(LS_CURRENT_COMPLETED_KEY)) || 0;

    	function handleClick(index) {
    		updateItems(index);

    		currentWeekProgress[index]
    		? addCompletedPercentage()
    		: substractCompletedPercentage();
    	}

    	function updateItems(index) {
    		const currentValue = currentWeekProgress[index];
    		$$invalidate(1, currentWeekProgress[index] = 1 - currentValue, currentWeekProgress);
    		localStorage.setItem(LS_CURRENT_WEEK_KEY, JSON.stringify(currentWeekProgress));
    	}

    	function addCompletedPercentage() {
    		$$invalidate(2, currentCompletedPercentage += taskPercentage);
    		localStorage.setItem(LS_CURRENT_COMPLETED_KEY, JSON.stringify(currentCompletedPercentage));
    	}

    	function substractCompletedPercentage() {
    		$$invalidate(2, currentCompletedPercentage -= taskPercentage);
    		localStorage.setItem(LS_CURRENT_COMPLETED_KEY, JSON.stringify(currentCompletedPercentage));
    	}

    	const writable_props = ["currentWeek"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CurrentWeek> was created with unknown prop '${key}'`);
    	});

    	const func = () => handleClick(0);
    	const func_1 = () => handleClick(1);
    	const func_2 = () => handleClick(2);
    	const func_3 = () => handleClick(3);
    	const func_4 = () => handleClick(4);

    	$$self.$set = $$props => {
    		if ("currentWeek" in $$props) $$invalidate(0, currentWeek = $$props.currentWeek);
    	};

    	$$self.$capture_state = () => {
    		return { currentWeek, currentCompletedPercentage };
    	};

    	$$self.$inject_state = $$props => {
    		if ("currentWeek" in $$props) $$invalidate(0, currentWeek = $$props.currentWeek);
    		if ("currentCompletedPercentage" in $$props) $$invalidate(2, currentCompletedPercentage = $$props.currentCompletedPercentage);
    	};

    	return [
    		currentWeek,
    		currentWeekProgress,
    		currentCompletedPercentage,
    		handleClick,
    		taskPercentage,
    		updateItems,
    		addCompletedPercentage,
    		substractCompletedPercentage,
    		func,
    		func_1,
    		func_2,
    		func_3,
    		func_4
    	];
    }

    class CurrentWeek extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$c, safe_not_equal, { currentWeek: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CurrentWeek",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*currentWeek*/ ctx[0] === undefined && !("currentWeek" in props)) {
    			console.warn("<CurrentWeek> was created without expected prop 'currentWeek'");
    		}
    	}

    	get currentWeek() {
    		throw new Error("<CurrentWeek>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentWeek(value) {
    		throw new Error("<CurrentWeek>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/NextWeek.svelte generated by Svelte v3.16.4 */
    const file$d = "src/components/NextWeek.svelte";

    function create_fragment$d(ctx) {
    	let div7;
    	let t0;
    	let t1;
    	let t2;
    	let div6;
    	let div5;
    	let div0;
    	let t3;
    	let div4;
    	let div1;
    	let t4;
    	let div2;
    	let t5;
    	let div3;
    	let current;

    	const weekinfo = new WeekInfo({
    			props: {
    				dueDate: /*nextWeek*/ ctx[0],
    				completedPercentage: /*nextCompletedPercentage*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const progressbar = new ProgressBar({
    			props: {
    				completedPercentage: /*nextCompletedPercentage*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const completedtasks = new CompletedTasks({
    			props: { items: /*nextWeekProgress*/ ctx[1] },
    			$$inline: true
    		});

    	const misctag = new MiscTag({ $$inline: true });

    	const task0 = new Task({
    			props: {
    				isChecked: /*nextWeekProgress*/ ctx[1][0],
    				handleClick: /*func*/ ctx[8],
    				taskName: "101 Tips For Being A Great Programmer (& Human) 👫",
    				taskSrc: "https://dev.to/emmawedekind/101-tips-for-being-a-great-programmer-human-36nl"
    			},
    			$$inline: true
    		});

    	const task1 = new Task({
    			props: {
    				isChecked: /*nextWeekProgress*/ ctx[1][1],
    				handleClick: /*func_1*/ ctx[9],
    				taskPre: "Ver",
    				taskName: "LinkedIn Profile Top Tips 🏃",
    				taskSrc: "https://dev.to/exampro/700-web-developers-asked-me-to-give-them-linkedin-profile-feedback-and-these-are-my-5-top-tips-5382"
    			},
    			$$inline: true
    		});

    	const task2 = new Task({
    			props: {
    				isChecked: /*nextWeekProgress*/ ctx[1][2],
    				handleClick: /*func_2*/ ctx[10],
    				taskPre: "Llegar al",
    				taskName: "2020 ⭐️",
    				taskSrc: ""
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			create_component(weekinfo.$$.fragment);
    			t0 = space();
    			create_component(progressbar.$$.fragment);
    			t1 = space();
    			create_component(completedtasks.$$.fragment);
    			t2 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			create_component(misctag.$$.fragment);
    			t3 = space();
    			div4 = element("div");
    			div1 = element("div");
    			create_component(task0.$$.fragment);
    			t4 = space();
    			div2 = element("div");
    			create_component(task1.$$.fragment);
    			t5 = space();
    			div3 = element("div");
    			create_component(task2.$$.fragment);
    			attr_dev(div0, "class", "flex justify-end mb-2");
    			add_location(div0, file$d, 50, 6, 1838);
    			attr_dev(div1, "class", "task mb-3");
    			add_location(div1, file$d, 55, 8, 1966);
    			attr_dev(div2, "class", "task mb-3");
    			add_location(div2, file$d, 63, 8, 2309);
    			attr_dev(div3, "class", "task mb-3");
    			add_location(div3, file$d, 72, 8, 2706);
    			attr_dev(div4, "class", "sm:leading-snug leading-tight");
    			add_location(div4, file$d, 54, 6, 1914);
    			attr_dev(div5, "class", "border-1 rounded p-3 shadow mb-1 bg-white");
    			add_location(div5, file$d, 49, 4, 1776);
    			attr_dev(div6, "class", "max-h-64 overflow-y-auto");
    			add_location(div6, file$d, 47, 2, 1732);
    			add_location(div7, file$d, 40, 0, 1523);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			mount_component(weekinfo, div7, null);
    			append_dev(div7, t0);
    			mount_component(progressbar, div7, null);
    			append_dev(div7, t1);
    			mount_component(completedtasks, div7, null);
    			append_dev(div7, t2);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			mount_component(misctag, div0, null);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			mount_component(task0, div1, null);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			mount_component(task1, div2, null);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			mount_component(task2, div3, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const weekinfo_changes = {};
    			if (dirty[0] & /*nextWeek*/ 1) weekinfo_changes.dueDate = /*nextWeek*/ ctx[0];
    			if (dirty[0] & /*nextCompletedPercentage*/ 4) weekinfo_changes.completedPercentage = /*nextCompletedPercentage*/ ctx[2];
    			weekinfo.$set(weekinfo_changes);
    			const progressbar_changes = {};
    			if (dirty[0] & /*nextCompletedPercentage*/ 4) progressbar_changes.completedPercentage = /*nextCompletedPercentage*/ ctx[2];
    			progressbar.$set(progressbar_changes);
    			const completedtasks_changes = {};
    			if (dirty[0] & /*nextWeekProgress*/ 2) completedtasks_changes.items = /*nextWeekProgress*/ ctx[1];
    			completedtasks.$set(completedtasks_changes);
    			const task0_changes = {};
    			if (dirty[0] & /*nextWeekProgress*/ 2) task0_changes.isChecked = /*nextWeekProgress*/ ctx[1][0];
    			task0.$set(task0_changes);
    			const task1_changes = {};
    			if (dirty[0] & /*nextWeekProgress*/ 2) task1_changes.isChecked = /*nextWeekProgress*/ ctx[1][1];
    			task1.$set(task1_changes);
    			const task2_changes = {};
    			if (dirty[0] & /*nextWeekProgress*/ 2) task2_changes.isChecked = /*nextWeekProgress*/ ctx[1][2];
    			task2.$set(task2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(weekinfo.$$.fragment, local);
    			transition_in(progressbar.$$.fragment, local);
    			transition_in(completedtasks.$$.fragment, local);
    			transition_in(misctag.$$.fragment, local);
    			transition_in(task0.$$.fragment, local);
    			transition_in(task1.$$.fragment, local);
    			transition_in(task2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(weekinfo.$$.fragment, local);
    			transition_out(progressbar.$$.fragment, local);
    			transition_out(completedtasks.$$.fragment, local);
    			transition_out(misctag.$$.fragment, local);
    			transition_out(task0.$$.fragment, local);
    			transition_out(task1.$$.fragment, local);
    			transition_out(task2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			destroy_component(weekinfo);
    			destroy_component(progressbar);
    			destroy_component(completedtasks);
    			destroy_component(misctag);
    			destroy_component(task0);
    			destroy_component(task1);
    			destroy_component(task2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const LS_NEXT_WEEK_KEY = "nextWeekProgress";
    const LS_NEXT_COMPLETED_KEY = "nextCompleted";

    function instance$7($$self, $$props, $$invalidate) {
    	let { nextWeek } = $$props;
    	const nextWeekProgress = JSON.parse(localStorage.getItem(LS_NEXT_WEEK_KEY)) || new Array(3).fill(0);
    	const taskPercentage = parseFloat((100 / nextWeekProgress.length).toFixed(2));
    	let nextCompletedPercentage = JSON.parse(localStorage.getItem(LS_NEXT_COMPLETED_KEY)) || 0;

    	function handleClick(index) {
    		updateItems(index);

    		nextWeekProgress[index]
    		? addCompletedPercentage()
    		: substractCompletedPercentage();
    	}

    	function updateItems(index) {
    		const currentValue = nextWeekProgress[index];
    		$$invalidate(1, nextWeekProgress[index] = 1 - currentValue, nextWeekProgress);
    		localStorage.setItem(LS_NEXT_WEEK_KEY, JSON.stringify(nextWeekProgress));
    	}

    	function addCompletedPercentage() {
    		$$invalidate(2, nextCompletedPercentage += taskPercentage);
    		localStorage.setItem(LS_NEXT_COMPLETED_KEY, JSON.stringify(nextCompletedPercentage));
    	}

    	function substractCompletedPercentage() {
    		$$invalidate(2, nextCompletedPercentage -= taskPercentage);
    		localStorage.setItem(LS_NEXT_COMPLETED_KEY, JSON.stringify(nextCompletedPercentage));
    	}

    	const writable_props = ["nextWeek"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NextWeek> was created with unknown prop '${key}'`);
    	});

    	const func = () => handleClick(0);
    	const func_1 = () => handleClick(1);
    	const func_2 = () => handleClick(2);

    	$$self.$set = $$props => {
    		if ("nextWeek" in $$props) $$invalidate(0, nextWeek = $$props.nextWeek);
    	};

    	$$self.$capture_state = () => {
    		return { nextWeek, nextCompletedPercentage };
    	};

    	$$self.$inject_state = $$props => {
    		if ("nextWeek" in $$props) $$invalidate(0, nextWeek = $$props.nextWeek);
    		if ("nextCompletedPercentage" in $$props) $$invalidate(2, nextCompletedPercentage = $$props.nextCompletedPercentage);
    	};

    	return [
    		nextWeek,
    		nextWeekProgress,
    		nextCompletedPercentage,
    		handleClick,
    		taskPercentage,
    		updateItems,
    		addCompletedPercentage,
    		substractCompletedPercentage,
    		func,
    		func_1,
    		func_2
    	];
    }

    class NextWeek extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$d, safe_not_equal, { nextWeek: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NextWeek",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*nextWeek*/ ctx[0] === undefined && !("nextWeek" in props)) {
    			console.warn("<NextWeek> was created without expected prop 'nextWeek'");
    		}
    	}

    	get nextWeek() {
    		throw new Error("<NextWeek>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nextWeek(value) {
    		throw new Error("<NextWeek>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.4 */
    const file$e = "src/App.svelte";

    function create_fragment$e(ctx) {
    	let div5;
    	let t0;
    	let main;
    	let div4;
    	let t1;
    	let div2;
    	let div0;
    	let t2;
    	let div1;
    	let t3;
    	let div3;
    	let t4;
    	let current;
    	const navbar = new Navbar({ $$inline: true });
    	const title_spread_levels = [/*titleProps*/ ctx[2]];
    	let title_props = {};

    	for (let i = 0; i < title_spread_levels.length; i += 1) {
    		title_props = assign(title_props, title_spread_levels[i]);
    	}

    	const title = new Title({ props: title_props, $$inline: true });

    	const currentweek = new CurrentWeek({
    			props: { currentWeek: /*currentWeek*/ ctx[0] },
    			$$inline: true
    		});

    	const nextweek = new NextWeek({
    			props: { nextWeek: /*nextWeek*/ ctx[1] },
    			$$inline: true
    		});

    	const referenceslink = new ReferencesLink({ $$inline: true });
    	const references = new References({ $$inline: true });

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			main = element("main");
    			div4 = element("div");
    			create_component(title.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			create_component(currentweek.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			create_component(nextweek.$$.fragment);
    			t3 = space();
    			div3 = element("div");
    			create_component(referenceslink.$$.fragment);
    			t4 = space();
    			create_component(references.$$.fragment);
    			attr_dev(div0, "class", "sm:w-11/12 w-2/3 shadow-md rounded p-3 bg-white-us z-10 mr-3 flex-none");
    			add_location(div0, file$e, 34, 8, 797);
    			attr_dev(div1, "class", "sm:w-11/12 w-2/3 shadow-md rounded p-3 bg-white-us z-10 opacity-75 hover:opacity-100 flex-none");
    			add_location(div1, file$e, 38, 8, 946);
    			attr_dev(div2, "class", "flex overflow-x-auto");
    			add_location(div2, file$e, 33, 6, 754);
    			attr_dev(div3, "class", "ml-auto");
    			add_location(div3, file$e, 43, 6, 1124);
    			attr_dev(div4, "class", "container max-w-xxl flex flex-col justify-center items-center m-auto svelte-1gaxcj4");
    			add_location(div4, file$e, 29, 4, 631);
    			attr_dev(main, "class", "p-3");
    			add_location(main, file$e, 27, 2, 607);
    			attr_dev(div5, "class", "bg-black-us");
    			add_location(div5, file$e, 24, 0, 565);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			mount_component(navbar, div5, null);
    			append_dev(div5, t0);
    			append_dev(div5, main);
    			append_dev(main, div4);
    			mount_component(title, div4, null);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			mount_component(currentweek, div0, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			mount_component(nextweek, div1, null);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			mount_component(referenceslink, div3, null);
    			append_dev(div3, t4);
    			mount_component(references, div3, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const title_changes = (dirty[0] & /*titleProps*/ 4)
    			? get_spread_update(title_spread_levels, [get_spread_object(/*titleProps*/ ctx[2])])
    			: {};

    			title.$set(title_changes);
    			const currentweek_changes = {};
    			if (dirty[0] & /*currentWeek*/ 1) currentweek_changes.currentWeek = /*currentWeek*/ ctx[0];
    			currentweek.$set(currentweek_changes);
    			const nextweek_changes = {};
    			if (dirty[0] & /*nextWeek*/ 2) nextweek_changes.nextWeek = /*nextWeek*/ ctx[1];
    			nextweek.$set(nextweek_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(title.$$.fragment, local);
    			transition_in(currentweek.$$.fragment, local);
    			transition_in(nextweek.$$.fragment, local);
    			transition_in(referenceslink.$$.fragment, local);
    			transition_in(references.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(title.$$.fragment, local);
    			transition_out(currentweek.$$.fragment, local);
    			transition_out(nextweek.$$.fragment, local);
    			transition_out(referenceslink.$$.fragment, local);
    			transition_out(references.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(navbar);
    			destroy_component(title);
    			destroy_component(currentweek);
    			destroy_component(nextweek);
    			destroy_component(referenceslink);
    			destroy_component(references);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { currentWeek } = $$props;
    	let { nextWeek } = $$props;

    	const titleProps = {
    		firstPart: "Progreso",
    		secondPart: "semanal"
    	};

    	const writable_props = ["currentWeek", "nextWeek"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("currentWeek" in $$props) $$invalidate(0, currentWeek = $$props.currentWeek);
    		if ("nextWeek" in $$props) $$invalidate(1, nextWeek = $$props.nextWeek);
    	};

    	$$self.$capture_state = () => {
    		return { currentWeek, nextWeek };
    	};

    	$$self.$inject_state = $$props => {
    		if ("currentWeek" in $$props) $$invalidate(0, currentWeek = $$props.currentWeek);
    		if ("nextWeek" in $$props) $$invalidate(1, nextWeek = $$props.nextWeek);
    	};

    	return [currentWeek, nextWeek, titleProps];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$e, safe_not_equal, { currentWeek: 0, nextWeek: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*currentWeek*/ ctx[0] === undefined && !("currentWeek" in props)) {
    			console.warn("<App> was created without expected prop 'currentWeek'");
    		}

    		if (/*nextWeek*/ ctx[1] === undefined && !("nextWeek" in props)) {
    			console.warn("<App> was created without expected prop 'nextWeek'");
    		}
    	}

    	get currentWeek() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentWeek(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nextWeek() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nextWeek(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        currentWeek: new Date('12/30/2019, 18:00'),
        nextWeek: new Date('01/06/2020, 18:00'),
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
