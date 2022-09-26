import * as adapter from '@astrojs/vercel/serverless/entrypoint';
import { escape } from 'html-escaper';
/* empty css                           */import 'mime';
import 'kleur/colors';
import 'string-width';
import 'path-browserify';
import { compile } from 'path-to-regexp';

const ASTRO_VERSION = "1.2.3";
function createDeprecatedFetchContentFn() {
  return () => {
    throw new Error("Deprecated: Astro.fetchContent() has been replaced with Astro.glob().");
  };
}
function createAstroGlobFn() {
  const globHandler = (importMetaGlobResult, globValue) => {
    let allEntries = [...Object.values(importMetaGlobResult)];
    if (allEntries.length === 0) {
      throw new Error(`Astro.glob(${JSON.stringify(globValue())}) - no matches found.`);
    }
    return Promise.all(allEntries.map((fn) => fn()));
  };
  return globHandler;
}
function createAstro(filePathname, _site, projectRootStr) {
  const site = _site ? new URL(_site) : void 0;
  const referenceURL = new URL(filePathname, `http://localhost`);
  const projectRoot = new URL(projectRootStr);
  return {
    site,
    generator: `Astro v${ASTRO_VERSION}`,
    fetchContent: createDeprecatedFetchContentFn(),
    glob: createAstroGlobFn(),
    resolve(...segments) {
      let resolved = segments.reduce((u, segment) => new URL(segment, u), referenceURL).pathname;
      if (resolved.startsWith(projectRoot.pathname)) {
        resolved = "/" + resolved.slice(projectRoot.pathname.length);
      }
      return resolved;
    }
  };
}

const escapeHTML = escape;
class HTMLString extends String {
}
const markHTMLString = (value) => {
  if (value instanceof HTMLString) {
    return value;
  }
  if (typeof value === "string") {
    return new HTMLString(value);
  }
  return value;
};

class Metadata {
  constructor(filePathname, opts) {
    this.modules = opts.modules;
    this.hoisted = opts.hoisted;
    this.hydratedComponents = opts.hydratedComponents;
    this.clientOnlyComponents = opts.clientOnlyComponents;
    this.hydrationDirectives = opts.hydrationDirectives;
    this.mockURL = new URL(filePathname, "http://example.com");
    this.metadataCache = /* @__PURE__ */ new Map();
  }
  resolvePath(specifier) {
    if (specifier.startsWith(".")) {
      const resolved = new URL(specifier, this.mockURL).pathname;
      if (resolved.startsWith("/@fs") && resolved.endsWith(".jsx")) {
        return resolved.slice(0, resolved.length - 4);
      }
      return resolved;
    }
    return specifier;
  }
  getPath(Component) {
    const metadata = this.getComponentMetadata(Component);
    return (metadata == null ? void 0 : metadata.componentUrl) || null;
  }
  getExport(Component) {
    const metadata = this.getComponentMetadata(Component);
    return (metadata == null ? void 0 : metadata.componentExport) || null;
  }
  getComponentMetadata(Component) {
    if (this.metadataCache.has(Component)) {
      return this.metadataCache.get(Component);
    }
    const metadata = this.findComponentMetadata(Component);
    this.metadataCache.set(Component, metadata);
    return metadata;
  }
  findComponentMetadata(Component) {
    const isCustomElement = typeof Component === "string";
    for (const { module, specifier } of this.modules) {
      const id = this.resolvePath(specifier);
      for (const [key, value] of Object.entries(module)) {
        if (isCustomElement) {
          if (key === "tagName" && Component === value) {
            return {
              componentExport: key,
              componentUrl: id
            };
          }
        } else if (Component === value) {
          return {
            componentExport: key,
            componentUrl: id
          };
        }
      }
    }
    return null;
  }
}
function createMetadata(filePathname, options) {
  return new Metadata(filePathname, options);
}

const PROP_TYPE = {
  Value: 0,
  JSON: 1,
  RegExp: 2,
  Date: 3,
  Map: 4,
  Set: 5,
  BigInt: 6,
  URL: 7
};
function serializeArray(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = value.map((v) => {
    return convertToSerializedForm(v, metadata, parents);
  });
  parents.delete(value);
  return serialized;
}
function serializeObject(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = Object.fromEntries(
    Object.entries(value).map(([k, v]) => {
      return [k, convertToSerializedForm(v, metadata, parents)];
    })
  );
  parents.delete(value);
  return serialized;
}
function convertToSerializedForm(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  const tag = Object.prototype.toString.call(value);
  switch (tag) {
    case "[object Date]": {
      return [PROP_TYPE.Date, value.toISOString()];
    }
    case "[object RegExp]": {
      return [PROP_TYPE.RegExp, value.source];
    }
    case "[object Map]": {
      return [
        PROP_TYPE.Map,
        JSON.stringify(serializeArray(Array.from(value), metadata, parents))
      ];
    }
    case "[object Set]": {
      return [
        PROP_TYPE.Set,
        JSON.stringify(serializeArray(Array.from(value), metadata, parents))
      ];
    }
    case "[object BigInt]": {
      return [PROP_TYPE.BigInt, value.toString()];
    }
    case "[object URL]": {
      return [PROP_TYPE.URL, value.toString()];
    }
    case "[object Array]": {
      return [PROP_TYPE.JSON, JSON.stringify(serializeArray(value, metadata, parents))];
    }
    default: {
      if (value !== null && typeof value === "object") {
        return [PROP_TYPE.Value, serializeObject(value, metadata, parents)];
      } else {
        return [PROP_TYPE.Value, value];
      }
    }
  }
}
function serializeProps(props, metadata) {
  const serialized = JSON.stringify(serializeObject(props, metadata));
  return serialized;
}

function serializeListValue(value) {
  const hash = {};
  push(value);
  return Object.keys(hash).join(" ");
  function push(item) {
    if (item && typeof item.forEach === "function")
      item.forEach(push);
    else if (item === Object(item))
      Object.keys(item).forEach((name) => {
        if (item[name])
          push(name);
      });
    else {
      item = item === false || item == null ? "" : String(item).trim();
      if (item) {
        item.split(/\s+/).forEach((name) => {
          hash[name] = true;
        });
      }
    }
  }
}

const HydrationDirectivesRaw = ["load", "idle", "media", "visible", "only"];
const HydrationDirectives = new Set(HydrationDirectivesRaw);
const HydrationDirectiveProps = new Set(HydrationDirectivesRaw.map((n) => `client:${n}`));
function extractDirectives(inputProps) {
  let extracted = {
    isPage: false,
    hydration: null,
    props: {}
  };
  for (const [key, value] of Object.entries(inputProps)) {
    if (key.startsWith("server:")) {
      if (key === "server:root") {
        extracted.isPage = true;
      }
    }
    if (key.startsWith("client:")) {
      if (!extracted.hydration) {
        extracted.hydration = {
          directive: "",
          value: "",
          componentUrl: "",
          componentExport: { value: "" }
        };
      }
      switch (key) {
        case "client:component-path": {
          extracted.hydration.componentUrl = value;
          break;
        }
        case "client:component-export": {
          extracted.hydration.componentExport.value = value;
          break;
        }
        case "client:component-hydration": {
          break;
        }
        case "client:display-name": {
          break;
        }
        default: {
          extracted.hydration.directive = key.split(":")[1];
          extracted.hydration.value = value;
          if (!HydrationDirectives.has(extracted.hydration.directive)) {
            throw new Error(
              `Error: invalid hydration directive "${key}". Supported hydration methods: ${Array.from(
                HydrationDirectiveProps
              ).join(", ")}`
            );
          }
          if (extracted.hydration.directive === "media" && typeof extracted.hydration.value !== "string") {
            throw new Error(
              'Error: Media query must be provided for "client:media", similar to client:media="(max-width: 600px)"'
            );
          }
          break;
        }
      }
    } else if (key === "class:list") {
      extracted.props[key.slice(0, -5)] = serializeListValue(value);
    } else {
      extracted.props[key] = value;
    }
  }
  return extracted;
}
async function generateHydrateScript(scriptOptions, metadata) {
  const { renderer, result, astroId, props, attrs } = scriptOptions;
  const { hydrate, componentUrl, componentExport } = metadata;
  if (!componentExport.value) {
    throw new Error(
      `Unable to resolve a valid export for "${metadata.displayName}"! Please open an issue at https://astro.build/issues!`
    );
  }
  const island = {
    children: "",
    props: {
      uid: astroId
    }
  };
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      island.props[key] = value;
    }
  }
  island.props["component-url"] = await result.resolve(decodeURI(componentUrl));
  if (renderer.clientEntrypoint) {
    island.props["component-export"] = componentExport.value;
    island.props["renderer-url"] = await result.resolve(decodeURI(renderer.clientEntrypoint));
    island.props["props"] = escapeHTML(serializeProps(props, metadata));
  }
  island.props["ssr"] = "";
  island.props["client"] = hydrate;
  island.props["before-hydration-url"] = await result.resolve("astro:scripts/before-hydration.js");
  island.props["opts"] = escapeHTML(
    JSON.stringify({
      name: metadata.displayName,
      value: metadata.hydrateArgs || ""
    })
  );
  return island;
}

var idle_prebuilt_default = `(self.Astro=self.Astro||{}).idle=t=>{const e=async()=>{await(await t())()};"requestIdleCallback"in window?window.requestIdleCallback(e):setTimeout(e,200)},window.dispatchEvent(new Event("astro:idle"));`;

var load_prebuilt_default = `(self.Astro=self.Astro||{}).load=a=>{(async()=>await(await a())())()},window.dispatchEvent(new Event("astro:load"));`;

var media_prebuilt_default = `(self.Astro=self.Astro||{}).media=(s,a)=>{const t=async()=>{await(await s())()};if(a.value){const e=matchMedia(a.value);e.matches?t():e.addEventListener("change",t,{once:!0})}},window.dispatchEvent(new Event("astro:media"));`;

var only_prebuilt_default = `(self.Astro=self.Astro||{}).only=t=>{(async()=>await(await t())())()},window.dispatchEvent(new Event("astro:only"));`;

var visible_prebuilt_default = `(self.Astro=self.Astro||{}).visible=(s,c,n)=>{const r=async()=>{await(await s())()};let i=new IntersectionObserver(e=>{for(const t of e)if(!!t.isIntersecting){i.disconnect(),r();break}});for(let e=0;e<n.children.length;e++){const t=n.children[e];i.observe(t)}},window.dispatchEvent(new Event("astro:visible"));`;

var astro_island_prebuilt_default = `var l;{const c={0:t=>t,1:t=>JSON.parse(t,o),2:t=>new RegExp(t),3:t=>new Date(t),4:t=>new Map(JSON.parse(t,o)),5:t=>new Set(JSON.parse(t,o)),6:t=>BigInt(t),7:t=>new URL(t)},o=(t,i)=>{if(t===""||!Array.isArray(i))return i;const[e,n]=i;return e in c?c[e](n):void 0};customElements.get("astro-island")||customElements.define("astro-island",(l=class extends HTMLElement{constructor(){super(...arguments);this.hydrate=()=>{if(!this.hydrator||this.parentElement&&this.parentElement.closest("astro-island[ssr]"))return;const i=this.querySelectorAll("astro-slot"),e={},n=this.querySelectorAll("template[data-astro-template]");for(const s of n){const r=s.closest(this.tagName);!r||!r.isSameNode(this)||(e[s.getAttribute("data-astro-template")||"default"]=s.innerHTML,s.remove())}for(const s of i){const r=s.closest(this.tagName);!r||!r.isSameNode(this)||(e[s.getAttribute("name")||"default"]=s.innerHTML)}const a=this.hasAttribute("props")?JSON.parse(this.getAttribute("props"),o):{};this.hydrator(this)(this.Component,a,e,{client:this.getAttribute("client")}),this.removeAttribute("ssr"),window.removeEventListener("astro:hydrate",this.hydrate),window.dispatchEvent(new CustomEvent("astro:hydrate"))}}connectedCallback(){!this.hasAttribute("await-children")||this.firstChild?this.childrenConnectedCallback():new MutationObserver((i,e)=>{e.disconnect(),this.childrenConnectedCallback()}).observe(this,{childList:!0})}async childrenConnectedCallback(){window.addEventListener("astro:hydrate",this.hydrate),await import(this.getAttribute("before-hydration-url")),this.start()}start(){const i=JSON.parse(this.getAttribute("opts")),e=this.getAttribute("client");if(Astro[e]===void 0){window.addEventListener(\`astro:\${e}\`,()=>this.start(),{once:!0});return}Astro[e](async()=>{const n=this.getAttribute("renderer-url"),[a,{default:s}]=await Promise.all([import(this.getAttribute("component-url")),n?import(n):()=>()=>{}]),r=this.getAttribute("component-export")||"default";if(!r.includes("."))this.Component=a[r];else{this.Component=a;for(const d of r.split("."))this.Component=this.Component[d]}return this.hydrator=s,this.hydrate},i,this)}attributeChangedCallback(){this.hydrator&&this.hydrate()}},l.observedAttributes=["props"],l))}`;

function determineIfNeedsHydrationScript(result) {
  if (result._metadata.hasHydrationScript) {
    return false;
  }
  return result._metadata.hasHydrationScript = true;
}
const hydrationScripts = {
  idle: idle_prebuilt_default,
  load: load_prebuilt_default,
  only: only_prebuilt_default,
  media: media_prebuilt_default,
  visible: visible_prebuilt_default
};
function determinesIfNeedsDirectiveScript(result, directive) {
  if (result._metadata.hasDirectives.has(directive)) {
    return false;
  }
  result._metadata.hasDirectives.add(directive);
  return true;
}
function getDirectiveScriptText(directive) {
  if (!(directive in hydrationScripts)) {
    throw new Error(`Unknown directive: ${directive}`);
  }
  const directiveScriptText = hydrationScripts[directive];
  return directiveScriptText;
}
function getPrescripts(type, directive) {
  switch (type) {
    case "both":
      return `<style>astro-island,astro-slot{display:contents}</style><script>${getDirectiveScriptText(directive) + astro_island_prebuilt_default}<\/script>`;
    case "directive":
      return `<script>${getDirectiveScriptText(directive)}<\/script>`;
  }
  return "";
}

const Fragment = Symbol.for("astro:fragment");
const Renderer = Symbol.for("astro:renderer");
function stringifyChunk(result, chunk) {
  switch (chunk.type) {
    case "directive": {
      const { hydration } = chunk;
      let needsHydrationScript = hydration && determineIfNeedsHydrationScript(result);
      let needsDirectiveScript = hydration && determinesIfNeedsDirectiveScript(result, hydration.directive);
      let prescriptType = needsHydrationScript ? "both" : needsDirectiveScript ? "directive" : null;
      if (prescriptType) {
        let prescripts = getPrescripts(prescriptType, hydration.directive);
        return markHTMLString(prescripts);
      } else {
        return "";
      }
    }
    default: {
      return chunk.toString();
    }
  }
}

