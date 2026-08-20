export const QUESTIONS = [
  { number: 1, sourceNumber: 5, text: "Did the staff offer the customer an additional product?" },
  { number: 2, sourceNumber: 4, text: "Did the staff inform the customer about a promotion or benefits in the loyalty app?" },
  { number: 3, sourceNumber: 2, text: "Were key products available and properly displayed?" },
  { number: 4, sourceNumber: 6, text: "Did the staff end the visit with a polite farewell?" },
  { number: 5, sourceNumber: 3, text: "Did the staff greet the customer?" },
  { number: 6, sourceNumber: 11, text: "Was the store ready to handle package returns?" },
] as const;

export const EXTENDED_QUESTIONS = [
  { number: 1, sourceNumber: 1, text: "Were the store surroundings and interior clean?" },
  { number: 2, sourceNumber: 2, text: "Were key products available and properly displayed?" },
  { number: 3, sourceNumber: 3, text: "Did the staff greet the customer?" },
  { number: 4, sourceNumber: 4, text: "Did the staff inform the customer about a promotion or benefits in the loyalty app?" },
  { number: 5, sourceNumber: 5, text: "Did the staff offer the customer an additional product?" },
  { number: 6, sourceNumber: 6, text: "Did the staff end the visit with a polite farewell?" },
  { number: 7, sourceNumber: 7, text: "Did the staff look neat and wear professional work clothing?" },
  { number: 8, sourceNumber: 8, text: "Did the staff behave professionally, politely, and efficiently?" },
  { number: 9, sourceNumber: 9, text: "Was the self-checkout station available and ready to use?" },
  { number: 10, sourceNumber: 11, text: "Was the store ready to handle package returns?" },
] as const;

export const PARTNERS = [
  { code: "REG1", login: "region1", name: "Demo Partner 1", expectedStores: 3 },
  { code: "REG2", login: "region2", name: "Demo Partner 2", expectedStores: 3 },
  { code: "REG3", login: "region3", name: "Demo Partner 3", expectedStores: 3 },
] as const;

export const INITIAL_PASSWORD = process.env.DEMO_INITIAL_PASSWORD || "demo1234";
export const SESSION_COOKIE = "retail_visit_session";
