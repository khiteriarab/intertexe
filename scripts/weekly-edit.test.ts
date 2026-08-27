import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { collectionRotation } from "../lib/collection-rotation.ts";
import {
  assembleWeeklyEditPicks,
  getWeeklyEditMeta,
  INTERTEXE_INSTAGRAM_URL,
  INTERTEXE_SOCIAL_HANDLE,
  INTERTEXE_TIKTOK_URL,
  WEEKLY_EDIT_MIX,
  weeklyEditOpenHref,
  weeklyEditProductHref,
  type WeeklyEditPickInput,
} from "../lib/weekly-edit.ts";
import { getAppSchemeProductUrl, hrefToSitePath, shouldOpenFallbackToWeb } from "../lib/app-store.ts";
import {
  dateFromWeekNumber,
  resolveWeeklyEditEditorial,
  shoppingMomentForDate,
  weekNumberFromDate,
} from "../lib/weekly-edit-season.ts";
import {
  collectionEditTitle,
  collectionImageUrl,
  compactFiberCopy,
  displayProductName,
  fiberDiscoverHref,
  pairProducts,
  saleSectionHeading,
  weeklyEditMaterialSpec,
} from "../lib/weekly-edit-presentation.ts";
import { jwtRoleClaim, presentedOpsSecret } from "../lib/cron-auth.ts";

function pick(partial: Partial<WeeklyEditPickInput> & Pick<WeeklyEditPickInput, "id" | "name">): WeeklyEditPickInput {
  return {
    brand: "Test Brand",
    price: 500,
    originalPrice: 0,
    currency: "USD",
    imageUrl: `https://img.example/${partial.id}.jpg`,
    url: `https://www.intertexe.com/product/${partial.id}`,
    naturalFiberPercent: 100,
    composition: "100% Silk",
    category: "Dresses",
    isSale: false,
    ...partial,
  };
}

describe("Weekly Edit editor's picks", () => {
  it("takes 2 shoes, 3 clothing, and 3 sale without repeating ids", () => {
    const picks = [
      pick({ id: "boot-1", name: "Chelsea Boot", category: "Shoes" }),
      pick({ id: "sandal-1", name: "Leather Sandal", category: "Footwear" }),
      pick({ id: "boot-sale", name: "Sale Boot", category: "Shoes", isSale: true, price: 400, originalPrice: 700 }),
      pick({ id: "dress-1", name: "Silk Midi", category: "Dresses" }),
      pick({ id: "top-1", name: "Linen Shirt", category: "Tops" }),
      pick({ id: "coat-1", name: "Wool Coat", category: "Outerwear" }),
      pick({ id: "dress-sale", name: "Sale Dress", category: "Dresses", isSale: true, price: 300, originalPrice: 795 }),
      pick({ id: "skirt-sale", name: "Sale Skirt", category: "Skirts", isSale: true, price: 220, originalPrice: 450 }),
      pick({ id: "knit-sale", name: "Sale Knit", category: "Knitwear", isSale: true, price: 180, originalPrice: 360 }),
      pick({
        id: "loewe-poplin",
        name: "Cotton Poplin Shirt",
        brand: "LOEWE",
        category: "Tops",
        isSale: true,
        price: 750,
        originalPrice: 750,
      }),
    ];

    const assembled = assembleWeeklyEditPicks(picks);
    assert.equal(assembled.filter((p) => p.section === "shoes").length, WEEKLY_EDIT_MIX.shoes);
    assert.equal(assembled.filter((p) => p.section === "clothing").length, WEEKLY_EDIT_MIX.clothing);
    assert.equal(assembled.filter((p) => p.section === "sale").length, WEEKLY_EDIT_MIX.sale);
    assert.equal(new Set(assembled.map((p) => p.id)).size, assembled.length);

    const shoes = assembled.filter((p) => p.section === "shoes");
    assert.ok(shoes.every((p) => /boot|sandal/i.test(p.name)));
    assert.equal(
      assembled.some((p) => p.section === "shoes" && p.id === "boot-sale"),
      false
    );

    const clothingIds = assembled.filter((p) => p.section === "clothing").map((p) => p.id);
    assert.ok(clothingIds.includes("dress-1"));
    assert.equal(clothingIds.includes("loewe-poplin"), false);

    const saleIds = assembled.filter((p) => p.section === "sale").map((p) => p.id);
    assert.ok(saleIds.includes("dress-sale"));
    assert.ok(saleIds.includes("skirt-sale"));
    assert.ok(saleIds.includes("boot-sale"));
    assert.equal(
      assembled.some((p) => /cotton poplin shirt/i.test(p.name)),
      false
    );
  });

  it("never fills from a random apparel catalog", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/weekly-edit.ts"), "utf8");
    assert.match(source, /is_editor_pick/);
    assert.doesNotMatch(source, /Math\.random/);
    assert.doesNotMatch(source, /liveProductsApparelFrom/);
    assert.doesNotMatch(source, /live_products_apparel/);
  });

  it("uses the linen-silk-cotton vacation prompt", () => {
    const vacation = collectionRotation.find((c) => c.name === "Vacation");
    assert.ok(vacation);
    assert.match(vacation!.subline, /linen, silk and cotton/i);
  });

  it("points follow CTAs at @intertexe, not @Khiteri", () => {
    assert.equal(INTERTEXE_SOCIAL_HANDLE, "@intertexe");
    assert.equal(INTERTEXE_INSTAGRAM_URL, "https://www.instagram.com/intertexe");
    assert.equal(INTERTEXE_TIKTOK_URL, "https://www.tiktok.com/@intertexe");
    assert.equal(INTERTEXE_INSTAGRAM_URL.includes("khiteri"), false);
    assert.equal(INTERTEXE_TIKTOK_URL.includes("khiteri"), false);
    assert.equal(INTERTEXE_TIKTOK_URL.includes("shopintertexe"), false);
  });
});