function validateComponentProps(props, displayName) {
  var _a;
  if (((_a = (Object.assign({"BASE_URL":"/","MODE":"production","DEV":false,"PROD":true},{_:process.env._,}))) == null ? void 0 : _a.DEV) && props != null) {
    for (const prop of Object.keys(props)) {
      if (HydrationDirectiveProps.has(prop)) {
        console.warn(
          `You are attempting to render <${displayName} ${prop} />, but ${displayName} is an Astro component. Astro components do not render in the client and should not have a hydration directive. Please use a framework component for client rendering.`
        );
      }
    }
  }
}
class AstroComponent {
  constructor(htmlParts, expressions) {
    this.htmlParts = htmlParts;
    this.expressions = expressions;
  }
  get [Symbol.toStringTag]() {
    return "AstroComponent";
  }
  async *[Symbol.asyncIterator]() {
    const { htmlParts, expressions } = this;
    for (let i = 0; i < htmlParts.length; i++) {
      const html = htmlParts[i];
      const expression = expressions[i];
      yield markHTMLString(html);
      yield* renderChild(expression);
    }
  }
}
function isAstroComponent(obj) {
  return typeof obj === "object" && Object.prototype.toString.call(obj) === "[object AstroComponent]";
}
function isAstroComponentFactory(obj) {
  return obj == null ? false : !!obj.isAstroComponentFactory;
}
async function* renderAstroComponent(component) {
  for await (const value of component) {
    if (value || value === 0) {
      for await (const chunk of renderChild(value)) {
        switch (chunk.type) {
          case "directive": {
            yield chunk;
            break;
          }
          default: {
            yield markHTMLString(chunk);
            break;
          }
        }
      }
    }
  }
}
async function renderToString(result, componentFactory, props, children) {
  const Component = await componentFactory(result, props, children);
  if (!isAstroComponent(Component)) {
    const response = Component;
    throw response;
  }
  let html = "";
  for await (const chunk of renderAstroComponent(Component)) {
    html += stringifyChunk(result, chunk);
  }
  return html;
}
async function renderToIterable(result, componentFactory, displayName, props, children) {
  validateComponentProps(props, displayName);
  const Component = await componentFactory(result, props, children);
  if (!isAstroComponent(Component)) {
    console.warn(
      `Returning a Response is only supported inside of page components. Consider refactoring this logic into something like a function that can be used in the page.`
    );
    const response = Component;
    throw response;
  }
  return renderAstroComponent(Component);
}
async function renderTemplate(htmlParts, ...expressions) {
  return new AstroComponent(htmlParts, expressions);
}

async function* renderChild(child) {
  child = await child;
  if (child instanceof HTMLString) {
    yield child;
  } else if (Array.isArray(child)) {
    for (const value of child) {
      yield markHTMLString(await renderChild(value));
    }
  } else if (typeof child === "function") {
    yield* renderChild(child());
  } else if (typeof child === "string") {
    yield markHTMLString(escapeHTML(child));
  } else if (!child && child !== 0) ; else if (child instanceof AstroComponent || Object.prototype.toString.call(child) === "[object AstroComponent]") {
    yield* renderAstroComponent(child);
  } else if (typeof child === "object" && Symbol.asyncIterator in child) {
    yield* child;
  } else {
    yield child;
  }
}
async function renderSlot(result, slotted, fallback) {
  if (slotted) {
    let iterator = renderChild(slotted);
    let content = "";
    for await (const chunk of iterator) {
      if (chunk.type === "directive") {
        content += stringifyChunk(result, chunk);
      } else {
        content += chunk;
      }
    }
    return markHTMLString(content);
  }
  return fallback;
}

/**
 * shortdash - https://github.com/bibig/node-shorthash
 *
 * @license
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Bibig <bibig@me.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
const dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY";
const binary = dictionary.length;
function bitwise(str) {
  let hash = 0;
  if (str.length === 0)
    return hash;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash = hash & hash;
  }
  return hash;
}
function shorthash(text) {
  let num;
  let result = "";
  let integer = bitwise(text);
  const sign = integer < 0 ? "Z" : "";
  integer = Math.abs(integer);
  while (integer >= binary) {
    num = integer % binary;
    integer = Math.floor(integer / binary);
    result = dictionary[num] + result;
  }
  if (integer > 0) {
    result = dictionary[integer] + result;
  }
  return sign + result;
}

const voidElementNames = /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;
const htmlBooleanAttributes = /^(allowfullscreen|async|autofocus|autoplay|controls|default|defer|disabled|disablepictureinpicture|disableremoteplayback|formnovalidate|hidden|loop|nomodule|novalidate|open|playsinline|readonly|required|reversed|scoped|seamless|itemscope)$/i;
const htmlEnumAttributes = /^(contenteditable|draggable|spellcheck|value)$/i;
const svgEnumAttributes = /^(autoReverse|externalResourcesRequired|focusable|preserveAlpha)$/i;
const STATIC_DIRECTIVES = /* @__PURE__ */ new Set(["set:html", "set:text"]);
const toIdent = (k) => k.trim().replace(/(?:(?<!^)\b\w|\s+|[^\w]+)/g, (match, index) => {
  if (/[^\w]|\s/.test(match))
    return "";
  return index === 0 ? match : match.toUpperCase();
});
const toAttributeString = (value, shouldEscape = true) => shouldEscape ? String(value).replace(/&/g, "&#38;").replace(/"/g, "&#34;") : value;
const kebab = (k) => k.toLowerCase() === k ? k : k.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
const toStyleString = (obj) => Object.entries(obj).map(([k, v]) => `${kebab(k)}:${v}`).join(";");
function defineScriptVars(vars) {
  let output = "";
  for (const [key, value] of Object.entries(vars)) {
    output += `let ${toIdent(key)} = ${JSON.stringify(value)};
`;
  }
  return markHTMLString(output);
}
function formatList(values) {
  if (values.length === 1) {
    return values[0];
  }
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
function addAttribute(value, key, shouldEscape = true) {
  if (value == null) {
    return "";
  }
  if (value === false) {
    if (htmlEnumAttributes.test(key) || svgEnumAttributes.test(key)) {
      return markHTMLString(` ${key}="false"`);
    }
    return "";
  }
  if (STATIC_DIRECTIVES.has(key)) {
    console.warn(`[astro] The "${key}" directive cannot be applied dynamically at runtime. It will not be rendered as an attribute.

Make sure to use the static attribute syntax (\`${key}={value}\`) instead of the dynamic spread syntax (\`{...{ "${key}": value }}\`).`);
    return "";
  }
  if (key === "class:list") {
    const listValue = toAttributeString(serializeListValue(value));
    if (listValue === "") {
      return "";
    }
    return markHTMLString(` ${key.slice(0, -5)}="${listValue}"`);
  }
  if (key === "style" && !(value instanceof HTMLString) && typeof value === "object") {
    return markHTMLString(` ${key}="${toStyleString(value)}"`);
  }
  if (key === "className") {
    return markHTMLString(` class="${toAttributeString(value, shouldEscape)}"`);
  }
  if (value === true && (key.startsWith("data-") || htmlBooleanAttributes.test(key))) {
    return markHTMLString(` ${key}`);
  } else {
    return markHTMLString(` ${key}="${toAttributeString(value, shouldEscape)}"`);
  }
}
function internalSpreadAttributes(values, shouldEscape = true) {
  let output = "";
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, shouldEscape);
  }
  return markHTMLString(output);
}
function renderElement$1(name, { props: _props, children = "" }, shouldEscape = true) {
  const { lang: _, "data-astro-id": astroId, "define:vars": defineVars, ...props } = _props;
  if (defineVars) {
    if (name === "style") {
      delete props["is:global"];
      delete props["is:scoped"];
    }
    if (name === "script") {
      delete props.hoist;
      children = defineScriptVars(defineVars) + "\n" + children;
    }
  }
  if ((children == null || children == "") && voidElementNames.test(name)) {
    return `<${name}${internalSpreadAttributes(props, shouldEscape)} />`;
  }
  return `<${name}${internalSpreadAttributes(props, shouldEscape)}>${children}</${name}>`;
}

function componentIsHTMLElement(Component) {
  return typeof HTMLElement !== "undefined" && HTMLElement.isPrototypeOf(Component);
}
async function renderHTMLElement(result, constructor, props, slots) {
  const name = getHTMLElementName(constructor);
  let attrHTML = "";
  for (const attr in props) {
    attrHTML += ` ${attr}="${toAttributeString(await props[attr])}"`;
  }
  return markHTMLString(
    `<${name}${attrHTML}>${await renderSlot(result, slots == null ? void 0 : slots.default)}</${name}>`
  );
}
function getHTMLElementName(constructor) {
  const definedName = customElements.getName(constructor);
  if (definedName)
    return definedName;
  const assignedName = constructor.name.replace(/^HTML|Element$/g, "").replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "html-");
  return assignedName;
}

const rendererAliases = /* @__PURE__ */ new Map([["solid", "solid-js"]]);
function guessRenderers(componentUrl) {
  const extname = componentUrl == null ? void 0 : componentUrl.split(".").pop();
  switch (extname) {
    case "svelte":
      return ["@astrojs/svelte"];
    case "vue":
      return ["@astrojs/vue"];
    case "jsx":
    case "tsx":
      return ["@astrojs/react", "@astrojs/preact"];
    default:
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/vue", "@astrojs/svelte"];
  }
}
function getComponentType(Component) {
  if (Component === Fragment) {
    return "fragment";
  }
  if (Component && typeof Component === "object" && Component["astro:html"]) {
    return "html";
  }
  if (isAstroComponentFactory(Component)) {
    return "astro-factory";
  }
  return "unknown";
}
async function renderComponent(result, displayName, Component, _props, slots = {}) {
  var _a;
  Component = await Component;
  switch (getComponentType(Component)) {
    case "fragment": {
      const children2 = await renderSlot(result, slots == null ? void 0 : slots.default);
      if (children2 == null) {
        return children2;
      }
      return markHTMLString(children2);
    }
    case "html": {
      const children2 = {};
      if (slots) {
        await Promise.all(
          Object.entries(slots).map(
            ([key, value]) => renderSlot(result, value).then((output) => {
              children2[key] = output;
            })
          )
        );
      }
      const html2 = Component.render({ slots: children2 });
      return markHTMLString(html2);
    }
    case "astro-factory": {
      async function* renderAstroComponentInline() {
        let iterable = await renderToIterable(result, Component, displayName, _props, slots);
        yield* iterable;
      }
      return renderAstroComponentInline();
    }
  }
  if (!Component && !_props["client:only"]) {
    throw new Error(
      `Unable to render ${displayName} because it is ${Component}!
Did you forget to import the component or is it possible there is a typo?`
    );
  }
  const { renderers } = result._metadata;
  const metadata = { displayName };
  const { hydration, isPage, props } = extractDirectives(_props);
  let html = "";
  let attrs = void 0;
  if (hydration) {
    metadata.hydrate = hydration.directive;
    metadata.hydrateArgs = hydration.value;
    metadata.componentExport = hydration.componentExport;
    metadata.componentUrl = hydration.componentUrl;
  }
  const probableRendererNames = guessRenderers(metadata.componentUrl);
  if (Array.isArray(renderers) && renderers.length === 0 && typeof Component !== "string" && !componentIsHTMLElement(Component)) {
    const message = `Unable to render ${metadata.displayName}!

There are no \`integrations\` set in your \`astro.config.mjs\` file.
Did you mean to add ${formatList(probableRendererNames.map((r) => "`" + r + "`"))}?`;
    throw new Error(message);
  }
  const children = {};
  if (slots) {
    await Promise.all(
      Object.entries(slots).map(
        ([key, value]) => renderSlot(result, value).then((output) => {
          children[key] = output;
        })
      )
    );
  }
  let renderer;
  if (metadata.hydrate !== "only") {
    if (Component && Component[Renderer]) {
      const rendererName = Component[Renderer];
      renderer = renderers.find(({ name }) => name === rendererName);
    }
    if (!renderer) {
      let error;
      for (const r of renderers) {
        try {
          if (await r.ssr.check.call({ result }, Component, props, children)) {
            renderer = r;
            break;
          }
        } catch (e) {
          error ?? (error = e);
        }
      }
      if (!renderer && error) {
        throw error;
      }
    }
    if (!renderer && typeof HTMLElement === "function" && componentIsHTMLElement(Component)) {
      const output = renderHTMLElement(result, Component, _props, slots);
      return output;
    }
  } else {
    if (metadata.hydrateArgs) {
      const passedName = metadata.hydrateArgs;
      const rendererName = rendererAliases.has(passedName) ? rendererAliases.get(passedName) : passedName;
      renderer = renderers.find(
        ({ name }) => name === `@astrojs/${rendererName}` || name === rendererName
      );
    }
    if (!renderer && renderers.length === 1) {
      renderer = renderers[0];
    }
    if (!renderer) {
      const extname = (_a = metadata.componentUrl) == null ? void 0 : _a.split(".").pop();
      renderer = renderers.filter(
        ({ name }) => name === `@astrojs/${extname}` || name === extname
      )[0];
    }
  }
  if (!renderer) {
    if (metadata.hydrate === "only") {
      throw new Error(`Unable to render ${metadata.displayName}!

Using the \`client:only\` hydration strategy, Astro needs a hint to use the correct renderer.
Did you mean to pass <${metadata.displayName} client:only="${probableRendererNames.map((r) => r.replace("@astrojs/", "")).join("|")}" />
`);
    } else if (typeof Component !== "string") {
      const matchingRenderers = renderers.filter((r) => probableRendererNames.includes(r.name));
      const plural = renderers.length > 1;
      if (matchingRenderers.length === 0) {
        throw new Error(`Unable to render ${metadata.displayName}!

There ${plural ? "are" : "is"} ${renderers.length} renderer${plural ? "s" : ""} configured in your \`astro.config.mjs\` file,
but ${plural ? "none were" : "it was not"} able to server-side render ${metadata.displayName}.

Did you mean to enable ${formatList(probableRendererNames.map((r) => "`" + r + "`"))}?`);
      } else if (matchingRenderers.length === 1) {
        renderer = matchingRenderers[0];
        ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
          { result },
          Component,
          props,
          children,
          metadata
        ));
      } else {
        throw new Error(`Unable to render ${metadata.displayName}!

This component likely uses ${formatList(probableRendererNames)},
but Astro encountered an error during server-side rendering.

Please ensure that ${metadata.displayName}:
1. Does not unconditionally access browser-specific globals like \`window\` or \`document\`.
   If this is unavoidable, use the \`client:only\` hydration directive.
2. Does not conditionally return \`null\` or \`undefined\` when rendered on the server.

If you're still stuck, please open an issue on GitHub or join us at https://astro.build/chat.`);
      }
    }
  } else {
    if (metadata.hydrate === "only") {
      html = await renderSlot(result, slots == null ? void 0 : slots.fallback);
    } else {
      ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
        { result },
        Component,
        props,
        children,
        metadata
      ));
    }
  }
  if (renderer && !renderer.clientEntrypoint && renderer.name !== "@astrojs/lit" && metadata.hydrate) {
    throw new Error(
      `${metadata.displayName} component has a \`client:${metadata.hydrate}\` directive, but no client entrypoint was provided by ${renderer.name}!`
    );
  }
  if (!html && typeof Component === "string") {
    const childSlots = Object.values(children).join("");
    const iterable = renderAstroComponent(
      await renderTemplate`<${Component}${internalSpreadAttributes(props)}${markHTMLString(
        childSlots === "" && voidElementNames.test(Component) ? `/>` : `>${childSlots}</${Component}>`
      )}`
    );
    html = "";
    for await (const chunk of iterable) {
      html += chunk;
    }
  }
  if (!hydration) {
    if (isPage || (renderer == null ? void 0 : renderer.name) === "astro:jsx") {
      return html;
    }
    return markHTMLString(html.replace(/\<\/?astro-slot\>/g, ""));
  }
  const astroId = shorthash(
    `<!--${metadata.componentExport.value}:${metadata.componentUrl}-->
${html}
${serializeProps(
      props,
      metadata
    )}`
  );
  const island = await generateHydrateScript(
    { renderer, result, astroId, props, attrs },
    metadata
  );
  let unrenderedSlots = [];
  if (html) {
    if (Object.keys(children).length > 0) {
      for (const key of Object.keys(children)) {
        if (!html.includes(key === "default" ? `<astro-slot>` : `<astro-slot name="${key}">`)) {
          unrenderedSlots.push(key);
        }
      }
    }
  } else {
    unrenderedSlots = Object.keys(children);
  }
  const template = unrenderedSlots.length > 0 ? unrenderedSlots.map(
    (key) => `<template data-astro-template${key !== "default" ? `="${key}"` : ""}>${children[key]}</template>`
  ).join("") : "";
  island.children = `${html ?? ""}${template}`;
  if (island.children) {
    island.props["await-children"] = "";
  }
  async function* renderAll() {
    yield { type: "directive", hydration, result };
    yield markHTMLString(renderElement$1("astro-island", island, false));
  }
  return renderAll();
}

