import * as adapter from '@astrojs/vercel/serverless/entrypoint';
import { escape } from 'html-escaper';
import mime from 'mime';
import sharp$1 from 'sharp';
/* empty css                           *//* empty css                           */import { doWork } from '@altano/tiny-async-pool';
import { dim, bold, red, yellow, cyan, green, bgGreen, black } from 'kleur/colors';
import fs from 'node:fs/promises';
import OS from 'node:os';
import path, { basename as basename$1, extname as extname$1, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MagicString from 'magic-string';
import { Readable } from 'node:stream';
import slash from 'slash';
import sizeOf from 'image-size';
import 'string-width';
import 'path-browserify';
import { compile } from 'path-to-regexp';

const $$module2$g = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  get warnForMissingAlt () { return warnForMissingAlt; },
  get Image () { return $$Image; },
  get Picture () { return $$Picture; }
}, Symbol.toStringTag, { value: 'Module' }));

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
const dictionary$1 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY";
const binary$1 = dictionary$1.length;
function bitwise$1(str) {
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
function shorthash$1(text) {
  let num;
  let result = "";
  let integer = bitwise$1(text);
  const sign = integer < 0 ? "Z" : "";
  integer = Math.abs(integer);
  while (integer >= binary$1) {
    num = integer % binary$1;
    integer = Math.floor(integer / binary$1);
    result = dictionary$1[num] + result;
  }
  if (integer > 0) {
    result = dictionary$1[integer] + result;
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
  const astroId = shorthash$1(
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

function isOutputFormat(value) {
  return ["avif", "jpeg", "png", "webp"].includes(value);
}
function isOutputFormatSupportsAlpha(value) {
  return ["avif", "png", "webp"].includes(value);
}
function isAspectRatioString(value) {
  return /^\d*:\d*$/.test(value);
}
function parseAspectRatio(aspectRatio) {
  if (!aspectRatio) {
    return void 0;
  }
  if (typeof aspectRatio === "number") {
    return aspectRatio;
  } else {
    const [width, height] = aspectRatio.split(":");
    return parseInt(width) / parseInt(height);
  }
}
function isSSRService(service) {
  return "transform" in service;
}

class SharpService {
  async getImageAttributes(transform) {
    const { width, height, src, format, quality, aspectRatio, fit, position, background, ...rest } = transform;
    return {
      ...rest,
      width,
      height
    };
  }
  serializeTransform(transform) {
    const searchParams = new URLSearchParams();
    if (transform.quality) {
      searchParams.append("q", transform.quality.toString());
    }
    if (transform.format) {
      searchParams.append("f", transform.format);
    }
    if (transform.width) {
      searchParams.append("w", transform.width.toString());
    }
    if (transform.height) {
      searchParams.append("h", transform.height.toString());
    }
    if (transform.aspectRatio) {
      searchParams.append("ar", transform.aspectRatio.toString());
    }
    if (transform.fit) {
      searchParams.append("fit", transform.fit);
    }
    if (transform.background) {
      searchParams.append("bg", transform.background);
    }
    if (transform.position) {
      searchParams.append("p", encodeURI(transform.position));
    }
    return { searchParams };
  }
  parseTransform(searchParams) {
    let transform = { src: searchParams.get("href") };
    if (searchParams.has("q")) {
      transform.quality = parseInt(searchParams.get("q"));
    }
    if (searchParams.has("f")) {
      const format = searchParams.get("f");
      if (isOutputFormat(format)) {
        transform.format = format;
      }
    }
    if (searchParams.has("w")) {
      transform.width = parseInt(searchParams.get("w"));
    }
    if (searchParams.has("h")) {
      transform.height = parseInt(searchParams.get("h"));
    }
    if (searchParams.has("ar")) {
      const ratio = searchParams.get("ar");
      if (isAspectRatioString(ratio)) {
        transform.aspectRatio = ratio;
      } else {
        transform.aspectRatio = parseFloat(ratio);
      }
    }
    if (searchParams.has("fit")) {
      transform.fit = searchParams.get("fit");
    }
    if (searchParams.has("p")) {
      transform.position = decodeURI(searchParams.get("p"));
    }
    if (searchParams.has("bg")) {
      transform.background = searchParams.get("bg");
    }
    return transform;
  }
  async transform(inputBuffer, transform) {
    const sharpImage = sharp$1(inputBuffer, { failOnError: false, pages: -1 });
    sharpImage.rotate();
    if (transform.width || transform.height) {
      const width = transform.width && Math.round(transform.width);
      const height = transform.height && Math.round(transform.height);
      sharpImage.resize({
        width,
        height,
        fit: transform.fit,
        position: transform.position,
        background: transform.background
      });
    }
    if (transform.format) {
      sharpImage.toFormat(transform.format, { quality: transform.quality });
      if (transform.background && !isOutputFormatSupportsAlpha(transform.format)) {
        sharpImage.flatten({ background: transform.background });
      }
    }
    const { data, info } = await sharpImage.toBuffer({ resolveWithObject: true });
    return {
      data,
      format: info.format
    };
  }
}
const service = new SharpService();
var sharp_default = service;

const sharp = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: sharp_default
}, Symbol.toStringTag, { value: 'Module' }));

const fnv1a52 = (str) => {
  const len = str.length;
  let i = 0, t0 = 0, v0 = 8997, t1 = 0, v1 = 33826, t2 = 0, v2 = 40164, t3 = 0, v3 = 52210;
  while (i < len) {
    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 435;
    t1 = v1 * 435;
    t2 = v2 * 435;
    t3 = v3 * 435;
    t2 += v0 << 8;
    t3 += v1 << 8;
    t1 += t0 >>> 16;
    v0 = t0 & 65535;
    t2 += t1 >>> 16;
    v1 = t1 & 65535;
    v3 = t3 + (t2 >>> 16) & 65535;
    v2 = t2 & 65535;
  }
  return (v3 & 15) * 281474976710656 + v2 * 4294967296 + v1 * 65536 + (v0 ^ v3 >> 4);
};
const etag = (payload, weak = false) => {
  const prefix = weak ? 'W/"' : '"';
  return prefix + fnv1a52(payload).toString(36) + payload.length.toString(36) + '"';
};

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

function isRemoteImage(src) {
  return /^http(s?):\/\//.test(src);
}
function removeQueryString(src) {
  const index = src.lastIndexOf("?");
  return index > 0 ? src.substring(0, index) : src;
}
function extname(src, format) {
  const index = src.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return src.substring(index);
}
function removeExtname(src) {
  const index = src.lastIndexOf(".");
  if (index <= 0) {
    return src;
  }
  return src.substring(0, index);
}
function basename(src) {
  return src.replace(/^.*[\\\/]/, "");
}
function propsToFilename(transform) {
  let filename = removeQueryString(transform.src);
  filename = basename(filename);
  const ext = extname(filename);
  filename = removeExtname(filename);
  const outputExt = transform.format ? `.${transform.format}` : ext;
  return `/${filename}_${shorthash(JSON.stringify(transform))}${outputExt}`;
}
function prependForwardSlash(path) {
  return path[0] === "/" ? path : "/" + path;
}
function trimSlashes(path) {
  return path.replace(/^\/|\/$/g, "");
}
function isString(path) {
  return typeof path === "string" || path instanceof String;
}
function joinPaths(...paths) {
  return paths.filter(isString).map(trimSlashes).join("/");
}

async function loadRemoteImage$1(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) {
      return void 0;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return void 0;
  }
}
const get = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const transform = sharp_default.parseTransform(url.searchParams);
    let inputBuffer = void 0;
    const sourceUrl = isRemoteImage(transform.src) ? new URL(transform.src) : new URL(transform.src, url.origin);
    inputBuffer = await loadRemoteImage$1(sourceUrl);
    if (!inputBuffer) {
      return new Response("Not Found", { status: 404 });
    }
    const { data, format } = await sharp_default.transform(inputBuffer, transform);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": mime.getType(format) || "",
        "Cache-Control": "public, max-age=31536000",
        ETag: etag(data.toString()),
        Date: new Date().toUTCString()
      }
    });
  } catch (err) {
    return new Response(`Server Error: ${err}`, { status: 500 });
  }
};

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  get
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$N = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/CardMain.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$P = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/CardMain.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$CardMain = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$P, $$props, $$slots);
  Astro2.self = $$CardMain;
  return renderTemplate`${maybeRenderHead($$result)}<article class="xl:pl-24 flex w-full flex-col items-center bg-gray-900">
  <div class="container text-gray-300 lg:px-6 w-11/12">
    <div class="space-y-6">
      <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
        Dlaczego my?
      </h2>
      <p class="text-lg md:text-xl">
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
      <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
        Co możemy dla Ciebie zrobić?
      </h2>
      <p class="text-lg md:text-xl">
        Świadczymy usługi detektywistyczne i windykacyjne dla osób prywatnych
        oraz podmiotów gospodarczych. Poufność, profesjonalizm, 15-letnie
        doświadczenie oraz indywidualne podejście do klienta to nasze atuty.
        Oferujemy pomoc w każdej sprawie. Sprawa Klienta - staje się naszą
        wspólną sprawą.
      </p>
    </div>
    <div class="space-y-6 mt-16">
      <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
        Jak działamy?
      </h2>
      <p class="text-lg md:text-xl">
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

const $$file$N = "/home/szymon/Programming/jaran/jaran-website/src/components/CardMain.astro";
const $$url$N = undefined;

const $$module1$a = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$N,
  default: $$CardMain,
  file: $$file$N,
  url: $$url$N
}, Symbol.toStringTag, { value: 'Module' }));

var __freeze$3 = Object.freeze;
var __defProp$3 = Object.defineProperty;
var __template$3 = (cooked, raw) => __freeze$3(__defProp$3(cooked, "raw", { value: __freeze$3(raw || cooked.slice()) }));
var _a$3;
const $$metadata$M = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$O = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactButton = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$O, $$props, $$slots);
  Astro2.self = $$ContactButton;
  return renderTemplate(_a$3 || (_a$3 = __template$3(["", '<div class="text-x box h-full mx-auto mt-8">\n  <button type="button" id="form_focus" class="block px-5 py-2 sm:px-10 sm:py-4 font-medium text-white bg-gradient-to-r from-red-800 to-red-600 rounded-lg transition-opacity ease-out duration-300 hover:opacity-80 shadow-md shadow-black">\n    skontaktuj si\u0119 z nami\n  </button>\n</div>\n\n<script defer>\n  document.getElementById("form_focus").addEventListener("click", () => {\n    document.querySelector("#email-address").scrollIntoView({\n      behavior: "smooth",\n      block: "center",\n    });\n  });\n<\/script>'])), maybeRenderHead($$result));
});

const $$file$M = "/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton.astro";
const $$url$M = undefined;

const $$module1$9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$M,
  default: $$ContactButton,
  file: $$file$M,
  url: $$url$M
}, Symbol.toStringTag, { value: 'Module' }));

async function loadLocalImage(src) {
  try {
    return await fs.readFile(src);
  } catch {
    return void 0;
  }
}
async function loadRemoteImage(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) {
      return void 0;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return void 0;
  }
}

const PREFIX = "@astrojs/image";
const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90
};
function getPrefix(level, timestamp) {
  let prefix = "";
  if (timestamp) {
    prefix += dim(dateTimeFormat.format(new Date()) + " ");
  }
  switch (level) {
    case "debug":
      prefix += bold(green(`[${PREFIX}] `));
      break;
    case "info":
      prefix += bold(cyan(`[${PREFIX}] `));
      break;
    case "warn":
      prefix += bold(yellow(`[${PREFIX}] `));
      break;
    case "error":
      prefix += bold(red(`[${PREFIX}] `));
      break;
  }
  return prefix;
}
const log = (_level, dest) => ({ message, level, prefix = true, timestamp = true }) => {
  if (levels[_level] >= levels[level]) {
    dest(`${prefix ? getPrefix(level, timestamp) : ""}${message}`);
  }
};
const info = log("info", console.info);
const debug = log("debug", console.debug);
const warn = log("warn", console.warn);

function getTimeStat(timeStart, timeEnd) {
  const buildTime = timeEnd - timeStart;
  return buildTime < 750 ? `${Math.round(buildTime)}ms` : `${(buildTime / 1e3).toFixed(2)}s`;
}
async function ssgBuild({ loader, staticImages, config, outDir, logLevel }) {
  const timer = performance.now();
  const cpuCount = OS.cpus().length;
  info({
    level: logLevel,
    prefix: false,
    message: `${bgGreen(
      black(
        ` optimizing ${staticImages.size} image${staticImages.size > 1 ? "s" : ""} in batches of ${cpuCount} `
      )
    )}`
  });
  const inputFiles = /* @__PURE__ */ new Set();
  async function processStaticImage([src, transformsMap]) {
    let inputFile = void 0;
    let inputBuffer = void 0;
    if (config.base && src.startsWith(config.base)) {
      src = src.substring(config.base.length - 1);
    }
    if (isRemoteImage(src)) {
      inputBuffer = await loadRemoteImage(src);
    } else {
      const inputFileURL = new URL(`.${src}`, outDir);
      inputFile = fileURLToPath(inputFileURL);
      inputBuffer = await loadLocalImage(inputFile);
      inputFiles.add(inputFile);
    }
    if (!inputBuffer) {
      warn({ level: logLevel, message: `"${src}" image could not be fetched` });
      return;
    }
    const transforms = Array.from(transformsMap.entries());
    debug({ level: logLevel, prefix: false, message: `${green("\u25B6")} transforming ${src}` });
    let timeStart = performance.now();
    for (const [filename, transform] of transforms) {
      timeStart = performance.now();
      let outputFile;
      if (isRemoteImage(src)) {
        const outputFileURL = new URL(path.join("./assets", path.basename(filename)), outDir);
        outputFile = fileURLToPath(outputFileURL);
      } else {
        const outputFileURL = new URL(path.join("./assets", filename), outDir);
        outputFile = fileURLToPath(outputFileURL);
      }
      const { data } = await loader.transform(inputBuffer, transform);
      await fs.writeFile(outputFile, data);
      const timeEnd = performance.now();
      const timeChange = getTimeStat(timeStart, timeEnd);
      const timeIncrease = `(+${timeChange})`;
      const pathRelative = outputFile.replace(fileURLToPath(outDir), "");
      debug({
        level: logLevel,
        prefix: false,
        message: `  ${cyan("created")} ${dim(pathRelative)} ${dim(timeIncrease)}`
      });
    }
  }
  await doWork(cpuCount, staticImages, processStaticImage);
  info({
    level: logLevel,
    prefix: false,
    message: dim(`Completed in ${getTimeStat(timer, performance.now())}.
`)
  });
}

async function metadata(src) {
  const file = await fs.readFile(src);
  const { width, height, type, orientation } = await sizeOf(file);
  const isPortrait = (orientation || 0) >= 5;
  if (!width || !height || !type) {
    return void 0;
  }
  return {
    src: fileURLToPath(src),
    width: isPortrait ? height : width,
    height: isPortrait ? width : height,
    format: type
  };
}

function createPlugin(config, options) {
  const filter = (id) => /^(?!\/_image?).*.(heic|heif|avif|jpeg|jpg|png|tiff|webp|gif)$/.test(id);
  const virtualModuleId = "virtual:image-loader";
  let resolvedConfig;
  return {
    name: "@astrojs/image",
    enforce: "pre",
    configResolved(viteConfig) {
      resolvedConfig = viteConfig;
    },
    async resolveId(id) {
      if (id === virtualModuleId) {
        return await this.resolve(options.serviceEntryPoint);
      }
    },
    async load(id) {
      if (!filter(id)) {
        return null;
      }
      const url = pathToFileURL(id);
      const meta = await metadata(url);
      if (!meta) {
        return;
      }
      if (!this.meta.watchMode) {
        const pathname = decodeURI(url.pathname);
        const filename = basename$1(pathname, extname$1(pathname) + `.${meta.format}`);
        const handle = this.emitFile({
          name: filename,
          source: await fs.readFile(url),
          type: "asset"
        });
        meta.src = `__ASTRO_IMAGE_ASSET__${handle}__`;
      } else {
        const relId = path.relative(fileURLToPath(config.srcDir), id);
        meta.src = join("/@astroimage", relId);
        meta.src = slash(meta.src);
      }
      return `export default ${JSON.stringify(meta)}`;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        var _a;
        if ((_a = req.url) == null ? void 0 : _a.startsWith("/@astroimage/")) {
          const [, id] = req.url.split("/@astroimage/");
          const url = new URL(id, config.srcDir);
          const file = await fs.readFile(url);
          const meta = await metadata(url);
          if (!meta) {
            return next();
          }
          const transform = await sharp_default.parseTransform(url.searchParams);
          if (!transform) {
            return next();
          }
          const result = await sharp_default.transform(file, transform);
          res.setHeader("Content-Type", `image/${result.format}`);
          res.setHeader("Cache-Control", "max-age=360000");
          const stream = Readable.from(result.data);
          return stream.pipe(res);
        }
        return next();
      });
    },
    async renderChunk(code) {
      const assetUrlRE = /__ASTRO_IMAGE_ASSET__([a-z\d]{8})__(?:_(.*?)__)?/g;
      let match;
      let s;
      while (match = assetUrlRE.exec(code)) {
        s = s || (s = new MagicString(code));
        const [full, hash, postfix = ""] = match;
        const file = this.getFileName(hash);
        const outputFilepath = resolvedConfig.base + file + postfix;
        s.overwrite(match.index, match.index + full.length, outputFilepath);
      }
      if (s) {
        return {
          code: s.toString(),
          map: resolvedConfig.build.sourcemap ? s.generateMap({ hires: true }) : null
        };
      } else {
        return null;
      }
    }
  };
}

function resolveSize(transform) {
  if (transform.width && transform.height) {
    return transform;
  }
  if (!transform.width && !transform.height) {
    throw new Error(`"width" and "height" cannot both be undefined`);
  }
  if (!transform.aspectRatio) {
    throw new Error(
      `"aspectRatio" must be included if only "${transform.width ? "width" : "height"}" is provided`
    );
  }
  let aspectRatio;
  if (typeof transform.aspectRatio === "number") {
    aspectRatio = transform.aspectRatio;
  } else {
    const [width, height] = transform.aspectRatio.split(":");
    aspectRatio = Number.parseInt(width) / Number.parseInt(height);
  }
  if (transform.width) {
    return {
      ...transform,
      width: transform.width,
      height: Math.round(transform.width / aspectRatio)
    };
  } else if (transform.height) {
    return {
      ...transform,
      width: Math.round(transform.height * aspectRatio),
      height: transform.height
    };
  }
  return transform;
}
async function resolveTransform(input) {
  if (typeof input.src === "string") {
    return resolveSize(input);
  }
  const metadata = "then" in input.src ? (await input.src).default : input.src;
  let { width, height, aspectRatio, background, format = metadata.format, ...rest } = input;
  if (!width && !height) {
    width = metadata.width;
    height = metadata.height;
  } else if (width) {
    let ratio = parseAspectRatio(aspectRatio) || metadata.width / metadata.height;
    height = height || Math.round(width / ratio);
  } else if (height) {
    let ratio = parseAspectRatio(aspectRatio) || metadata.width / metadata.height;
    width = width || Math.round(height * ratio);
  }
  return {
    ...rest,
    src: metadata.src,
    width,
    height,
    aspectRatio,
    format,
    background
  };
}
async function getImage(transform) {
  var _a, _b, _c;
  if (!transform.src) {
    throw new Error("[@astrojs/image] `src` is required");
  }
  let loader = (_a = globalThis.astroImage) == null ? void 0 : _a.loader;
  if (!loader) {
    const { default: mod } = await Promise.resolve().then(() => sharp).catch(() => {
      throw new Error(
        "[@astrojs/image] Builtin image loader not found. (Did you remember to add the integration to your Astro config?)"
      );
    });
    loader = mod;
    globalThis.astroImage = globalThis.astroImage || {};
    globalThis.astroImage.loader = loader;
  }
  const resolved = await resolveTransform(transform);
  const attributes = await loader.getImageAttributes(resolved);
  const isDev = (_b = (Object.assign({"BASE_URL":"/","MODE":"production","DEV":false,"PROD":true},{_:process.env._,SSR:true,}))) == null ? void 0 : _b.DEV;
  const isLocalImage = !isRemoteImage(resolved.src);
  const _loader = isDev && isLocalImage ? sharp_default : loader;
  if (!_loader) {
    throw new Error("@astrojs/image: loader not found!");
  }
  const { searchParams } = isSSRService(_loader) ? _loader.serializeTransform(resolved) : sharp_default.serializeTransform(resolved);
  let src;
  if (/^[\/\\]?@astroimage/.test(resolved.src)) {
    src = `${resolved.src}?${searchParams.toString()}`;
  } else {
    searchParams.set("href", resolved.src);
    src = `/_image?${searchParams.toString()}`;
  }
  if ((_c = globalThis.astroImage) == null ? void 0 : _c.addStaticImage) {
    src = globalThis.astroImage.addStaticImage(resolved);
  }
  return {
    ...attributes,
    src
  };
}

async function resolveAspectRatio({ src, aspectRatio }) {
  if (typeof src === "string") {
    return parseAspectRatio(aspectRatio);
  } else {
    const metadata = "then" in src ? (await src).default : src;
    return parseAspectRatio(aspectRatio) || metadata.width / metadata.height;
  }
}
async function resolveFormats({ src, formats }) {
  const unique = new Set(formats);
  if (typeof src === "string") {
    unique.add(extname$1(src).replace(".", ""));
  } else {
    const metadata = "then" in src ? (await src).default : src;
    unique.add(extname$1(metadata.src).replace(".", ""));
  }
  return Array.from(unique).filter(Boolean);
}
async function getPicture(params) {
  const { src, widths, fit, position, background } = params;
  if (!src) {
    throw new Error("[@astrojs/image] `src` is required");
  }
  if (!widths || !Array.isArray(widths)) {
    throw new Error("[@astrojs/image] at least one `width` is required");
  }
  const aspectRatio = await resolveAspectRatio(params);
  if (!aspectRatio) {
    throw new Error("`aspectRatio` must be provided for remote images");
  }
  async function getSource(format) {
    const imgs = await Promise.all(
      widths.map(async (width) => {
        const img = await getImage({
          src,
          format,
          width,
          fit,
          position,
          background,
          height: Math.round(width / aspectRatio)
        });
        return `${img.src} ${width}w`;
      })
    );
    return {
      type: mime.getType(format) || format,
      srcset: imgs.join(",")
    };
  }
  const allFormats = await resolveFormats(params);
  const image = await getImage({
    src,
    width: Math.max(...widths),
    aspectRatio,
    fit,
    position,
    background,
    format: allFormats[allFormats.length - 1]
  });
  const sources = await Promise.all(allFormats.map((format) => getSource(format)));
  return {
    sources,
    image
  };
}

const PKG_NAME = "@astrojs/image";
const ROUTE_PATTERN = "/_image";
function integration(options = {}) {
  const resolvedOptions = {
    serviceEntryPoint: "@astrojs/image/sharp",
    logLevel: "info",
    ...options
  };
  let _config;
  const staticImages = /* @__PURE__ */ new Map();
  function getViteConfiguration() {
    return {
      plugins: [createPlugin(_config, resolvedOptions)],
      optimizeDeps: {
        include: ["image-size", "sharp"]
      },
      ssr: {
        noExternal: ["@astrojs/image", resolvedOptions.serviceEntryPoint]
      }
    };
  }
  return {
    name: PKG_NAME,
    hooks: {
      "astro:config:setup": ({ command, config, updateConfig, injectRoute }) => {
        _config = config;
        updateConfig({ vite: getViteConfiguration() });
        if (command === "dev" || config.output === "server") {
          injectRoute({
            pattern: ROUTE_PATTERN,
            entryPoint: "@astrojs/image/endpoint"
          });
        }
      },
      "astro:build:setup": () => {
        function addStaticImage(transform) {
          const srcTranforms = staticImages.has(transform.src) ? staticImages.get(transform.src) : /* @__PURE__ */ new Map();
          const filename = propsToFilename(transform);
          srcTranforms.set(filename, transform);
          staticImages.set(transform.src, srcTranforms);
          return prependForwardSlash(joinPaths(_config.base, "assets", filename));
        }
        globalThis.astroImage = _config.output === "static" ? {
          addStaticImage
        } : {};
      },
      "astro:build:done": async ({ dir }) => {
        var _a;
        if (_config.output === "static") {
          const loader = (_a = globalThis == null ? void 0 : globalThis.astroImage) == null ? void 0 : _a.loader;
          if (loader && "transform" in loader && staticImages.size > 0) {
            await ssgBuild({
              loader,
              staticImages,
              config: _config,
              outDir: dir,
              logLevel: resolvedOptions.logLevel
            });
          }
        }
      }
    }
  };
}

const $$module1$8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: integration,
  getImage,
  getPicture
}, Symbol.toStringTag, { value: 'Module' }));

createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/node_modules/@astrojs/image/components/Image.astro", { modules: [{ module: $$module1$8, specifier: "../dist/index.js", assert: {} }, { module: $$module2$g, specifier: "./index.js", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$N = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/node_modules/@astrojs/image/components/Image.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Image = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$N, $$props, $$slots);
  Astro2.self = $$Image;
  const { loading = "lazy", decoding = "async", ...props } = Astro2.props;
  if (props.alt === void 0 || props.alt === null) {
    warnForMissingAlt();
  }
  const attrs = await getImage(props);
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate`${maybeRenderHead($$result)}<img${spreadAttributes(attrs, "attrs", { "class": "astro-UXNKDZ4E" })}${addAttribute(loading, "loading")}${addAttribute(decoding, "decoding")}>