describe("Weekly Edit email", () => {
  it("reads as a shopping product with material-first merchandising", () => {
    const email = fs.readFileSync(path.join(process.cwd(), "emails/WeeklyEditEmail.tsx"), "utf8");
    const send = fs.readFileSync(path.join(process.cwd(), "app/api/cron/weekly-edit-send/route.ts"), "utf8");
    assert.match(email, />INTERTEXE</);
    assert.doesNotMatch(email, /The Material Standard/);
    assert.match(email, /#F1F1EF/);
    assert.match(email, /#FAFAF8/);
    assert.match(email, /#F4F4F2/);
    assert.match(email, /color-scheme: light only/);
    assert.match(email, /Pieces worth buying now, selected through a material-first lens/);
    assert.match(email, /The Edit/);
    assert.match(email, /New to the edit/);
    assert.match(email, /we-product-grid/);
    assert.match(email, /Shop the edit/);
    assert.doesNotMatch(email, /Explore the edit/);
    assert.doesNotMatch(email, /TikTok →/);
    assert.doesNotMatch(email, /stackedButton/);
    assert.match(email, /email\/icon-tiktok\.png/);
    assert.match(email, /email\/icon-instagram\.png/);
    assert.match(email, /email\/icon-app\.png/);
    assert.match(email, /alt="TikTok"/);
    assert.match(email, /alt="Instagram"/);
    assert.match(email, /alt="App"/);
    assert.doesNotMatch(email, /Follow \{INTERTEXE_SOCIAL_HANDLE\}/);
    assert.match(email, /Material intelligence/);
    assert.match(email, /Discover /);
    assert.match(email, /weeklyEditMaterialSpec/);
    assert.doesNotMatch(email, /Intertexe verified/);
    assert.doesNotMatch(email, /INTERTEXE VERIFIED/);
    assert.match(email, /weeklyEditOpenHref/);
    assert.match(email, /weeklyEditProductHref/);
    assert.match(email, /productOpenHref/);
    assert.doesNotMatch(email, /href=\{product\.url\}/);
    assert.match(email, /Open in INTERTEXE/);
    assert.match(email, /height: 280px/);
    assert.match(email, /email_weekly_edit_app/);
    assert.match(email, /10:00 AM Eastern \/ 4:00 PM Barcelona/);
    assert.doesNotMatch(email, /Friday at 9am/);
    assert.match(email, /INTERTEXE_INSTAGRAM_URL/);
    assert.match(email, /INTERTEXE_TIKTOK_URL/);
    assert.doesNotMatch(email, /Week \$\{/);
    assert.doesNotMatch(email, /Editor&apos;s favorites/);
    assert.doesNotMatch(email, /SHOP ALL VERIFIED PIECES/);
    assert.doesNotMatch(email, /VIEW COLLECTION/);
    assert.doesNotMatch(email, /Fiber fact/);
    assert.doesNotMatch(email, /KHITERI_INSTAGRAM_URL/);
    assert.doesNotMatch(email, /instagram\.com\/khiteri/);
    assert.match(send, /selectWeeklyEditProducts/);
    assert.match(send, /The Weekly Edit/);
  });

  it("lets a live service role trigger the internal preview via x-intertexe-ops", () => {
    const preview = fs.readFileSync(
      path.join(process.cwd(), "app/api/cron/weekly-edit-preview/route.ts"),
      "utf8"
    );
    const auth = fs.readFileSync(path.join(process.cwd(), "lib/cron-auth.ts"), "utf8");
    assert.match(preview, /authorizeWeeklyEditPreview/);
    assert.match(auth, /x-intertexe-ops/);
    assert.match(auth, /isLiveSupabaseServiceRole/);
    assert.match(auth, /service_role/);
    assert.doesNotMatch(auth, /authHeader === `Bearer \$\{serviceKey\}`/);
  });
});

describe("Weekly Edit presentation", () => {
  it("puts composition ahead of a generic natural-fiber percentage", () => {
    assert.equal(
      weeklyEditMaterialSpec({ composition: "100% Silk", naturalFiberPercent: 100 }).label,
      "100% SILK"
    );
    assert.equal(
      weeklyEditMaterialSpec({ composition: "93% Silk, 7% Elastane", naturalFiberPercent: 93 }).label,
      "93% SILK"
    );
    assert.equal(
      weeklyEditMaterialSpec({ composition: "", naturalFiberPercent: 95 }).label,
      "95% NATURAL FIBER"
    );
    assert.equal(
      weeklyEditMaterialSpec({ composition: "100% Silk", naturalFiberPercent: 100 }).verified,
      true
    );
  });

  it("titles collections as shopping edits and uses hosted campaign art", () => {
    assert.equal(collectionEditTitle("Vacation"), "The Vacation Edit");
    assert.equal(collectionEditTitle("The White Edit"), "The White Edit");
    assert.equal(collectionEditTitle("The First Fall Edit"), "The First Fall Edit");
    assert.match(collectionImageUrl("Vacation"), /editorial-vacation/);
    assert.match(collectionImageUrl("The First Fall Edit"), /fabric-cashmere/);
    assert.equal(displayProductName("Staud Greta Silk Dress", "Staud"), "Greta Silk Dress");
  });

  it("builds two-column rows and a compact fiber aside", () => {
    assert.deepEqual(pairProducts([1, 2, 3]).map((row) => row.length), [2, 1]);
    assert.equal(saleSectionHeading([{ price: 36 }, { price: 85 }]), "Under $500");
    assert.equal(saleSectionHeading([{ price: 695 }]), "On sale");
    assert.equal(
      compactFiberCopy("First sentence. Second sentence. Third stays. Fourth drops."),
      "First sentence. Second sentence. Third stays."
    );
    assert.equal(fiberDiscoverHref("Wool"), "https://www.intertexe.com/shop?fiber=wool");
    assert.equal(fiberDiscoverHref("Cashmere"), "https://www.intertexe.com/shop?fiber=cashmere");
  });
});

describe("Weekly Edit seasonal editorial", () => {
  it("uses cashmere and The First Fall Edit in late August, not generic wool trivia", () => {
    const august = new Date(Date.UTC(2026, 7, 21));
    const week = weekNumberFromDate(august);
    assert.equal(week, 2955);
    assert.equal(dateFromWeekNumber(2955).toISOString().slice(0, 10), "2026-08-20");

    const editorial = getWeeklyEditMeta(week, [
      { name: "Greta Silk Dress", composition: "100% Silk", category: "Dresses" },
    ]);
    assert.equal(shoppingMomentForDate(august).id, "first-fall");
    assert.equal(editorial.collection.name, "The First Fall Edit");
    assert.equal(
      editorial.collection.subline,
      "Cashmere, lightweight knits and transitional pieces worth buying now."
    );
    assert.equal(editorial.fiberFact.fiber, "Cashmere");
    assert.equal(editorial.fiberFact.headline, "Cashmere season starts now.");
    assert.deepEqual(editorial.fiberFact.traits, ["SOFTNESS", "WARMTH", "FIBER QUALITY"]);
    assert.match(editorial.fiberFact.fact, /Not all cashmere is created equal/);
    assert.match(editorial.fiberFact.fact, /pills after a season/);
    assert.equal(compactFiberCopy(editorial.fiberFact.fact), editorial.fiberFact.fact);
    assert.doesNotMatch(editorial.fiberFact.headline, /year-round/i);
    assert.doesNotMatch(editorial.fiberFact.fact, /year-round/i);
    assert.match(editorial.collection.url, /fiber=cashmere/);
    assert.match(editorial.collection.imageUrl, /fabric-cashmere/);
  });

  it("moves the merchandising theme with the calendar instead of week-modulo rotation", () => {
    const coats = resolveWeeklyEditEditorial(weekNumberFromDate(new Date(Date.UTC(2026, 9, 15))));
    assert.equal(coats.moment.id, "coats");
    assert.equal(coats.collection.name, "The Coat Edit");
    assert.equal(coats.fiberFact.fiber, "Wool");
    assert.match(coats.fiberFact.headline, /Coat season/i);

    const holiday = resolveWeeklyEditEditorial(weekNumberFromDate(new Date(Date.UTC(2026, 11, 10))));
    assert.equal(holiday.moment.id, "holiday");
    assert.equal(holiday.collection.name, "The Holiday Edit");
    assert.equal(holiday.fiberFact.fiber, "Silk");

    const spring = resolveWeeklyEditEditorial(weekNumberFromDate(new Date(Date.UTC(2026, 3, 10))));
    assert.equal(spring.moment.id, "spring");
    assert.equal(spring.collection.name, "The Spring Edit");
    assert.equal(spring.fiberFact.fiber, "Cotton");

    const summer = resolveWeeklyEditEditorial(weekNumberFromDate(new Date(Date.UTC(2026, 6, 8))));
    assert.equal(summer.moment.id, "summer");
    assert.equal(summer.collection.name, "Vacation");
    assert.equal(summer.fiberFact.fiber, "Linen");
    assert.match(summer.collection.subline, /linen, silk and cotton/i);
  });

  it("can follow a later-window fiber when the week's products have it and not the lead", () => {
    const lateFirstFall = weekNumberFromDate(new Date(Date.UTC(2026, 8, 20)));
    const editorial = resolveWeeklyEditEditorial(lateFirstFall, {
      products: [{ name: "Silk Shirt", composition: "100% Silk", category: "Tops" }],
    });
    assert.equal(editorial.moment.id, "first-fall");
    assert.equal(editorial.collection.name, "The First Fall Edit");
    assert.equal(editorial.fiberFact.fiber, "Silk");
    assert.match(editorial.fiberFact.headline, /Silk is how summer becomes fall/);
  });

  it("keeps seasonal copy in the engine, not a week-modulo trivia list", () => {
    const season = fs.readFileSync(path.join(process.cwd(), "lib/weekly-edit-season.ts"), "utf8");
    const weekly = fs.readFileSync(path.join(process.cwd(), "lib/weekly-edit.ts"), "utf8");
    const facts = fs.readFileSync(path.join(process.cwd(), "lib/fiber-facts.ts"), "utf8");
    assert.match(season, /shoppingMomentForDate/);
    assert.match(season, /Cashmere season starts now/);
    assert.doesNotMatch(season, /year-round/i);
    assert.doesNotMatch(season, /Why wool works year-round/);
    assert.doesNotMatch(facts, /weekNumber % /);
    assert.doesNotMatch(weekly, /getFiberFactForWeek/);
    assert.match(weekly, /preferFibers/);
  });
});

describe("Weekly Edit app / web product links", () => {
  it("opens the complementary INTERTEXE app product, not the seller or Shop", () => {
    assert.equal(
      weeklyEditProductHref("0fd5a9b1-6751-47ef-bfa4-78a46bb9e644"),
      "https://www.intertexe.com/go/0fd5a9b1-6751-47ef-bfa4-78a46bb9e644"
    );
    assert.equal(
      getAppSchemeProductUrl("0fd5a9b1-6751-47ef-bfa4-78a46bb9e644"),
      "intertexe://product/0fd5a9b1-6751-47ef-bfa4-78a46bb9e644"
    );
    assert.doesNotMatch(getAppSchemeProductUrl("abc"), /open\?next=/);
    assert.equal(hrefToSitePath("https://www.intertexe.com/product/staud-greta"), "/product/staud-greta");
    assert.equal(
      weeklyEditOpenHref("/shop?fiber=cashmere"),
      "https://www.intertexe.com/shop?fiber=cashmere"
    );
    const appIcon = weeklyEditOpenHref("/shop", "email_weekly_edit_app");
    assert.match(appIcon, /apps\.apple\.com\/app\/id6770476520/);
    assert.doesNotMatch(appIcon, /\/open\?/);
    const weekly = fs.readFileSync(path.join(process.cwd(), "lib/weekly-edit.ts"), "utf8");
    assert.match(weekly, /row\.id \|\| row\.product_id/);
    const aasa = fs.readFileSync(
      path.join(process.cwd(), "app/.well-known/apple-app-site-association/route.ts"),
      "utf8"
    );
    assert.doesNotMatch(aasa, /\"\/p\"/);
    assert.doesNotMatch(aasa, /\"\/p\/\*\"/);
    assert.doesNotMatch(aasa, /\"\/go\"/);
    assert.doesNotMatch(aasa, /\"\/go\/\*\"/);
    const hop = fs.readFileSync(path.join(process.cwd(), "app/p/[id]/EmailProductOpenClient.tsx"), "utf8");
    assert.match(hop, /getAppSchemeProductUrl/);
    assert.doesNotMatch(hop, /getAppSchemeOpenUrl/);
    assert.doesNotMatch(hop, /click\.linksynergy/);
    const goPage = fs.readFileSync(path.join(process.cwd(), "app/go/[id]/page.tsx"), "utf8");
    assert.match(goPage, /EmailProductOpenClient/);
    assert.doesNotMatch(goPage, /weeklyEditBuyDestination/);
    assert.equal(fs.existsSync(path.join(process.cwd(), "app/go/[id]/route.ts")), false);
  });

  it("falls back to the web item when the app is not installed, not the App Store", () => {
    assert.equal(shouldOpenFallbackToWeb("/product/staud-greta", "email_weekly_edit"), true);
    assert.equal(shouldOpenFallbackToWeb("/shop?fiber=cashmere", "email_weekly_edit"), true);
    assert.equal(shouldOpenFallbackToWeb("/shop", "email_weekly_edit_app"), false);
    assert.equal(shouldOpenFallbackToWeb("/scanner", "email_day4_no_scan"), false);
    const open = fs.readFileSync(path.join(process.cwd(), "app/open/OpenAppClient.tsx"), "utf8");
    assert.match(open, /shouldOpenFallbackToWeb/);
    assert.match(open, /continue to the piece on the web/);
  });
});

describe("Weekly Edit preview ops auth", () => {
  it("reads x-intertexe-ops and only treats service_role JWTs as ops keys", () => {
    const req = new Request("https://www.intertexe.com/api/cron/weekly-edit-preview", {
      headers: { "x-intertexe-ops": "secret-token" },
    });
    assert.equal(presentedOpsSecret(req), "secret-token");
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    const anon = Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url");
    assert.equal(jwtRoleClaim(`header.${payload}.sig`), "service_role");
    assert.equal(jwtRoleClaim(`header.${anon}.sig`), "anon");
    assert.equal(jwtRoleClaim("not-a-jwt"), null);
  });
});