const uniqueElements = (item, index, all) => {
  const props = JSON.stringify(item.props);
  const children = item.children;
  return index === all.findIndex((i) => JSON.stringify(i.props) === props && i.children == children);
};
const alreadyHeadRenderedResults = /* @__PURE__ */ new WeakSet();
function renderHead(result) {
  alreadyHeadRenderedResults.add(result);
  const styles = Array.from(result.styles).filter(uniqueElements).map((style) => renderElement$1("style", style));
  result.styles.clear();
  const scripts = Array.from(result.scripts).filter(uniqueElements).map((script, i) => {
    return renderElement$1("script", script, false);
  });
  const links = Array.from(result.links).filter(uniqueElements).map((link) => renderElement$1("link", link, false));
  return markHTMLString(links.join("\n") + styles.join("\n") + scripts.join("\n"));
}
async function* maybeRenderHead(result) {
  if (alreadyHeadRenderedResults.has(result)) {
    return;
  }
  yield renderHead(result);
}

typeof process === "object" && Object.prototype.toString.call(process) === "[object process]";

new TextEncoder();

function createComponent(cb) {
  cb.isAstroComponentFactory = true;
  return cb;
}
function spreadAttributes(values, _name, { class: scopedClassName } = {}) {
  let output = "";
  if (scopedClassName) {
    if (typeof values.class !== "undefined") {
      values.class += ` ${scopedClassName}`;
    } else if (typeof values["class:list"] !== "undefined") {
      values["class:list"] = [values["class:list"], scopedClassName];
    } else {
      values.class = scopedClassName;
    }
  }
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, true);
  }
  return markHTMLString(output);
}

const AstroJSX = "astro:jsx";
const Empty = Symbol("empty");
const toSlotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
function isVNode(vnode) {
  return vnode && typeof vnode === "object" && vnode[AstroJSX];
}
function transformSlots(vnode) {
  if (typeof vnode.type === "string")
    return vnode;
  const slots = {};
  if (isVNode(vnode.props.children)) {
    const child = vnode.props.children;
    if (!isVNode(child))
      return;
    if (!("slot" in child.props))
      return;
    const name = toSlotName(child.props.slot);
    slots[name] = [child];
    slots[name]["$$slot"] = true;
    delete child.props.slot;
    delete vnode.props.children;
  }
  if (Array.isArray(vnode.props.children)) {
    vnode.props.children = vnode.props.children.map((child) => {
      if (!isVNode(child))
        return child;
      if (!("slot" in child.props))
        return child;
      const name = toSlotName(child.props.slot);
      if (Array.isArray(slots[name])) {
        slots[name].push(child);
      } else {
        slots[name] = [child];
        slots[name]["$$slot"] = true;
      }
      delete child.props.slot;
      return Empty;
    }).filter((v) => v !== Empty);
  }
  Object.assign(vnode.props, slots);
}
function markRawChildren(child) {
  if (typeof child === "string")
    return markHTMLString(child);
  if (Array.isArray(child))
    return child.map((c) => markRawChildren(c));
  return child;
}
function transformSetDirectives(vnode) {
  if (!("set:html" in vnode.props || "set:text" in vnode.props))
    return;
  if ("set:html" in vnode.props) {
    const children = markRawChildren(vnode.props["set:html"]);
    delete vnode.props["set:html"];
    Object.assign(vnode.props, { children });
    return;
  }
  if ("set:text" in vnode.props) {
    const children = vnode.props["set:text"];
    delete vnode.props["set:text"];
    Object.assign(vnode.props, { children });
    return;
  }
}
function createVNode(type, props) {
  const vnode = {
    [AstroJSX]: true,
    type,
    props: props ?? {}
  };
  transformSetDirectives(vnode);
  transformSlots(vnode);
  return vnode;
}

const ClientOnlyPlaceholder = "astro-client-only";
const skipAstroJSXCheck = /* @__PURE__ */ new WeakSet();
let originalConsoleError;
let consoleFilterRefs = 0;
async function renderJSX(result, vnode) {
  switch (true) {
    case vnode instanceof HTMLString:
      if (vnode.toString().trim() === "") {
        return "";
      }
      return vnode;
    case typeof vnode === "string":
      return markHTMLString(escapeHTML(vnode));
    case (!vnode && vnode !== 0):
      return "";
    case Array.isArray(vnode):
      return markHTMLString(
        (await Promise.all(vnode.map((v) => renderJSX(result, v)))).join("")
      );
  }
  if (isVNode(vnode)) {
    switch (true) {
      case vnode.type === Symbol.for("astro:fragment"):
        return renderJSX(result, vnode.props.children);
      case vnode.type.isAstroComponentFactory: {
        let props = {};
        let slots = {};
        for (const [key, value] of Object.entries(vnode.props ?? {})) {
          if (key === "children" || value && typeof value === "object" && value["$$slot"]) {
            slots[key === "children" ? "default" : key] = () => renderJSX(result, value);
          } else {
            props[key] = value;
          }
        }
        return markHTMLString(await renderToString(result, vnode.type, props, slots));
      }
      case (!vnode.type && vnode.type !== 0):
        return "";
      case (typeof vnode.type === "string" && vnode.type !== ClientOnlyPlaceholder):
        return markHTMLString(await renderElement(result, vnode.type, vnode.props ?? {}));
    }
    if (vnode.type) {
      let extractSlots2 = function(child) {
        if (Array.isArray(child)) {
          return child.map((c) => extractSlots2(c));
        }
        if (!isVNode(child)) {
          _slots.default.push(child);
          return;
        }
        if ("slot" in child.props) {
          _slots[child.props.slot] = [..._slots[child.props.slot] ?? [], child];
          delete child.props.slot;
          return;
        }
        _slots.default.push(child);
      };
      if (typeof vnode.type === "function" && vnode.type["astro:renderer"]) {
        skipAstroJSXCheck.add(vnode.type);
      }
      if (typeof vnode.type === "function" && vnode.props["server:root"]) {
        const output2 = await vnode.type(vnode.props ?? {});
        return await renderJSX(result, output2);
      }
      if (typeof vnode.type === "function" && !skipAstroJSXCheck.has(vnode.type)) {
        useConsoleFilter();
        try {
          const output2 = await vnode.type(vnode.props ?? {});
          if (output2 && output2[AstroJSX]) {
            return await renderJSX(result, output2);
          } else if (!output2) {
            return await renderJSX(result, output2);
          }
        } catch (e) {
          skipAstroJSXCheck.add(vnode.type);
        } finally {
          finishUsingConsoleFilter();
        }
      }
      const { children = null, ...props } = vnode.props ?? {};
      const _slots = {
        default: []
      };
      extractSlots2(children);
      for (const [key, value] of Object.entries(props)) {
        if (value["$$slot"]) {
          _slots[key] = value;
          delete props[key];
        }
      }
      const slotPromises = [];
      const slots = {};
      for (const [key, value] of Object.entries(_slots)) {
        slotPromises.push(
          renderJSX(result, value).then((output2) => {
            if (output2.toString().trim().length === 0)
              return;
            slots[key] = () => output2;
          })
        );
      }
      await Promise.all(slotPromises);
      let output;
      if (vnode.type === ClientOnlyPlaceholder && vnode.props["client:only"]) {
        output = await renderComponent(
          result,
          vnode.props["client:display-name"] ?? "",
          null,
          props,
          slots
        );
      } else {
        output = await renderComponent(
          result,
          typeof vnode.type === "function" ? vnode.type.name : vnode.type,
          vnode.type,
          props,
          slots
        );
      }
      if (typeof output !== "string" && Symbol.asyncIterator in output) {
        let body = "";
        for await (const chunk of output) {
          let html = stringifyChunk(result, chunk);
          body += html;
        }
        return markHTMLString(body);
      } else {
        return markHTMLString(output);
      }
    }
  }
  return markHTMLString(`${vnode}`);
}
async function renderElement(result, tag, { children, ...props }) {
  return markHTMLString(
    `<${tag}${spreadAttributes(props)}${markHTMLString(
      (children == null || children == "") && voidElementNames.test(tag) ? `/>` : `>${children == null ? "" : await renderJSX(result, children)}</${tag}>`
    )}`
  );
}
function useConsoleFilter() {
  consoleFilterRefs++;
  if (!originalConsoleError) {
    originalConsoleError = console.error;
    try {
      console.error = filteredConsoleError;
    } catch (error) {
    }
  }
}
function finishUsingConsoleFilter() {
  consoleFilterRefs--;
}
function filteredConsoleError(msg, ...rest) {
  if (consoleFilterRefs > 0 && typeof msg === "string") {
    const isKnownReactHookError = msg.includes("Warning: Invalid hook call.") && msg.includes("https://reactjs.org/link/invalid-hook-call");
    if (isKnownReactHookError)
      return;
  }
}

const slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
async function check(Component, props, { default: children = null, ...slotted } = {}) {
  if (typeof Component !== "function")
    return false;
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  try {
    const result = await Component({ ...props, ...slots, children });
    return result[AstroJSX];
  } catch (e) {
  }
  return false;
}
async function renderToStaticMarkup(Component, props = {}, { default: children = null, ...slotted } = {}) {
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  const { result } = this;
  const html = await renderJSX(result, createVNode(Component, { ...props, ...slots, children }));
  return { html };
}
var server_default = {
  check,
  renderToStaticMarkup
};

const $$metadata$i = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/CardMain.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$i = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/CardMain.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$CardMain = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$i, $$props, $$slots);
  Astro2.self = $$CardMain;
  return renderTemplate`${maybeRenderHead($$result)}<article class=" md:pl-24 flex w-full flex-col items-center">
  <div class="container text-gray-300 lg:px-6 w-11/12">
    <div class="space-y-6">
      <h2 class="text-5xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">Dlaczego my?</h2>
      <p class="text-lg">
        Posiadamy wieloletnie doświadczenie, wiedzę, środki i możliwości aby
        pomóc zarówno podmiotom gospodarczym, instytucjom finansowym i
        ubezpieczeniowym oraz osobom prywatnym w rozwiązaniu Państwa problemów.
        Do każdej powierzonej nam sprawy skrupulatnie się przygotowujemy i
        dokładamy wszelkich starań, by sprawnie ją rozwiązać. Gwarantujemy
        profesjonalizm, lojalność i dyskrecję. Zatrudniamy tylko
        licencjonowanych detektywów z wieloletnim doświadczeniem. Cenę usługi
        dostosowujemy do możliwości finansowych Klienta. Prowadzimy działania na
        terenie kraju i za granicą.
      </p>
    </div>
    <div class="space-y-6 mt-16">
      <h2 class="text-5xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
        Co możemy dla Ciebie zrobić?
      </h2>
      <p class="text-lg">
        Świadczymy usługi detektywistyczne i windykacyjne dla osób prywatnych
        oraz podmiotów gospodarczych. Poufność, profesjonalizm, 15-letnie
        doświadczenie oraz indywidualne podejście do klienta to nasze atuty.
        Oferujemy pomoc w każdej sprawie. Sprawa Klienta – staje się naszą
        wspólną sprawą.
      </p>
    </div>
    <div class="space-y-6 mt-16">
      <h2 class="text-5xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">Jak działamy?</h2>
      <p class="text-lg">
        Jaran to także biuro windykacyjne działające sprawnie, szybko i
        stanowczo. Windykacja odbywa się w granicach prawa, oferujemy także
        doradztwo i asystę prawną. Centrala firmy znajduje się w mieście
        stołecznym Warszawa, oddział posiadamy także w Poznaniu. Serdecznie
        zapraszamy wszystkich zainteresowanych!
      </p>
    </div>
    
  </div>
</article>`;
});

const $$file$i = "/home/szymon/Programming/jaran/jaran-website/src/components/CardMain.astro";
const $$url$i = undefined;