`;
});

createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/node_modules/@astrojs/image/components/Picture.astro", { modules: [{ module: $$module1$8, specifier: "../dist/index.js", assert: {} }, { module: $$module2$g, specifier: "./index.js", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$M = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/node_modules/@astrojs/image/components/Picture.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Picture = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$M, $$props, $$slots);
  Astro2.self = $$Picture;
  const {
    src,
    alt,
    sizes,
    widths,
    aspectRatio,
    fit,
    background,
    position,
    formats = ["avif", "webp"],
    loading = "lazy",
    decoding = "async",
    ...attrs
  } = Astro2.props;
  if (alt === void 0 || alt === null) {
    warnForMissingAlt();
  }
  const { image, sources } = await getPicture({
    src,
    widths,
    formats,
    aspectRatio,
    fit,
    background,
    position
  });
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate`${maybeRenderHead($$result)}<picture${spreadAttributes(attrs, "attrs", { "class": "astro-MD3BZF6M" })}>
	${sources.map((attrs2) => renderTemplate`<source${spreadAttributes(attrs2, "attrs", { "class": "astro-MD3BZF6M" })}${addAttribute(sizes, "sizes")}>`)}
	<img${spreadAttributes(image, "image", { "class": "astro-MD3BZF6M" })}${addAttribute(loading, "loading")}${addAttribute(decoding, "decoding")}${addAttribute(alt, "alt")}>
</picture>

`;
});

let altWarningShown = false;
function warnForMissingAlt() {
  if (altWarningShown === true) {
    return;
  }
  altWarningShown = true;
  console.warn(`
[@astrojs/image] "alt" text was not provided for an <Image> or <Picture> component.

A future release of @astrojs/image may throw a build error when "alt" text is missing.

The "alt" attribute holds a text description of the image, which isn't mandatory but is incredibly useful for accessibility. Set to an empty string (alt="") if the image is not a key part of the content (it's decoration or a tracking pixel).
`);
}

const $$metadata$L = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Hero.astro", { modules: [{ module: $$module1$9, specifier: "./ContactButton.astro", assert: {} }, { module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$L = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Hero.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Hero = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$L, $$props, $$slots);
  Astro2.self = $$Hero;
  return renderTemplate`${maybeRenderHead($$result)}<header class=" pt-32 sm:pt-44 xl:pt-52 text-xl box w-full h-screen">
  |${renderComponent($$result, "Image", $$Image, { "src": "/backgrounds/warsaw-4419052.jpg", "alt": "", "height": "1080", "width": "1920", "format": "webp", "class": "absolute flex -z-10 brightness-50 top-0 mx-auto object-cover min-h-screen" })}
  <div class="items-center">
    <div class="w-full text-center">
      <h1 class="text-3xl sm:text-7xl font-medium text-white z-50 pb-8 max-w-xs sm:max-w-3xl mx-auto racking-normal leading-tight">
        Detektywi<br>Biuro detektywistyczne <span class="uppercase">jaran</span>
      </h1>

      <p class="text-base sm:text-2xl max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto mt-4 text-white font-light tracking-wide">
        Świadczymy usługi detektywistyczne i windykacyjne dla osób prywatnych
        oraz podmiotów gospodarczych. Poufność, profesjonalizm, ponad 16-letnie
        doświadczenie oraz indywidualne podejście do klienta to nasze atuty.
        Oferujemy pomoc w każdej sprawie. Sprawa Klienta staje się naszą wspólną
        sprawą.
      </p>

      <div class="flex flex-wrap justify-center mt-8 gap-4">
        ${renderComponent($$result, "ContactButton", $$ContactButton, {})}
      </div>
    </div>
  </div>
</header>`;
});

const $$file$L = "/home/szymon/Programming/jaran/jaran-website/src/components/Hero.astro";
const $$url$L = undefined;

const $$module2$f = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$L,
  default: $$Hero,
  file: $$file$L,
  url: $$url$L
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$K = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$K = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Sidebar = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$K, $$props, $$slots);
  Astro2.self = $$Sidebar;
  return renderTemplate`${maybeRenderHead($$result)}<div class="hidden xl:flex flex-col bg-red-700 mr-32 rounded-2xl text-gray-300 h-full text-left md:text-2xl lg:text-xl">
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
          <svg height="45px" width="45px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 122.88 101.54" style="enable-background:new 0 0 122.88 101.54" xml:space="preserve"><style type="text/css">
              .st0 {
                fill-rule: evenodd;
                clip-rule: evenodd;
              }
            </style><g><path class="st0" d="M66.45,11.99C72.23,6,77.7,1.31,87.33,0.21c22.83-2.62,43.82,20.75,32.29,43.76 c-3.28,6.56-9.96,14.35-17.35,21.99c-8.11,8.4-17.08,16.62-23.37,22.86l-6.8,6.74l-7.34-10.34l8.57-12.08l-7.09-6.45l5.89-7.76 l-8.17-11.52l8.17-11.52l-5.89-7.76l7.09-6.45L66.45,11.99L66.45,11.99z M55.81,101.54l-10.04-9.67 C28.73,75.46,0.94,54.8,0.02,29.21C-0.62,11.28,13.53-0.21,29.8,0c13.84,0.18,20.05,6.74,28.77,15.31l3.49,4.92l-2.02,1.83 l-0.01-0.01l-0.65,0.61l-4.54,4.13l0.06,0.08l-0.05,0.04l2.64,3.47l1.65,2.24l0.03-0.03l2.39,3.15l-8,11.28l-0.07,0.06l0.01,0.02 l-0.01,0.02l0.07,0.06l8,11.28l-2.39,3.15l-0.03-0.03l-1.64,2.23l-2.64,3.48l0.05,0.04l-0.06,0.08l4.54,4.13l0.65,0.61l0.01-0.01 l2.02,1.83l-7.73,10.89l0.05,0.05l-0.05,0.05l7.73,10.89l-2.02,1.83l-0.01-0.01l-0.65,0.61L55.81,101.54L55.81,101.54z"></path>
            </g>
          </svg>
          <span class="mx-4"> Podejrzewasz zdradę bliskiej Ci osoby?</span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/ochrona-biznesu">
          <svg height="60px" width="60px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 511 512.35"><path d="M162.62 21.9c-5.49 5.43-10.63 12.02-15.42 19.71-17.37 27.82-30.33 69.99-39.92 123.16-56.3 10.64-91.06 34.14-89.9 58.14 1.04 21.74 28.46 38.41 69.67 49.92-2.71 8.38-2.07 9.82 1.6 20.13-30.78 12.98-62.94 52.4-88.65 86.93l100.03 67.61-35.32 64.85h384.41l-37.26-64.85L511 378.63c-29.08-40.85-64.19-75.56-86.12-84.98 4.63-12.02 5.44-14.12 1.56-20.79 41.21-11.72 68.23-28.84 68.17-51.47-.06-24.68-35.5-48.38-88.31-56.62-12.64-53.5-25.22-95.62-41.23-123.27-2.91-5.02-5.93-9.57-9.09-13.62-47.66-61.12-64.36-2.69-98.14-2.76-39.17-.08-44.15-53.69-95.22-3.22zm67.12 398.37c-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47h10.52c1.38 0 2.66.44 3.7 1.17 3.77 2.1 7.46 3.33 11.01 3.42 3.54.09 7.14-.96 10.8-3.45a6.515 6.515 0 0 1 3.61-1.11l12.78-.03c3.57 0 6.46 2.9 6.46 6.47s-2.89 6.47-6.46 6.47h-10.95c-5.46 3.27-10.98 4.67-16.54 4.53-5.44-.14-10.78-1.77-16.01-4.53h-8.92zm-69.12-140.78c60.43 21.74 120.87 21.38 181.3 1.83-58.45 4.75-122.79 3.62-181.3-1.83zm208.37-.86c20.89 70.63-68.53 106.5-101.95 27.98h-22.11c-34.12 78.28-122.14 44.17-102.16-28.94-7.31-.8-14.51-1.68-21.56-2.62l-.32 1.88-.59 3.56-3.48 20.87c-30.39-6.72-13.36 71.77 14.26 64.87 4.22 12.18 7.69 22.62 11.26 32.19 36.81 98.83 190.88 104.81 226.95 6.36 3.78-10.32 6.85-21.64 11.24-35.39 25.44 4.06 46.35-73.31 15.34-67.63l-3.19-21.05-.55-3.65-.23-1.54c-7.47 1.16-15.12 2.2-22.91 3.11zM123.7 176.34l7.43-25.43c48.16 40.42 214.59 34.09 250.87 0l6.26 25.43c-42.31 44.75-219.33 38.67-264.56 0z"></path>
          </svg>
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

const $$file$K = "/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar.astro";
const $$url$K = undefined;

const $$module5$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$K,
  default: $$Sidebar,
  file: $$file$K,
  url: $$url$K
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$J = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Features.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$J = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Features.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Features = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$J, $$props, $$slots);
  Astro2.self = $$Features;
  return renderTemplate`${maybeRenderHead($$result)}<div class="grid md:pl-5 lg:pl-16 xl:pl-36 mx-auto space-y-0 md:grid-cols-2 pt-24 text-lg md:text-xl leading-6 bg-gray-900 text-gray-300">
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
        <p class="text-lg md:text-xl">
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
        <p class="text-lg md:text-xl">
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
        <p class="text-lg md:text-xl">
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
        <p class="text-lg md:text-xl">
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
        <p class="text-lg md:text-xl">
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
        <p class="text-lg md:text-xl">
          Pracujemy 24 h na dobę, przez 7 dni w tygodniu, 365 dni w roku.
        </p>
      </div>
    </div>
  </div>
</div>`;
});

const $$file$J = "/home/szymon/Programming/jaran/jaran-website/src/components/Features.astro";
const $$url$J = undefined;

const $$module1$7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$J,
  default: $$Features,
  file: $$file$J,
  url: $$url$J
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$I = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Footer.astro", { modules: [{ module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$I = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Footer.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Footer = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$I, $$props, $$slots);
  Astro2.self = $$Footer;
  return renderTemplate`${maybeRenderHead($$result)}<footer class="">
  <div class="w-full bg-gradient-to-t from-stone-900 via-gray-900 to-gray-900 pt-14">
    <div class="container m-auto px-6 py-img6 space-y-8 text-gray-300 lg:px-12">
      <div class="grid grid-cols-7 gap-6 lg:gap-0">
        <div class="col-span-8 lg:col-span-2">
          <div class="hidden gap-6 items-center justify-between py-6 lg:py-0 lg:border-none lg:block lg:space-y-6">
            ${renderComponent($$result, "Image", $$Image, { "src": "logo-stare.png", "alt": "logo jaran", "width": [250], "height": [60], "format": "webp" })}
            <p class="text-lg md:text-xl">
              Profesjonalna firma świadcząca usługi detektywistyczne i
              windykacyjne. Posiadamy doświadczenie, umiejętności i determinację
              w rozwiązywaniu Twoich trudnych spraw. Sprawdź nas!
            </p>
          </div>
        </div>
        <div class="col-span-8 lg:col-span-5">
          <div class="lg:pl-16 pb-16 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <h3 class="text-lg md:text-xl font-extrabold">Przydatne linki</h3>
              <ul class="list-inside mt-4 space-y-4 text-lg md:text-xl">
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
              <h3 class="text-lg md:text-xl font-extrabold">Dane firmy</h3>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">
                Zezwolenie MSWiA RD-45/2008
              </p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">
                Polisa Ubezpieczeniowa OC Zawodowej
              </p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">Licencja nr 0003798</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">NIP: 526-139-57-09</p>
            </div>
            <div>
              <h3 class="text-lg md:text-xl font-extrabold">Kontakt</h3>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">ul. Poznańska 24 lok. 21</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">00-685 Warszawa</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">tel: +48 22 622 14 08</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">tel: +48 669 981 964</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">
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

const $$file$I = "/home/szymon/Programming/jaran/jaran-website/src/components/Footer.astro";
const $$url$I = undefined;

const $$module1$6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$I,
  default: $$Footer,
  file: $$file$I,
  url: $$url$I
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$H = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Form.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$H = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Form.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Form = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$H, $$props, $$slots);
  Astro2.self = $$Form;
  return renderTemplate`${maybeRenderHead($$result)}<div class="content-center rounded-2xl bg-sky-100 border-2 border-sky-700 py-5">
  <h3 class="text-red-600 text-5xl text-center pb-3">Skontaktuj się z nami</h3>
  <form id="fs-frm" name="simple-contact-form" accept-charset="utf-8" action="https://formspree.io/f/mrgdqlan" method="post" class="flex flex-col w-full">
    <fieldset id="fs-frm-inputs">
      <div class="flex flex-col sm:flex-row w-full justify-between px-5 gap-5">
        <div class="flex-auto">
          <label for="full-name" class="hidden">Imie</label>
          <input type="text" name="name" id="full-name" placeholder="Imie" required="" class="rounded-lg border-transparent appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent">
        </div>
        <div class="flex-auto">
          <label for="email-address" class="hidden">Adres mailowy</label>
          <input type="email" name="_replyto" id="email-address" placeholder="email@domena.pl" required="" class="rounded-lg border-transparent appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent">
        </div>
      </div>
      <div class="pt-5 px-5">
        <label for="message " class="hidden">Wiadomość</label>
        <textarea rows="10" name="message" id="message" placeholder="Wiadomość" required="" class="appearance-none border w-full px-5 py-2 border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"></textarea>
        <input type="hidden" name="_subject" id="email-subject" value="Contact Form Submission">
      </div>
    </fieldset>
    <div class="pt-5 px-5">
    <input type="submit" value="Wyślij" class="py-2 px-4 bg-gradient-to-r from-red-800 to-red-600 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg"></div>
  </form>
