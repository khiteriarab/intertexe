import { DEMO_GTIN_VERIFIED } from "../../lib/material-intelligence/demo-records";

export function demoCurl(gtin = DEMO_GTIN_VERIFIED) {
  return `curl -sS https://www.intertexe.com/api/v1/demo/composition/${gtin}`;
}

export function prodCurl(gtin = DEMO_GTIN_VERIFIED) {
  return `curl -sS https://www.intertexe.com/api/v1/composition/${gtin} \\
  -H "Authorization: Bearer itx_live_…"`;
}

export function jsExample(gtin = DEMO_GTIN_VERIFIED) {
  return `const res = await fetch(
  "https://www.intertexe.com/api/v1/demo/composition/${gtin}"
);
const json = await res.json();`;
}

export function pythonExample(gtin = DEMO_GTIN_VERIFIED) {
  return `import urllib.request, json
url = "https://www.intertexe.com/api/v1/demo/composition/${gtin}"
print(json.load(urllib.request.urlopen(url)))`;
}