const $$module1$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$i,
  default: $$CardMain,
  file: $$file$i,
  url: $$url$i
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$h = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Features.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$h = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Features.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Features = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$h, $$props, $$slots);
  Astro2.self = $$Features;
  return renderTemplate`${maybeRenderHead($$result)}<div class="pl-16 grid mx-auto space-y-0 md:grid-cols-2 mt-24 text-lg leading-6 bg-gray-900 text-gray-300 ">
  <div class="space-y-6 px-4 sm:px-16 md:px-4">
    <div class="flex flex-row max-w-md">
      <div class="mb-4 mr-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
        </div>
      </div>
      <div>
        <p class="text-lg">
          Funkcjonujemy na rynku detektywistycznym od 2006 roku.
        </p>
      </div>
    </div>
    <div class="flex flex-row max-w-md">
      <div class="mb-4 mr-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
        </div>
      </div>
      <div>
        <p class="text-lg">
          Udzielamy pomocy w sprawach gospodarczych, karnych, cywilnych,
          rozwodowych, spadkowych, administracyjnych, innych.
        </p>
      </div>
    </div>
    <div class="flex flex-row max-w-md">
      <div class="mb-4 mr-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
        </div>
      </div>
      <div>
        <p class="text-lg">
          Mamy Oddziały we wszystkich miastach Polski, działamy na terenie
          Europy, państw dawnego ZSRR oraz Stanów Zjednoczonych Ameryki.
        </p>
      </div>
    </div>
  </div>
  <div class="space-y-6 px-4 sm:px-16 md:px-4 pt-6 md:pt-0">
    <div class="flex flex-row max-w-md">
      <div class="mb-4 mr-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
        </div>
      </div>
      <div>
        <p class="text-lg">
          Zatrudniamy licencjonowanych detektywów, byłych pracowników CBA,
          policji i innych służb specjalnych (50% to kobiety).
        </p>
      </div>
    </div>
    <div class="flex flex-row max-w-md">
      <div class="mb-4 mr-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
        </div>
      </div>
      <div>
        <p class="text-lg">
          Dysponujemy zespołami analityczno – dochodzeniowymi, obserwacyjnymi,
          eksperckimi, windykacyjnymi i technicznymi.
        </p>
      </div>
    </div>
    <div class="flex flex-row max-w-md">
      <div class="mb-4 mr-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
        </div>
      </div>
      <div>
        <p class="text-lg">
          Pracujemy 24 h na dobę, przez 7 dni w tygodniu, 365 dni w roku.
        </p>
      </div>
    </div>
  </div>
</div>`;
});

const $$file$h = "/home/szymon/Programming/jaran/jaran-website/src/components/Features.astro";
const $$url$h = undefined;

const $$module2$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$h,
  default: $$Features,
  file: $$file$h,
  url: $$url$h
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$g = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [{ type: "inline", value: `
  document.getElementById("form_focus").addEventListener("click", () => {
    document.querySelector("#contact-form-name").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  document.addEventListener("scroll", function (e) {
    let currentScroll = window.scrollY + window.innerHeight;
    if (currentScroll > 1000) {
      document.getElementById("mynav").classList.add("bg-gray-900");
    }
  });
    document.addEventListener("scroll", function (e) {
    let currentScroll = window.scrollY + window.innerHeight;
    if (currentScroll < 1000) {
      document.getElementById("mynav").classList.remove("bg-gray-900");
    }
  });
` }] });
const $$Astro$g = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactButton = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$g, $$props, $$slots);
  Astro2.self = $$ContactButton;
  return renderTemplate`${maybeRenderHead($$result)}<div class="text-x box h-full mx-auto mt-8">
  <button type="button" id="form_focus" class="block px-10 py-4 font-medium text-white bg-gradient-to-r  from-red-800 to-red-600 rounded-lg transition-opacity ease-out duration-300 hover:opacity-80 shadow-md shadow-black">
    skontaktuj się z nami
  </button>
</div>

`;
});

const $$file$g = "/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton.astro";
const $$url$g = undefined;

const $$module1$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$g,
  default: $$ContactButton,
  file: $$file$g,
  url: $$url$g
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$f = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Hero.astro", { modules: [{ module: $$module1$2, specifier: "./ContactButton.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [{ type: "inline", value: `
  document.getElementById("form_focus").addEventListener("click", () => {
    document.querySelector("#contact-form-name").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
` }] });
const $$Astro$f = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Hero.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Hero = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$f, $$props, $$slots);
  Astro2.self = $$Hero;
  return renderTemplate`${maybeRenderHead($$result)}<header class="px-4 pt-44 xl:pt-52 text-xl bg-gray-900 box h-full">
  <div class="items-center">
    <div class="w-full text-center">
      <h1 class="text-5xl font-medium text-gray-200 pb-8 md:max-w-3xl mx-auto max-w-xl tracking-normal leading-tight">
        Prywatny detektyw,<br>Biuro detektywistyczne <span class="uppercase">jaran</span>
      </h1>

      <p class="max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto mt-4 text-lg text-gray-200 font-light tracking-wide">
        Świadczymy usługi detektywistyczne i windykacyjne dla osób prywatnych
        oraz podmiotów gospodarczych. Poufność, profesjonalizm, ponad 15-letnie
        doświadczenie oraz indywidualne podejście do klienta to nasze atuty.
        Oferujemy pomoc w każdej sprawie. Sprawa Klienta staje się naszą wspólną
        sprawą.
      </p>

      <div class="flex flex-wrap justify-center mt-8 gap-4">
        ${renderComponent($$result, "ContactButton", $$ContactButton, {})}
      </div>
    </div>
  </div>
</header>

`;
});

const $$file$f = "/home/szymon/Programming/jaran/jaran-website/src/components/Hero.astro";
const $$url$f = undefined;

