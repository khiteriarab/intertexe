import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { collectionRotation } from "../lib/collection-rotation.ts";
import {
  assembleWeeklyEditPicks,
  KHITERI_INSTAGRAM_URL,
  KHITERI_SOCIAL_HANDLE,
  KHITERI_TIKTOK_URL,
  WEEKLY_EDIT_MIX,
  type WeeklyEditPickInput,
} from "../lib/weekly-edit.ts";

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

  it("uses the late-summer vacation prompt", () => {
    const vacation = collectionRotation.find((c) => c.name === "Vacation");
    assert.ok(vacation);
    assert.match(vacation!.subline, /late summer getaway/i);
    assert.match(vacation!.subline, /before the cold/i);
  });

  it("points follow CTAs at @Khiteri", () => {
    assert.equal(KHITERI_SOCIAL_HANDLE, "@Khiteri");
    assert.equal(KHITERI_INSTAGRAM_URL, "https://www.instagram.com/khiteri");
    assert.equal(KHITERI_TIKTOK_URL, "https://www.tiktok.com/@khiteri");
  });
});

describe("Weekly Edit email", () => {
  it("uses a black masthead, open-the-app button, and Khiteri socials", () => {
    const email = fs.readFileSync(path.join(process.cwd(), "emails/WeeklyEditEmail.tsx"), "utf8");
    const send = fs.readFileSync(path.join(process.cwd(), "app/api/cron/weekly-edit-send/route.ts"), "utf8");
    assert.match(email, /const kicker = \{[\s\S]*?color: "#1C2B2A"/);
    assert.match(email, /INTERTEXE · THE MATERIAL STANDARD/);
    assert.match(email, /OPEN THE APP/);
    assert.match(email, /getAppStoreOpenUrl/);
    assert.match(email, /KHITERI_INSTAGRAM_URL/);
    assert.match(email, /KHITERI_TIKTOK_URL/);
    assert.match(email, /Editor&apos;s favorites/);
    assert.doesNotMatch(email, /SHOP ALL VERIFIED PIECES/);
    assert.match(send, /selectWeeklyEditProducts/);
    assert.match(send, /editor's picks/);
  });
});