</div>`;
});

const $$file$H = "/home/szymon/Programming/jaran/jaran-website/src/components/Form.astro";
const $$url$H = undefined;

const $$module2$e = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$H,
  default: $$Form,
  file: $$file$H,
  url: $$url$H
}, Symbol.toStringTag, { value: 'Module' }));

var __freeze$2 = Object.freeze;
var __defProp$2 = Object.defineProperty;
var __template$2 = (cooked, raw) => __freeze$2(__defProp$2(cooked, "raw", { value: __freeze$2(raw || cooked.slice()) }));
var _a$2;
const $$metadata$G = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Nav.astro", { modules: [{ module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$G = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Nav.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Nav = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$G, $$props, $$slots);
  Astro2.self = $$Nav;
  return renderTemplate(_a$2 || (_a$2 = __template$2(["", '<nav id="mynav" class="fixed w-full z-50 top-0 opacity-90">\n  <div class="w-full sm:w-5/6 mx-auto flex items-start justify-between mt-0 py-5">\n    <div class="ml-0 py-auto flex flex-row">\n      <a href="/">\n        ', '\n      </a>\n      <a href="/" class="py-3 absolute pt-3 ml-48 sm:ml-60 lg:ml-60 xl:ml-52 sm:pt-8">', '</a>\n    </div>\n\n    <div class="flex flex-col items-end pt-5">\n      <div class="block xl:hidden pr-4">\n        <button id="nav-toggle" class="flex items-center px-4 mx-4 py-3 border rounded text-gray-200 border-gray-200 hover:text-gray-100 hover:border-grey-100 appearance-none focus:outline-none">\n          <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">\n            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"></path>\n          </svg>\n        </button>\n      </div>\n\n      <div class="pr-4 xl:pr-0 hidden w-full items-center flex-grow xl:flex xl:items-center xl:w-auto xl:mt-0 z-20" id="nav-content">\n        <ul class="xl:flex text-lg md:text-xl font-medium justify-end flex-1 xl:text-center text-end">\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/detektyw">Detektyw\n            </a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/windykacja">Windykacja</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/informacja-gospodarcza">Informacja Gospodarcza</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/ochrona-biznesu">Ochrona Biznesu</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/cennik">Cennik</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/kontakt">Kontakt</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a href="/en" class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link">\n              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" width="50px" height="50px" viewBox="0 0 800 800" enable-background="new 0 0 800 800" xml:space="preserve">\n                <g>\n                  <polygon fill="#103B9B" points="24.807,331.323 24.807,232.411 173.175,331.323  "></polygon>\n                  <polygon fill="#103B9B" points="25.807,234.279 25.807,330.323 169.872,330.323  "></polygon>\n                  <polygon fill="#103B9B" points="154.567,153.839 331.322,153.839 331.322,271.675  "></polygon>\n                  <polygon fill="#103B9B" points="330.322,154.839 157.87,154.839 330.322,269.807  "></polygon>\n                  <polygon fill="#103B9B" points="24.807,468.678 173.175,468.678 24.807,567.589  "></polygon>\n                  <polygon fill="#103B9B" points="25.807,469.678 25.807,565.721 169.872,469.678  "></polygon>\n                  <polygon fill="#103B9B" points="468.678,153.839 645.433,153.839 468.678,271.675  "></polygon>\n                  <polygon fill="#103B9B" points="642.13,154.839 469.678,154.839 469.678,269.807  "></polygon>\n                  <polygon fill="#103B9B" points="626.825,331.323 775.193,232.411 775.193,331.323  "></polygon>\n                  <polygon fill="#103B9B" points="774.193,330.323 774.193,234.279 630.128,330.323  "></polygon>\n                  <polygon fill="#103B9B" points="154.567,646.161 331.322,528.323 331.322,646.161  "></polygon>\n                  <polygon fill="#103B9B" points="157.87,645.161 330.322,645.161 330.322,530.191  "></polygon>\n                  <polygon fill="#103B9B" points="626.825,468.678 775.193,468.678 775.193,567.589  "></polygon>\n                  <polygon fill="#103B9B" points="774.193,565.721 774.193,469.678 630.128,469.678  "></polygon>\n                  <polygon fill="#103B9B" points="468.678,646.161 468.678,528.323 645.433,646.161  "></polygon>\n                  <polygon fill="#103B9B" points="469.678,645.161 642.13,645.161 469.678,530.191  "></polygon>\n                  <polygon fill="#FFFFFF" points="642.13,154.839 469.678,269.807 469.678,154.839 450.322,154.839 450.322,349.677 774.193,349.677    774.193,330.323 630.128,330.323 774.193,234.279 774.193,166.045 527.778,330.323 481.254,330.323 469.678,330.323    469.678,313.244 469.678,282.228 660.743,154.839  "></polygon>\n                  <polygon fill="#FFFFFF" points="157.87,645.161 330.322,530.191 330.322,645.161 349.678,645.161 349.678,450.322 25.807,450.322    25.807,469.678 169.872,469.678 25.807,565.721 25.807,633.954 272.222,469.678 318.746,469.678 330.322,469.678 330.322,486.77    330.322,517.786 139.262,645.161  "></polygon>\n                  <polygon fill="#ED1F34" points="52.217,646.161 318.443,468.678 331.322,468.678 331.322,487.305 93.041,646.161  "></polygon>\n                  <polygon fill="#ED1F34" points="318.746,469.678 55.52,645.161 92.738,645.161 330.322,486.77 330.322,469.678  "></polygon>\n                  <polygon fill="#ED1F34" points="234.126,331.323 24.807,191.44 24.807,164.177 275.525,331.323  "></polygon>\n                  <polygon fill="#ED1F34" points="25.807,166.045 25.807,190.906 234.429,330.323 272.222,330.323  "></polygon>\n                  <polygon fill="#ED1F34" points="524.476,468.678 564.026,468.678 775.193,609.788 775.193,635.822  "></polygon>\n                  <polygon fill="#ED1F34" points="774.193,633.954 774.193,610.322 563.723,469.678 527.778,469.678  "></polygon>\n                  <polygon fill="#ED1F34" points="468.678,331.323 468.678,312.708 706.959,153.839 747.783,153.839 481.557,331.323  "></polygon>\n                  <polygon fill="#ED1F34" points="481.254,330.323 744.48,154.839 707.262,154.839 469.678,313.244 469.678,330.323  "></polygon>\n                  <path d="M800,657.979v-54.572c0-0.021,0-0.041,0-0.062V142.02c0-0.014,0-0.025,0-0.039v-0.045c0-0.076-0.011-0.15-0.012-0.226   c-0.006-0.348-0.02-0.693-0.054-1.041c-0.014-0.148-0.041-0.291-0.061-0.436c-0.036-0.272-0.07-0.545-0.125-0.815   c-0.038-0.189-0.09-0.374-0.136-0.561c-0.054-0.22-0.104-0.44-0.169-0.659c-0.069-0.227-0.153-0.446-0.232-0.666   c-0.063-0.172-0.118-0.346-0.189-0.516c-0.111-0.27-0.239-0.53-0.368-0.79c-0.059-0.119-0.108-0.237-0.17-0.354   c-0.178-0.33-0.37-0.65-0.573-0.963c-0.027-0.043-0.05-0.088-0.077-0.131c-0.002-0.003-0.005-0.007-0.009-0.01   c-0.241-0.359-0.497-0.708-0.772-1.042c-0.125-0.153-0.265-0.289-0.396-0.435c-0.146-0.162-0.287-0.331-0.442-0.485   c-0.217-0.217-0.447-0.417-0.678-0.616c-0.084-0.072-0.162-0.153-0.249-0.224c-0.221-0.181-0.451-0.344-0.682-0.509   c-0.11-0.08-0.217-0.167-0.33-0.243c-0.2-0.134-0.408-0.251-0.614-0.374c-0.158-0.094-0.313-0.194-0.475-0.28   c-0.164-0.088-0.334-0.162-0.503-0.243c-0.215-0.103-0.427-0.21-0.646-0.303c-0.126-0.052-0.255-0.093-0.382-0.14   c-0.267-0.1-0.532-0.201-0.806-0.285c-0.1-0.031-0.201-0.05-0.303-0.078c-0.301-0.083-0.602-0.167-0.91-0.227   c-0.138-0.027-0.276-0.04-0.414-0.063c-0.298-0.05-0.596-0.1-0.9-0.127c-0.398-0.038-0.8-0.06-1.202-0.06   c-0.009-0.002-0.018-0.002-0.024-0.002h-83.654c-0.016,0-0.029,0-0.045,0H12.903c-0.007,0-0.014,0-0.021,0   c-0.403,0.002-0.805,0.022-1.206,0.06c-0.351,0.033-0.695,0.088-1.038,0.148c-0.091,0.016-0.183,0.024-0.272,0.042   c-0.337,0.067-0.666,0.155-0.993,0.248c-0.072,0.021-0.146,0.035-0.218,0.057c-0.296,0.089-0.583,0.198-0.871,0.308   c-0.105,0.04-0.213,0.072-0.316,0.117c-0.241,0.1-0.473,0.215-0.706,0.33c-0.146,0.072-0.298,0.136-0.442,0.213   c-0.184,0.098-0.359,0.21-0.538,0.318c-0.184,0.11-0.372,0.215-0.552,0.335c-0.136,0.091-0.262,0.193-0.394,0.288   c-0.208,0.151-0.42,0.299-0.621,0.464c-0.108,0.088-0.207,0.188-0.312,0.279c-0.208,0.182-0.42,0.363-0.618,0.561   c-0.189,0.188-0.361,0.391-0.539,0.59c-0.1,0.114-0.207,0.217-0.303,0.333c-0.275,0.334-0.532,0.682-0.772,1.041   c-0.003,0.005-0.007,0.009-0.01,0.014c-0.033,0.05-0.059,0.104-0.091,0.153c-0.198,0.306-0.389,0.618-0.561,0.939   c-0.065,0.12-0.117,0.246-0.177,0.368c-0.126,0.256-0.253,0.511-0.361,0.776c-0.072,0.174-0.129,0.351-0.193,0.526   c-0.079,0.218-0.162,0.434-0.23,0.657c-0.067,0.22-0.115,0.44-0.17,0.663c-0.046,0.186-0.098,0.368-0.134,0.557   c-0.053,0.272-0.089,0.545-0.125,0.819c-0.019,0.145-0.046,0.288-0.06,0.434c-0.035,0.348-0.046,0.695-0.053,1.041   C0.01,141.786,0,141.86,0,141.936v0.045c0,0.014,0,0.025,0,0.039v55.811c0,0.016,0,0.029,0,0.044v460.104c0,0.014,0,0.025,0,0.04   v0.044c0,0.076,0.01,0.15,0.012,0.226c0.005,0.348,0.019,0.693,0.053,1.041c0.014,0.146,0.041,0.289,0.06,0.436   c0.036,0.273,0.071,0.545,0.125,0.817c0.038,0.188,0.09,0.373,0.136,0.561c0.053,0.22,0.103,0.44,0.168,0.659   c0.069,0.225,0.151,0.441,0.232,0.662c0.063,0.174,0.119,0.35,0.191,0.521c0.11,0.268,0.239,0.526,0.366,0.784   c0.059,0.119,0.108,0.239,0.172,0.357c0.177,0.331,0.37,0.65,0.573,0.964c0.027,0.043,0.05,0.088,0.078,0.131   c0.001,0.003,0.005,0.007,0.007,0.01c0.278,0.417,0.585,0.811,0.908,1.191c0.1,0.118,0.207,0.227,0.31,0.342   c0.224,0.246,0.458,0.481,0.699,0.709c0.134,0.126,0.268,0.249,0.406,0.368c0.256,0.22,0.523,0.427,0.797,0.628   c0.115,0.084,0.224,0.176,0.34,0.255c0.389,0.265,0.792,0.507,1.209,0.73c0.1,0.054,0.203,0.097,0.305,0.146   c0.335,0.167,0.676,0.322,1.027,0.461c0.133,0.052,0.265,0.099,0.397,0.146c0.332,0.119,0.669,0.222,1.012,0.313   c0.136,0.036,0.272,0.073,0.41,0.104c0.354,0.081,0.714,0.145,1.079,0.196c0.125,0.018,0.25,0.043,0.375,0.057   c0.459,0.052,0.926,0.083,1.399,0.084c0.022,0,0.044,0.004,0.068,0.004c0.005,0,0.012,0,0.018,0h83.623c0.017,0,0.036,0,0.053,0   h690.458c0.005,0,0.013,0.002,0.018,0.002c0.022,0,0.045-0.004,0.067-0.004c0.473-0.002,0.938-0.032,1.398-0.084   c0.124-0.014,0.246-0.04,0.369-0.057c0.367-0.052,0.73-0.115,1.086-0.198c0.135-0.031,0.269-0.067,0.402-0.104   c0.348-0.093,0.688-0.197,1.022-0.316c0.131-0.046,0.26-0.091,0.389-0.143c0.356-0.14,0.702-0.298,1.041-0.466   c0.097-0.049,0.196-0.09,0.292-0.142c0.42-0.224,0.824-0.468,1.215-0.732c0.113-0.078,0.221-0.167,0.33-0.248   c0.277-0.201,0.548-0.411,0.806-0.635c0.138-0.119,0.271-0.241,0.402-0.365c0.244-0.229,0.477-0.466,0.704-0.712   c0.103-0.113,0.208-0.222,0.308-0.339c0.323-0.38,0.63-0.775,0.908-1.19c0.002-0.004,0.005-0.007,0.007-0.011   c0.029-0.043,0.05-0.087,0.078-0.13c0.203-0.313,0.396-0.632,0.572-0.964c0.063-0.117,0.112-0.237,0.171-0.354   c0.129-0.26,0.256-0.52,0.368-0.79c0.07-0.17,0.125-0.344,0.188-0.516c0.081-0.221,0.164-0.44,0.232-0.666   c0.065-0.219,0.115-0.438,0.169-0.657c0.047-0.188,0.098-0.371,0.136-0.563c0.054-0.27,0.09-0.544,0.124-0.815   c0.019-0.146,0.047-0.289,0.062-0.437c0.035-0.346,0.047-0.693,0.054-1.039c0.002-0.076,0.012-0.15,0.012-0.226v-0.045   C800,658.006,800,657.992,800,657.979z M469.678,313.244l237.584-158.405h37.219L481.254,330.323h46.524l246.415-164.277v68.234   v96.043v19.354H450.322V154.839h19.355H642.13h18.613L469.678,282.228V313.244z M349.678,349.677H25.807v-19.354v-96.043v-12.335   l162.176,108.378h46.446L25.807,190.906v-24.86l246.416,164.277h46.524L55.52,154.839h102.352h172.45h19.355V349.677z    M330.322,486.77L92.738,645.161H55.52l263.226-175.483h-46.524L25.807,633.954v-68.233v-96.043v-19.355h323.871v194.839h-19.355   H157.87h-18.608l191.061-127.375V486.77z M450.322,450.322h233.549c7.128,0,12.903-5.777,12.903-12.903l0,0   c0-7.126-5.775-12.902-12.903-12.902H437.419c-7.127,0-12.903,5.776-12.903,12.902v207.742h-49.031V437.419   c0-7.126-5.776-12.902-12.903-12.902H25.807v-49.033h336.774c7.127,0,12.903-5.777,12.903-12.903V154.839h49.031v207.742   c0,7.126,5.776,12.903,12.903,12.903h336.774v49.033h-38.709c-7.128,0-12.903,5.776-12.903,12.902l0,0   c0,7.126,5.775,12.903,12.903,12.903h38.709v19.355v96.043v13.565L610.171,469.678h-46.448l210.471,140.645v23.631L527.778,469.678   h-46.524L744.48,645.161H642.13H469.678h-19.355V450.322z"></path>\n                  <polygon fill="#FFFFFF" points="330.322,269.807 157.87,154.839 55.52,154.839 318.746,330.323 272.222,330.323 234.429,330.323    187.983,330.323 25.807,221.944 25.807,234.279 169.872,330.323 25.807,330.323 25.807,349.677 349.678,349.677 349.678,154.839    330.322,154.839  "></polygon>\n                  <path fill="#FFFFFF" d="M469.678,530.191l172.452,114.97H744.48L481.254,469.678h46.524h35.946h46.448l164.021,109.608v-13.565   l-144.065-96.043h144.065v-19.355h-38.709c-7.128,0-12.903-5.777-12.903-12.903h-25.807c0,7.126-5.775,12.903-12.903,12.903   H450.322v194.839h19.355V530.191z"></path>\n                  <path fill="#ED1F34" d="M374.484,646.161V437.419c0-6.563-5.34-11.902-11.903-11.902H24.807v-51.033h337.774   c6.563,0,11.903-5.34,11.903-11.903V153.839h51.031v208.742c0,6.563,5.34,11.903,11.903,11.903h337.774v51.033h-39.709   c-6.563,0-11.903,5.339-11.903,11.902v1h-27.807v-1c0-6.563-5.34-11.902-11.903-11.902H437.419   c-6.563,0-11.903,5.339-11.903,11.902v208.742H374.484z"></path>\n                  <path fill="#ED1F34" d="M722.581,437.419c0-7.126,5.775-12.902,12.903-12.902h38.709v-49.033H437.419   c-7.127,0-12.903-5.777-12.903-12.903V154.839h-49.031v207.742c0,7.126-5.776,12.903-12.903,12.903H25.807v49.033h336.774   c7.127,0,12.903,5.776,12.903,12.902v207.742h49.031V437.419c0-7.126,5.776-12.902,12.903-12.902h246.452   c7.128,0,12.903,5.776,12.903,12.902l0,0H722.581L722.581,437.419z"></path>\n                </g>\n              </svg>\n            </a>\n          </li>\n        </ul>\n      </div>\n    </div>\n  </div>\n</nav>\n\n<script defer>\n  let scrollcheck = 1000;\n  document.getElementById("nav-toggle").onclick = function () {\n    document.getElementById("nav-content").classList.toggle("hidden");\n    document.getElementById("mynav").classList.add("bg-gray-900");\n    if(scrollcheck === 1000){\n      scrollcheck = 0;\n    }else{\n      scrollcheck = 1000;\n    }\n  };\n  document.addEventListener("scroll", function (e) {\n    let currentScroll = window.scrollY + window.innerHeight;\n    if (currentScroll >= scrollcheck) {\n      document.getElementById("mynav").classList.add("bg-gray-900");\n    }\n  });\n  document.addEventListener("scroll", function (e) {\n    let currentScroll = window.scrollY + window.innerHeight;\n    if (currentScroll <= scrollcheck) {\n      document.getElementById("mynav").classList.remove("bg-gray-900");\n    }\n  });\n<\/script>'])), maybeRenderHead($$result), renderComponent($$result, "Image", $$Image, { "width": [250], "height": [60], "format": "webp", "src": "logo-stare.png", "alt": "logo", "class": "object-fill t-0 my-auto w-8/12 sm:w-10/12 pl-10 xl:pl-0 pt-5 sm:pt-9" }), renderComponent($$result, "Image", $$Image, { "format": "webp", "alt": "logo", "src": "/pajak.png", "width": [60], "height": [60] }));
});

const $$file$G = "/home/szymon/Programming/jaran/jaran-website/src/components/Nav.astro";
const $$url$G = undefined;

const $$module3$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$G,
  default: $$Nav,
  file: $$file$G,
  url: $$url$G
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$F = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout.astro", { modules: [{ module: $$module1$7, specifier: "../components/Features.astro", assert: {} }, { module: $$module1$6, specifier: "../components/Footer.astro", assert: {} }, { module: $$module2$e, specifier: "../components/Form.astro", assert: {} }, { module: $$module3$2, specifier: "../components/Nav.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$F = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Layout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$F, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="pl" class="overflow-x-hidden">
  <head>
    <meta name="google-site-verification" content="cy2LBn3YlupNGqpHEm_bKVFq70NARt2VTHNYb_kHo_w">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <meta name="description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">

    <meta property="og:title" content="JARAN Biuro detektywistyczne">
    <meta property="og:description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">
    <meta property="og:image" content="TO DO">
    <meta property="og:url" content="TO DO">

    <meta name="twitter:title" content="JARAN Biuro detektywistyczne">
    <meta name="twitter:description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">
    <meta name="twitter:url" content="TODO">
    <meta name="twitter:card" content="biuro detektywistyczne">

    <title>${title}</title>
  ${renderHead($$result)}</head>
  <body class="font-[Roboto] overflow-x-hidden">
    ${renderComponent($$result, "Nav", $$Nav, {})}
    ${renderSlot($$result, $$slots["default"])}
    <div class="bg-gray-900">
      ${renderComponent($$result, "Features", $$Features, {})}
      <div class="w-11/12 md:w-11/12 lg:w-4/6 xl:w-1/2 mx-auto pt-24">
        ${renderComponent($$result, "Form", $$Form, {})}
      </div>
      ${renderComponent($$result, "Footer", $$Footer, {})}
    </div>
  </body></html>`;
});

const $$file$F = "/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout.astro";
const $$url$F = undefined;

