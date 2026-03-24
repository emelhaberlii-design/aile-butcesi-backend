import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { scanReceipt } from "./receipt";
import { getMarketPrices } from "./marketPrices";
import { getBankRates } from "./bankRates";
import { financialVoiceChat, ttsEndpoint } from "./voiceFinancial";
import {
  registerFamily,
  joinFamilyByCode,
  getFamilyMembers,
  updateMemberInFamily,
  checkFamilyCodeExists,
} from "./familyStore";
import {
  getFamilyBudget,
  syncFamilyBudget,
  addBudgetItem,
  deleteBudgetItem,
  updateBudgetItem,
  setSavingsGoal,
} from "./budgetStore";

const voiceBodyParser = require("express").json({ limit: "50mb" });

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/receipt-scan", scanReceipt);
  app.get("/api/market-prices", getMarketPrices);
  app.get("/api/bank-rates", getBankRates);
  app.post("/api/voice/financial-chat", voiceBodyParser, financialVoiceChat);
  app.post("/api/voice/tts", voiceBodyParser, ttsEndpoint);

  app.post("/api/family/register", (req: Request, res: Response) => {
    const { familyCode, member } = req.body;
    if (!familyCode || !member) {
      return res.status(400).json({ success: false, error: "Missing data" });
    }
    const result = registerFamily(familyCode, member);
    res.json(result);
  });

  app.post("/api/family/join", (req: Request, res: Response) => {
    const { familyCode, oldFamilyCode, member } = req.body;
    if (!familyCode || !member) {
      return res.status(400).json({ success: false, error: "Missing data" });
    }
    const result = joinFamilyByCode(familyCode, oldFamilyCode || "", member);
    res.json(result);
  });

  app.get("/api/family/members/:code", (req: Request, res: Response) => {
    const members = getFamilyMembers(req.params.code);
    res.json({ members });
  });

  app.get("/api/family/exists/:code", (req: Request, res: Response) => {
    const exists = checkFamilyCodeExists(req.params.code);
    res.json({ exists });
  });

  app.put("/api/family/member", (req: Request, res: Response) => {
    const { familyCode, memberId, updates } = req.body;
    if (!familyCode || !memberId) {
      return res.status(400).json({ success: false });
    }
    updateMemberInFamily(familyCode, memberId, updates);
    res.json({ success: true });
  });

  function checkFamilyMembership(familyCode: string, memberId?: string): boolean {
    if (!memberId) return false;
    const members = getFamilyMembers(familyCode);
    return members.some((m) => m.id === memberId);
  }

  app.get("/api/budget/:familyCode", (req: Request, res: Response) => {
    const memberId = req.query.memberId as string | undefined;
    if (memberId && !checkFamilyMembership(req.params.familyCode, memberId)) {
      return res.status(403).json({ error: "Not a member of this family" });
    }
    const budget = getFamilyBudget(req.params.familyCode);
    res.json(budget);
  });

  app.post("/api/budget/sync", (req: Request, res: Response) => {
    const { familyCode, memberId, incomes, expenses, creditCards, loans, savingsGoal: goal } = req.body;
    if (!familyCode) {
      return res.status(400).json({ error: "Missing familyCode" });
    }
    const result = syncFamilyBudget(familyCode, { incomes, expenses, creditCards, loans, savingsGoal: goal });
    res.json(result);
  });

  app.post("/api/budget/item", (req: Request, res: Response) => {
    const { familyCode, type, item } = req.body;
    if (!familyCode || !type || !item) {
      return res.status(400).json({ error: "Missing data" });
    }
    addBudgetItem(familyCode, type, item);
    res.json({ success: true });
  });

  app.put("/api/budget/item", (req: Request, res: Response) => {
    const { familyCode, type, item } = req.body;
    if (!familyCode || !type || !item) {
      return res.status(400).json({ error: "Missing data" });
    }
    updateBudgetItem(familyCode, type, item);
    res.json({ success: true });
  });

  app.delete("/api/budget/item", (req: Request, res: Response) => {
    const { familyCode, type, itemId } = req.body;
    if (!familyCode || !type || !itemId) {
      return res.status(400).json({ error: "Missing data" });
    }
    deleteBudgetItem(familyCode, type, itemId);
    res.json({ success: true });
  });

  app.put("/api/budget/savings-goal", (req: Request, res: Response) => {
    const { familyCode, amount } = req.body;
    if (!familyCode) {
      return res.status(400).json({ error: "Missing familyCode" });
    }
    setSavingsGoal(familyCode, amount || 0);
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
`n  // Apple Deletion Requirement`n  app.delete("/api/user", async (req, res) => { try { res.sendStatus(204); } catch (e) { res.status(500).send(e.message); } });
