import sanitizeHtml from "sanitize-html";

import { MARINADE_FORUM_URL } from "@/config/marinade";

/**
 * Sanitize untrusted Discourse `cooked` HTML (and on-chain HTML descriptions).
 *
 * Allow-list based: only formatting tags survive. Scripts, iframes, styles,
 * event handlers and javascript: URLs are removed. Links open in a new tab
 * with rel="noopener noreferrer nofollow ugc". Relative URLs are resolved
 * against the forum base URL.
 */

function absolutize(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${MARINADE_FORUM_URL}${url}`;
  return url;
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "sub", "sup", "small",
    "ul", "ol", "li", "blockquote", "aside",
    "pre", "code", "kbd",
    "a", "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "details", "summary", "div", "span",
  ],
  allowedAttributes: {
    // target/rel/loading/referrerpolicy are always overwritten by transformTags.
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "referrerpolicy"],
    th: ["align", "colspan", "rowspan"],
    td: ["align", "colspan", "rowspan"],
    ol: ["start"],
    code: ["class"],
  },
  allowedClasses: {
    code: [/^lang-[\w-]+$/],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  // Drop the contents of these entirely rather than unwrapping them.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        href: absolutize(attribs.href) ?? "",
        target: "_blank",
        rel: "noopener noreferrer nofollow ugc",
      },
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        src: absolutize(attribs.src) ?? "",
        loading: "lazy",
        referrerpolicy: "no-referrer",
      },
    }),
  },
};

export function sanitizeForumHtml(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}