const $$module4$4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$F,
  default: $$Layout,
  file: $$file$F,
  url: $$url$F
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$E = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/index.astro", { modules: [{ module: $$module1$a, specifier: "../components/CardMain.astro", assert: {} }, { module: $$module2$f, specifier: "../components/Hero.astro", assert: {} }, { module: $$module5$1, specifier: "../components/Sidebar.astro", assert: {} }, { module: $$module4$4, specifier: "../layouts/Layout.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$E = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/index.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$E, $$props, $$slots);
  Astro2.self = $$Index;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "JARAN Prywatne biuro detektywistyczne Warszawa" }, { "default": () => renderTemplate`${maybeRenderHead($$result)}<main>
    ${renderComponent($$result, "Hero", $$Hero, {})}
    <div class="bg-gray-900 flex flex-row pt-5 md:pt-12 xl:pt-16">
      <div class="flex flex-col bg-gray-900">
        ${renderComponent($$result, "CardMain", $$CardMain, {})}
      </div>
      ${renderComponent($$result, "Sidebar", $$Sidebar, {})}
    </div>
  </main>` })}`;
});

const $$file$E = "/home/szymon/Programming/jaran/jaran-website/src/pages/index.astro";
const $$url$E = "";

const _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$E,
  default: $$Index,
  file: $$file$E,
  url: $$url$E
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$D = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite.astro", { modules: [{ module: $$module1$9, specifier: "../components/ContactButton.astro", assert: {} }, { module: $$module1$6, specifier: "../components/Footer.astro", assert: {} }, { module: $$module2$e, specifier: "../components/Form.astro", assert: {} }, { module: $$module3$2, specifier: "../components/Nav.astro", assert: {} }, { module: $$module5$1, specifier: "../components/Sidebar.astro", assert: {} }, { module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$D = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Subsite = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$D, $$props, $$slots);
  Astro2.self = $$Subsite;
  return renderTemplate`<html lang="pl">
  <head>
    <meta name="google-site-verification" content="cy2LBn3YlupNGqpHEm_bKVFq70NARt2VTHNYb_kHo_w">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <meta name="description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">

    <meta property="og:title" content="JARAN Biuro detektywistyczne">
    <meta property="og:description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">
    <meta property="og:image" content="TO DO">
    <meta property="og:url" content="TO DO">

    <meta name="twitter:title" content="JARAN Biuro detektywistyczne">
    <meta name="twitter:description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">
    <meta name="twitter:url" content="TODO">
    <meta name="twitter:card" content="biuro detektywistyczne">

    <title>${"JARAN Prywatne biuro detektywistyczne Warszawa"}</title>
  ${renderHead($$result)}</head>

  <body class="font-[Roboto] static bg-gray-900">
    ${renderComponent($$result, "Nav", $$Nav, {})}
    <section class="bg-gray-900">
      <div class="absolute z-20 flex flex-col w-full top-24 sm:top-24 lg:top-28 xl:top-48">
        <h1 class="text-4xl sm:text-5xl lg:text-7xl -mb-5 sm:mb-0 lg:mb-0 font-thin text-gray-300 mx-auto text-center leading-tight">
          ${Astro2.props.title}
        </h1>
        ${renderComponent($$result, "ContactButton", $$ContactButton, {})}
      </div>
      <div class="z-10 absolute sm:-top-16 md:-top-24 lg:-top-32 xl:-top-40 2xl:-top-48 mx-auto">
        <picture${addAttribute(Astro2.props.clss, "class")} class="object-fill mx-auto">
          ${renderComponent($$result, "Image", $$Image, { "src": Astro2.props.imgsrc, "format": "webp", "width": "1920", "height": "1000", "alt": Astro2.props.altprop })}
        </picture>
      </div>

      <div class="absolute z-10 w-full mt-[200px] sm:mt-[285px] md:mt-[282px] lg:mt-[376px] xl:mt-[470px] 2xl:mt-[564px] flex flex-col bg-gray-900">
        <div class="px-5 flex flex-row">
          <div class="lg:pl-20 flex w-full">
            <div class="text-gray-300 lg:px-6 lg:w-10/12 text-center">
              <section>
                <div class="flex flex-col items-center w-full md:px-10 py-8 text-left">
                  ${renderSlot($$result, $$slots["default"])}
                </div>
              </section>
              <div class="w-full mx-auto pt-24">
                ${renderComponent($$result, "Form", $$Form, {})}
              </div>
            </div>
          </div>
          <div class="pt-24">
            ${renderComponent($$result, "Sidebar", $$Sidebar, {})}
          </div>
        </div>
        ${renderComponent($$result, "Footer", $$Footer, {})}
      </div>
    </section>
  </body></html>`;
});

const $$file$D = "/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite.astro";
const $$url$D = undefined;

const $$module1$5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$D,
  default: $$Subsite,
  file: $$file$D,
  url: $$url$D
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$C = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/infgos-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$C = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/infgos-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$InfgosContent$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$C, $$props, $$slots);
  Astro2.self = $$InfgosContent$1;
  return renderTemplate`${maybeRenderHead($$result)}<article>
<div class="pb-2">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Co oferujemy?
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Wywiad gospodarczy, rozpoznawanie i monitorowanie wskazanych firm, ich potencjału
        finansowego, technicznego, osobowego, ocena wiarygodności handlowej podmiotów
        gospodarczych
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalanie struktur organizacyjnych, stosunków własnościowych, powiązań personalnych,
        finansowych przedsiębiorców i osób
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Rozpoznawanie nieuczciwej konkurencji, pomoc w jej zwalczaniu
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Rozpracowywanie osób, prześwietlanie ich przeszłości, kontaktów, życiorysów,
        pod kątem oceny zagrożeń i korzyści dla Firmy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie informacji o bezprawnym wykorzystywaniu nazw handlowych, znaków
        towarowych oraz związanych z ujawnieniem tajemnic Firmy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Sprawdzanie dokumentów kredytowych i oświadczeń finansowych na potrzeby instytucji
        finansowych, bankowych, leasingowych, innych
      </li>
    </ul>
  </div>
</div>

<div class="pt-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Metody, narzędzia i techniki działania
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Tworzenie ekspertskich zespołów zadaniowych do konkretnej sprawy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Działania ofensywne w celu uzyskania informacji, dokumentów, przedmiotów,
        mających żywotne znaczenie dla strategicznych celów Firmy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja wskazanych osób, obiektów, pojazdów
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Analiza psychologiczna i charakterologiczna przeciwnika biznesowego
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Wykorzystywanie nowoczesnych technik specjalnych w prowadzonych sprawach
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie dowodów wskazujących na nieuczciwą działalność konkurencji
      </li>
    </ul>
  </div>
</div>
</article>`;
});

const $$file$C = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/infgos-content.astro";
const $$url$C = undefined;

const $$module2$d = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$C,
  default: $$InfgosContent$1,
  file: $$file$C,
  url: $$url$C
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$B = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/informacja-gospodarcza.astro", { modules: [{ module: $$module1$5, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module2$d, specifier: "../components/subpages/pl/infgos-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$B = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/informacja-gospodarcza.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$InformacjaGospodarcza = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$B, $$props, $$slots);
  Astro2.self = $$InformacjaGospodarcza;
  return renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Informacja Gospodarcza", "imgsrc": "/backgrounds/informacja-gospodarcza.jpg", "clss": "brightness-50", "altprop": "Dwa laptopy na kt\xF3rych pracuje osoba" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$InfgosContent$1, {})}` })}`;
});

const $$file$B = "/home/szymon/Programming/jaran/jaran-website/src/pages/informacja-gospodarcza.astro";
const $$url$B = "/informacja-gospodarcza";

const _page2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$B,
  default: $$InformacjaGospodarcza,
  file: $$file$B,
  url: $$url$B
}, Symbol.toStringTag, { value: 'Module' }));

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(raw || cooked.slice()) }));
var _a$1;
const $$metadata$A = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton_en.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$A = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactButtonEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$A, $$props, $$slots);
  Astro2.self = $$ContactButtonEn;
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", '<div class="text-x box h-full mx-auto mt-8">\n  <button type="button" id="form_focus" class="block px-5 py-2 sm:px-10 sm:py-4 font-medium text-white bg-gradient-to-r from-red-800 to-red-600 rounded-lg transition-opacity ease-out duration-300 hover:opacity-80 shadow-md shadow-black">\n    Contact Us\n  </button>\n</div>\n\n<script defer>\n  document.getElementById("form_focus").addEventListener("click", () => {\n    document.querySelector("#email-address").scrollIntoView({\n      behavior: "smooth",\n      block: "center",\n    });\n  });\n<\/script>'])), maybeRenderHead($$result));
});

const $$file$A = "/home/szymon/Programming/jaran/jaran-website/src/components/ContactButton_en.astro";
const $$url$A = undefined;

const $$module1$4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$A,
  default: $$ContactButtonEn,
  file: $$file$A,
  url: $$url$A
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$z = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Footer_en.astro", { modules: [{ module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$z = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Footer_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$FooterEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$z, $$props, $$slots);
  Astro2.self = $$FooterEn;
  return renderTemplate`${maybeRenderHead($$result)}<footer class="">
  <div class="w-full bg-gradient-to-t from-stone-900 via-gray-900 to-gray-900 pt-14">
    <div class="container m-auto px-6 py-img6 space-y-8 text-gray-300 lg:px-12">
      <div class="grid grid-cols-7 gap-6 lg:gap-0">
        <div class="col-span-8 lg:col-span-2">
          <div class="hidden gap-6 items-center justify-between py-6 lg:py-0 lg:border-none lg:block lg:space-y-6">
            ${renderComponent($$result, "Image", $$Image, { "src": "logo-stare.png", "alt": "logo jaran", "width": [250], "height": [60], "format": "webp" })}
            <p class="text-lg md:text-xl">
              
A professional company that provides detective and debt collection services. We have experience, skills and determination
in solving your difficult matters.
            </p>

          </div>
        </div>
        <div class="col-span-8 lg:col-span-5">
          <div class="lg:pl-16 pb-16 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <h3 class="text-lg md:text-xl font-extrabold">Usefull links</h3>
              <ul class="list-inside mt-4 space-y-4 text-lg md:text-xl">
                <li>
                  <a href="/detective" class="hover:text-red-600">Detective</a>
                </li>
                <li>
                  <a href="/debt-collection" class="hover:text-red-600">Debt collection</a>
                </li>
                <li>
                  <a href="/business-intelligence" class="hover:text-red-600">Business intelligence</a>
                </li>
                <li>
                  <a href="/business-protection" class="hover:text-red-600">Business protection</a>
                </li>
                <li>
                  <a href="/pricing" class="hover:text-red-600">Pricing</a>
                </li>
                <li>
                  <a href="/contact" class="hover:text-red-600">Contact</a>
                </li>
              </ul>
            </div>
            <div>
              <h3 class="text-lg md:text-xl font-extrabold">Company's info</h3>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">
                Permit MSWiA RD-45/2008
              </p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">
                Professional Liability Insurance Policy
              </p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">License nr 0003798</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">NIP: 526-139-57-09</p>
            </div>
            <div>
              <h3 class="text-lg md:text-xl font-extrabold">Contact</h3>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">ul. Poznańska 24 lok. 21</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">00-685 Warszawa</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">tel: +48 22 622 14 08</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">tel: +48 669 981 964</p>
              <p class="list-inside mt-4 space-y-4 text-lg md:text-xl">
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

const $$file$z = "/home/szymon/Programming/jaran/jaran-website/src/components/Footer_en.astro";
const $$url$z = undefined;

const $$module2$c = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$z,
  default: $$FooterEn,
  file: $$file$z,
  url: $$url$z
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$y = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Form_en.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$y = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Form_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$FormEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$y, $$props, $$slots);
  Astro2.self = $$FormEn;
  return renderTemplate`${maybeRenderHead($$result)}<div class="content-center rounded-2xl bg-sky-100 border-2 border-sky-700 py-5">
  <h3 class="text-red-600 text-5xl text-center pb-3">Contact us!</h3>
  <form id="fs-frm" name="simple-contact-form" accept-charset="utf-8" action="https://formspree.io/f/mrgdqlan" method="post" class="flex flex-col w-full">
    <fieldset id="fs-frm-inputs">
      <div class="flex flex-col sm:flex-row w-full justify-between px-5 gap-5">
        <div class="flex-auto">
          <label for="full-name" class="hidden">Name</label>
          <input type="text" name="name" id="full-name" placeholder="Name" required="" class="rounded-lg border-transparent appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent">
        </div>
        <div class="flex-auto">
          <label for="email-address" class="hidden">Email adress</label>
          <input type="email" name="_replyto" id="email-address" placeholder="email@domain.com" required="" class="rounded-lg border-transparent appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent">
        </div>
      </div>
      <div class="pt-5 px-5">
        <label for="message " class="hidden">Message</label>
        <textarea rows="10" name="message" id="message" placeholder="Your message" required="" class="appearance-none border w-full px-5 py-2 border-gray-300 bg-white text-gray-700 placeholder-gray-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"></textarea>
        <input type="hidden" name="_subject" id="email-subject" value="Contact Form Submission">
      </div>
    </fieldset>
    <div class="pt-5 px-5">
    <input type="submit" value="Send" class="py-2 px-4 bg-gradient-to-r from-red-800 to-red-600 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg"></div>
  </form>
</div>`;
});

const $$file$y = "/home/szymon/Programming/jaran/jaran-website/src/components/Form_en.astro";
const $$url$y = undefined;

const $$module3$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$y,
  default: $$FormEn,
  file: $$file$y,
  url: $$url$y
}, Symbol.toStringTag, { value: 'Module' }));

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$metadata$x = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Nav_en.astro", { modules: [{ module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$x = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Nav_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$NavEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$x, $$props, $$slots);
  Astro2.self = $$NavEn;
  return renderTemplate(_a || (_a = __template(["", '<nav id="mynav" class="fixed w-full z-50 top-0 opacity-90">\n  <div class="w-full sm:w-5/6 mx-auto flex items-start justify-between mt-0 py-5">\n    <div class="ml-0 py-auto flex flex-row">\n      <a href="/en">\n        ', '\n      </a>\n      <a href="/en" class="py-3 absolute pt-3 ml-48 sm:ml-60 lg:ml-60 xl:ml-52 sm:pt-8">', '\n      </a>\n    </div>\n\n    <div class="flex flex-col items-end pt-5">\n      <div class="block xl:hidden pr-4">\n        <button id="nav-toggle" class="flex items-center px-4 mx-4 py-3 border rounded text-gray-200 border-gray-200 hover:text-gray-100 hover:border-grey-100 appearance-none focus:outline-none">\n          <svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">\n            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"></path>\n          </svg>\n        </button>\n      </div>\n\n      <div class="pr-4 xl:pr-0 hidden w-full items-center flex-grow xl:flex xl:items-center xl:w-auto xl:mt-0 z-20" id="nav-content">\n        <ul class="xl:flex text-lg md:text-xl font-medium justify-end flex-1 xl:text-center text-end">\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/detective">Detective\n            </a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/debt-collection">Debt collection</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/business-intelligence">Business intelligence</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/business-protection">Business protection</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/pricing">Pricing</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link" href="/contact">Contact</a>\n          </li>\n          <li class="mr-3 my-3 xl:w-28 place-self-center">\n            <a href="/" class="inline-block text-gray-100 no-underline hover:text-red-600 py-2 px-4 link">\n              <svg width="50px" height="5-px" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--twemoji" preserveAspectRatio="xMidYMid meet"><path fill="#EEE" d="M32 5H4a4 4 0 0 0-4 4v9h36V9a4 4 0 0 0-4-4z"></path><path fill="#DC143C" d="M0 27a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4v-9H0v9z"></path>\n              </svg>\n            </a>\n          </li>\n        </ul>\n      </div>\n    </div>\n  </div>\n</nav>\n\n<script defer>\n  let scrollcheck = 1000;\n  document.getElementById("nav-toggle").onclick = function () {\n    document.getElementById("nav-content").classList.toggle("hidden");\n    document.getElementById("mynav").classList.add("bg-gray-900");\n    if (scrollcheck === 1000) {\n      scrollcheck = 0;\n    } else {\n      scrollcheck = 1000;\n    }\n  };\n  document.addEventListener("scroll", function (e) {\n    let currentScroll = window.scrollY + window.innerHeight;\n    if (currentScroll >= scrollcheck) {\n      document.getElementById("mynav").classList.add("bg-gray-900");\n    }\n  });\n  document.addEventListener("scroll", function (e) {\n    let currentScroll = window.scrollY + window.innerHeight;\n    if (currentScroll <= scrollcheck) {\n      document.getElementById("mynav").classList.remove("bg-gray-900");\n    }\n  });\n<\/script>'])), maybeRenderHead($$result), renderComponent($$result, "Image", $$Image, { "width": [250], "height": [60], "format": "webp", "src": "logo-stare.png", "alt": "logo", "class": "object-fill t-0 my-auto w-8/12 sm:w-10/12 pl-10 xl:pl-0 pt-5 sm:pt-9" }), renderComponent($$result, "Image", $$Image, { "format": "webp", "alt": "logo", "src": "/pajak.png", "width": [60], "height": [60] }));
});

const $$file$x = "/home/szymon/Programming/jaran/jaran-website/src/components/Nav_en.astro";
const $$url$x = undefined;

