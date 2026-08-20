import { describe, expect, it } from "vitest";
import { getDb, initializeDatabase } from "@/lib/db";
import { PARTNERS } from "@/lib/constants";

describe("struktura demonstracyjna", () => {
  it("zawiera 3 struktury, 4 użytkowników i 9 sklepów", () => {
    const db = initializeDatabase(getDb());
    expect((db.prepare("SELECT COUNT(*) count FROM partner_regions").get() as {count:number}).count).toBe(3);
    expect((db.prepare("SELECT COUNT(*) count FROM users").get() as {count:number}).count).toBe(4);
    expect((db.prepare("SELECT COUNT(*) count FROM stores").get() as {count:number}).count).toBe(9);
  });

  it("ma poprawne liczby sklepów i wyłącznie syntetyczne kody D", () => {
    const db = getDb();
    for (const partner of PARTNERS) {
      const row = db.prepare("SELECT COUNT(*) count FROM stores s JOIN partner_regions r ON r.id=s.region_id WHERE r.code=?").get(partner.code) as {count:number};
      expect(row.count).toBe(partner.expectedStores);
    }
    expect((db.prepare("SELECT COUNT(*) count FROM stores WHERE mpc NOT GLOB 'D*'").get() as {count:number}).count).toBe(0);
    expect(db.prepare("SELECT mpc FROM stores WHERE mpc='D1001'").get()).toBeTruthy();
    expect(db.prepare("SELECT mpc FROM stores WHERE mpc='D1009'").get()).toBeTruthy();
    expect(db.prepare("SELECT s.mpc,r.code FROM stores s JOIN partner_regions r ON r.id=s.region_id WHERE s.mpc='D1001'").get()).toEqual({mpc:"D1001",code:"REG1"});
  });
});