const $$module3$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$f,
  default: $$Hero,
  file: $$file$f,
  url: $$url$f
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$e = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$e = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Sidebar = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$Sidebar;
  return renderTemplate`${maybeRenderHead($$result)}<div class="hidden xl:flex flex-col bg-red-700 mr-32 rounded-xl text-gray-300 h-full text-left text-lg">
  <nav class="my-5 px-6 w-96">
    <ul>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/detektyw">
          <svg height="68px" width="68px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 501 512.22"><path d="M265.57 75.41v262.38h128.51c1.35 0 2.47 1.11 2.47 2.47v6.76h90.44c7.73 0 14.01 6.27 14.01 14.01 0 2.98-.94 5.76-2.53 8.03-10.33 17.27-15.64 39.18-15.64 61.21 0 21.87 5.24 43.54 15.98 60.5 4.11 6.52 2.15 15.15-4.38 19.26-2.32 1.46-4.9 2.15-7.44 2.15l-414.61.04c-19.82 0-37.53-10.86-50.47-26.54C8.46 469.39 0 447.44 0 427.51c0-19.92 8.35-40.49 21.69-55.69 13.01-14.81 30.85-24.8 50.69-24.8h36.41v-6.76c0-1.36 1.11-2.47 2.47-2.47h128.51V75.53c-11.19-3.88-20.06-12.74-23.96-23.93h-81.25v12.36c0 1.35-1.12 2.47-2.47 2.47h-20.85c-1.36 0-2.47-1.12-2.47-2.47V51.6H88.1c-1.58 0-2.87-1.11-2.87-2.47V28.28c0-1.36 1.29-2.47 2.87-2.47h127.8C221.26 10.77 235.62 0 252.5 0c16.87 0 31.23 10.77 36.59 25.81h128.14c1.58 0 2.88 1.11 2.88 2.47v20.85c0 1.36-1.3 2.47-2.88 2.47h-23.3v12.36c0 1.35-1.11 2.47-2.47 2.47h-20.85c-1.36 0-2.47-1.12-2.47-2.47V51.6h-78.96a38.985 38.985 0 0 1-23.61 23.81zm193.99 393.38H334.33c-4.05 0-7.34-3.28-7.34-7.33 0-4.05 3.29-7.34 7.34-7.34h122.26c-.92-6.1-1.49-12.27-1.69-18.46H331.73c-4.05 0-7.34-3.29-7.34-7.34s3.29-7.34 7.34-7.34h123.34c.31-5.31.87-10.62 1.7-15.86h-89.98c-4.05 0-7.34-3.29-7.34-7.34s3.29-7.33 7.34-7.33h93.01c1.36-5.26 2.98-10.41 4.88-15.41H72.38c-11.22 0-21.72 6.11-29.67 15.17-9.03 10.29-14.69 24.07-14.69 37.3 0 13.68 5.97 28.94 15.46 40.43 7.92 9.6 18.16 16.26 28.9 16.26h392.08c-1.92-5-3.56-10.15-4.9-15.41zM388.38 80.45l82.65 146.03a7.656 7.656 0 0 1 1 3.96h.07c.01.19.02.37.02.55 0 34.78-40.95 62.99-91.44 62.99-49.94 0-90.54-27.6-91.41-61.86a7.663 7.663 0 0 1 1.1-6.17l84.52-145.83c2.12-3.68 6.83-4.93 10.5-2.8 1.33.76 2.34 1.86 2.99 3.13zm.32 31.76v110.36h62.45L388.7 112.21zm-14.74 110.36V112.38L310.1 222.57h63.86zM128.23 80.45l82.65 146.03a7.55 7.55 0 0 1 .99 3.96h.08c0 .19.01.37.01.55 0 34.78-40.94 62.99-91.44 62.99-49.94 0-90.53-27.6-91.41-61.86a7.5 7.5 0 0 1-.22-1.85c0-1.6.48-3.08 1.32-4.32l84.52-145.83a7.688 7.688 0 0 1 10.51-2.8c1.32.76 2.33 1.86 2.99 3.13zm.31 31.76v110.36H191l-62.46-110.36zm-14.73 110.36V112.38L49.95 222.57h63.86zM252.5 21.91c9.34 0 16.92 7.58 16.92 16.93 0 9.34-7.58 16.92-16.92 16.92-9.35 0-16.93-7.58-16.93-16.92 0-9.35 7.58-16.93 16.93-16.93z"></path>
          </svg>
          <span class="mx-4">
            Masz kłopoty w sprawach gospodarczych, karnych, cywilnych,
            rozwodowych?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/windykacja">
          <svg height="68px" width="68px" xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 122.88 102.3"><defs><style>
                .cls-1 {
                  fill-rule: evenodd;
                }
              </style>
            </defs><title>payroll-salary</title><path class="cls-1" d="M111.83,70.4h10.06a1,1,0,0,1,1,1V95.8a1,1,0,0,1-1,1H111.83a1,1,0,0,1-1-1V71.38a1,1,0,0,1,1-1ZM74.23,41.54a5.71,5.71,0,1,1-4,7,5.71,5.71,0,0,1,4-7Zm34.69,11.67L89.6,70.81l-2.36-2.53L101,55.7l.19-.16a3.28,3.28,0,0,0,.16-4.63L78.94,23.59l3.27-3,26.71,32.62ZM.68,15,9.74,12.6a.93.93,0,0,1,1.13.66l5.89,22a.92.92,0,0,1-.65,1.13L7.05,38.8a.92.92,0,0,1-1.13-.65L0,16.16A.92.92,0,0,1,.68,15ZM14,15.68a1.78,1.78,0,0,1,0-1.14c.38-.95,1.85-1.09,2.76-1.34a13.34,13.34,0,0,0,2.72-1,32.71,32.71,0,0,0,3.62-2.38C26.1,7.74,28.89,6,31.81,4,38.31-.52,36-.51,44.3.65A85.94,85.94,0,0,1,54.88,2.82a5.93,5.93,0,0,1,1.41.54,5.62,5.62,0,0,1,1.21,1c4,3.37,7.51,6.9,11,10.47,1.18,1.26,1.87,2.57,1.57,3.59-1.23,4.2-6.56.12-11.73-2.15-2.17-1-5-1.58-7.44-2.47-3-.41-4.53-1.14-7.57-1-4.53.8-3.2,7.25,2.69,5.92,4-.9,13.09.5,16.25,3.19,3,2.5,2.59,5.85-1.78,6.9l-3.81.29c-6.07.47-6,.2-11.68,2.93-3.07,1.47-6.29,3-9.79,3.27-2.12.17-3.41-.36-5.59-1.25a16.31,16.31,0,0,0-3.42-1.24,10.9,10.9,0,0,0-2.94-.42c-1.48,0-3.3,1-4.43,0a2.28,2.28,0,0,1-.65-1.09L14,15.68Zm58.59,6.54L99.38,53.37,78.78,72.14l-29-33.67,6.33-5.76,5.4-.42.47-.08a9.67,9.67,0,0,0,3.78-1.74l-6.44,5.87a4.12,4.12,0,0,1-.27,5.82L76,62.55a4.12,4.12,0,0,1,5.81.27l8.14-7.43a4.11,4.11,0,0,1,.27-5.81l-16.9-20.4h0a4.11,4.11,0,0,1-5.82-.27l-1,.92a3.58,3.58,0,0,0,.26-.29A5.94,5.94,0,0,0,68,27a6,6,0,0,0,0-2.8,7.27,7.27,0,0,0-.31-1c2,.4,3.65.19,4.89-1Zm35.06,72.43V72.6H97.69c-4.2.75-8.4,3-12.61,5.68h-7.7c-3.49.21-5.32,3.74-1.93,6.06,2.7,2,6.27,1.87,9.92,1.55,2.52-.13,2.63,3.26,0,3.27-.91.07-1.9-.15-2.77-.15C78,89,74.29,88.14,72,84.54l-1.15-2.7L59.37,76.16c-5.73-1.89-9.8,4.11-5.58,8.29a150.31,150.31,0,0,0,25.52,15c6.33,3.84,12.65,3.71,19,0l9.33-4.82Z"></path>
          </svg>
          <span class="mx-4">
            Dłużnik nie wywiązuje się z zobowiązań finansowych wobec Ciebie?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/informacja-gospodarcza">
          <svg height="68px" width="68px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 501.76"><path d="M363.49 208.04 439.55 76.3 305.09 0 172.57 229.53c9.52-3.86 19.55-6.42 29.79-7.47l97.06-168.12c12.56 7.15 26.54 3.27 32.77-7.69l52.93 30.56c-6.03 10.61-2.15 24.6 8.77 30.79l-51.68 89.51c7.41 2.99 14.48 6.74 21.28 10.93zM65.73 381.06c6.11 0 11.07 4.96 11.07 11.07 0 6.12-4.96 11.07-11.07 11.07s-11.07-4.95-11.07-11.07c0-6.11 4.96-11.07 11.07-11.07zm322.2-96.59c-.01-2.1.12-4.09.38-5.97l-21.77-14.54c-3.13-2.09-6.56-4.49-10-6.9-12.38-8.67-25.13-17.6-38.87-21.21-7.42-1.95-15.98-3.25-24.75-3.42-7.64-.14-15.44.58-22.77 2.47-4.38 1.14-8.61 2.71-12.53 4.78-3.49 1.84-6.74 4.1-9.63 6.8l-14.62 17.39c-.44.86-1.07 1.6-1.83 2.17l-40.31 47.97c.6 3.07 1.81 5.64 3.46 7.69 1.92 2.38 4.48 4.15 7.43 5.25 3.12 1.17 6.72 1.62 10.53 1.31 6.08-.51 12.56-2.99 18.41-7.62l11.2-9.26c2.83-2.34 5.19-4.49 7.53-6.64 5.17-4.72 10.34-9.44 15.76-12.67 12.56-7.5 25.06-7.74 37.43 13l63.38 114.32h21.55l.02-134.92zm5.1-18.3c.98-1.36 2.1-2.61 3.36-3.74 5.53-4.98 13.45-7.41 23.61-7.42v-.03l55.1.02c11.53-.05 20.91 2.06 27.4 7.06 7.23 5.56 10.62 14.04 9.17 26.19l-12.18 125.88c-.89 11.24-3.86 20.05-9.15 26.14-5.63 6.47-13.47 9.66-23.74 9.23l-49.55.01c-6.94.36-12.82-1.52-17.74-5.46-3.61-2.87-6.59-6.81-8.98-11.72h-17.14c2.31 6.75 2.19 13.15.35 18.84-1.9 5.85-5.59 10.84-10.3 14.57-4.61 3.66-10.24 6.16-16.12 7.13-5.75.94-11.76.42-17.35-1.9-6.5 6.8-13.35 11.08-20.49 13.05-7.17 1.97-14.43 1.57-21.78-1.01-6.97 7.73-14.68 12.58-23.17 14.42-8.65 1.87-17.85.58-27.59-4.01-3.04 2.37-6.22 4.25-9.53 5.62-4.71 1.95-9.65 2.85-14.8 2.7-12.35-.37-20.67-4.02-27.29-9.94-6.31-5.64-10.56-12.89-15.35-21.23l-27.31-47.64h-21.18c-1.19 5.97-3.24 11.04-6.28 15.11l-.3.42c-5.4 6.94-13.33 10.63-24.29 10.41l-46.21.01c-9.16 1.48-17.01-.76-23.15-7.88-5.44-6.31-9.16-16.51-10.74-31.53l-.07-.55L.69 290.63c-1.89-12.77.2-21.8 5.33-27.97 5.18-6.22 12.98-9.03 22.6-9.48l.8-.05h58.5v.03c9.25-.11 17.19 1.42 23.19 5.3v.02c4.85 3.14 8.33 7.56 10.12 13.57h39.81c10-6.75 19.37-12.05 29.73-15.28 10.17-3.17 21.08-4.28 34.11-2.72l13.62-16.21.51-.54c3.8-3.61 8.05-6.58 12.62-8.99 4.8-2.53 9.96-4.45 15.3-5.83 8.5-2.2 17.46-3.04 26.19-2.88 9.89.18 19.5 1.64 27.8 3.82l.02.01c15.89 4.16 29.62 13.78 42.95 23.12 3.18 2.23 6.35 4.45 9.79 6.74l19.35 12.88zm-283.38 14.14a6.457 6.457 0 0 1-.24-2.33c-.71-4.16-2.53-6.97-5.23-8.72-3.77-2.41-9.36-3.35-16.19-3.27h-.07v.03l-58.75-.01c-6.05.29-10.69 1.74-13.28 4.86-2.79 3.34-3.79 9.11-2.43 18.05l.06.59 9.56 118.61c1.3 12.26 3.94 20.14 7.68 24.48 2.96 3.42 7 4.4 11.85 3.52.39-.07.78-.11 1.16-.11l46.27-.02.69.04c6.48.11 10.97-1.83 13.8-5.47l.23-.28c3.13-4.25 4.67-10.81 4.91-19.21l-.02-130.76zm12.89 129.74h23.64c2.5 0 4.67 1.42 5.74 3.5l29.03 50.63c4.25 7.41 8 13.83 12.73 18.06 4.42 3.95 10.21 6.4 19.09 6.66 3.33.1 6.52-.48 9.56-1.73 1.86-.77 3.69-1.81 5.48-3.11l-18.91-35.39a6.41 6.41 0 0 1 2.64-8.68c3.13-1.67 7.02-.49 8.68 2.64l20.56 38.47c7.66 3.89 14.59 5.1 20.83 3.75 5.7-1.24 11.08-4.66 16.14-10.19l-29.63-46.5a6.422 6.422 0 0 1 1.97-8.86 6.409 6.409 0 0 1 8.85 1.97l31.23 49.01c5.47 2.22 10.73 2.73 15.74 1.36 4.78-1.32 9.57-4.39 14.36-9.34l-28.29-53.25a6.44 6.44 0 0 1 2.66-8.71 6.452 6.452 0 0 1 8.71 2.67l29.26 55.09c3.81 2.2 8.21 2.78 12.45 2.08 3.7-.6 7.26-2.19 10.18-4.5 2.81-2.24 5-5.13 6.07-8.44 1.17-3.63 1.05-7.9-.97-12.54-.42-.96-.59-1.98-.52-2.97a6.418 6.418 0 0 1-3.66-4.25l-64.22-115.85c-7.14-11.94-13.58-12.25-19.8-8.55-4.41 2.63-9.05 6.88-13.7 11.12-2.81 2.57-5.64 5.16-7.98 7.09l-11.4 9.39c-7.94 6.31-16.88 9.7-25.36 10.41-5.63.46-11.13-.26-16.06-2.11-5.1-1.91-9.57-5.02-12.96-9.23-3.66-4.54-6.05-10.29-6.62-17.13-.16-1.97.58-3.79 1.87-5.09l34.71-41.3c-7.38-.1-13.91.91-20.04 2.82-9.35 2.9-18.07 7.99-27.62 14.5a6.45 6.45 0 0 1-3.99 1.38h-40.45v125.12zm321.98-28.99c6.11 0 11.07 4.96 11.07 11.07 0 6.12-4.96 11.07-11.07 11.07-6.12 0-11.08-4.95-11.08-11.07 0-6.11 4.96-11.07 11.08-11.07zm-145.85-249.3c-19.45-.76-35.83 14.38-36.59 33.83-.36 9.02 2.71 17.37 8.03 23.81 17.1-2.74 35.84-1.84 52.74 1.83a35.079 35.079 0 0 0 9.66-22.88c.76-19.45-14.39-35.83-33.84-36.59zM145.94 240.18 262.77 37.83l-19.01-10.78-117.45 203.43c4.41 2.6 8.76 6.05 12.27 9.7h7.36z"></path>
          </svg>
          <span class="mx-4">
            Chcesz mieć wiedzę o swoim kontrahencie bądź przeciwniku biznesowym?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/ochrona-biznesu">
          <svg height="70px" width="70px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 396.63"><path fill-rule="nonzero" d="M12.41 86.41h16.73V45.33c0-5.71 4.62-10.33 10.32-10.33h18.39V10.34C57.85 4.63 62.46 0 68.17 0h167.74c5.71 0 10.33 4.63 10.33 10.34V35h226.23c5.71 0 10.33 4.62 10.33 10.33v41.08h18.87c5.71 0 10.33 4.63 10.33 10.33 0 2.24-.72 5.65-1.04 7.96l-35.37 260.06c-2.3 17.16-14.98 31.87-33.12 31.87H61.26c-18.25 0-31.31-14.71-33.2-32.17L.06 97.83c-.59-5.67 3.53-10.76 9.21-11.34 1.11-.11 1.98-.08 3.14-.08zm187.63 127.81h2.92v-9c0-15.03 5.93-28.74 15.47-38.7 9.63-10.03 22.92-16.27 37.57-16.27 14.65 0 27.95 6.23 37.56 16.27 9.55 9.96 15.48 23.66 15.48 38.7v9h2.93c4.75 0 8.65 3.89 8.65 8.65v85.59c0 4.76-3.9 8.65-8.65 8.65H200.04c-4.77 0-8.66-3.89-8.66-8.65v-85.59c0-4.76 3.89-8.65 8.66-8.65zm49.11 55.33-9.02 23.61h31.73l-8.34-23.94c5.3-2.72 8.92-8.24 8.92-14.61 0-9.08-7.36-16.44-16.45-16.44-9.07 0-16.43 7.36-16.43 16.44 0 6.62 3.92 12.34 9.59 14.94zm-29.8-55.33h73.3v-9c0-10.69-4.16-20.38-10.86-27.38-6.64-6.92-15.77-11.21-25.79-11.21-10.03 0-19.15 4.29-25.79 11.21-6.71 7-10.86 16.69-10.86 27.38v9zM21.84 107.12l26.79 255.26c.7 6.79 5.18 13.63 12.63 13.63h381.21c7.56 0 11.74-7.21 12.67-13.92l34.65-254.93c-155.98-.02-311.96-.04-467.95-.04zM49.8 55.71v30.66l412.33-4.38V55.71H235.91c-5.71 0-10.34-4.63-10.34-10.34V20.71H78.51v24.66c0 5.71-4.63 10.34-10.34 10.34H49.8z"></path>
          </svg>
          <span class="mx-4">
            Tajemnice Twojego przedsiębiorstwa dostały się w niepowołane ręce?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/detektyw">
          <svg height="45px" width="45px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 122.88 101.54" style="enable-background:new 0 0 122.88 101.54" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;}</style><g><path class="st0" d="M66.45,11.99C72.23,6,77.7,1.31,87.33,0.21c22.83-2.62,43.82,20.75,32.29,43.76 c-3.28,6.56-9.96,14.35-17.35,21.99c-8.11,8.4-17.08,16.62-23.37,22.86l-6.8,6.74l-7.34-10.34l8.57-12.08l-7.09-6.45l5.89-7.76 l-8.17-11.52l8.17-11.52l-5.89-7.76l7.09-6.45L66.45,11.99L66.45,11.99z M55.81,101.54l-10.04-9.67 C28.73,75.46,0.94,54.8,0.02,29.21C-0.62,11.28,13.53-0.21,29.8,0c13.84,0.18,20.05,6.74,28.77,15.31l3.49,4.92l-2.02,1.83 l-0.01-0.01l-0.65,0.61l-4.54,4.13l0.06,0.08l-0.05,0.04l2.64,3.47l1.65,2.24l0.03-0.03l2.39,3.15l-8,11.28l-0.07,0.06l0.01,0.02 l-0.01,0.02l0.07,0.06l8,11.28l-2.39,3.15l-0.03-0.03l-1.64,2.23l-2.64,3.48l0.05,0.04l-0.06,0.08l4.54,4.13l0.65,0.61l0.01-0.01 l2.02,1.83l-7.73,10.89l0.05,0.05l-0.05,0.05l7.73,10.89l-2.02,1.83l-0.01-0.01l-0.65,0.61L55.81,101.54L55.81,101.54z"></path></g></svg>
          <span class="mx-4"> Podejrzewasz zdradę bliskiej Ci osoby?</span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/ochrona-biznesu">
          <svg height="60px" width="60px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 511 512.35"><path d="M162.62 21.9c-5.49 5.43-10.63 12.02-15.42 19.71-17.37 27.82-30.33 69.99-39.92 123.16-56.3 10.64-91.06 34.14-89.9 58.14 1.04 21.74 28.46 38.41 69.67 49.92-2.71 8.38-2.07 9.82 1.6 20.13-30.78 12.98-62.94 52.4-88.65 86.93l100.03 67.61-35.32 64.85h384.41l-37.26-64.85L511 378.63c-29.08-40.85-64.19-75.56-86.12-84.98 4.63-12.02 5.44-14.12 1.56-20.79 41.21-11.72 68.23-28.84 68.17-51.47-.06-24.68-35.5-48.38-88.31-56.62-12.64-53.5-25.22-95.62-41.23-123.27-2.91-5.02-5.93-9.57-9.09-13.62-47.66-61.12-64.36-2.69-98.14-2.76-39.17-.08-44.15-53.69-95.22-3.22zm67.12 398.37c-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47h10.52c1.38 0 2.66.44 3.7 1.17 3.77 2.1 7.46 3.33 11.01 3.42 3.54.09 7.14-.96 10.8-3.45a6.515 6.515 0 0 1 3.61-1.11l12.78-.03c3.57 0 6.46 2.9 6.46 6.47s-2.89 6.47-6.46 6.47h-10.95c-5.46 3.27-10.98 4.67-16.54 4.53-5.44-.14-10.78-1.77-16.01-4.53h-8.92zm-69.12-140.78c60.43 21.74 120.87 21.38 181.3 1.83-58.45 4.75-122.79 3.62-181.3-1.83zm208.37-.86c20.89 70.63-68.53 106.5-101.95 27.98h-22.11c-34.12 78.28-122.14 44.17-102.16-28.94-7.31-.8-14.51-1.68-21.56-2.62l-.32 1.88-.59 3.56-3.48 20.87c-30.39-6.72-13.36 71.77 14.26 64.87 4.22 12.18 7.69 22.62 11.26 32.19 36.81 98.83 190.88 104.81 226.95 6.36 3.78-10.32 6.85-21.64 11.24-35.39 25.44 4.06 46.35-73.31 15.34-67.63l-3.19-21.05-.55-3.65-.23-1.54c-7.47 1.16-15.12 2.2-22.91 3.11zM123.7 176.34l7.43-25.43c48.16 40.42 214.59 34.09 250.87 0l6.26 25.43c-42.31 44.75-219.33 38.67-264.56 0z"></path></svg>
          <span class="mx-4">
            Podejrzewasz, że jesteś szpiegowany, podsłuchiwany?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/ochrona-biznesu">
          <svg height="55px" width="55px" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="512px" height="512px" version="1.1" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 512">
  <path fill="black" fill-rule="nonzero" d="M423.51 61.53c-5.02,-5.03 -10.92,-7.51 -17.75,-7.51 -6.82,0 -12.8,2.48 -17.75,7.51l-27.05 26.97c-7.25,-4.7 -14.93,-8.8 -22.95,-12.47 -8.02,-3.67 -16.22,-6.82 -24.5,-9.55l0 -41.48c0,-7 -2.38,-12.89 -7.25,-17.75 -4.86,-4.86 -10.75,-7.25 -17.75,-7.25l-52.05 0c-6.66,0 -12.45,2.39 -17.49,7.25 -4.95,4.86 -7.43,10.75 -7.43,17.75l0 37.98c-8.7,2.04 -17.15,4.6 -25.26,7.76 -8.19,3.16 -15.95,6.74 -23.29,10.75l-29.96 -29.53c-4.69,-4.94 -10.4,-7.5 -17.32,-7.5 -6.83,0 -12.71,2.56 -17.75,7.5l-36.43 36.54c-5.03,5.03 -7.51,10.92 -7.51,17.73 0,6.83 2.48,12.81 7.51,17.75l26.97 27.06c-4.7,7.26 -8.79,14.93 -12.46,22.95 -3.68,8.02 -6.83,16.22 -9.56,24.49l-41.47 0c-7.01,0 -12.9,2.39 -17.76,7.26 -4.86,4.86 -7.25,10.75 -7.25,17.75l0 52.05c0,6.65 2.39,12.46 7.25,17.5 4.86,4.94 10.75,7.42 17.76,7.42l37.97 0c2.04,8.7 4.6,17.15 7.76,25.25 3.17,8.2 6.75,16.13 10.75,23.81l-29.52 29.44c-4.95,4.7 -7.51,10.41 -7.51,17.33 0,6.82 2.56,12.71 7.51,17.75l36.53 36.95c5.03,4.69 10.92,7 17.75,7 6.82,0 12.79,-2.31 17.75,-7l27.04 -27.48c7.26,4.69 14.94,8.78 22.96,12.46 8.02,3.66 16.21,6.83 24.49,9.55l0 41.48c0,7 2.39,12.88 7.25,17.74 4.86,4.87 10.76,7.26 17.75,7.26l52.05 0c6.66,0 12.46,-2.39 17.5,-7.26 4.94,-4.86 7.42,-10.74 7.42,-17.74l0 -37.98c8.7,-2.04 17.15,-4.6 25.25,-7.76 8.2,-3.16 16.14,-6.74 23.81,-10.75l29.44 29.53c4.7,4.95 10.49,7.5 17.51,7.5 7.07,0 12.87,-2.55 17.57,-7.5l36.95 -36.53c4.69,-5.04 7,-10.92 7,-17.75 0,-6.82 -2.31,-12.8 -7,-17.75l-27.48 -27.05c4.7,-7.26 8.79,-14.93 12.46,-22.96 3.66,-8.01 6.83,-16.21 9.56,-24.49l41.47 0c7,0 12.88,-2.4 17.74,-7.25 4.87,-4.87 7.26,-10.75 7.26,-17.75l0 -52.05c0,-6.66 -2.39,-12.45 -7.26,-17.5 -4.86,-4.95 -10.74,-7.42 -17.74,-7.42l-37.98 0c-2.04,-8.36 -4.6,-16.73 -7.76,-25 -3.16,-8.37 -6.74,-16.21 -10.75,-23.56l29.53 -29.95c4.95,-4.69 7.5,-10.41 7.5,-17.32 0,-6.83 -2.55,-12.71 -7.5,-17.75l-36.53 -36.43zm-48.41 257.98c-22.72,42.52 -67.54,71.44 -119.1,71.44 -51.58,0 -96.37,-28.92 -119.09,-71.42 2.66,-11.61 7.05,-21.74 19.9,-28.84 17.76,-9.89 48.34,-9.15 62.89,-22.24l20.1 52.78 10.1 -28.77 -4.95 -5.42c-3.72,-5.44 -2.44,-11.62 4.46,-12.74 2.33,-0.37 4.95,-0.14 7.47,-0.14 2.69,0 5.68,-0.25 8.22,0.32 6.41,1.41 7.07,7.62 3.88,12.56l-4.95 5.42 10.11 28.77 18.18 -52.78c13.12,11.8 48.43,14.18 62.88,22.24 12.89,7.22 17.26,17.24 19.9,28.82zm-159.11 -86.45c-1.82,0.03 -3.31,-0.2 -4.93,-1.1 -2.15,-1.19 -3.67,-3.24 -4.7,-5.55 -2.17,-4.86 -3.89,-17.63 1.57,-21.29l-1.02 -0.66 -0.11 -1.41c-0.21,-2.57 -0.26,-5.68 -0.32,-8.95 -0.2,-12 -0.45,-26.56 -10.37,-29.47l-4.25 -1.26 2.81 -3.38c8.01,-9.64 16.38,-18.07 24.82,-24.54 9.55,-7.33 19.26,-12.2 28.75,-13.61 9.77,-1.44 19.23,0.75 27.97,7.62 2.57,2.03 5.08,4.48 7.5,7.33 9.31,0.88 16.94,5.77 22.38,12.75 3.24,4.16 5.71,9.09 7.29,14.33 1.56,5.22 2.24,10.77 1.95,16.23 -0.53,9.8 -4.2,19.35 -11.61,26.33 1.3,0.04 2.53,0.33 3.61,0.91 4.14,2.15 4.27,6.82 3.19,10.75 -1.08,3.28 -2.44,7.08 -3.73,10.28 -1.56,4.31 -3.85,5.12 -8.27,4.65 -9.93,43.45 -69.98,44.93 -82.53,0.04zm40.01 -135.69c87.64,0 158.63,71.04 158.63,158.63 0,87.64 -71.04,158.63 -158.63,158.63 -87.63,0 -158.63,-71.04 -158.63,-158.63 0,-87.64 71.04,-158.63 158.63,-158.63z"></path>
</svg>
          <span class="mx-4">
            Twój pracownik jest nieuczciwy lub nielojalny?
          </span>
        </a>
      </li>
    </ul>
  </nav>
</div>`;
});