const $$module4$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$x,
  default: $$NavEn,
  file: $$file$x,
  url: $$url$x
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$w = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar_en.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$w = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$SidebarEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$w, $$props, $$slots);
  Astro2.self = $$SidebarEn;
  return renderTemplate`${maybeRenderHead($$result)}<div class="hidden xl:flex flex-col bg-red-700 mr-32 rounded-2xl text-gray-300 h-full text-left md:text-2xl lg:text-xl">
  <nav class="my-5 px-6 w-96">
    <ul>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/detective">
          <svg height="68px" width="68px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 501 512.22"><path d="M265.57 75.41v262.38h128.51c1.35 0 2.47 1.11 2.47 2.47v6.76h90.44c7.73 0 14.01 6.27 14.01 14.01 0 2.98-.94 5.76-2.53 8.03-10.33 17.27-15.64 39.18-15.64 61.21 0 21.87 5.24 43.54 15.98 60.5 4.11 6.52 2.15 15.15-4.38 19.26-2.32 1.46-4.9 2.15-7.44 2.15l-414.61.04c-19.82 0-37.53-10.86-50.47-26.54C8.46 469.39 0 447.44 0 427.51c0-19.92 8.35-40.49 21.69-55.69 13.01-14.81 30.85-24.8 50.69-24.8h36.41v-6.76c0-1.36 1.11-2.47 2.47-2.47h128.51V75.53c-11.19-3.88-20.06-12.74-23.96-23.93h-81.25v12.36c0 1.35-1.12 2.47-2.47 2.47h-20.85c-1.36 0-2.47-1.12-2.47-2.47V51.6H88.1c-1.58 0-2.87-1.11-2.87-2.47V28.28c0-1.36 1.29-2.47 2.87-2.47h127.8C221.26 10.77 235.62 0 252.5 0c16.87 0 31.23 10.77 36.59 25.81h128.14c1.58 0 2.88 1.11 2.88 2.47v20.85c0 1.36-1.3 2.47-2.88 2.47h-23.3v12.36c0 1.35-1.11 2.47-2.47 2.47h-20.85c-1.36 0-2.47-1.12-2.47-2.47V51.6h-78.96a38.985 38.985 0 0 1-23.61 23.81zm193.99 393.38H334.33c-4.05 0-7.34-3.28-7.34-7.33 0-4.05 3.29-7.34 7.34-7.34h122.26c-.92-6.1-1.49-12.27-1.69-18.46H331.73c-4.05 0-7.34-3.29-7.34-7.34s3.29-7.34 7.34-7.34h123.34c.31-5.31.87-10.62 1.7-15.86h-89.98c-4.05 0-7.34-3.29-7.34-7.34s3.29-7.33 7.34-7.33h93.01c1.36-5.26 2.98-10.41 4.88-15.41H72.38c-11.22 0-21.72 6.11-29.67 15.17-9.03 10.29-14.69 24.07-14.69 37.3 0 13.68 5.97 28.94 15.46 40.43 7.92 9.6 18.16 16.26 28.9 16.26h392.08c-1.92-5-3.56-10.15-4.9-15.41zM388.38 80.45l82.65 146.03a7.656 7.656 0 0 1 1 3.96h.07c.01.19.02.37.02.55 0 34.78-40.95 62.99-91.44 62.99-49.94 0-90.54-27.6-91.41-61.86a7.663 7.663 0 0 1 1.1-6.17l84.52-145.83c2.12-3.68 6.83-4.93 10.5-2.8 1.33.76 2.34 1.86 2.99 3.13zm.32 31.76v110.36h62.45L388.7 112.21zm-14.74 110.36V112.38L310.1 222.57h63.86zM128.23 80.45l82.65 146.03a7.55 7.55 0 0 1 .99 3.96h.08c0 .19.01.37.01.55 0 34.78-40.94 62.99-91.44 62.99-49.94 0-90.53-27.6-91.41-61.86a7.5 7.5 0 0 1-.22-1.85c0-1.6.48-3.08 1.32-4.32l84.52-145.83a7.688 7.688 0 0 1 10.51-2.8c1.32.76 2.33 1.86 2.99 3.13zm.31 31.76v110.36H191l-62.46-110.36zm-14.73 110.36V112.38L49.95 222.57h63.86zM252.5 21.91c9.34 0 16.92 7.58 16.92 16.93 0 9.34-7.58 16.92-16.92 16.92-9.35 0-16.93-7.58-16.93-16.92 0-9.35 7.58-16.93 16.93-16.93z"></path>
          </svg>
          <span class="mx-4">
            Do you have any problems in the economic, criminal, civil, divorce
            matters?"
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/debt-collection">
          <svg height="68px" width="68px" xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 122.88 102.3"><defs><style>
                .cls-1 {
                  fill-rule: evenodd;
                }
              </style>
            </defs><title>payroll-salary</title><path class="cls-1" d="M111.83,70.4h10.06a1,1,0,0,1,1,1V95.8a1,1,0,0,1-1,1H111.83a1,1,0,0,1-1-1V71.38a1,1,0,0,1,1-1ZM74.23,41.54a5.71,5.71,0,1,1-4,7,5.71,5.71,0,0,1,4-7Zm34.69,11.67L89.6,70.81l-2.36-2.53L101,55.7l.19-.16a3.28,3.28,0,0,0,.16-4.63L78.94,23.59l3.27-3,26.71,32.62ZM.68,15,9.74,12.6a.93.93,0,0,1,1.13.66l5.89,22a.92.92,0,0,1-.65,1.13L7.05,38.8a.92.92,0,0,1-1.13-.65L0,16.16A.92.92,0,0,1,.68,15ZM14,15.68a1.78,1.78,0,0,1,0-1.14c.38-.95,1.85-1.09,2.76-1.34a13.34,13.34,0,0,0,2.72-1,32.71,32.71,0,0,0,3.62-2.38C26.1,7.74,28.89,6,31.81,4,38.31-.52,36-.51,44.3.65A85.94,85.94,0,0,1,54.88,2.82a5.93,5.93,0,0,1,1.41.54,5.62,5.62,0,0,1,1.21,1c4,3.37,7.51,6.9,11,10.47,1.18,1.26,1.87,2.57,1.57,3.59-1.23,4.2-6.56.12-11.73-2.15-2.17-1-5-1.58-7.44-2.47-3-.41-4.53-1.14-7.57-1-4.53.8-3.2,7.25,2.69,5.92,4-.9,13.09.5,16.25,3.19,3,2.5,2.59,5.85-1.78,6.9l-3.81.29c-6.07.47-6,.2-11.68,2.93-3.07,1.47-6.29,3-9.79,3.27-2.12.17-3.41-.36-5.59-1.25a16.31,16.31,0,0,0-3.42-1.24,10.9,10.9,0,0,0-2.94-.42c-1.48,0-3.3,1-4.43,0a2.28,2.28,0,0,1-.65-1.09L14,15.68Zm58.59,6.54L99.38,53.37,78.78,72.14l-29-33.67,6.33-5.76,5.4-.42.47-.08a9.67,9.67,0,0,0,3.78-1.74l-6.44,5.87a4.12,4.12,0,0,1-.27,5.82L76,62.55a4.12,4.12,0,0,1,5.81.27l8.14-7.43a4.11,4.11,0,0,1,.27-5.81l-16.9-20.4h0a4.11,4.11,0,0,1-5.82-.27l-1,.92a3.58,3.58,0,0,0,.26-.29A5.94,5.94,0,0,0,68,27a6,6,0,0,0,0-2.8,7.27,7.27,0,0,0-.31-1c2,.4,3.65.19,4.89-1Zm35.06,72.43V72.6H97.69c-4.2.75-8.4,3-12.61,5.68h-7.7c-3.49.21-5.32,3.74-1.93,6.06,2.7,2,6.27,1.87,9.92,1.55,2.52-.13,2.63,3.26,0,3.27-.91.07-1.9-.15-2.77-.15C78,89,74.29,88.14,72,84.54l-1.15-2.7L59.37,76.16c-5.73-1.89-9.8,4.11-5.58,8.29a150.31,150.31,0,0,0,25.52,15c6.33,3.84,12.65,3.71,19,0l9.33-4.82Z"></path>
          </svg>
          <span class="mx-4">
            Does the debtor not settle the payments on time?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/business-intelligence">
          <svg height="68px" width="68px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 501.76"><path d="M363.49 208.04 439.55 76.3 305.09 0 172.57 229.53c9.52-3.86 19.55-6.42 29.79-7.47l97.06-168.12c12.56 7.15 26.54 3.27 32.77-7.69l52.93 30.56c-6.03 10.61-2.15 24.6 8.77 30.79l-51.68 89.51c7.41 2.99 14.48 6.74 21.28 10.93zM65.73 381.06c6.11 0 11.07 4.96 11.07 11.07 0 6.12-4.96 11.07-11.07 11.07s-11.07-4.95-11.07-11.07c0-6.11 4.96-11.07 11.07-11.07zm322.2-96.59c-.01-2.1.12-4.09.38-5.97l-21.77-14.54c-3.13-2.09-6.56-4.49-10-6.9-12.38-8.67-25.13-17.6-38.87-21.21-7.42-1.95-15.98-3.25-24.75-3.42-7.64-.14-15.44.58-22.77 2.47-4.38 1.14-8.61 2.71-12.53 4.78-3.49 1.84-6.74 4.1-9.63 6.8l-14.62 17.39c-.44.86-1.07 1.6-1.83 2.17l-40.31 47.97c.6 3.07 1.81 5.64 3.46 7.69 1.92 2.38 4.48 4.15 7.43 5.25 3.12 1.17 6.72 1.62 10.53 1.31 6.08-.51 12.56-2.99 18.41-7.62l11.2-9.26c2.83-2.34 5.19-4.49 7.53-6.64 5.17-4.72 10.34-9.44 15.76-12.67 12.56-7.5 25.06-7.74 37.43 13l63.38 114.32h21.55l.02-134.92zm5.1-18.3c.98-1.36 2.1-2.61 3.36-3.74 5.53-4.98 13.45-7.41 23.61-7.42v-.03l55.1.02c11.53-.05 20.91 2.06 27.4 7.06 7.23 5.56 10.62 14.04 9.17 26.19l-12.18 125.88c-.89 11.24-3.86 20.05-9.15 26.14-5.63 6.47-13.47 9.66-23.74 9.23l-49.55.01c-6.94.36-12.82-1.52-17.74-5.46-3.61-2.87-6.59-6.81-8.98-11.72h-17.14c2.31 6.75 2.19 13.15.35 18.84-1.9 5.85-5.59 10.84-10.3 14.57-4.61 3.66-10.24 6.16-16.12 7.13-5.75.94-11.76.42-17.35-1.9-6.5 6.8-13.35 11.08-20.49 13.05-7.17 1.97-14.43 1.57-21.78-1.01-6.97 7.73-14.68 12.58-23.17 14.42-8.65 1.87-17.85.58-27.59-4.01-3.04 2.37-6.22 4.25-9.53 5.62-4.71 1.95-9.65 2.85-14.8 2.7-12.35-.37-20.67-4.02-27.29-9.94-6.31-5.64-10.56-12.89-15.35-21.23l-27.31-47.64h-21.18c-1.19 5.97-3.24 11.04-6.28 15.11l-.3.42c-5.4 6.94-13.33 10.63-24.29 10.41l-46.21.01c-9.16 1.48-17.01-.76-23.15-7.88-5.44-6.31-9.16-16.51-10.74-31.53l-.07-.55L.69 290.63c-1.89-12.77.2-21.8 5.33-27.97 5.18-6.22 12.98-9.03 22.6-9.48l.8-.05h58.5v.03c9.25-.11 17.19 1.42 23.19 5.3v.02c4.85 3.14 8.33 7.56 10.12 13.57h39.81c10-6.75 19.37-12.05 29.73-15.28 10.17-3.17 21.08-4.28 34.11-2.72l13.62-16.21.51-.54c3.8-3.61 8.05-6.58 12.62-8.99 4.8-2.53 9.96-4.45 15.3-5.83 8.5-2.2 17.46-3.04 26.19-2.88 9.89.18 19.5 1.64 27.8 3.82l.02.01c15.89 4.16 29.62 13.78 42.95 23.12 3.18 2.23 6.35 4.45 9.79 6.74l19.35 12.88zm-283.38 14.14a6.457 6.457 0 0 1-.24-2.33c-.71-4.16-2.53-6.97-5.23-8.72-3.77-2.41-9.36-3.35-16.19-3.27h-.07v.03l-58.75-.01c-6.05.29-10.69 1.74-13.28 4.86-2.79 3.34-3.79 9.11-2.43 18.05l.06.59 9.56 118.61c1.3 12.26 3.94 20.14 7.68 24.48 2.96 3.42 7 4.4 11.85 3.52.39-.07.78-.11 1.16-.11l46.27-.02.69.04c6.48.11 10.97-1.83 13.8-5.47l.23-.28c3.13-4.25 4.67-10.81 4.91-19.21l-.02-130.76zm12.89 129.74h23.64c2.5 0 4.67 1.42 5.74 3.5l29.03 50.63c4.25 7.41 8 13.83 12.73 18.06 4.42 3.95 10.21 6.4 19.09 6.66 3.33.1 6.52-.48 9.56-1.73 1.86-.77 3.69-1.81 5.48-3.11l-18.91-35.39a6.41 6.41 0 0 1 2.64-8.68c3.13-1.67 7.02-.49 8.68 2.64l20.56 38.47c7.66 3.89 14.59 5.1 20.83 3.75 5.7-1.24 11.08-4.66 16.14-10.19l-29.63-46.5a6.422 6.422 0 0 1 1.97-8.86 6.409 6.409 0 0 1 8.85 1.97l31.23 49.01c5.47 2.22 10.73 2.73 15.74 1.36 4.78-1.32 9.57-4.39 14.36-9.34l-28.29-53.25a6.44 6.44 0 0 1 2.66-8.71 6.452 6.452 0 0 1 8.71 2.67l29.26 55.09c3.81 2.2 8.21 2.78 12.45 2.08 3.7-.6 7.26-2.19 10.18-4.5 2.81-2.24 5-5.13 6.07-8.44 1.17-3.63 1.05-7.9-.97-12.54-.42-.96-.59-1.98-.52-2.97a6.418 6.418 0 0 1-3.66-4.25l-64.22-115.85c-7.14-11.94-13.58-12.25-19.8-8.55-4.41 2.63-9.05 6.88-13.7 11.12-2.81 2.57-5.64 5.16-7.98 7.09l-11.4 9.39c-7.94 6.31-16.88 9.7-25.36 10.41-5.63.46-11.13-.26-16.06-2.11-5.1-1.91-9.57-5.02-12.96-9.23-3.66-4.54-6.05-10.29-6.62-17.13-.16-1.97.58-3.79 1.87-5.09l34.71-41.3c-7.38-.1-13.91.91-20.04 2.82-9.35 2.9-18.07 7.99-27.62 14.5a6.45 6.45 0 0 1-3.99 1.38h-40.45v125.12zm321.98-28.99c6.11 0 11.07 4.96 11.07 11.07 0 6.12-4.96 11.07-11.07 11.07-6.12 0-11.08-4.95-11.08-11.07 0-6.11 4.96-11.07 11.08-11.07zm-145.85-249.3c-19.45-.76-35.83 14.38-36.59 33.83-.36 9.02 2.71 17.37 8.03 23.81 17.1-2.74 35.84-1.84 52.74 1.83a35.079 35.079 0 0 0 9.66-22.88c.76-19.45-14.39-35.83-33.84-36.59zM145.94 240.18 262.77 37.83l-19.01-10.78-117.45 203.43c4.41 2.6 8.76 6.05 12.27 9.7h7.36z"></path>
          </svg>
          <span class="mx-4">
            Would you like to know more details about third parties which you
            work with or a competitor?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/business-intelligence">
          <svg height="70px" width="70px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 396.63"><path fill-rule="nonzero" d="M12.41 86.41h16.73V45.33c0-5.71 4.62-10.33 10.32-10.33h18.39V10.34C57.85 4.63 62.46 0 68.17 0h167.74c5.71 0 10.33 4.63 10.33 10.34V35h226.23c5.71 0 10.33 4.62 10.33 10.33v41.08h18.87c5.71 0 10.33 4.63 10.33 10.33 0 2.24-.72 5.65-1.04 7.96l-35.37 260.06c-2.3 17.16-14.98 31.87-33.12 31.87H61.26c-18.25 0-31.31-14.71-33.2-32.17L.06 97.83c-.59-5.67 3.53-10.76 9.21-11.34 1.11-.11 1.98-.08 3.14-.08zm187.63 127.81h2.92v-9c0-15.03 5.93-28.74 15.47-38.7 9.63-10.03 22.92-16.27 37.57-16.27 14.65 0 27.95 6.23 37.56 16.27 9.55 9.96 15.48 23.66 15.48 38.7v9h2.93c4.75 0 8.65 3.89 8.65 8.65v85.59c0 4.76-3.9 8.65-8.65 8.65H200.04c-4.77 0-8.66-3.89-8.66-8.65v-85.59c0-4.76 3.89-8.65 8.66-8.65zm49.11 55.33-9.02 23.61h31.73l-8.34-23.94c5.3-2.72 8.92-8.24 8.92-14.61 0-9.08-7.36-16.44-16.45-16.44-9.07 0-16.43 7.36-16.43 16.44 0 6.62 3.92 12.34 9.59 14.94zm-29.8-55.33h73.3v-9c0-10.69-4.16-20.38-10.86-27.38-6.64-6.92-15.77-11.21-25.79-11.21-10.03 0-19.15 4.29-25.79 11.21-6.71 7-10.86 16.69-10.86 27.38v9zM21.84 107.12l26.79 255.26c.7 6.79 5.18 13.63 12.63 13.63h381.21c7.56 0 11.74-7.21 12.67-13.92l34.65-254.93c-155.98-.02-311.96-.04-467.95-.04zM49.8 55.71v30.66l412.33-4.38V55.71H235.91c-5.71 0-10.34-4.63-10.34-10.34V20.71H78.51v24.66c0 5.71-4.63 10.34-10.34 10.34H49.8z"></path>
          </svg>
          <span class="mx-4">
            When your company secrets are being disclosed or do you suspect of
            being surveilled?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/detective">
          <svg height="45px" width="45px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 122.88 101.54" style="enable-background:new 0 0 122.88 101.54" xml:space="preserve"><style type="text/css">
              .st0 {
                fill-rule: evenodd;
                clip-rule: evenodd;
              }
            </style><g><path class="st0" d="M66.45,11.99C72.23,6,77.7,1.31,87.33,0.21c22.83-2.62,43.82,20.75,32.29,43.76 c-3.28,6.56-9.96,14.35-17.35,21.99c-8.11,8.4-17.08,16.62-23.37,22.86l-6.8,6.74l-7.34-10.34l8.57-12.08l-7.09-6.45l5.89-7.76 l-8.17-11.52l8.17-11.52l-5.89-7.76l7.09-6.45L66.45,11.99L66.45,11.99z M55.81,101.54l-10.04-9.67 C28.73,75.46,0.94,54.8,0.02,29.21C-0.62,11.28,13.53-0.21,29.8,0c13.84,0.18,20.05,6.74,28.77,15.31l3.49,4.92l-2.02,1.83 l-0.01-0.01l-0.65,0.61l-4.54,4.13l0.06,0.08l-0.05,0.04l2.64,3.47l1.65,2.24l0.03-0.03l2.39,3.15l-8,11.28l-0.07,0.06l0.01,0.02 l-0.01,0.02l0.07,0.06l8,11.28l-2.39,3.15l-0.03-0.03l-1.64,2.23l-2.64,3.48l0.05,0.04l-0.06,0.08l4.54,4.13l0.65,0.61l0.01-0.01 l2.02,1.83l-7.73,10.89l0.05,0.05l-0.05,0.05l7.73,10.89l-2.02,1.83l-0.01-0.01l-0.65,0.61L55.81,101.54L55.81,101.54z"></path>
            </g>
          </svg>
          <span class="mx-4">Do you suspect that your life partner is unfaithful to you?</span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/business-protection">
          <svg height="60px" width="60px" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 511 512.35"><path d="M162.62 21.9c-5.49 5.43-10.63 12.02-15.42 19.71-17.37 27.82-30.33 69.99-39.92 123.16-56.3 10.64-91.06 34.14-89.9 58.14 1.04 21.74 28.46 38.41 69.67 49.92-2.71 8.38-2.07 9.82 1.6 20.13-30.78 12.98-62.94 52.4-88.65 86.93l100.03 67.61-35.32 64.85h384.41l-37.26-64.85L511 378.63c-29.08-40.85-64.19-75.56-86.12-84.98 4.63-12.02 5.44-14.12 1.56-20.79 41.21-11.72 68.23-28.84 68.17-51.47-.06-24.68-35.5-48.38-88.31-56.62-12.64-53.5-25.22-95.62-41.23-123.27-2.91-5.02-5.93-9.57-9.09-13.62-47.66-61.12-64.36-2.69-98.14-2.76-39.17-.08-44.15-53.69-95.22-3.22zm67.12 398.37c-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47h10.52c1.38 0 2.66.44 3.7 1.17 3.77 2.1 7.46 3.33 11.01 3.42 3.54.09 7.14-.96 10.8-3.45a6.515 6.515 0 0 1 3.61-1.11l12.78-.03c3.57 0 6.46 2.9 6.46 6.47s-2.89 6.47-6.46 6.47h-10.95c-5.46 3.27-10.98 4.67-16.54 4.53-5.44-.14-10.78-1.77-16.01-4.53h-8.92zm-69.12-140.78c60.43 21.74 120.87 21.38 181.3 1.83-58.45 4.75-122.79 3.62-181.3-1.83zm208.37-.86c20.89 70.63-68.53 106.5-101.95 27.98h-22.11c-34.12 78.28-122.14 44.17-102.16-28.94-7.31-.8-14.51-1.68-21.56-2.62l-.32 1.88-.59 3.56-3.48 20.87c-30.39-6.72-13.36 71.77 14.26 64.87 4.22 12.18 7.69 22.62 11.26 32.19 36.81 98.83 190.88 104.81 226.95 6.36 3.78-10.32 6.85-21.64 11.24-35.39 25.44 4.06 46.35-73.31 15.34-67.63l-3.19-21.05-.55-3.65-.23-1.54c-7.47 1.16-15.12 2.2-22.91 3.11zM123.7 176.34l7.43-25.43c48.16 40.42 214.59 34.09 250.87 0l6.26 25.43c-42.31 44.75-219.33 38.67-264.56 0z"></path>
          </svg>
          <span class="mx-4">
            Perhaps, do you have a feeling of being observed or someone tried to
            receive unauthorized access to your documents or talks?
          </span>
        </a>
      </li>
      <li class="hover:bg-red-600 rounded-2xl px-3 py-2">
        <a class="hover:text-gray-100 flex items-center my-2 duration-200" href="/business-protection">
          <svg height="55px" width="55px" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="512px" height="512px" version="1.1" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 512">
            <path fill="black" fill-rule="nonzero" d="M423.51 61.53c-5.02,-5.03 -10.92,-7.51 -17.75,-7.51 -6.82,0 -12.8,2.48 -17.75,7.51l-27.05 26.97c-7.25,-4.7 -14.93,-8.8 -22.95,-12.47 -8.02,-3.67 -16.22,-6.82 -24.5,-9.55l0 -41.48c0,-7 -2.38,-12.89 -7.25,-17.75 -4.86,-4.86 -10.75,-7.25 -17.75,-7.25l-52.05 0c-6.66,0 -12.45,2.39 -17.49,7.25 -4.95,4.86 -7.43,10.75 -7.43,17.75l0 37.98c-8.7,2.04 -17.15,4.6 -25.26,7.76 -8.19,3.16 -15.95,6.74 -23.29,10.75l-29.96 -29.53c-4.69,-4.94 -10.4,-7.5 -17.32,-7.5 -6.83,0 -12.71,2.56 -17.75,7.5l-36.43 36.54c-5.03,5.03 -7.51,10.92 -7.51,17.73 0,6.83 2.48,12.81 7.51,17.75l26.97 27.06c-4.7,7.26 -8.79,14.93 -12.46,22.95 -3.68,8.02 -6.83,16.22 -9.56,24.49l-41.47 0c-7.01,0 -12.9,2.39 -17.76,7.26 -4.86,4.86 -7.25,10.75 -7.25,17.75l0 52.05c0,6.65 2.39,12.46 7.25,17.5 4.86,4.94 10.75,7.42 17.76,7.42l37.97 0c2.04,8.7 4.6,17.15 7.76,25.25 3.17,8.2 6.75,16.13 10.75,23.81l-29.52 29.44c-4.95,4.7 -7.51,10.41 -7.51,17.33 0,6.82 2.56,12.71 7.51,17.75l36.53 36.95c5.03,4.69 10.92,7 17.75,7 6.82,0 12.79,-2.31 17.75,-7l27.04 -27.48c7.26,4.69 14.94,8.78 22.96,12.46 8.02,3.66 16.21,6.83 24.49,9.55l0 41.48c0,7 2.39,12.88 7.25,17.74 4.86,4.87 10.76,7.26 17.75,7.26l52.05 0c6.66,0 12.46,-2.39 17.5,-7.26 4.94,-4.86 7.42,-10.74 7.42,-17.74l0 -37.98c8.7,-2.04 17.15,-4.6 25.25,-7.76 8.2,-3.16 16.14,-6.74 23.81,-10.75l29.44 29.53c4.7,4.95 10.49,7.5 17.51,7.5 7.07,0 12.87,-2.55 17.57,-7.5l36.95 -36.53c4.69,-5.04 7,-10.92 7,-17.75 0,-6.82 -2.31,-12.8 -7,-17.75l-27.48 -27.05c4.7,-7.26 8.79,-14.93 12.46,-22.96 3.66,-8.01 6.83,-16.21 9.56,-24.49l41.47 0c7,0 12.88,-2.4 17.74,-7.25 4.87,-4.87 7.26,-10.75 7.26,-17.75l0 -52.05c0,-6.66 -2.39,-12.45 -7.26,-17.5 -4.86,-4.95 -10.74,-7.42 -17.74,-7.42l-37.98 0c-2.04,-8.36 -4.6,-16.73 -7.76,-25 -3.16,-8.37 -6.74,-16.21 -10.75,-23.56l29.53 -29.95c4.95,-4.69 7.5,-10.41 7.5,-17.32 0,-6.83 -2.55,-12.71 -7.5,-17.75l-36.53 -36.43zm-48.41 257.98c-22.72,42.52 -67.54,71.44 -119.1,71.44 -51.58,0 -96.37,-28.92 -119.09,-71.42 2.66,-11.61 7.05,-21.74 19.9,-28.84 17.76,-9.89 48.34,-9.15 62.89,-22.24l20.1 52.78 10.1 -28.77 -4.95 -5.42c-3.72,-5.44 -2.44,-11.62 4.46,-12.74 2.33,-0.37 4.95,-0.14 7.47,-0.14 2.69,0 5.68,-0.25 8.22,0.32 6.41,1.41 7.07,7.62 3.88,12.56l-4.95 5.42 10.11 28.77 18.18 -52.78c13.12,11.8 48.43,14.18 62.88,22.24 12.89,7.22 17.26,17.24 19.9,28.82zm-159.11 -86.45c-1.82,0.03 -3.31,-0.2 -4.93,-1.1 -2.15,-1.19 -3.67,-3.24 -4.7,-5.55 -2.17,-4.86 -3.89,-17.63 1.57,-21.29l-1.02 -0.66 -0.11 -1.41c-0.21,-2.57 -0.26,-5.68 -0.32,-8.95 -0.2,-12 -0.45,-26.56 -10.37,-29.47l-4.25 -1.26 2.81 -3.38c8.01,-9.64 16.38,-18.07 24.82,-24.54 9.55,-7.33 19.26,-12.2 28.75,-13.61 9.77,-1.44 19.23,0.75 27.97,7.62 2.57,2.03 5.08,4.48 7.5,7.33 9.31,0.88 16.94,5.77 22.38,12.75 3.24,4.16 5.71,9.09 7.29,14.33 1.56,5.22 2.24,10.77 1.95,16.23 -0.53,9.8 -4.2,19.35 -11.61,26.33 1.3,0.04 2.53,0.33 3.61,0.91 4.14,2.15 4.27,6.82 3.19,10.75 -1.08,3.28 -2.44,7.08 -3.73,10.28 -1.56,4.31 -3.85,5.12 -8.27,4.65 -9.93,43.45 -69.98,44.93 -82.53,0.04zm40.01 -135.69c87.64,0 158.63,71.04 158.63,158.63 0,87.64 -71.04,158.63 -158.63,158.63 -87.63,0 -158.63,-71.04 -158.63,-158.63 0,-87.64 71.04,-158.63 158.63,-158.63z"></path>
          </svg>
          <span class="mx-4">
            Do you have concerns relating with the integrity aspects within your
            Company?
          </span>
        </a>
      </li>
    </ul>
  </nav>
</div>`;
});

const $$file$w = "/home/szymon/Programming/jaran/jaran-website/src/components/Sidebar_en.astro";
const $$url$w = undefined;

const $$module3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$w,
  default: $$SidebarEn,
  file: $$file$w,
  url: $$url$w
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$v = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite_en.astro", { modules: [{ module: $$module1$4, specifier: "../components/ContactButton_en.astro", assert: {} }, { module: $$module2$c, specifier: "../components/Footer_en.astro", assert: {} }, { module: $$module3$1, specifier: "../components/Form_en.astro", assert: {} }, { module: $$module4$3, specifier: "../components/Nav_en.astro", assert: {} }, { module: $$module3, specifier: "../components/Sidebar_en.astro", assert: {} }, { module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$v = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$SubsiteEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$v, $$props, $$slots);
  Astro2.self = $$SubsiteEn;
  return renderTemplate`<html lang="en">
  <head>
    <meta name="google-site-verification" content="cy2LBn3YlupNGqpHEm_bKVFq70NARt2VTHNYb_kHo_w">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <meta name="description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">

    <meta property="og:title" content="JARAN Detective office">
    <meta property="og:description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">
    <meta property="og:image" content="TO DO">
    <meta property="og:url" content="TO DO">

    <meta name="twitter:title" content="JARAN Detective office">
    <meta name="twitter:description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">
    <meta name="twitter:url" content="TODO">
    <meta name="twitter:card" content="biuro detektywistyczne">

    <title>${"JARAN private detective office Warsaw"}</title>
  ${renderHead($$result)}</head>

  <body class="font-[Roboto] static bg-gray-900">
    ${renderComponent($$result, "Nav", $$NavEn, {})}
    <section class="bg-gray-900">
      <div class="absolute z-20 flex flex-col w-full top-24 sm:top-24 lg:top-28 xl:top-48">
        <h1 class="text-4xl sm:text-5xl lg:text-7xl -mb-5 sm:mb-0 lg:mb-0 font-thin text-gray-300 mx-auto text-center leading-tight">
          ${Astro2.props.title}
        </h1>
        ${renderComponent($$result, "ContactButton", $$ContactButtonEn, {})}
      </div>
      <div class="z-10 absolute sm:-top-16 md:-top-24 lg:-top-32 xl:-top-40 2xl:-top-48 mx-auto">
        <picture${addAttribute(Astro2.props.clss, "class")} class="object-fill mx-auto">
          ${renderComponent($$result, "Image", $$Image, { "src": Astro2.props.imgsrc, "format": "webp", "width": "1920", "height": "1000", "alt": Astro2.props.altprop })}
        </picture>
      </div>

      <div class="absolute z-10 w-full mt-[200px] sm:mt-[285px] md:mt-[282px] lg:mt-[376px] xl:mt-[470px] 2xl:mt-[564px] flex flex-col bg-gray-900">
        <div class="px-5 flex flex-row">
          <div class="lg:pl-20 flex w-full">
            <div class="text-gray-300 lg:px-6 lg:w-10/12 text-center">
              <section>
                <div class="flex flex-col items-center w-full md:px-10 py-8 text-left">
                  ${renderSlot($$result, $$slots["default"])}
                </div>
              </section>
              <div class="w-full mx-auto pt-24">
                ${renderComponent($$result, "Form", $$FormEn, {})}
              </div>
            </div>
          </div>
          <div class="pt-24">
            ${renderComponent($$result, "Sidebar", $$SidebarEn, {})}
          </div>
        </div>
        ${renderComponent($$result, "Footer", $$FooterEn, {})}
      </div>
    </section>
  </body></html>`;
});

const $$file$v = "/home/szymon/Programming/jaran/jaran-website/src/layouts/Subsite_en.astro";
const $$url$v = undefined;

const $$module1$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$v,
  default: $$SubsiteEn,
  file: $$file$v,
  url: $$url$v
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$u = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/infgos-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$u = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/infgos-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$InfgosContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$u, $$props, $$slots);
  Astro2.self = $$InfgosContent;
  return renderTemplate`${maybeRenderHead($$result)}<article>
<div class="pb-2">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    What do we offer?
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Business intelligence.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Acquiring information that is important for an Enterprise.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Identifying threats and assisting in their liquidation.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Identifying unfair competition, collecting information indicating and
counteracting unfair competition.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Collecting evidence of unauthorized use of trade names, trademarks and
company secrets.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Gathering information, documents, items that are important for the strategic
interests of the company.
      </li>
    </ul>
  </div>
</div>
<div class="pt-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Metody, narzędzia i techniki działania
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Tworzenie ekspertskich zespołów zadaniowych do konkretnej sprawy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Działania ofensywne w celu uzyskania informacji, dokumentów, przedmiotów,
        mających żywotne znaczenie dla strategicznych celów Firmy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja wskazanych osób, obiektów, pojazdów
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Analiza psychologiczna i charakterologiczna przeciwnika biznesowego
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Wykorzystywanie nowoczesnych technik specjalnych w prowadzonych sprawach
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie dowodów wskazujących na nieuczciwą działalność konkurencji
      </li>
    </ul>
  </div>
</div>
</article>`;
});

const $$file$u = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/infgos-content.astro";
const $$url$u = undefined;

const $$module2$b = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$u,
  default: $$InfgosContent,
  file: $$file$u,
  url: $$url$u
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$t = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/business-intelligence.astro", { modules: [{ module: $$module1$3, specifier: "../layouts/Subsite_en.astro", assert: {} }, { module: $$module2$b, specifier: "../components/subpages/en/infgos-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$t = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/business-intelligence.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$BusinessIntelligence = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$t, $$props, $$slots);
  Astro2.self = $$BusinessIntelligence;
  return renderTemplate`${renderComponent($$result, "Subsite", $$SubsiteEn, { "title": "Business Intelligence Office", "imgsrc": "/backgrounds/informacja-gospodarcza.jpg", "clss": "brightness-50", "altprop": "Dwa laptopy na kt\xF3rych pracuje osoba" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$InfgosContent, {})}` })}`;
});

const $$file$t = "/home/szymon/Programming/jaran/jaran-website/src/pages/business-intelligence.astro";
const $$url$t = "/business-intelligence";

const _page3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$t,
  default: $$BusinessIntelligence,
  file: $$file$t,
  url: $$url$t
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$s = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/obiz-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$s = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/obiz-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ObizContent$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$s, $$props, $$slots);
  Astro2.self = $$ObizContent$1;
  return renderTemplate`${maybeRenderHead($$result)}<article>
<div class="pb-2">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Co oferujemy?
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Recognizing the company's competitive environment, identifying and
counteracting risks.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Assistance in the selection and verification of personnel, checking
biographical data, employment history, establishing social, professional and
criminal contacts.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Rozpoznawanie otoczenia konkurencyjnego Firmy, identyfikacja zagrożeń i aktywne
        przeciwdziałanie szpiegostwu gospodarczemu
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Capturing "information leaks" from the company, revealing sources and
inspirations.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Detection of bugging devices in cars and objects, securing business
meetings.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Verifying employees' integrity and loyalty, disclosing abuse within the
company.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Conducting internal investigations in cases ordered by the company.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Conducting audits, including security audits.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Carrying out wariographic examinations (court expert).
      </li>
    </ul>
  </div>
</div>

<div class="pb-2 pt-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Methods, tools and techniques of action for the execution of given tasks:
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Building teams of experts for a particular case.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Documenting events, facts and circumstances, evaluating and verifying
evidence.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Supervision over the quality of the procedures conducted by the authorities
law enforcement and other government agencies.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Detection of surveillance and bugging devices.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Screening on a "lie detector" (forensic expert).
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Conducting security and ICT security audits.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Secret observation of people, objects, vehicles.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Investigative IT.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Legal and operational advice and support of Client at every stage of the
proceedings.
      </li>
    </ul>
  </div>
</div>
</article>`;
});

const $$file$s = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/obiz-content.astro";
const $$url$s = undefined;

const $$module2$a = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$s,
  default: $$ObizContent$1,
  file: $$file$s,
  url: $$url$s
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$r = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/business-protection.astro", { modules: [{ module: $$module1$3, specifier: "../layouts/Subsite_en.astro", assert: {} }, { module: $$module2$a, specifier: "../components/subpages/en/obiz-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$r = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/business-protection.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$BusinessProtection = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$r, $$props, $$slots);
  Astro2.self = $$BusinessProtection;
  return renderTemplate`${renderComponent($$result, "Subsite", $$SubsiteEn, { "title": "Office of business protection", "imgsrc": "/backgrounds/ochrona-biznesu.jpg", "clss": "brightness-50", "altprop": "Widok na wie\u017Cowce z ulicy" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$ObizContent$1, {})}` })}`;
});

const $$file$r = "/home/szymon/Programming/jaran/jaran-website/src/pages/business-protection.astro";
const $$url$r = "/business-protection";

const _page4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$r,
  default: $$BusinessProtection,
  file: $$file$r,
  url: $$url$r
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$q = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/windykacja-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$q = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/windykacja-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$WindykacjaContent$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$q, $$props, $$slots);
  Astro2.self = $$WindykacjaContent$1;
  return renderTemplate`${maybeRenderHead($$result)}<article class="pb-2">
  <div>
    <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
      What do we offer?
    </h2>
  </div>
  <div>
    <div class="pt-5">
      <ul class="text-lg md:text-xl">
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Professional financial debt collection.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Collecting financial receivables in an efficient manner.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Looking for the debtor’s assets.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Performing direct debt collection activities preceding court proceedings.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Supporting Clients at all stages of the procedure.
        </li>
      </ul>
    </div>
  </div>

  <div class="pt-5">
    <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
      Methods, tools and techniques of action for the execution of given tasks:
    </h2>
    <div class="pt-5">
      <ul class="text-lg md:text-xl">
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Building teams of experts for a particular case.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Documenting events, facts and circumstances, evaluating and verifying evidence.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Secret observation of people, objects, vehicles.
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Legal and operational advice and support of Client at every stage of the
          proceedings.
        </li>
      </ul>
    </div>
  </div>
</article>`;
});

const $$file$q = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/windykacja-content.astro";
const $$url$q = undefined;

const $$module2$9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$q,
  default: $$WindykacjaContent$1,
  file: $$file$q,
  url: $$url$q
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$p = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/debt-collection.astro", { modules: [{ module: $$module1$3, specifier: "../layouts/Subsite_en.astro", assert: {} }, { module: $$module2$9, specifier: "../components/subpages/en/windykacja-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$p = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/debt-collection.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$DebtCollection = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$p, $$props, $$slots);
  Astro2.self = $$DebtCollection;
  return renderTemplate`${renderComponent($$result, "Subsite", $$SubsiteEn, { "title": "Debt-collection", "imgsrc": "/backgrounds/windykacja.jpeg", "clss": "brightness-50 grayscale", "altprop": "Czarno bia\u0142y stos ksi\u0105\u017Cek" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$WindykacjaContent$1, {})}` })}`;
});

const $$file$p = "/home/szymon/Programming/jaran/jaran-website/src/pages/debt-collection.astro";
const $$url$p = "/debt-collection";

const _page5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$p,
  default: $$DebtCollection,
  file: $$file$p,
  url: $$url$p
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$o = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/obiz-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$o = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/obiz-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ObizContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$o, $$props, $$slots);
  Astro2.self = $$ObizContent;
  return renderTemplate`${maybeRenderHead($$result)}<article>
<div class="pb-2">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Co oferujemy?
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Organizowanie kompleksowej osłony kontrwywiadowczej dla Firmy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Wykrywanie sprawców nadużyć na szkodę Firmy i ich mocodawców
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Rozpoznawanie otoczenia konkurencyjnego Firmy, identyfikacja zagrożeń i aktywne
        przeciwdziałanie szpiegostwu gospodarczemu
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Pomoc w zakresie doboru i weryfikacji kadr, sprawdzanie danych biograficznych,
        historii zatrudnienia, ustalanie kontaktów towarzyskich, zawodowych, powiązań
        rodzinnych i związków przestępczych
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Wychwytywanie „przecieków informacji” z Firmy, ujawnianie źródeł oraz inspiratorów
        tych incydentów pod kątem ich neutralizacji
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Sprawdzanie uczciwości i lojalności podejrzewanych pracowników
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Przeciwdziałanie wrogim atakom ze strony mediów, identyfikowanie mocodawców
        tych ataków i tworzenie odpowiedniego wizerunku Firmy
      </li>
    </ul>
  </div>
</div>

<div class="pb-2 pt-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Metody, narzędzia i techniki działania.
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Tworzenie zespołów analityczno - windykacyjnych do konkretnej sprawy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Merytoryczna ocena, analiza i weryfikacja materiałów sprawy
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja osób, obiektów, pojazdów
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Przeprowadzanie polubownych negocjacji przez bezpośrednie kontakty windykatorów
        terenowych
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Doradztwo prawne, operacyjne i wspieranie Klienta na każdym etapie postępowania
      </li>
    </ul>
  </div>
</div>
</article>`;
});

const $$file$o = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/obiz-content.astro";
const $$url$o = undefined;

const $$module2$8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$o,
  default: $$ObizContent,
  file: $$file$o,
  url: $$url$o
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$n = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/ochrona-biznesu.astro", { modules: [{ module: $$module1$5, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module2$8, specifier: "../components/subpages/pl/obiz-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$n = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/ochrona-biznesu.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$OchronaBiznesu = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$n, $$props, $$slots);
  Astro2.self = $$OchronaBiznesu;
  return renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Ochrona Biznesu", "imgsrc": "/backgrounds/ochrona-biznesu.jpg", "clss": "brightness-50", "altprop": "Widok na wie\u017Cowce z ulicy" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$ObizContent, {})}` })}`;
});

const $$file$n = "/home/szymon/Programming/jaran/jaran-website/src/pages/ochrona-biznesu.astro";
const $$url$n = "/ochrona-biznesu";

const _page6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$n,
  default: $$OchronaBiznesu,
  file: $$file$n,
  url: $$url$n
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$m = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/windykacja-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$m = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/windykacja-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$WindykacjaContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$m, $$props, $$slots);
  Astro2.self = $$WindykacjaContent;
  return renderTemplate`${maybeRenderHead($$result)}<article class="pb-2">
  <div>
    <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
      Co oferujemy?
    </h2>
    <p class="text-lg md:text-xl pt-5">
      Skuteczne ściąganie długów i należności to sprawa wymagająca doświadczenia
      i odpowiedniego podejścia. Każda windykacja w naszej firmie poprzedzona
      jest dokładną analizą, dzięki której opracowuje się sukcesywny plan
      działania. Każdy Klient ma swoją, odrębną historię, dlatego ważne jest aby
      do sprawy podchodzić indywidualnie. Jeżeli jesteś zainteresowany naszymi
      usługami, zapraszamy do Centrali naszej firmy w Warszawie.
    </p>
  </div>
  <div>
    <div class="pt-5">
      <ul class="text-lg md:text-xl">
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Profesjonalne dochodzenie zobowiązań i należności finansowych
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Czynności windykacyjne poprzedzone dokładnym rozpoznaniem sytuacji finansowej
          i majątkowej dłużnika oraz jego najbliższych
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Poszukiwanie nieuczciwego dłużnika, ustalanie miejsca jego pobytu, analiza
          psychologiczna i charakterologiczna opornego dłużnika celem doboru adekwatnej
          taktyki postępowania wobec niego
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Prowadzenie bezpośrednich negocjacji, postępowań ugodowych, ustalanie warunków
          i monitorowanie spłaty zaległych należności
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Bieżące i aktywne wspomaganie windykacji sądowej i egzekucyjnej
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Działamy wyłącznie w granicach określonych przepisami prawa
        </li>
      </ul>
    </div>
  </div>

  <div class="pt-5">
    <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
      Metody, narzędzia i techniki działania.
    </h2>
    <div class="pt-5">
      <ul class="text-lg md:text-xl">
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Tworzenie zespołów analityczno - windykacyjnych do konkretnej sprawy
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Merytoryczna ocena, analiza i weryfikacja materiałów sprawy
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Niejawna obserwacja osób, obiektów, pojazdów
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Przeprowadzanie polubownych negocjacji przez bezpośrednie kontakty windykatorów
          terenowych
        </li>
        <li class="flex text-body-color mb-2">
          <span class="rounded-full mr-2 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
              <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
              <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
            </svg>
          </span>
          Doradztwo prawne, operacyjne i wspieranie Klienta na każdym etapie postępowania
        </li>
      </ul>
    </div>
  </div>