const $$file$e = "/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar.astro";
const $$url$e = undefined;

const $$module2$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$e,
  default: $$Sidebar,
  file: $$file$e,
  url: $$url$e
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$d = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Footer.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$d = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Footer.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Footer = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$Footer;
  return renderTemplate`${maybeRenderHead($$result)}<footer>
  <div class="w-full bg-gradient-to-t from-stone-900 via-gray-900 to-gray-900 pt-14">
    <div class="container m-auto px-6 py-6 space-y-8 text-gray-300 lg:px-12">
      <div class="grid grid-cols-7 gap-6 lg:gap-0">
        <div class="col-span-8 lg:col-span-2">
          <div class="hidden gap-6 items-center justify-between py-6 lg:py-0 lg:border-none lg:block lg:space-y-6">
            <img src="logo-stare.png" alt="logo jaran">
            <p class="text-lg">
              Profesjonalna firma świadcząca usługi detektywistyczne i
              windykacyjne. Posiadamy doświadczenie, umiejętności i determinację
              w rozwiązywaniu Twoich trudnych spraw. Sprawdź nas!
            </p>
          </div>
        </div>
        <div class="col-span-8 lg:col-span-5">
          <div class="lg:pl-16 pb-16 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <h6 class="text-xl font-extrabold">Przydatne linki</h6>
              <ul class="list-inside mt-4 space-y-4">
                <li>
                  <a href="#" class="hover:text-red-600">Detektyw</a>
                </li>
                <li>
                  <a href="#" class="hover:text-red-600">Windykacja</a>
                </li>
                <li>
                  <a href="#" class="hover:text-red-600">Informacja Gospodarcza</a>
                </li>
                <li>
                  <a href="#" class="hover:text-red-600">Ochrona biznesu</a>
                </li>
                <li>
                  <a href="#" class="hover:text-red-600">Cennik</a>
                </li>
                <li>
                  <a href="#" class="hover:text-red-600">Kontakt</a>
                </li>
              </ul>
            </div>
            <div>
              <h6 class="text-xl font-extrabold">Dane firmy</h6>
              <p class="list-inside mt-4 space-y-4">
                Zezwolenie MSWiA RD-45/2008
              </p>
              <p class="list-inside mt-4 space-y-4">
                Polisa Ubezpieczeniowa OC Zawodowej
              </p>
              <p class="list-inside mt-4 space-y-4">Licencja nr 0003798</p>
              <p class="list-inside mt-4 space-y-4">NIP: 526-139-57-09</p>
            </div>
            <div>
              <h6 class="text-xl font-extrabold">Kontakt</h6>
              <p class="list-inside mt-4 space-y-4">ul. Poznańska 24 lok. 21</p>
              <p class="list-inside mt-4 space-y-4">00-685 Warszawa</p>
              <p class="list-inside mt-4 space-y-4">tel: +48 22 622 14 08</p>
              <p class="list-inside mt-4 space-y-4">tel: +48 669 981 964</p>
              <p class="list-inside mt-4 space-y-4">
                email: biuro@jaran.com.pl
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</footer>`;
});

const $$file$d = "/home/szymon/Programming/jaran/jaran-website/src/components/Footer.astro";
const $$url$d = undefined;

const $$module1$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$d,
  default: $$Footer,
  file: $$file$d,
  url: $$url$d
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$c = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Form.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$c = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Form.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Form = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$Form;
  return renderTemplate`${maybeRenderHead($$result)}<div class="flex flex-col flex-wrap-reverse content-center w-full bg-gray-900 pb-12 relative">
  <form class="flex w-full max-w-xl space-x-3">
    <div class="w-full max-w-2xl px-5 py-10 m-auto mt-10 bg-white rounded-lg shadow dark:bg-gray-800">
      <div class="mb-6 text-3xl font-light text-center text-gray-800 dark:text-white">
        Skontaktuj się z nami
      </div>
      <div class="grid max-w-xl grid-cols-2 gap-4 m-auto">
        <div class="col-span-2 lg:col-span-1">
          <div class="relative">
            <input type="text" id="contact-form-name" class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent" placeholder="Imie">
          </div>
        </div>
        <div class="col-span-2 lg:col-span-1">
          <div class="relative">
            <input type="text" id="contact-form-email" class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent" placeholder="email">
          </div>
        </div>
        <div class="col-span-2">
          <label class="text-gray-700" for="name">
            <textarea class="flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent" id="comment" placeholder="Enter your comment" name="comment" rows="5" cols="40">            </textarea>
          </label>
        </div>
        <div class="col-span-2 text-right">
          <button type="submit" class="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-indigo-200 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg">
            Wyślij
          </button>
        </div>
      </div>
    </div>
  </form>
</div>`;
});

const $$file$c = "/home/szymon/Programming/jaran/jaran-website/src/components/Form.astro";
const $$url$c = undefined;