</article>`;
});

const $$file$m = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/windykacja-content.astro";
const $$url$m = undefined;

const $$module2$7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$m,
  default: $$WindykacjaContent,
  file: $$file$m,
  url: $$url$m
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$l = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/windykacja.astro", { modules: [{ module: $$module1$5, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module2$7, specifier: "../components/subpages/pl/windykacja-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$l = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/windykacja.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Windykacja = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$l, $$props, $$slots);
  Astro2.self = $$Windykacja;
  return renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Windykacja", "imgsrc": "/backgrounds/windykacja.jpeg", "clss": "brightness-50 grayscale", "altprop": "Czarno bia\u0142y stos ksi\u0105\u017Cek" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$WindykacjaContent, {})}` })}`;
});

const $$file$l = "/home/szymon/Programming/jaran/jaran-website/src/pages/windykacja.astro";
const $$url$l = "/windykacja";

const _page7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$l,
  default: $$Windykacja,
  file: $$file$l,
  url: $$url$l
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$k = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/detektyw-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$k = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/detektyw-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$DetektywContent$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$k, $$props, $$slots);
  Astro2.self = $$DetektywContent$1;
  return renderTemplate`${maybeRenderHead($$result)}<article>
<div class="pb-2">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    What do we offer?
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Collecting information in criminal, economic, insurance, civil, divorce,
inheritance and other matters.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Searching for missing persons, hiding people, family members, others.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Conducting divorce cases, preparation of evidence for divorce cases.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Verification resumes, employee history, establishing social and business
relationships, financial situations.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Secret observation of indicated persons, cars and objects.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Identifying the offenders of malicious anxiety, criminal threats or
defamation.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Discreet checking of the child's contacts, control of guardians and
housewives.
      </li>
    </ul>
  </div>
</div>
<div class="pt-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Methods, tools and techniques of action for the execution of given tasks:
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Collecting information on criminal, economic, civil, divorce, inheritance insurance and other cases.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Conducting investigations and proceedings in cases requiring substantive explanations.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Searching for missing people, family members and others.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Documenting events, facts and circumstances, evaluating and verifying
evidence.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Secret observation of people, objects, vehicles.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Identifying the perpetrators of malicious disturbance, criminal threats or defamation.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Investigative IT.
      </li>
    </ul>
  </div>
</div>
</article>`;
});

const $$file$k = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/detektyw-content.astro";
const $$url$k = undefined;

const $$module2$6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$k,
  default: $$DetektywContent$1,
  file: $$file$k,
  url: $$url$k
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$j = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/detective.astro", { modules: [{ module: $$module1$3, specifier: "../layouts/Subsite_en.astro", assert: {} }, { module: $$module2$6, specifier: "../components/subpages/en/detektyw-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$j = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/detective.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Detective = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$j, $$props, $$slots);
  Astro2.self = $$Detective;
  return renderTemplate`${renderComponent($$result, "Subsite", $$SubsiteEn, { "title": "Detective", "imgsrc": "/backgrounds/detektyw.jpg", "clss": "brightness-50", "altprop": "Tablica szach\xF3w z widocznymi pionkami" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$DetektywContent$1, {})}` })}`;
});

const $$file$j = "/home/szymon/Programming/jaran/jaran-website/src/pages/detective.astro";
const $$url$j = "/detective";

const _page8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$j,
  default: $$Detective,
  file: $$file$j,
  url: $$url$j
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$i = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/detektyw-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$i = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/detektyw-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$DetektywContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$i, $$props, $$slots);
  Astro2.self = $$DetektywContent;
  return renderTemplate`${maybeRenderHead($$result)}<article>
<div class="pb-2">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Co oferujemy?
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie informacji do spraw karnych, gospodarczych, ubezpieczeniowych,
        cywilnych, rozwodowych, spadkowych, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie śledztw i postępowań w sprawach wymagających merytorycznych wyjaśnień.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Poszukiwanie osób zaginionych, ukrywających się, członków rodziny, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie spraw dotyczących zdrady małżeńskiej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalenia, wywiady środowiskowe, sprawdzanie życiorysów, historii pracowniczej,
        ustalanie kontaktów towarzysko-biznesowych, sytuacji finansowej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja wskazanych osób i obiektów.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalanie sprawców złośliwego niepokojenia, gróźb karalnych bądź zniesławienia.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Dyskretne sprawdzanie kontaktów dziecka (zagrożenia narkomanią, sektami,
        prostytucją), kontrola opiekunek i gospodyń domowych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Informatyka śledcza.
      </li>
    </ul>
  </div>
</div>

<div class="pt-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
    Metody, narzędzia i techniki działania służące realizacji zadań
  </h2>
  <div class="pt-5">
    <ul class="text-lg md:text-xl">
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Zbieranie informacji do spraw karnych, gospodarczych, ubezpieczeniowych,
        cywilnych, rozwodowych, spadkowych, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie śledztw i postępowań w sprawach wymagających merytorycznych wyjaśnień.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Poszukiwanie osób zaginionych, ukrywających się, członków rodziny, innych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Prowadzenie spraw dotyczących zdrady małżeńskiej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalenia, wywiady środowiskowe, sprawdzanie życiorysów, historii pracowniczej,
        ustalanie kontaktów towarzysko-biznesowych, sytuacji finansowej.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Niejawna obserwacja wskazanych osób i obiektów.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Ustalanie sprawców złośliwego niepokojenia, gróźb karalnych bądź zniesławienia.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Dyskretne sprawdzanie kontaktów dziecka (zagrożenia narkomanią, sektami,
        prostytucją), kontrola opiekunek i gospodyń domowych.
      </li>
      <li class="flex text-body-color mb-2">
        <span class="rounded-full mr-2 text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" class="fill-current">
            <path style="fill: #dc2626" d="M10 19.625C4.6875 19.625 0.40625 15.3125 0.40625 10C0.40625 4.6875 4.6875 0.40625 10 0.40625C15.3125 0.40625 19.625 4.6875 19.625 10C19.625 15.3125 15.3125 19.625 10 19.625ZM10 1.5C5.3125 1.5 1.5 5.3125 1.5 10C1.5 14.6875 5.3125 18.5312 10 18.5312C14.6875 18.5312 18.5312 14.6875 18.5312 10C18.5312 5.3125 14.6875 1.5 10 1.5Z"></path>
            <path style="fill: #dc2626" d="M8.9375 12.1875C8.71875 12.1875 8.53125 12.125 8.34375 11.9687L6.28125 9.96875C6.0625 9.75 6.0625 9.40625 6.28125 9.1875C6.5 8.96875 6.84375 8.96875 7.0625 9.1875L8.9375 11.0312L12.9375 7.15625C13.1563 6.9375 13.5 6.9375 13.7188 7.15625C13.9375 7.375 13.9375 7.71875 13.7188 7.9375L9.5625 12C9.34375 12.125 9.125 12.1875 8.9375 12.1875Z"></path>
          </svg>
        </span>
        Informatyka śledcza.
      </li>
    </ul>
  </div>
</div>
</article>`;
});

const $$file$i = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/detektyw-content.astro";
const $$url$i = undefined;

const $$module2$5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$i,
  default: $$DetektywContent,
  file: $$file$i,
  url: $$url$i
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$h = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/detektyw.astro", { modules: [{ module: $$module1$5, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module2$5, specifier: "../components/subpages/pl/detektyw-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$h = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/detektyw.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Detektyw = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$h, $$props, $$slots);
  Astro2.self = $$Detektyw;
  return renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Detektyw", "imgsrc": "/backgrounds/detektyw.jpg", "clss": "brightness-50", "altprop": "Tablica szach\xF3w z widocznymi pionkami" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$DetektywContent, {})}` })}`;
});

const $$file$h = "/home/szymon/Programming/jaran/jaran-website/src/pages/detektyw.astro";
const $$url$h = "/detektyw";

const _page9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$h,
  default: $$Detektyw,
  file: $$file$h,
  url: $$url$h
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$g = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactSidebar_en.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$g = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactSidebar_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactSidebarEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$g, $$props, $$slots);
  Astro2.self = $$ContactSidebarEn;
  return renderTemplate`${maybeRenderHead($$result)}<div class="hidden xl:flex flex-col bg-red-700 mr-32 rounded-2xl text-gray-300 h-full text-left text-lg md:text-xl">
  <div class="py-10 px-10 w-96">
    <h3 class="text-4xl pb-2 text-white font-bold ">Let us meet</h3>
    <p>
      Our office is located in the center of Warsaw, less than 400 meters from the Palace of Culture and Science. We invite you to Poznańska Street in Warsaw, however, we can meet in another convenient place.
    </p>

    <h3 class="py-3 text-4xl text-white font-bold">Address</h3>
    <ul>
      <li>ul. Poznańska 24 lok. 21</li>
      <li>00-685 Warszawa</li>
      <li>tel: +48 22 622 14 08</li>
      <li>tel: +48 669 981 964</li>
      <li>email: biuro@jaran.com.pl</li>
    </ul>
  </div>
</div>`;
});

const $$file$g = "/home/szymon/Programming/jaran/jaran-website/src/components/ContactSidebar_en.astro";
const $$url$g = undefined;

const $$module4$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$g,
  default: $$ContactSidebarEn,
  file: $$file$g,
  url: $$url$g
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$f = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Map.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$f = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Map.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Map = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$f, $$props, $$slots);
  Astro2.self = $$Map;
  return renderTemplate`${maybeRenderHead($$result)}<div class="w-screen h-[500px]">
  <iframe loading="lazy" allow="" width="100%" height="100%" id="gmap_canvas" src="https://maps.google.com/maps?q=Biuro%20Detektywistyczne%20JARAN&t=&z=15&ie=UTF8&iwloc=&output=embed"></iframe>
</div>`;
});

const $$file$f = "/home/szymon/Programming/jaran/jaran-website/src/components/Map.astro";
const $$url$f = undefined;

const $$module5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$f,
  default: $$Map,
  file: $$file$f,
  url: $$url$f
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$e = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/ContactSubite_en.astro", { modules: [{ module: $$module2$c, specifier: "../components/Footer_en.astro", assert: {} }, { module: $$module3$1, specifier: "../components/Form_en.astro", assert: {} }, { module: $$module4$3, specifier: "../components/Nav_en.astro", assert: {} }, { module: $$module4$2, specifier: "../components/ContactSidebar_en.astro", assert: {} }, { module: $$module5, specifier: "../components/Map.astro", assert: {} }, { module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$e = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/ContactSubite_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactSubiteEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$ContactSubiteEn;
  return renderTemplate`<html lang="en">
  <head>
    <meta name="google-site-verification" content="cy2LBn3YlupNGqpHEm_bKVFq70NARt2VTHNYb_kHo_w">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <meta name="description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">

    <meta property="og:title" content="JARAN Detective office">
    <meta property="og:description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">
    <meta property="og:image" content="TO DO">
    <meta property="og:url" content="TO DO">

    <meta name="twitter:title" content="JARAN Detective office">
    <meta name="twitter:description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">
    <meta name="twitter:url" content="TODO">
    <meta name="twitter:card" content="Detective office">

    <title>${"JARAN private detective office Warsaw"}</title>
  ${renderHead($$result)}</head>

  <body class="font-[Roboto] static bg-gray-900 h-full">
    ${renderComponent($$result, "Nav", $$NavEn, {})}
    <section class="bg-gray-900">
      <div class="absolute z-20 flex flex-col w-full pt-3 sm:pt-12 md:pt-12 top-24 sm:top-24 lg:top-28 xl:top-48">
        <h1 class="text-4xl sm:text-5xl lg:text-7xl -mb-5 sm:mb-0 lg:mb-0 font-thin text-gray-300 mx-auto text-center leading-tight">
          ${Astro2.props.title}
        </h1>
      </div>
      <div class="z-10 absolute sm:-top-16 md:-top-24 lg:-top-32 xl:-top-40 2xl:-top-48 mx-auto">
        <picture${addAttribute(Astro2.props.clss, "class")} class="object-fill mx-auto">
          ${renderComponent($$result, "Image", $$Image, { "class": "brightness-150", "src": Astro2.props.imgsrc, "format": "webp", "alt": "Zdj\u0119cie starego telefonu", "height": "1000", "width": "1920" })}
        </picture>
      </div>

      <div class="absolute z-10 w-full mt-[200px] sm:mt-[285px] md:mt-[282px] lg:mt-[376px] xl:mt-[470px] 2xl:mt-[564px] flex flex-col bg-gray-900">
        <div class="flex flex-row">
          <div class="lg:pl-20 md:px-10 flex w-full">
            <div class="text-gray-300 lg:px-6 lg:w-10/12 text-center">
              <section>
                <div class="flex flex-col items-center px-10 xl:pb-16 pt-8 text-left w-10/12">
                  ${renderSlot($$result, $$slots["default"])}
                </div>
              </section>
              <div class=" w-full mx-auto pt-24">
                ${renderComponent($$result, "Form", $$FormEn, {})}
              </div>
            </div>
          </div>
          <div class="pt-12 pb-72">
            ${renderComponent($$result, "Sidebar", $$ContactSidebarEn, {})}
          </div>
        </div>
        <div class="flex flex-col mx-auto">
          <div class="flex py-20">
            ${renderComponent($$result, "Map", $$Map, {})}
          </div>
          ${renderComponent($$result, "Footer", $$FooterEn, {})}
        </div>
      </div>
    </section>
  </body></html>`;
});

const $$file$e = "/home/szymon/Programming/jaran/jaran-website/src/layouts/ContactSubite_en.astro";
const $$url$e = undefined;

const $$module1$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$e,
  default: $$ContactSubiteEn,
  file: $$file$e,
  url: $$url$e
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$d = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/kontakt-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$d = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/kontakt-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$KontaktContent$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$KontaktContent$1;
  return renderTemplate`${maybeRenderHead($$result)}<div>
  <div><h2 class="text-4xl sm:text-6xl pb-2 text-white bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">Contact us!</h2></div>
  <div class="text-gray-300 h-full text-left text-lg md:text-xl pt-5">
    <p>In Jaran we always have time for our customers. Leave us a message including your name and e-mail address. Describe your case and how you would expect us to help you. We will get back to you as soon as possible.</p>
  </div>
</div>`;
});

const $$file$d = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/kontakt-content.astro";
const $$url$d = undefined;

const $$module2$4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$d,
  default: $$KontaktContent$1,
  file: $$file$d,
  url: $$url$d
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$c = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/contact.astro", { modules: [{ module: $$module1$2, specifier: "../layouts/ContactSubite_en.astro", assert: {} }, { module: $$module2$4, specifier: "../components/subpages/en/kontakt-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$c = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/contact.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Contact = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$Contact;
  return renderTemplate`${renderComponent($$result, "Subsite", $$ContactSubiteEn, { "title": "Contact", "imgsrc": "/backgrounds/kontakt.jpg", "clss": "-mt-16" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$KontaktContent$1, {})}` })}`;
});

const $$file$c = "/home/szymon/Programming/jaran/jaran-website/src/pages/contact.astro";
const $$url$c = "/contact";

const _page10 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$c,
  default: $$Contact,
  file: $$file$c,
  url: $$url$c
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$b = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactSidebar.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$b = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/ContactSidebar.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactSidebar = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$ContactSidebar;
  return renderTemplate`${maybeRenderHead($$result)}<div class="hidden xl:flex flex-col bg-red-700 mr-32 rounded-2xl text-gray-300 h-full text-left text-lg md:text-xl">
  <div class="py-10 px-10 w-96">
    <h3 class="text-4xl pb-2 text-white font-bold ">Spotkajmy się</h3>
    <p>
      Nasze biuro znajduje się w odległości niespełna 400 metrów od Pałacu
      Kultury i Nauki. Zapraszamy na ulicę Poznańską w Warszawie, choć możemy
      spotkać się w innym uzgodnionym miejscu.
    </p>

    <h3 class="py-3 text-4xl text-white font-bold">Adres</h3>
    <ul>
      <li>ul. Poznańska 24 lok. 21</li>
      <li>00-685 Warszawa</li>
      <li>tel: +48 22 622 14 08</li>
      <li>tel: +48 669 981 964</li>
      <li>email: biuro@jaran.com.pl</li>
    </ul>
  </div>
</div>`;
});

const $$file$b = "/home/szymon/Programming/jaran/jaran-website/src/components/ContactSidebar.astro";
const $$url$b = undefined;

const $$module4$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$b,
  default: $$ContactSidebar,
  file: $$file$b,
  url: $$url$b
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$a = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/ContactSubite.astro", { modules: [{ module: $$module1$6, specifier: "../components/Footer.astro", assert: {} }, { module: $$module2$e, specifier: "../components/Form.astro", assert: {} }, { module: $$module3$2, specifier: "../components/Nav.astro", assert: {} }, { module: $$module4$1, specifier: "../components/ContactSidebar.astro", assert: {} }, { module: $$module5, specifier: "../components/Map.astro", assert: {} }, { module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$a = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/ContactSubite.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$ContactSubite = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$ContactSubite;
  return renderTemplate`<html lang="pl">
  <head>
    <meta name="google-site-verification" content="cy2LBn3YlupNGqpHEm_bKVFq70NARt2VTHNYb_kHo_w">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <meta name="description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">

    <meta property="og:title" content="JARAN Biuro detektywistyczne">
    <meta property="og:description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">
    <meta property="og:image" content="TO DO">
    <meta property="og:url" content="TO DO">

    <meta name="twitter:title" content="JARAN Biuro detektywistyczne">
    <meta name="twitter:description" content="Biuro detektywistyczne z ponad 16 letnim doświadczeniem. Dyskretne obserwacje, Sprawy Rodzinne i Firmowe. Dyskrecja i skuteczność">
    <meta name="twitter:url" content="TODO">
    <meta name="twitter:card" content="biuro detektywistyczne">

    <title>${"JARAN Prywatne biuro detektywistyczne Warszawa"}</title>
  ${renderHead($$result)}</head>

  <body class="font-[Roboto] static bg-gray-900 h-full">
    ${renderComponent($$result, "Nav", $$Nav, {})}
    <section class="bg-gray-900">
      <div class="absolute z-20 flex flex-col w-full pt-3 sm:pt-12 md:pt-12 top-24 sm:top-24 lg:top-28 xl:top-48">
        <h1 class="text-4xl sm:text-5xl lg:text-7xl -mb-5 sm:mb-0 lg:mb-0 font-thin text-gray-300 mx-auto text-center leading-tight">
          ${Astro2.props.title}
        </h1>
      </div>
      <div class="z-10 absolute sm:-top-16 md:-top-24 lg:-top-32 xl:-top-40 2xl:-top-48 mx-auto">
        <picture${addAttribute(Astro2.props.clss, "class")} class="object-fill mx-auto">
          ${renderComponent($$result, "Image", $$Image, { "class": "brightness-150", "src": Astro2.props.imgsrc, "format": "webp", "alt": "Zdj\u0119cie starego telefonu", "height": "1000", "width": "1920" })}
        </picture>
      </div>

      <div class="absolute z-10 w-full mt-[200px] sm:mt-[285px] md:mt-[282px] lg:mt-[376px] xl:mt-[470px] 2xl:mt-[564px] flex flex-col bg-gray-900">
        <div class="flex flex-row">
          <div class="lg:pl-20 md:px-10 flex w-full">
            <div class="text-gray-300 lg:px-6 lg:w-10/12 text-center">
              <section>
                <div class="flex flex-col items-center px-10 xl:pb-16 pt-8 text-left w-10/12">
                  ${renderSlot($$result, $$slots["default"])}
                </div>
              </section>
              <div class=" w-full mx-auto pt-24">
                ${renderComponent($$result, "Form", $$Form, {})}
              </div>
            </div>
          </div>
          <div class="pt-12 pb-72">
            ${renderComponent($$result, "Sidebar", $$ContactSidebar, {})}
          </div>
        </div>
        <div class="flex flex-col mx-auto">
          <div class="flex py-20">
            ${renderComponent($$result, "Map", $$Map, {})}
          </div>
          ${renderComponent($$result, "Footer", $$Footer, {})}
        </div>
      </div>
    </section>
  </body></html>`;
});

const $$file$a = "/home/szymon/Programming/jaran/jaran-website/src/layouts/ContactSubite.astro";
const $$url$a = undefined;

const $$module1$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$a,
  default: $$ContactSubite,
  file: $$file$a,
  url: $$url$a
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$9 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/kontakt-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$9 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/kontakt-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$KontaktContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$KontaktContent;
  return renderTemplate`${maybeRenderHead($$result)}<div>
  <div><h2 class="text-4xl sm:text-6xl pb-2 text-white bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">Napisz do nas!</h2></div>
  <div class="text-gray-300 h-full text-left text-lg md:text-xl pt-5">
    <p>W biurze detektywistycznym Jaran zawsze mamy dla Ciebie czas. Skontaktuj się z nami, zostawiając swoje imię oraz adres e-mail. Opisz swoją sprawę oraz sposób, w jaki możemy Ci pomóc. Otrzymasz od nas odpowiedź najszybciej, jak to możliwe.</p>
  </div>
</div>`;
});

const $$file$9 = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/kontakt-content.astro";
const $$url$9 = undefined;

const $$module2$3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$9,
  default: $$KontaktContent,
  file: $$file$9,
  url: $$url$9
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$8 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/kontakt.astro", { modules: [{ module: $$module1$1, specifier: "../layouts/ContactSubite.astro", assert: {} }, { module: $$module2$3, specifier: "../components/subpages/pl/kontakt-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$8 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/kontakt.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Kontakt = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$Kontakt;
  return renderTemplate`${renderComponent($$result, "Subsite", $$ContactSubite, { "title": "Kontakt", "imgsrc": "/backgrounds/kontakt.jpg", "clss": "-mt-16" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$KontaktContent, {})}` })}`;
});

const $$file$8 = "/home/szymon/Programming/jaran/jaran-website/src/pages/kontakt.astro";
const $$url$8 = "/kontakt";

const _page11 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$8,
  default: $$Kontakt,
  file: $$file$8,
  url: $$url$8
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$7 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/cennik-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$7 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/cennik-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$CennikContent$1 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$CennikContent$1;
  return renderTemplate`${maybeRenderHead($$result)}<artice>
<div class="pb-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
  We always have time for you!
  </h2>
  <p class="text-lg md:text-xl pt-5">
    After the case is concluded, we present the Client with a detailed report detective's
report on the activities performed, signed by a licensed detective together with the
collected documentation (observation, photographic and video documentation,
findings), presenting conclusions for effective solutions to the Client's problems.
  </p>
</div>
  <ul class="text-lg md:text-xl">
    <li class="pt-2">
      - The prices of services are individually determined with the Client and
adjusted to the Client's financial abilities.
    </li>
    <li class="pt-2">
      - Prices are dependent on the complexity of the case, the technical
requirements and the efforts to achieve an successful result.
    </li>
    <li class="pt-2">
      - Visit, talk with us. Even if you won&#39;t use our services, following the meeting
you will have a better knowledge about solving your problem.
    </li>
    <li class="pt-2">
      - Detective advice and consultation is free of charge.
    </li>
  </ul>
</artice>`;
});

const $$file$7 = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/en/cennik-content.astro";
const $$url$7 = undefined;

const $$module2$2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$7,
  default: $$CennikContent$1,
  file: $$file$7,
  url: $$url$7
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$6 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/pricing.astro", { modules: [{ module: $$module1$3, specifier: "../layouts/Subsite_en.astro", assert: {} }, { module: $$module2$2, specifier: "../components/subpages/en/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$6 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/pricing.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Pricing = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$Pricing;
  return renderTemplate`${renderComponent($$result, "Subsite", $$SubsiteEn, { "title": "Pricing", "imgsrc": "/backgrounds/cennik.jpg", "clss": "brightness-50 ", "altprop": "Tablet z wykresem le\u017C\u0105cy na biurku" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent$1, {})}` })}`;
});

const $$file$6 = "/home/szymon/Programming/jaran/jaran-website/src/pages/pricing.astro";
const $$url$6 = "/pricing";

const _page12 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$6,
  default: $$Pricing,
  file: $$file$6,
  url: $$url$6
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$5 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/cennik-content.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$5 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/cennik-content.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$CennikContent = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$CennikContent;
  return renderTemplate`${maybeRenderHead($$result)}<artice>
<div class="pb-5">
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">Zawsze mamy dla Ciebie czas</h2>
  <p class="text-lg md:text-xl pt-4">
    Ceny oferowanych usług każdorazowo są uzgadniane z Klientem. Zależą od
    stopnia skomplikowania sprawy, użytych środków technicznych i sił służących
    uzyskaniu skutecznego rezultatu. W sprawach windykacyjnych cena usługi
    zawiera opłatę wstępną (na poczet bieżących kosztów związanych z pełnym
    rozpoznaniem dłużnika) oraz uzgodniony procent od zwindykowanego długu. <br><bold class="font-black underline underline-offset-2">Porady i konsultacje detektywistyczne są bezpłatne.</bold> Nawet jeśli nie skorzystasz z naszych usług po spotkaniu będziesz mieć pełniejszą
    wiedzę na temat rozwiązania Twego Problemu.
  </p>
</div>
<div>
  <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-5 rounded-lg pl-5">
    Nasz klient na zawsze pozostaje naszym klientem
  </h2>
  <p class="text-lg md:text-xl pt-4">
    Po zrealizowaniu sprawy przedstawiamy Klientowi, szczegółowe sprawozdanie
    (raport detektywistyczny) z wykonanych czynności podpisane przez
    licencjonowanego detektywa wraz z zebraną dokumentacją (obserwacja,
    ustalenia), przedstawiając wnioski służące skutecznemu rozwiązywaniu jego
    problemów. W razie konieczności zapewniamy również kompleksową obsługę
    prawną, komorniczą i psychologiczną.
  </p>
</div>
</artice>`;
});

const $$file$5 = "/home/szymon/Programming/jaran/jaran-website/src/components/subpages/pl/cennik-content.astro";
const $$url$5 = undefined;

const $$module2$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$5,
  default: $$CennikContent,
  file: $$file$5,
  url: $$url$5
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$4 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/cennik.astro", { modules: [{ module: $$module1$5, specifier: "../layouts/Subsite.astro", assert: {} }, { module: $$module2$1, specifier: "../components/subpages/pl/cennik-content.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$4 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/cennik.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$Cennik = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Cennik;
  return renderTemplate`${renderComponent($$result, "Subsite", $$Subsite, { "title": "Cennik", "imgsrc": "/backgrounds/cennik.jpg", "clss": "brightness-50 ", "altprop": "Tablet z wykresem le\u017C\u0105cy na biurku" }, { "default": () => renderTemplate`${renderComponent($$result, "Content", $$CennikContent, {})}` })}`;
});

const $$file$4 = "/home/szymon/Programming/jaran/jaran-website/src/pages/cennik.astro";
const $$url$4 = "/cennik";

const _page13 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$4,
  default: $$Cennik,
  file: $$file$4,
  url: $$url$4
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$3 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/CardMain_en.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$3 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/CardMain_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$CardMainEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$CardMainEn;
  return renderTemplate`${maybeRenderHead($$result)}<article class="xl:pl-24 flex w-full flex-col items-center bg-gray-900">
  <div class="text-gray-300 lg:px-6 w-11/12">
    <div class="">
      <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
        Why should you choose us?
      </h2>
      <div class="flex flex-col mx-auto space-y-0 pt-5 text-lg md:text-xl leading-6 bg-gray-900 text-gray-300">
        <div class="px-4 sm:px-16 md:px-4">
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                We have successfully worked on the European market since 2006.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                We have met all authorities requirements relating with operating
                private investigation company in European Union.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                We operate in Poland, Europe and USA.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                We hire only professional and licensed private detectives, who
                give a warranty of highly confidential and high level services
                approach. Many of our employees are women.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                The company is managed by a woman.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                Our company offers the investigation support in a business,
                criminal, insurance, civil, divorce, inheritance, and other
                cases.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                Our Team includes analysts, private detectives and technical
                (surveillance) experts.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                We never leave our Customers, when the case is terminated -
                never before the tasks are completed.
              </p>
            </div>
          </div>
          <div class="flex flex-row">
            <div class="mb-4 mr-4">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                </svg>
              </div>
            </div>
            <div>
              <p class="text-lg md:text-xl">
                We work 24 hours a day 7 days a week.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="pt-5">
      <h2 class="text-4xl sm:text-6xl font-thin text-start bg-gradient-to-r from-red-700 to via-gray-900 py-3 rounded-lg pl-5">
        What can we do for you?
      </h2>
      <p class="text-lg md:text-xl pt-5">
        We provide detective and debt collection services for individuals and
        business entities. Confidentiality, professionalism, 15 years of
        experience and an individual approach to the client are our strengths.
        We offer help in every matter. Client's case - it becomes our common
        case.
      </p>
    </div>
  </div>
</article>`;
});

const $$file$3 = "/home/szymon/Programming/jaran/jaran-website/src/components/CardMain_en.astro";
const $$url$3 = undefined;

const $$module1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$3,
  default: $$CardMainEn,
  file: $$file$3,
  url: $$url$3
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$2 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Hero_en.astro", { modules: [{ module: $$module1$4, specifier: "./ContactButton_en.astro", assert: {} }, { module: $$module2$g, specifier: "@astrojs/image/components", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$2 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/components/Hero_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$HeroEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$HeroEn;
  return renderTemplate`${maybeRenderHead($$result)}<header class=" pt-32 sm:pt-44 xl:pt-52 text-xl box w-full h-screen">
  |${renderComponent($$result, "Image", $$Image, { "src": "/backgrounds/warsaw-4419052.jpg", "alt": "", "height": "1080", "width": "1920", "format": "webp", "class": "absolute flex -z-10 brightness-50 top-0 mx-auto object-cover min-h-screen" })}
  <div class="items-center">
    <div class="w-full text-center">
      <h1 class="text-3xl sm:text-7xl font-medium text-white z-50 pb-8 max-w-xs sm:max-w-3xl mx-auto racking-normal leading-tight">
        Detectives<br>Private Investigator <span class="uppercase">jaran</span>
      </h1>

      <p class="text-base sm:text-2xl max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto mt-4 text-white font-light tracking-wide">
        We provide investigation and debt collection services for a private and individual
Customers. The attributes which articulates us are facile to define:
confidentiality, 16 year of professional experience on the European market and
individual approach to every case. Each projects is considered as a our own
project, and we strongly believe that the impossible issues are not exist.
      </p>

      <div class="flex flex-wrap justify-center mt-8 gap-4">
        ${renderComponent($$result, "ContactButton", $$ContactButtonEn, {})}
      </div>
    </div>
  </div>
</header>`;
});

const $$file$2 = "/home/szymon/Programming/jaran/jaran-website/src/components/Hero_en.astro";
const $$url$2 = undefined;

const $$module2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$2,
  default: $$HeroEn,
  file: $$file$2,
  url: $$url$2
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$1 = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout_en.astro", { modules: [{ module: $$module1$7, specifier: "../components/Features.astro", assert: {} }, { module: $$module2$c, specifier: "../components/Footer_en.astro", assert: {} }, { module: $$module3$1, specifier: "../components/Form_en.astro", assert: {} }, { module: $$module4$3, specifier: "../components/Nav_en.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$1 = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout_en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$LayoutEn = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$LayoutEn;
  return renderTemplate`<html lang="en" class="overflow-x-hidden">
  <head>
    <meta name="google-site-verification" content="cy2LBn3YlupNGqpHEm_bKVFq70NARt2VTHNYb_kHo_w">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <meta name="description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">

    <meta property="og:title" content="JARAN Detective office">
    <meta property="og:description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">
    <meta property="og:image" content="TO DO">
    <meta property="og:url" content="TO DO">

    <meta name="twitter:title" content="JARAN Detective office">
    <meta name="twitter:description" content="JARAN is a Polish private investigator agency based in Warsaw providing expert investigation services to private and corporate clients.">
    <meta name="twitter:url" content="TODO">
    <meta name="twitter:card" content="biuro detektywistyczne">

    <title>${"JARAN private detective office Warsaw"}</title>
  ${renderHead($$result)}</head>
  <body class="font-[Roboto] overflow-x-hidden">
    ${renderComponent($$result, "NavEn", $$NavEn, {})}
    ${renderSlot($$result, $$slots["default"])}
    <div class="bg-gray-900">
      <div class="w-11/12 md:w-11/12 lg:w-4/6 xl:w-1/2 mx-auto pt-24">
        ${renderComponent($$result, "Form", $$FormEn, {})}
      </div>
      ${renderComponent($$result, "Footer", $$FooterEn, {})}
    </div>
  </body></html>`;
});

const $$file$1 = "/home/szymon/Programming/jaran/jaran-website/src/layouts/Layout_en.astro";
const $$url$1 = undefined;

const $$module4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$1,
  default: $$LayoutEn,
  file: $$file$1,
  url: $$url$1
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata = createMetadata("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/en.astro", { modules: [{ module: $$module1, specifier: "../components/CardMain_en.astro", assert: {} }, { module: $$module2, specifier: "../components/Hero_en.astro", assert: {} }, { module: $$module3, specifier: "../components/Sidebar_en.astro", assert: {} }, { module: $$module4, specifier: "../layouts/Layout_en.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro = createAstro("/@fs/home/szymon/Programming/jaran/jaran-website/src/pages/en.astro", "https://jaran.com.pl/", "file:///home/szymon/Programming/jaran/jaran-website/");
const $$En = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$En;
  return renderTemplate`${renderComponent($$result, "Layout", $$LayoutEn, { "title": "JARAN Private investigators Warsaw" }, { "default": () => renderTemplate`${maybeRenderHead($$result)}<main>
    ${renderComponent($$result, "Hero", $$HeroEn, {})}
    <div class="bg-gray-900 flex flex-row pt-5 md:pt-12 xl:pt-16">
      <div class="flex flex-col lg:w-full w-9/12 bg-gray-900">
        ${renderComponent($$result, "CardMain", $$CardMainEn, {})}
      </div>
      ${renderComponent($$result, "Sidebar", $$SidebarEn, {})}
    </div>
  </main>` })}`;
});

const $$file = "/home/szymon/Programming/jaran/jaran-website/src/pages/en.astro";
const $$url = "/en";

const _page14 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata,
  default: $$En,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const pageMap = new Map([['node_modules/@astrojs/image/dist/endpoint.js', _page0],['src/pages/index.astro', _page1],['src/pages/informacja-gospodarcza.astro', _page2],['src/pages/business-intelligence.astro', _page3],['src/pages/business-protection.astro', _page4],['src/pages/debt-collection.astro', _page5],['src/pages/ochrona-biznesu.astro', _page6],['src/pages/windykacja.astro', _page7],['src/pages/detective.astro', _page8],['src/pages/detektyw.astro', _page9],['src/pages/contact.astro', _page10],['src/pages/kontakt.astro', _page11],['src/pages/pricing.astro', _page12],['src/pages/cennik.astro', _page13],['src/pages/en.astro', _page14],]);
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

const _manifest = Object.assign(deserializeManifest({"adapterName":"@astrojs/vercel/serverless","routes":[{"file":"","links":[],"scripts":[],"routeData":{"type":"endpoint","route":"/_image","pattern":"^\\/_image$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/@astrojs/image/dist/endpoint.js","pathname":"/_image","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/","type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/informacja-gospodarcza","type":"page","pattern":"^\\/informacja-gospodarcza\\/?$","segments":[[{"content":"informacja-gospodarcza","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/informacja-gospodarcza.astro","pathname":"/informacja-gospodarcza","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/business-intelligence","type":"page","pattern":"^\\/business-intelligence\\/?$","segments":[[{"content":"business-intelligence","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/business-intelligence.astro","pathname":"/business-intelligence","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/business-protection","type":"page","pattern":"^\\/business-protection\\/?$","segments":[[{"content":"business-protection","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/business-protection.astro","pathname":"/business-protection","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/debt-collection","type":"page","pattern":"^\\/debt-collection\\/?$","segments":[[{"content":"debt-collection","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/debt-collection.astro","pathname":"/debt-collection","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/ochrona-biznesu","type":"page","pattern":"^\\/ochrona-biznesu\\/?$","segments":[[{"content":"ochrona-biznesu","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ochrona-biznesu.astro","pathname":"/ochrona-biznesu","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/windykacja","type":"page","pattern":"^\\/windykacja\\/?$","segments":[[{"content":"windykacja","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/windykacja.astro","pathname":"/windykacja","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/detective","type":"page","pattern":"^\\/detective\\/?$","segments":[[{"content":"detective","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/detective.astro","pathname":"/detective","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/detektyw","type":"page","pattern":"^\\/detektyw\\/?$","segments":[[{"content":"detektyw","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/detektyw.astro","pathname":"/detektyw","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/contact","type":"page","pattern":"^\\/contact\\/?$","segments":[[{"content":"contact","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/contact.astro","pathname":"/contact","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/kontakt","type":"page","pattern":"^\\/kontakt\\/?$","segments":[[{"content":"kontakt","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/kontakt.astro","pathname":"/kontakt","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/pricing","type":"page","pattern":"^\\/pricing\\/?$","segments":[[{"content":"pricing","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/pricing.astro","pathname":"/pricing","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/cennik","type":"page","pattern":"^\\/cennik\\/?$","segments":[[{"content":"cennik","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/cennik.astro","pathname":"/cennik","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["assets/9b824390.6eb7c049.css","assets/123263cd.83bcbffd.css"],"scripts":[],"routeData":{"route":"/en","type":"page","pattern":"^\\/en\\/?$","segments":[[{"content":"en","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/en.astro","pathname":"/en","_meta":{"trailingSlash":"ignore"}}}],"site":"https://jaran.com.pl/","base":"/","markdown":{"drafts":false,"syntaxHighlight":"shiki","shikiConfig":{"langs":[],"theme":"github-dark","wrap":false},"remarkPlugins":[],"rehypePlugins":[],"remarkRehype":{},"extendDefaultPlugins":false,"isAstroFlavoredMd":false},"pageMap":null,"renderers":[],"entryModules":{"\u0000@astrojs-ssr-virtual-entry":"entry.js","astro:scripts/before-hydration.js":"data:text/javascript;charset=utf-8,//[no before-hydration script]"},"assets":["/assets/123263cd.83bcbffd.css","/assets/9b824390.6eb7c049.css","/favicon.ico","/logo-stare.png","/pajak.png","/backgrounds/cennik.jpg","/backgrounds/detektyw.jpg","/backgrounds/informacja-gospodarcza.jpg","/backgrounds/kontakt.jpg","/backgrounds/ochrona-biznesu.jpg","/backgrounds/warsaw-4419052.jpg","/backgrounds/windykacja.jpeg"]}), {
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