const $$module2$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$c,
  default: $$Form,
  file: $$file$c,
  url: $$url$c
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$b = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Nav.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [{ type: "inline", value: `
  document.getElementById("nav-toggle").onclick = function () {
    document.getElementById("nav-content").classList.toggle("hidden");
  };
` }] });
const $$Astro$b = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Nav.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Nav = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$Nav;
  return renderTemplate`${maybeRenderHead($$result)}<nav id="mynav" class="fixed w-full z-20 top-0 opacity-95">
  <div class="w-full sm:w-5/6 mx-auto flex items-start justify-between mt-0 py-5">
    <div class="ml-0">
      <a href="/" class="flex py-4">
        <img src="logo-stare.png" alt="logo" class="object-fill t-0 my-auto w-10/12 pl-10 xl:pl-0">
      </a>
    </div>

    <div class="flex flex-col items-end my-auto">
      <div class="block xl:hidden pr-4">
        <button id="nav-toggle" class="flex items-center px-4 mx-4 py-3 border rounded text-gray-500 border-gray-500 hover:text-gray-100 hover:border-grey-100 appearance-none focus:outline-none">
          <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"></path>
          </svg>
        </button>
      </div>

      <div class="pr-4 xl:pr-0 hidden w-full items-center flex-grow xl:flex xl:items-center xl:w-auto mt-5 xl:mt-0 bg-inherit z-20" id="nav-content">
        <ul class="xl:flex text-xl font-medium justify-end flex-1 xl:text-center text-end">
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="/detektyw">Detektyw
            </a>
          </li>
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="/windykacja">Windykacja</a>
          </li>
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="/informacja-gospodarcza">Informacja Gospodarcza</a>
          </li>
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="/ochrona-biznesu">Ochrona biznesu</a>
          </li>
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="/cennik">Cennik</a>
          </li>
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="/kontakt">Kontakt</a>
          </li>
          <li class="mr-3 my-3 xl:w-28 place-self-center">
            <a class="inline-block text-gray-300 no-underline hover:text-red-600 py-2 px-4 link" href="#">
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" width="50px" height="50px" viewBox="0 0 800 800" enable-background="new 0 0 800 800" xml:space="preserve">
                <g>
                  <polygon fill="#103B9B" points="24.807,331.323 24.807,232.411 173.175,331.323  "></polygon>
                  <polygon fill="#103B9B" points="25.807,234.279 25.807,330.323 169.872,330.323  "></polygon>
                  <polygon fill="#103B9B" points="154.567,153.839 331.322,153.839 331.322,271.675  "></polygon>
                  <polygon fill="#103B9B" points="330.322,154.839 157.87,154.839 330.322,269.807  "></polygon>
                  <polygon fill="#103B9B" points="24.807,468.678 173.175,468.678 24.807,567.589  "></polygon>
                  <polygon fill="#103B9B" points="25.807,469.678 25.807,565.721 169.872,469.678  "></polygon>
                  <polygon fill="#103B9B" points="468.678,153.839 645.433,153.839 468.678,271.675  "></polygon>
                  <polygon fill="#103B9B" points="642.13,154.839 469.678,154.839 469.678,269.807  "></polygon>
                  <polygon fill="#103B9B" points="626.825,331.323 775.193,232.411 775.193,331.323  "></polygon>
                  <polygon fill="#103B9B" points="774.193,330.323 774.193,234.279 630.128,330.323  "></polygon>
                  <polygon fill="#103B9B" points="154.567,646.161 331.322,528.323 331.322,646.161  "></polygon>
                  <polygon fill="#103B9B" points="157.87,645.161 330.322,645.161 330.322,530.191  "></polygon>
                  <polygon fill="#103B9B" points="626.825,468.678 775.193,468.678 775.193,567.589  "></polygon>
                  <polygon fill="#103B9B" points="774.193,565.721 774.193,469.678 630.128,469.678  "></polygon>
                  <polygon fill="#103B9B" points="468.678,646.161 468.678,528.323 645.433,646.161  "></polygon>
                  <polygon fill="#103B9B" points="469.678,645.161 642.13,645.161 469.678,530.191  "></polygon>
                  <polygon fill="#FFFFFF" points="642.13,154.839 469.678,269.807 469.678,154.839 450.322,154.839 450.322,349.677 774.193,349.677    774.193,330.323 630.128,330.323 774.193,234.279 774.193,166.045 527.778,330.323 481.254,330.323 469.678,330.323    469.678,313.244 469.678,282.228 660.743,154.839  "></polygon>
                  <polygon fill="#FFFFFF" points="157.87,645.161 330.322,530.191 330.322,645.161 349.678,645.161 349.678,450.322 25.807,450.322    25.807,469.678 169.872,469.678 25.807,565.721 25.807,633.954 272.222,469.678 318.746,469.678 330.322,469.678 330.322,486.77    330.322,517.786 139.262,645.161  "></polygon>
                  <polygon fill="#ED1F34" points="52.217,646.161 318.443,468.678 331.322,468.678 331.322,487.305 93.041,646.161  "></polygon>
                  <polygon fill="#ED1F34" points="318.746,469.678 55.52,645.161 92.738,645.161 330.322,486.77 330.322,469.678  "></polygon>
                  <polygon fill="#ED1F34" points="234.126,331.323 24.807,191.44 24.807,164.177 275.525,331.323  "></polygon>
                  <polygon fill="#ED1F34" points="25.807,166.045 25.807,190.906 234.429,330.323 272.222,330.323  "></polygon>
                  <polygon fill="#ED1F34" points="524.476,468.678 564.026,468.678 775.193,609.788 775.193,635.822  "></polygon>
                  <polygon fill="#ED1F34" points="774.193,633.954 774.193,610.322 563.723,469.678 527.778,469.678  "></polygon>
                  <polygon fill="#ED1F34" points="468.678,331.323 468.678,312.708 706.959,153.839 747.783,153.839 481.557,331.323  "></polygon>
                  <polygon fill="#ED1F34" points="481.254,330.323 744.48,154.839 707.262,154.839 469.678,313.244 469.678,330.323  "></polygon>
                  <path d="M800,657.979v-54.572c0-0.021,0-0.041,0-0.062V142.02c0-0.014,0-0.025,0-0.039v-0.045c0-0.076-0.011-0.15-0.012-0.226   c-0.006-0.348-0.02-0.693-0.054-1.041c-0.014-0.148-0.041-0.291-0.061-0.436c-0.036-0.272-0.07-0.545-0.125-0.815   c-0.038-0.189-0.09-0.374-0.136-0.561c-0.054-0.22-0.104-0.44-0.169-0.659c-0.069-0.227-0.153-0.446-0.232-0.666   c-0.063-0.172-0.118-0.346-0.189-0.516c-0.111-0.27-0.239-0.53-0.368-0.79c-0.059-0.119-0.108-0.237-0.17-0.354   c-0.178-0.33-0.37-0.65-0.573-0.963c-0.027-0.043-0.05-0.088-0.077-0.131c-0.002-0.003-0.005-0.007-0.009-0.01   c-0.241-0.359-0.497-0.708-0.772-1.042c-0.125-0.153-0.265-0.289-0.396-0.435c-0.146-0.162-0.287-0.331-0.442-0.485   c-0.217-0.217-0.447-0.417-0.678-0.616c-0.084-0.072-0.162-0.153-0.249-0.224c-0.221-0.181-0.451-0.344-0.682-0.509   c-0.11-0.08-0.217-0.167-0.33-0.243c-0.2-0.134-0.408-0.251-0.614-0.374c-0.158-0.094-0.313-0.194-0.475-0.28   c-0.164-0.088-0.334-0.162-0.503-0.243c-0.215-0.103-0.427-0.21-0.646-0.303c-0.126-0.052-0.255-0.093-0.382-0.14   c-0.267-0.1-0.532-0.201-0.806-0.285c-0.1-0.031-0.201-0.05-0.303-0.078c-0.301-0.083-0.602-0.167-0.91-0.227   c-0.138-0.027-0.276-0.04-0.414-0.063c-0.298-0.05-0.596-0.1-0.9-0.127c-0.398-0.038-0.8-0.06-1.202-0.06   c-0.009-0.002-0.018-0.002-0.024-0.002h-83.654c-0.016,0-0.029,0-0.045,0H12.903c-0.007,0-0.014,0-0.021,0   c-0.403,0.002-0.805,0.022-1.206,0.06c-0.351,0.033-0.695,0.088-1.038,0.148c-0.091,0.016-0.183,0.024-0.272,0.042   c-0.337,0.067-0.666,0.155-0.993,0.248c-0.072,0.021-0.146,0.035-0.218,0.057c-0.296,0.089-0.583,0.198-0.871,0.308   c-0.105,0.04-0.213,0.072-0.316,0.117c-0.241,0.1-0.473,0.215-0.706,0.33c-0.146,0.072-0.298,0.136-0.442,0.213   c-0.184,0.098-0.359,0.21-0.538,0.318c-0.184,0.11-0.372,0.215-0.552,0.335c-0.136,0.091-0.262,0.193-0.394,0.288   c-0.208,0.151-0.42,0.299-0.621,0.464c-0.108,0.088-0.207,0.188-0.312,0.279c-0.208,0.182-0.42,0.363-0.618,0.561   c-0.189,0.188-0.361,0.391-0.539,0.59c-0.1,0.114-0.207,0.217-0.303,0.333c-0.275,0.334-0.532,0.682-0.772,1.041   c-0.003,0.005-0.007,0.009-0.01,0.014c-0.033,0.05-0.059,0.104-0.091,0.153c-0.198,0.306-0.389,0.618-0.561,0.939   c-0.065,0.12-0.117,0.246-0.177,0.368c-0.126,0.256-0.253,0.511-0.361,0.776c-0.072,0.174-0.129,0.351-0.193,0.526   c-0.079,0.218-0.162,0.434-0.23,0.657c-0.067,0.22-0.115,0.44-0.17,0.663c-0.046,0.186-0.098,0.368-0.134,0.557   c-0.053,0.272-0.089,0.545-0.125,0.819c-0.019,0.145-0.046,0.288-0.06,0.434c-0.035,0.348-0.046,0.695-0.053,1.041   C0.01,141.786,0,141.86,0,141.936v0.045c0,0.014,0,0.025,0,0.039v55.811c0,0.016,0,0.029,0,0.044v460.104c0,0.014,0,0.025,0,0.04   v0.044c0,0.076,0.01,0.15,0.012,0.226c0.005,0.348,0.019,0.693,0.053,1.041c0.014,0.146,0.041,0.289,0.06,0.436   c0.036,0.273,0.071,0.545,0.125,0.817c0.038,0.188,0.09,0.373,0.136,0.561c0.053,0.22,0.103,0.44,0.168,0.659   c0.069,0.225,0.151,0.441,0.232,0.662c0.063,0.174,0.119,0.35,0.191,0.521c0.11,0.268,0.239,0.526,0.366,0.784   c0.059,0.119,0.108,0.239,0.172,0.357c0.177,0.331,0.37,0.65,0.573,0.964c0.027,0.043,0.05,0.088,0.078,0.131   c0.001,0.003,0.005,0.007,0.007,0.01c0.278,0.417,0.585,0.811,0.908,1.191c0.1,0.118,0.207,0.227,0.31,0.342   c0.224,0.246,0.458,0.481,0.699,0.709c0.134,0.126,0.268,0.249,0.406,0.368c0.256,0.22,0.523,0.427,0.797,0.628   c0.115,0.084,0.224,0.176,0.34,0.255c0.389,0.265,0.792,0.507,1.209,0.73c0.1,0.054,0.203,0.097,0.305,0.146   c0.335,0.167,0.676,0.322,1.027,0.461c0.133,0.052,0.265,0.099,0.397,0.146c0.332,0.119,0.669,0.222,1.012,0.313   c0.136,0.036,0.272,0.073,0.41,0.104c0.354,0.081,0.714,0.145,1.079,0.196c0.125,0.018,0.25,0.043,0.375,0.057   c0.459,0.052,0.926,0.083,1.399,0.084c0.022,0,0.044,0.004,0.068,0.004c0.005,0,0.012,0,0.018,0h83.623c0.017,0,0.036,0,0.053,0   h690.458c0.005,0,0.013,0.002,0.018,0.002c0.022,0,0.045-0.004,0.067-0.004c0.473-0.002,0.938-0.032,1.398-0.084   c0.124-0.014,0.246-0.04,0.369-0.057c0.367-0.052,0.73-0.115,1.086-0.198c0.135-0.031,0.269-0.067,0.402-0.104   c0.348-0.093,0.688-0.197,1.022-0.316c0.131-0.046,0.26-0.091,0.389-0.143c0.356-0.14,0.702-0.298,1.041-0.466   c0.097-0.049,0.196-0.09,0.292-0.142c0.42-0.224,0.824-0.468,1.215-0.732c0.113-0.078,0.221-0.167,0.33-0.248   c0.277-0.201,0.548-0.411,0.806-0.635c0.138-0.119,0.271-0.241,0.402-0.365c0.244-0.229,0.477-0.466,0.704-0.712   c0.103-0.113,0.208-0.222,0.308-0.339c0.323-0.38,0.63-0.775,0.908-1.19c0.002-0.004,0.005-0.007,0.007-0.011   c0.029-0.043,0.05-0.087,0.078-0.13c0.203-0.313,0.396-0.632,0.572-0.964c0.063-0.117,0.112-0.237,0.171-0.354   c0.129-0.26,0.256-0.52,0.368-0.79c0.07-0.17,0.125-0.344,0.188-0.516c0.081-0.221,0.164-0.44,0.232-0.666   c0.065-0.219,0.115-0.438,0.169-0.657c0.047-0.188,0.098-0.371,0.136-0.563c0.054-0.27,0.09-0.544,0.124-0.815   c0.019-0.146,0.047-0.289,0.062-0.437c0.035-0.346,0.047-0.693,0.054-1.039c0.002-0.076,0.012-0.15,0.012-0.226v-0.045   C800,658.006,800,657.992,800,657.979z M469.678,313.244l237.584-158.405h37.219L481.254,330.323h46.524l246.415-164.277v68.234   v96.043v19.354H450.322V154.839h19.355H642.13h18.613L469.678,282.228V313.244z M349.678,349.677H25.807v-19.354v-96.043v-12.335   l162.176,108.378h46.446L25.807,190.906v-24.86l246.416,164.277h46.524L55.52,154.839h102.352h172.45h19.355V349.677z    M330.322,486.77L92.738,645.161H55.52l263.226-175.483h-46.524L25.807,633.954v-68.233v-96.043v-19.355h323.871v194.839h-19.355   H157.87h-18.608l191.061-127.375V486.77z M450.322,450.322h233.549c7.128,0,12.903-5.777,12.903-12.903l0,0   c0-7.126-5.775-12.902-12.903-12.902H437.419c-7.127,0-12.903,5.776-12.903,12.902v207.742h-49.031V437.419   c0-7.126-5.776-12.902-12.903-12.902H25.807v-49.033h336.774c7.127,0,12.903-5.777,12.903-12.903V154.839h49.031v207.742   c0,7.126,5.776,12.903,12.903,12.903h336.774v49.033h-38.709c-7.128,0-12.903,5.776-12.903,12.902l0,0   c0,7.126,5.775,12.903,12.903,12.903h38.709v19.355v96.043v13.565L610.171,469.678h-46.448l210.471,140.645v23.631L527.778,469.678   h-46.524L744.48,645.161H642.13H469.678h-19.355V450.322z"></path>
                  <polygon fill="#FFFFFF" points="330.322,269.807 157.87,154.839 55.52,154.839 318.746,330.323 272.222,330.323 234.429,330.323    187.983,330.323 25.807,221.944 25.807,234.279 169.872,330.323 25.807,330.323 25.807,349.677 349.678,349.677 349.678,154.839    330.322,154.839  "></polygon>
                  <path fill="#FFFFFF" d="M469.678,530.191l172.452,114.97H744.48L481.254,469.678h46.524h35.946h46.448l164.021,109.608v-13.565   l-144.065-96.043h144.065v-19.355h-38.709c-7.128,0-12.903-5.777-12.903-12.903h-25.807c0,7.126-5.775,12.903-12.903,12.903   H450.322v194.839h19.355V530.191z"></path>
                  <path fill="#ED1F34" d="M374.484,646.161V437.419c0-6.563-5.34-11.902-11.903-11.902H24.807v-51.033h337.774   c6.563,0,11.903-5.34,11.903-11.903V153.839h51.031v208.742c0,6.563,5.34,11.903,11.903,11.903h337.774v51.033h-39.709   c-6.563,0-11.903,5.339-11.903,11.902v1h-27.807v-1c0-6.563-5.34-11.902-11.903-11.902H437.419   c-6.563,0-11.903,5.339-11.903,11.902v208.742H374.484z"></path>
                  <path fill="#ED1F34" d="M722.581,437.419c0-7.126,5.775-12.902,12.903-12.902h38.709v-49.033H437.419   c-7.127,0-12.903-5.777-12.903-12.903V154.839h-49.031v207.742c0,7.126-5.776,12.903-12.903,12.903H25.807v49.033h336.774   c7.127,0,12.903,5.776,12.903,12.902v207.742h49.031V437.419c0-7.126,5.776-12.902,12.903-12.902h246.452   c7.128,0,12.903,5.776,12.903,12.902l0,0H722.581L722.581,437.419z"></path>
                </g>
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</nav>

`;
});

const $$file$b = "/home/szymon/Programming/jaran/jaran-website/src/components/Nav.astro";
const $$url$b = undefined;

const $$module3$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$b,
  default: $$Nav,
  file: $$file$b,
  url: $$url$b
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$a = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout.astro", { modules: [{ module: $$module1$1, specifier: "../components/Footer.astro", assert: {} }, { module: $$module2$1, specifier: "../components/Form.astro", assert: {} }, { module: $$module3$2, specifier: "../components/Nav.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$a = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Layout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate`<html lang="pl" class="astro-7KEF4HOD">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width">
		<meta name="generator"${addAttribute(Astro2.generator, "content")}>
		<title>${title}</title>
	${renderHead($$result)}</head>
	<body class="font-[Roboto] astro-7KEF4HOD">
		${renderComponent($$result, "Nav", $$Nav, { "class": "astro-7KEF4HOD" })}
		${renderSlot($$result, $$slots["default"])}
		${renderComponent($$result, "Form", $$Form, { "class": "astro-7KEF4HOD" })}
		${renderComponent($$result, "Footer", $$Footer, { "class": "astro-7KEF4HOD" })}

	</body></html>`;
});

const $$file$a = "/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout.astro";
const $$url$a = undefined;

const $$module1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$a,
  default: $$Layout,
  file: $$file$a,
  url: $$url$a
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$9 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/index.astro", { modules: [{ module: $$module1$3, specifier: "../components/CardMain.astro", assert: {} }, { module: $$module2$3, specifier: "../components/Features.astro", assert: {} }, { module: $$module3$3, specifier: "../components/Hero.astro", assert: {} }, { module: $$module2$2, specifier: "../components/Sidebar.astro", assert: {} }, { module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$9 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/index.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$Index;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${maybeRenderHead($$result)}<main>
		 ${renderComponent($$result, "Hero", $$Hero, {})}
		 <div class="bg-gray-900 flex flex-row pt-36 pb-12">
			<div class="flex flex-col bg-gray-900 ">
${renderComponent($$result, "CardMain", $$CardMain, {})}
${renderComponent($$result, "Features", $$Features, {})}
			</div>
${renderComponent($$result, "Sidebar", $$Sidebar, {})}
		 </div>
	</main>` })}`;
});

const $$file$9 = "/home/szymon/Programming/jaran/jaran-website/src/pages/index.astro";
const $$url$9 = "";

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$9,
  default: $$Index,
  file: $$file$9,
  url: $$url$9
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$8 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite.astro", { modules: [{ module: $$module1$2, specifier: "../components/ContactButton.astro", assert: {} }, { module: $$module2$2, specifier: "../components/Sidebar.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$8 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Subsite = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$Subsite;
  return renderTemplate`${maybeRenderHead($$result)}<section class="static">
    <div class="relative z-0 md:-mt-12 lg:-mt-24 xl:-mt-28 2xl:-mt-44">
      <div class="w-full">
        <img${addAttribute(Astro2.props.imgsrc, "src")} class="brightness-50  z-0">
      </div>
      <div class="absolute  top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pt-28 md:pt-44 xl:pt-44 2xl:pt-56">
        <h1 class="text-8xl font-bold text-white mx-auto leading-tight">
          ${Astro2.props.title}
        </h1>
      </div>
      <div class="absolute mt-24 top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pt-28 md:pt-44 xl:pt-44 2xl:pt-64">
        ${renderComponent($$result, "ContactButton", $$ContactButton, {})}
      </div>
    </div>
    <div class="relative bg-gray-900 flex flex-row sm:-mt-[50px] md:-mt-[100px] lg:-mt-[200px] xl:-mt-[300px] z-10 w-full">
      <article class="px-6 container flex mx-auto">
        <div class="container flex flex-col justif text-gray-300 lg:px-6">
          <section>
            <div class="flex flex-col items-center mx-auto py-8 2xl:w-10/12">
              <div class="flex flex-col text-left w-full md:text">
                <div class="w-full">
                  ${renderSlot($$result, $$slots["default"])}
                </div>
              </div>
            </div>
          </section>
        </div>
      </article>
      <div class="py-12">
      ${renderComponent($$result, "Sidebar", $$Sidebar, {})}
      </div>
    </div>
</section>`;
});

const $$file$8 = "/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite.astro";
const $$url$8 = undefined;

const $$module2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$8,
  default: $$Subsite,
  file: $$file$8,
  url: $$url$8
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$7 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/cennik-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$7 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/cennik-content.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$CennikContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$CennikContent;
  return renderTemplate`${maybeRenderHead($$result)}<div class="pb-5">
  <h2 class=" font-thin text-5xl py-3">Zawsze mamy dla Ciebie czas</h2>
  <p class=" text-lg">
    Ceny oferowanych usług każdorazowo są uzgadniane z Klientem. Zależą od
    stopnia skomplikowania sprawy, użytych środków technicznych i sił służących
    uzyskaniu skutecznego rezultatu. W sprawach windykacyjnych cena usługi
    zawiera opłatę wstępną (na poczet bieżących kosztów związanych z pełnym
    rozpoznaniem dłużnika) oraz uzgodniony procent od zwindykowanego długu. <bold class="font-black underline underline-offset-2">Porady i konsultacje detektywistyczne są bezpłatne.</bold> Nawet jeśli nie skorzystasz z naszych usług po spotkaniu będziesz mieć pełniejszą
    wiedzę na temat rozwiązania Twego Problemu.
  </p>
</div>
<div>
  <h2 class=" font-thin text-5xl py-3">Nasz klient na zawsze pozostaje naszym klientem</h2>
  <p class=" text-lg">
    Po zrealizowaniu sprawy przedstawiamy Klientowi, szczegółowe sprawozdanie
    (raport detektywistyczny) z wykonanych czynności podpisane przez
    licencjonowanego detektywa wraz z zebraną dokumentacją (obserwacja,
    ustalenia), przedstawiając wnioski służące skutecznemu rozwiązywaniu jego
    problemów. W razie konieczności zapewniamy również kompleksową obsługę
    prawną, komorniczą i psychologiczną.
  </p>
</div>`;
});

const $$file$7 = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/cennik-content.astro";
const $$url$7 = undefined;

const $$module3$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$7,
  default: $$CennikContent,
  file: $$file$7,
  url: $$url$7
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$6 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/informacja-gospodarcza.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }, { module: $$module2, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module3$1, specifier: "../components/subpages/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$6 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/informacja-gospodarcza.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$InformacjaGospodarcza = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$InformacjaGospodarcza;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Informacja Gospodarcza" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent, {})}` })}` })}`;
});

const $$file$6 = "/home/szymon/Programming/jaran/jaran-website/src/pages/informacja-gospodarcza.astro";
const $$url$6 = "/informacja-gospodarcza";

const _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$6,
  default: $$InformacjaGospodarcza,
  file: $$file$6,
  url: $$url$6
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$5 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/ochrona-biznesu.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }, { module: $$module2, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module3$1, specifier: "../components/subpages/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$5 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/ochrona-biznesu.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$OchronaBiznesu = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$OchronaBiznesu;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Ochrona Biznesu" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent, {})}` })}` })}`;
});

const $$file$5 = "/home/szymon/Programming/jaran/jaran-website/src/pages/ochrona-biznesu.astro";
const $$url$5 = "/ochrona-biznesu";

const _page2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$5,
  default: $$OchronaBiznesu,
  file: $$file$5,
  url: $$url$5
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$4 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/windykacja.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }, { module: $$module2, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module3$1, specifier: "../components/subpages/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$4 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/windykacja.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Windykacja = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Windykacja;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Windykacja" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent, {})}` })}` })}`;
});

const $$file$4 = "/home/szymon/Programming/jaran/jaran-website/src/pages/windykacja.astro";
const $$url$4 = "/windykacja";

const _page3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$4,
  default: $$Windykacja,
  file: $$file$4,
  url: $$url$4
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$3 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/detektyw-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$3 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/detektyw-content.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$DetektywContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$DetektywContent;
  return renderTemplate`${maybeRenderHead($$result)}<div class="pb-5">
  <h2 class="font-thin text-5xl py-5">Co oferujemy?</h2>
  <div>
    <ul class=" text-base">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie informacji do spraw karnych, gospodarczych, ubezpieczeniowych,
        cywilnych, rozwodowych, spadkowych, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie śledztw i postępowań w sprawach wymagających merytorycznych wyjaśnień.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Poszukiwanie osób zaginionych, ukrywających się, członków rodziny, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie spraw dotyczących zdrady małżeńskiej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalenia, wywiady środowiskowe, sprawdzanie życiorysów, historii pracowniczej,
        ustalanie kontaktów towarzysko-biznesowych, sytuacji finansowej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja wskazanych osób i obiektów.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalanie sprawców złośliwego niepokojenia, gróźb karalnych bądź zniesławienia.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Dyskretne sprawdzanie kontaktów dziecka (zagrożenia narkomanią, sektami,
        prostytucją), kontrola opiekunek i gospodyń domowych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Informatyka śledcza.
      </li>
    </ul>
  </div>
</div>

<div class="pb-5">
  <h2 class="font-thin text-5xl py-5">Metody, narzędzia i techniki działania służące realizacji zadań</h2>
  <div>
    <ul class=" text-base">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary ">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie informacji do spraw karnych, gospodarczych, ubezpieczeniowych,
        cywilnych, rozwodowych, spadkowych, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie śledztw i postępowań w sprawach wymagających merytorycznych wyjaśnień.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Poszukiwanie osób zaginionych, ukrywających się, członków rodziny, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie spraw dotyczących zdrady małżeńskiej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalenia, wywiady środowiskowe, sprawdzanie życiorysów, historii pracowniczej,
        ustalanie kontaktów towarzysko-biznesowych, sytuacji finansowej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja wskazanych osób i obiektów.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalanie sprawców złośliwego niepokojenia, gróźb karalnych bądź zniesławienia.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Dyskretne sprawdzanie kontaktów dziecka (zagrożenia narkomanią, sektami,
        prostytucją), kontrola opiekunek i gospodyń domowych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Informatyka śledcza.
      </li>
    </ul>
  </div>
</div>`;
});

const $$file$3 = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/detektyw-content.astro";
const $$url$3 = undefined;

const $$module3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$3,
  default: $$DetektywContent,
  file: $$file$3,
  url: $$url$3
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$2 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/detektyw.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }, { module: $$module2, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module3, specifier: "../components/subpages/detektyw-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$2 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/detektyw.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Detektyw = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Detektyw;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Detektyw", "imgsrc": "https://res.cloudinary.com/dfxcnehol/image/upload/v1599328771/photo_1536743939714_23ec5ac2dbae_ixlib_rb_1_2_21355edf48.jpg" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$DetektywContent, {})}` })}` })}`;
});

const $$file$2 = "/home/szymon/Programming/jaran/jaran-website/src/pages/detektyw.astro";
const $$url$2 = "/detektyw";

const _page4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$2,
  default: $$Detektyw,
  file: $$file$2,
  url: $$url$2
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$1 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/kontakt.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }, { module: $$module2, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module3$1, specifier: "../components/subpages/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$1 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/kontakt.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Kontakt = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Kontakt;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Kontakt" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent, {})}` })}` })}`;
});

const $$file$1 = "/home/szymon/Programming/jaran/jaran-website/src/pages/kontakt.astro";
const $$url$1 = "/kontakt";

const _page5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$1,
  default: $$Kontakt,
  file: $$file$1,
  url: $$url$1
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/cennik.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }, { module: $$module2, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module3$1, specifier: "../components/subpages/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/cennik.astro", "", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Cennik = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Cennik;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Cennik", "imgsrc": "https://res.cloudinary.com/dfxcnehol/image/upload/v1600067205/pexels_photo_187041_81995f60b5.jpg" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent, {})}` })}` })}`;
});

const $$file = "/home/szymon/Programming/jaran/jaran-website/src/pages/cennik.astro";
const $$url = "/cennik";

const _page6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata,
  default: $$Cennik,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const pageMap = new Map([['src/pages/index.astro', _page0],['src/pages/informacja-gospodarcza.astro', _page1],['src/pages/ochrona-biznesu.astro', _page2],['src/pages/windykacja.astro', _page3],['src/pages/detektyw.astro', _page4],['src/pages/kontakt.astro', _page5],['src/pages/cennik.astro', _page6],]);
const renderers = [Object.assign({"name":"astro:jsx","serverEntrypoint":"astro/jsx/server.js","jsxImportSource":"astro"}, { ssr: server_default }),];

if (typeof process !== "undefined") {
  if (process.argv.includes("--verbose")) ; else if (process.argv.includes("--silent")) ; else ;
}

const SCRIPT_EXTENSIONS = /* @__PURE__ */ new Set([".js", ".ts"]);
new RegExp(
  `\\.(${Array.from(SCRIPT_EXTENSIONS).map((s) => s.slice(1)).join("|")})($|\\?)`
);

const STYLE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".css",
  ".pcss",
  ".postcss",
  ".scss",
  ".sass",
  ".styl",
  ".stylus",
  ".less"
]);
new RegExp(
  `\\.(${Array.from(STYLE_EXTENSIONS).map((s) => s.slice(1)).join("|")})($|\\?)`
);

function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments.map((segment) => {
    return segment[0].spread ? `/:${segment[0].content.slice(3)}(.*)?` : "/" + segment.map((part) => {
      if (part)
        return part.dynamic ? `:${part.content}` : part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
  }).join("");
  let trailing = "";
  if (addTrailingSlash === "always" && segments.length) {
    trailing = "/";
  }
  const toPath = compile(template + trailing);
  return toPath;
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  return {
    ...serializedManifest,
    assets,
    routes
  };
}

const _manifest = Object.assign(deserializeManifest({"adapterName":"@astrojs/vercel/serverless","routes":[{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.fe948c1d.js"}],"routeData":{"route":"/","type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.3a534bd3.js"}],"routeData":{"route":"/informacja-gospodarcza","type":"page","pattern":"^\\/informacja-gospodarcza\\/?$","segments":[[{"content":"informacja-gospodarcza","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/informacja-gospodarcza.astro","pathname":"/informacja-gospodarcza","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.3a534bd3.js"}],"routeData":{"route":"/ochrona-biznesu","type":"page","pattern":"^\\/ochrona-biznesu\\/?$","segments":[[{"content":"ochrona-biznesu","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ochrona-biznesu.astro","pathname":"/ochrona-biznesu","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.3a534bd3.js"}],"routeData":{"route":"/windykacja","type":"page","pattern":"^\\/windykacja\\/?$","segments":[[{"content":"windykacja","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/windykacja.astro","pathname":"/windykacja","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.3a534bd3.js"}],"routeData":{"route":"/detektyw","type":"page","pattern":"^\\/detektyw\\/?$","segments":[[{"content":"detektyw","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/detektyw.astro","pathname":"/detektyw","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.3a534bd3.js"}],"routeData":{"route":"/kontakt","type":"page","pattern":"^\\/kontakt\\/?$","segments":[[{"content":"kontakt","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/kontakt.astro","pathname":"/kontakt","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/38634bd1.ffc78dac.css"],"scripts":[{"type":"external","value":"hoisted.3a534bd3.js"}],"routeData":{"route":"/cennik","type":"page","pattern":"^\\/cennik\\/?$","segments":[[{"content":"cennik","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/cennik.astro","pathname":"/cennik","_meta":{"trailingSlash":"ignore"}}}],"base":"/","markdown":{"drafts":false,"syntaxHighlight":"shiki","shikiConfig":{"langs":[],"theme":"github-dark","wrap":false},"remarkPlugins":[],"rehypePlugins":[],"remarkRehype":{},"extendDefaultPlugins":false,"isAstroFlavoredMd":false},"pageMap":null,"renderers":[],"entryModules":{"\u0000@astrojs-ssr-virtual-entry":"entry.js","/astro/hoisted.js?q=0":"hoisted.fe948c1d.js","/astro/hoisted.js?q=1":"hoisted.3a534bd3.js","astro:scripts/before-hydration.js":"data:text/javascript;charset=utf-8,//[no before-hydration script]"},"assets":["/assets/38634bd1.ffc78dac.css","/hoisted.3a534bd3.js","/hoisted.fe948c1d.js","/logo-stare.png","/backgrounds/cennik.jpg","/backgrounds/detektyw.jpg","/backgrounds/informacja-gospodarcza.jpg","/backgrounds/kontakt.jpg","/backgrounds/ochrona-biznesu.jpg","/backgrounds/windykacja.jpg","/backgrounds/windykacja.webp","/chunks/Nav.astro_astro_type_script_index_0_lang.acd1320e.js"]}), {
	pageMap: pageMap,
	renderers: renderers
});
const _args = undefined;

const _exports = adapter.createExports(_manifest, _args);
const _default = _exports['default'];

const _start = 'start';
if(_start in adapter) {
	adapter[_start](_manifest, _args);
}

export { _default as default };
